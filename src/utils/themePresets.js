export const PRESET_THEMES = [
  { name: 'Orange (Default)', primary: '#f97316', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Blue', primary: '#2563eb', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Indigo', primary: '#4f46e5', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Purple', primary: '#7c3aed', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Emerald Green', primary: '#10b981', secondary: '#3b82f6', danger: '#ef4444', info: '#f59e0b' },
  { name: 'Teal', primary: '#0d9488', secondary: '#f59e0b', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Cyan', primary: '#0891b2', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Red', primary: '#dc2626', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Rose', primary: '#f43f5e', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Pink', primary: '#ec4899', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' },
  { name: 'Amber', primary: '#f59e0b', secondary: '#10b981', danger: '#ef4444', info: '#3b82f6' }
];

export const DEFAULT_THEME_COLORS = {
  primary_color: '#f97316',
  secondary_color: '#10b981',
  danger_color: '#ef4444',
  info_color: '#3b82f6',
  preset_name: 'Orange (Default)'
};

export function applyThemeToCssVariables(primaryHex, secondaryHex) {
  if (!primaryHex) return;
  const root = document.documentElement;
  root.style.setProperty('--primary', primaryHex);
  root.style.setProperty('--primary-hover', adjustHexColor(primaryHex, -20));
  if (secondaryHex) {
    root.style.setProperty('--accent-green', secondaryHex);
  }
}

function adjustHexColor(col, amt) {
  let usePound = false;
  if (col[0] === '#') {
    col = col.slice(1);
    usePound = true;
  }
  let num = parseInt(col, 16);
  if (isNaN(num)) return usePound ? '#' + col : col;
  let r = (num >> 16) + amt;
  if (r > 255) r = 255; else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt;
  if (b > 255) b = 255; else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt;
  if (g > 255) g = 255; else if (g < 0) g = 0;
  return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}
