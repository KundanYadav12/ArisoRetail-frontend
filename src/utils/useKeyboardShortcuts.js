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
        event.preventDefault();
      } else if (key === 'Delete') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT') {
          const inputEl = document.activeElement;
          if (inputEl && inputEl.classList.contains('pos-search-input') && !inputEl.value) {
            actionKey = 'Delete';
            event.preventDefault();
          }
        } else if (activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          actionKey = 'Delete';
          event.preventDefault();
        }
      } else if (key === '+' || key === '=' || key === '-' || event.code === 'NumpadAdd' || event.code === 'NumpadSubtract' || event.code === 'Equal' || event.code === 'Minus') {
        const isPlus = key === '+' || key === '=' || event.code === 'NumpadAdd' || (event.code === 'Equal' && !ctrlKey);
        const isMinus = key === '-' || event.code === 'NumpadSubtract' || (event.code === 'Minus' && !ctrlKey);
        const mappedKey = isMinus ? '-' : (isPlus ? '+' : null);

        if (mappedKey) {
          const activeTag = document.activeElement?.tagName;
          if (activeTag === 'INPUT') {
            const inputEl = document.activeElement;
            if (inputEl && inputEl.classList.contains('pos-search-input') && !inputEl.value) {
              actionKey = mappedKey;
              event.preventDefault();
            }
          } else if (activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
            actionKey = mappedKey;
            event.preventDefault();
          }
        }
      } else if (key === 'ArrowUp' || key === 'ArrowDown') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT') {
          const inputEl = document.activeElement;
          if (inputEl && inputEl.classList.contains('pos-search-input') && !inputEl.value) {
            actionKey = key;
            event.preventDefault();
          }
        } else if (activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
          actionKey = key;
          event.preventDefault();
        }
      } else if (key === 'Enter') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'INPUT') {
          const inputEl = document.activeElement;
          if (inputEl && inputEl.classList.contains('pos-search-input') && !inputEl.value) {
            actionKey = 'Enter';
            event.preventDefault();
          }
        } else if (activeTag !== 'TEXTAREA' && activeTag !== 'BUTTON') {
          actionKey = 'Enter';
          event.preventDefault();
        }
      } else if (key === 'End') {
        actionKey = 'End';
        event.preventDefault();
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
