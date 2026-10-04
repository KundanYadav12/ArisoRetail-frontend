/**
 * Shared input validation and UX utilities for weight and quantity inputs in POS:
 * - Rejects negative values (blocks minus key, clamps pasted/entered negatives to 0).
 * - Allows only digits [0-9] and at most one decimal point.
 * - Auto-formats leading decimals (.5 -> 0.5, . -> 0.).
 * - Blocks up/down spinner arrow decrementing below zero.
 * - Auto-selects full input value on focus and click.
 */

/**
 * Sanitizes a string input to only allow positive numbers with at most one decimal point.
 * @param {string} raw - Raw input string
 * @param {boolean} [allowDecimal=true] - Whether decimal points are allowed
 * @returns {string} Cleaned positive string
 */
export function sanitizePositiveNumberString(raw, allowDecimal = true) {
  if (raw === null || raw === undefined) return '';
  let str = String(raw).trim();
  if (!str) return '';

  // Remove negative signs, plus signs, scientific notation 'e', letters, and symbols
  str = str.replace(/[^0-9.]/g, '');

  if (!allowDecimal) {
    return str.replace(/\./g, '');
  }

  // Handle leading dot: '.' -> '0.' or '.5' -> '0.5'
  if (str.startsWith('.')) {
    str = '0' + str;
  }

  // Keep only the first decimal point
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }

  return str;
}

/**
 * KeyDown handler to block non-numeric keys, multiple dots, negative signs, and decrementing below zero.
 * @param {KeyboardEvent} e
 * @param {Object} options
 * @param {boolean} [options.allowDecimal=true]
 * @param {Function} [options.onLeadingDot]
 * @param {Function} [options.onEnter]
 * @param {Function} [options.onEscape]
 * @param {Function} [options.onF5]
 */
export function handlePositiveNumberKeyDown(e, {
  allowDecimal = true,
  onLeadingDot,
  onEnter,
  onEscape,
  onF5
} = {}) {
  // Navigation / Control keys
  const allowedControlKeys = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End'
  ];

  if (e.key === 'Enter') {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.nativeEvent?.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (onEnter) onEnter(e);
    return;
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.nativeEvent?.stopImmediatePropagation) {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (onEscape) onEscape(e);
    return;
  }

  if (e.key === 'F5') {
    e.preventDefault();
    if (onF5) onF5(e);
    return;
  }

  // Allow standard shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Cmd on Mac)
  if (e.ctrlKey || e.metaKey) {
    return;
  }

  // Prevent arrow down if already at or below 0
  if (e.key === 'ArrowDown') {
    const currentVal = parseFloat(e.target.value || '0');
    if (isNaN(currentVal) || currentVal <= 0) {
      e.preventDefault();
      return;
    }
  }

  if (e.key === 'ArrowUp') {
    return;
  }

  if (allowedControlKeys.includes(e.key)) {
    return;
  }

  // Explicitly block negative sign, plus sign, and scientific notation
  if (e.key === '-' || e.key === 'Minus' || e.key === '+' || e.key === 'e' || e.key === 'E') {
    e.preventDefault();
    return;
  }

  // Decimal point check
  if (e.key === '.') {
    if (!allowDecimal) {
      e.preventDefault();
      return;
    }

    const val = e.target.value || '';
    const start = e.target.selectionStart ?? 0;
    const end = e.target.selectionEnd ?? 0;
    const isAllSelected = (start === 0 && end === val.length);

    // If empty or all selected, convert to '0.'
    if (val === '' || isAllSelected) {
      e.preventDefault();
      if (onLeadingDot) {
        onLeadingDot();
      }
      return;
    }

    // If input already contains '.' and the selection does not cover it, block second dot
    const selectedText = val.substring(start, end);
    if (val.includes('.') && !selectedText.includes('.')) {
      e.preventDefault();
      return;
    }
    return;
  }

  // Only allow digits 0-9
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
}

/**
 * Paste event handler to clean pasted content
 * @param {ClipboardEvent} e
 * @param {Function} setValue - State setter callback
 * @param {boolean} [allowDecimal=true]
 */
export function handlePositiveNumberPaste(e, setValue, allowDecimal = true) {
  e.preventDefault();
  const pasteText = (e.clipboardData || window.clipboardData)?.getData('text') || '';
  const sanitized = sanitizePositiveNumberString(pasteText, allowDecimal);
  if (setValue) {
    setValue(sanitized);
  }
}

/**
 * Focus and click handlers to reliably select all text in the input
 */
export function handleSelectAllOnFocus(e) {
  e.target.select();
}

export function handleSelectAllOnClick(e) {
  e.target.select();
}

export function handleSelectAllOnMouseUp(e) {
  // If the user single-clicked without dragging to select a sub-range, select all
  if (e.target.selectionStart === e.target.selectionEnd) {
    e.target.select();
  }
}
