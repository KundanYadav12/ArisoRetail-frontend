import { useEffect } from 'react';

/**
 * Centralized Keyboard Shortcut Hook for Ariso Retail Desktop POS
 * Handles functional keys (F2-F12), Esc, Delete, Arrow keys, Enter, and Ctrl combinations.
 */
export function useKeyboardShortcuts(shortcuts = {}, deps = []) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Prevent browser default actions for specific F-keys if registered
      const key = event.key;
      const ctrlKey = event.ctrlKey || event.metaKey;
      const shiftKey = event.shiftKey;

      let actionKey = null;

      // Handle F1-F12 Keys
      if (/^F(1[0-2]|[1-9])$/.test(key)) {
        actionKey = key;
        event.preventDefault();
        event.stopPropagation();
      } else if (ctrlKey && key.toLowerCase() === 'f') {
        actionKey = 'Ctrl+F';
        event.preventDefault();
      } else if (ctrlKey && (key === '/' || key === '?')) {
        actionKey = 'Ctrl+/';
        event.preventDefault();
      } else if (key === '?') {
        // Only trigger '?' shortcut if user is not currently typing inside a text input
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          actionKey = '?';
          event.preventDefault();
        }
      } else if (key === 'Escape') {
        actionKey = 'Esc';
      } else if (key === 'Delete') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          actionKey = 'Delete';
        }
      } else if (key === '+' || key === '-') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          actionKey = key;
          event.preventDefault();
        }
      }

      if (actionKey && shortcuts[actionKey]) {
        shortcuts[actionKey](event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, ...deps]);
}
