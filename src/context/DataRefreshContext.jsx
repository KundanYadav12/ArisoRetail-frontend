/**
 * DataRefreshContext — Real-Time Data Synchronization via Server-Sent Events
 *
 * Opens a single SSE connection per browser tab to /api/events.
 * When the server broadcasts a change event (menu_updated, stock_updated, etc.),
 * this context increments a version counter for that data domain.
 *
 * Any component that needs to refresh after a remote change simply calls:
 *   const { useMenuVersion, useStockVersion, ... } = useDataRefresh();
 * and puts the version in their useEffect dependency array.
 *
 * Principles:
 *  - ONE SSE connection per tab (no polling flood)
 *  - Zero new libraries
 *  - Preserves all existing fetch logic — components just re-run their existing fetch
 *  - Auto-reconnect with exponential back-off on connection loss
 *  - Gracefully degrades if SSE is unavailable (no crashes)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';
import { getApiUrl } from '../utils/api';

const DataRefreshContext = createContext(null);

// Exported hook — safe to call outside provider (returns zeros as fallback)
export function useDataRefresh() {
  const ctx = useContext(DataRefreshContext);
  if (!ctx) {
    // Graceful fallback: return stable zero versions + no-op refresh
    return {
      menuVersion: 0,
      categoryVersion: 0,
      stockVersion: 0,
      orderVersion: 0,
      inventoryVersion: 0,
      settingsVersion: 0,
      isConnected: false,
      triggerRefresh: () => {}
    };
  }
  return ctx;
}

export function DataRefreshProvider({ children, token }) {
  const [menuVersion, setMenuVersion] = useState(0);
  const [categoryVersion, setCategoryVersion] = useState(0);
  const [stockVersion, setStockVersion] = useState(0);
  const [orderVersion, setOrderVersion] = useState(0);
  const [inventoryVersion, setInventoryVersion] = useState(0);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const esRef = useRef(null);
  const retryRef = useRef(null);
  const retryDelay = useRef(1000);
  const unmountedRef = useRef(false);

  // Manual trigger — lets any component force a domain refresh locally
  const triggerRefresh = useCallback((domain) => {
    switch (domain) {
      case 'menu':      setMenuVersion(v => v + 1); break;
      case 'category':  setCategoryVersion(v => v + 1); break;
      case 'stock':     setStockVersion(v => v + 1); break;
      case 'order':     setOrderVersion(v => v + 1); break;
      case 'inventory': setInventoryVersion(v => v + 1); break;
      case 'settings':  setSettingsVersion(v => v + 1); break;
      default:
        // Bump everything
        setMenuVersion(v => v + 1);
        setCategoryVersion(v => v + 1);
        setStockVersion(v => v + 1);
        setOrderVersion(v => v + 1);
        setInventoryVersion(v => v + 1);
        setSettingsVersion(v => v + 1);
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || unmountedRef.current) return;
    if (typeof EventSource === 'undefined') return; // SSR/unsupported

    // Close any existing connection before opening a new one
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = getApiUrl('/events');
    // Append token as query param because EventSource doesn't support custom headers
    const fullUrl = `${url}?token=${encodeURIComponent(token)}`;

    let es;
    try {
      es = new EventSource(fullUrl);
    } catch (e) {
      console.warn('[DataRefresh] EventSource creation failed:', e.message);
      return;
    }

    esRef.current = es;

    es.addEventListener('connected', () => {
      if (unmountedRef.current) return;
      setIsConnected(true);
      retryDelay.current = 1000; // reset backoff on successful connect
    });

    es.addEventListener('menu_updated', () => {
      if (!unmountedRef.current) setMenuVersion(v => v + 1);
    });

    es.addEventListener('category_updated', () => {
      if (!unmountedRef.current) setCategoryVersion(v => v + 1);
    });

    es.addEventListener('stock_updated', () => {
      if (!unmountedRef.current) setStockVersion(v => v + 1);
    });

    es.addEventListener('order_updated', () => {
      if (!unmountedRef.current) setOrderVersion(v => v + 1);
    });

    es.addEventListener('inventory_updated', () => {
      if (!unmountedRef.current) setInventoryVersion(v => v + 1);
    });

    es.addEventListener('price_updated', () => {
      // Price change is a subset of menu
      if (!unmountedRef.current) setMenuVersion(v => v + 1);
    });

    es.addEventListener('settings_updated', () => {
      if (!unmountedRef.current) setSettingsVersion(v => v + 1);
    });

    es.onerror = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);
      es.close();
      esRef.current = null;

      // Exponential back-off reconnect (max 30 s)
      const delay = Math.min(retryDelay.current, 30000);
      retryDelay.current = delay * 2;
      retryRef.current = setTimeout(connect, delay);
    };
  }, [token]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  const value = {
    menuVersion,
    categoryVersion,
    stockVersion,
    orderVersion,
    inventoryVersion,
    settingsVersion,
    isConnected,
    triggerRefresh
  };

  return (
    <DataRefreshContext.Provider value={value}>
      {children}
    </DataRefreshContext.Provider>
  );
}
