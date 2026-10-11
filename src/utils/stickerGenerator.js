import JsBarcode from 'jsbarcode';

/**
 * Supported standard sticker dimensions in millimeters
 */
export const STICKER_SIZES = {
  '50x25': {
    id: '50x25',
    name: '50 × 25 mm',
    width: 50,
    height: 25,
    aspect: '2:1 (Shelf / Barcode Label)',
    barcodeHeightMm: 7.0, // 7 mm optimal for 25 mm shelf labels
    defaultBarcodeHeight: 18,
    defaultBarcodeWidth: 1.05,
    fontScale: {
      shop: '7.5pt',
      address: '6pt',
      product: '7.5pt',
      variant: '6.5pt',
      price: '7.5pt',
      mrp: '6.5pt',
      date: '6pt'
    }
  },
  '38x38': {
    id: '38x38',
    name: '38 × 38 mm',
    width: 38,
    height: 38,
    aspect: '1:1 (Square Retail Label)',
    barcodeHeightMm: 8.0, // 8 mm optimal for 38 mm square labels
    defaultBarcodeHeight: 22,
    defaultBarcodeWidth: 0.9,
    fontScale: {
      shop: '8pt',
      address: '6.5pt',
      product: '8pt',
      variant: '6.5pt',
      price: '8pt',
      mrp: '7pt',
      date: '6.5pt'
    }
  },
  '38x50': {
    id: '38x50',
    name: '38 × 50 mm',
    width: 38,
    height: 50,
    aspect: '1:1.3 (Portrait Product Label)',
    barcodeHeightMm: 8.5, // 8.5 mm standard retail scan height (guarantees zero vertical overflow)
    defaultBarcodeHeight: 24,
    defaultBarcodeWidth: 0.9,
    fontScale: {
      shop: '8.5pt',
      address: '7pt',
      product: '8.5pt',
      variant: '7pt',
      price: '8.5pt',
      mrp: '7.5pt',
      date: '7pt'
    }
  }
};

/**
 * Supported sticker typography and language fonts (bundled locally offline - OFL license)
 */
export const STICKER_FONTS = [
  { id: 'default', name: 'Default Sans', family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  { id: 'monospace', name: 'Monospace', family: 'ui-monospace, Menlo, Monaco, Consolas, "Courier New", monospace' },
  { id: 'serif', name: 'Serif', family: 'Georgia, Cambria, "Times New Roman", Times, serif' },
  { id: 'devanagari', name: 'Noto Sans Devanagari (Hindi / Marathi)', family: '"Noto Sans Devanagari", sans-serif' },
  { id: 'gujarati', name: 'Noto Sans Gujarati', family: '"Noto Sans Gujarati", sans-serif' },
  { id: 'tamil', name: 'Noto Sans Tamil', family: '"Noto Sans Tamil", sans-serif' },
  { id: 'telugu', name: 'Noto Sans Telugu', family: '"Noto Sans Telugu", sans-serif' },
  { id: 'kannada', name: 'Noto Sans Kannada', family: '"Noto Sans Kannada", sans-serif' },
  { id: 'bengali', name: 'Noto Sans Bengali', family: '"Noto Sans Bengali", sans-serif' },
  { id: 'malayalam', name: 'Noto Sans Malayalam', family: '"Noto Sans Malayalam", sans-serif' },
  { id: 'gurmukhi', name: 'Noto Sans Gurmukhi (Punjabi)', family: '"Noto Sans Gurmukhi", sans-serif' },
  { id: 'arabic', name: 'Noto Sans Arabic', family: '"Noto Sans Arabic", sans-serif' },
  { id: 'roboto', name: 'Roboto', family: '"Roboto", sans-serif' },
  { id: 'inter', name: 'Inter', family: '"Inter", sans-serif' }
];

export function getFontFamilyCss(fontId) {
  const found = STICKER_FONTS.find(f => f.id === fontId);
  return found ? found.family : STICKER_FONTS[0].family;
}

/**
 * Preload and verify that the requested font family is ready in document.fonts before rendering
 */
export async function ensureStickerFontLoaded(fontIdOrFamily) {
  if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') {
    return;
  }
  const fontObj = STICKER_FONTS.find(f => f.id === fontIdOrFamily) || STICKER_FONTS.find(f => f.family === fontIdOrFamily);
  const familyToLoad = fontObj ? fontObj.family : (fontIdOrFamily || 'sans-serif');
  const primaryNameMatch = familyToLoad.match(/["']([^"']+)["']/);
  const primaryName = primaryNameMatch ? primaryNameMatch[1] : familyToLoad.split(',')[0].trim();

  try {
    await Promise.all([
      document.fonts.load(`16px "${primaryName}"`),
      document.fonts.load(`bold 16px "${primaryName}"`),
      document.fonts.load(`20px "${primaryName}"`),
      document.fonts.load(`bold 20px "${primaryName}"`)
    ]);
    await document.fonts.ready;
  } catch (err) {
    console.warn('[StickerGenerator] Font load warning for:', primaryName, err);
  }
}

/**
 * Validates the weight input when "Print weight on label" is checked
 */
export function validateWeightInput(config = {}) {
  if (!config.printWeight) return { isValid: true, error: '' };
  const raw = config.weightValue;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { isValid: false, error: 'Weight value cannot be empty when checked' };
  }
  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) {
    return { isValid: false, error: 'Weight must be a positive number greater than 0' };
  }
  return { isValid: true, error: '' };
}

/**
 * Resolves the display product name, supporting optional local language overrides
 */
export function resolveStickerProductName(item = {}, config = {}) {
  // 1. User manual override from designer field
  if (config?.localProductName && config.localProductName.trim()) {
    return config.localProductName.trim();
  }
  // 2. If a regional language font is chosen, check item's regional language fields
  const isRegionalFont = config?.fontFamily && !['default', 'monospace', 'serif', 'roboto', 'inter'].includes(config.fontFamily);
  if (isRegionalFont) {
    const regionalVal = item?.name_local || item?.local_name || item?.name_hindi || item?.hindi_name || item?.regional_name;
    if (regionalVal && String(regionalVal).trim()) {
      return String(regionalVal).trim();
    }
  }
  // 3. Fallback to standard item name
  return (item?.name || item?.item_name || 'Retail Item').trim();
}

/**
 * Default sticker template layout configuration
 */
export const DEFAULT_STICKER_CONFIG = {
  size: '50x25',
  rows: 1, // 1 = 1-row roll, 2 = 2-row roll
  spacingMm: 3, // 3 mm standard gap between stickers
  dpi: 203, // 203 or 300 DPI
  rotation: 0, // 0, 90, 180, 270 degrees
  driverBaseOffset: 0, // 0, 90, 180, 270 degrees (defaults to 0: None / Raw)
  autoFixOrientation: false, // auto-fix 90 deg rotation for wide/landscape thermal driver rolls
  offsetXmm: 0, // Left offset fine-tuning (-15 to +15 mm)
  offsetYmm: 0, // Top offset fine-tuning (-15 to +15 mm)
  directThermalMode: false, // Send raw TSPL/ZPL commands
  tsplDirection: 0, // 0 = standard top-to-bottom feed, 1 = inverted feed
  showShopName: true,
  showProductName: true,
  showSize: false,
  showColor: false,
  showWeight: false,
  showMrp: true,
  showSellingPrice: true,
  showMfgDate: true,
  showExpDate: false,
  showAddress: true,
  showBarcode: true,
  customShopName: '',
  customAddress: '',
  customSize: '',
  customColor: '',
  customWeight: '',
  mrpMultiplier: 1.25, // default suggested MRP calculation (125% of selling price if not specified)
  defaultMfgDate: '', // if empty, uses today
  defaultExpDate: '',
  // Font & Weight options
  fontFamily: 'default', // default font
  localProductName: '', // optional override for product name in local language
  printWeight: false, // checkbox "Print weight on label"
  weightValue: '500', // default weight value
  weightUnit: 'g', // unit dropdown: g, kg, ml, L, pcs
  safePaddingMm: 2.5, // 2.5 mm default inner safe padding (33 mm usable width for 38 mm label)
  mediaWidthMm: '', // Physical backing/media roll width in mm (default = pageW)
  driverLeftMarginMm: 0, // Windows driver left margin compensation in mm (saved per printer profile)
  speed: 4, // TSPL print speed in inches/sec
  density: 8 // TSPL print darkness/density (1-15)
};

const STORAGE_KEY = 'ariso_sticker_config';

/**
 * Load persisted sticker configuration from localStorage, optionally with printer profile
 */
export function loadSavedStickerConfig(printerName = null) {
  try {
    const baseRaw = localStorage.getItem(STORAGE_KEY);
    const baseParsed = baseRaw ? JSON.parse(baseRaw) : {};
    let printerParsed = {};
    if (printerName) {
      const printerRaw = localStorage.getItem(`${STORAGE_KEY}_${printerName}`);
      if (printerRaw) printerParsed = JSON.parse(printerRaw);
    }
    return { ...DEFAULT_STICKER_CONFIG, ...baseParsed, ...printerParsed };
  } catch (e) {
    console.warn('[StickerGenerator] Failed to load saved config:', e);
    return { ...DEFAULT_STICKER_CONFIG };
  }
}

/**
 * Save sticker configuration to localStorage, optionally storing offsets for specific printer profile
 */
export function saveStickerConfig(config, printerName = null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (printerName) {
      localStorage.setItem(`${STORAGE_KEY}_${printerName}`, JSON.stringify(config));
    }
  } catch (e) {
    console.warn('[StickerGenerator] Failed to save config:', e);
  }
}

/**
 * Calculate effective rotation in degrees (0, 90, 180, or 270) for print document
 * Taking into account user rotation, auto-fix compensation, and driver base offset.
 * finalRotation = (userRotation + autoFixOffset + driverBaseOffset) mod 360
 */
export function getEffectiveRotation(config) {
  const userRotation = parseInt(config?.rotation, 10) || 0;
  const autoFixOffset = config?.autoFixOrientation ? 270 : 0;
  const driverBaseOffset = config?.driverBaseOffset !== undefined
    ? (parseInt(config.driverBaseOffset, 10) || 0)
    : 0;
  const finalRotation = (userRotation + autoFixOffset + driverBaseOffset) % 360;
  return ((finalRotation % 360) + 360) % 360;
}

/**
 * Calculate user-facing physical label preview rotation (0, 90, 180, or 270)
 * Represents the final orientation of the physical label relative to the viewer.
 */
export function getPreviewRotation(config) {
  const userRotation = parseInt(config?.rotation, 10) || 0;
  return ((userRotation % 360) + 360) % 360;
}

/**
 * Calculate dynamic @page size and CSS transform for rotated sheet layout
 * Exact mapping of [0, W] x [0, H] into the page with zero clipping
 */
export function getRotationTransform(rotation, widthMm, heightMm, offsetXmm = 0, offsetYmm = 0) {
  const rot = ((rotation % 360) + 360) % 360;
  const offX = parseFloat(offsetXmm) || 0;
  const offY = parseFloat(offsetYmm) || 0;
  const SW = widthMm;
  const SH = heightMm;

  if (rot === 90) {
    return {
      rotation: 90,
      pageWidthMm: SH,
      pageHeightMm: SW,
      isSwapped: true,
      sheetTransform: `translate(${SH}mm, 0) rotate(90deg)`,
      transform: `translate(${SH}mm, 0) rotate(90deg)` + (offX || offY ? ` translate(${offX}mm, ${offY}mm)` : '')
    };
  } else if (rot === 180) {
    return {
      rotation: 180,
      pageWidthMm: SW,
      pageHeightMm: SH,
      isSwapped: false,
      sheetTransform: `translate(${SW}mm, ${SH}mm) rotate(180deg)`,
      transform: `translate(${SW}mm, ${SH}mm) rotate(180deg)` + (offX || offY ? ` translate(${offX}mm, ${offY}mm)` : '')
    };
  } else if (rot === 270) {
    return {
      rotation: 270,
      pageWidthMm: SH,
      pageHeightMm: SW,
      isSwapped: true,
      sheetTransform: `translate(0, ${SW}mm) rotate(270deg)`,
      transform: `translate(0, ${SW}mm) rotate(270deg)` + (offX || offY ? ` translate(${offX}mm, ${offY}mm)` : '')
    };
  } else {
    // 0 deg
    return {
      rotation: 0,
      pageWidthMm: SW,
      pageHeightMm: SH,
      isSwapped: false,
      sheetTransform: 'none',
      transform: (offX || offY) ? `translate(${offX}mm, ${offY}mm)` : 'none'
    };
  }
}

/**
 * Resolve product sticker prices according to retail fallback rules:
 * - If product has a valid Sale Price (> 0), print the Sale Price.
 * - If Sale Price is empty, null, 0, or not available, automatically fallback to MRP from existing product data.
 * - Do not leave the price blank when MRP is available.
 */
export function resolveStickerPrices(item = {}, config = {}) {
  // 1. Raw MRP extraction from existing product fields
  let rawMrp = null;
  const mrpCandidates = [item?.mrp, item?.MRP, item?.maximum_retail_price, item?.mrp_price];
  for (const c of mrpCandidates) {
    if (c !== undefined && c !== null && c !== '') {
      const num = parseFloat(c);
      if (!isNaN(num) && num > 0) {
        rawMrp = num;
        break;
      }
    }
  }

  // 2. Raw Sale Price extraction from existing product fields
  let rawSalePrice = null;
  const saleCandidates = [item?.sale_price, item?.salePrice, item?.selling_price, item?.sellingPrice, item?.price];
  for (const c of saleCandidates) {
    if (c !== undefined && c !== null && c !== '') {
      const num = parseFloat(c);
      if (!isNaN(num) && num > 0) {
        rawSalePrice = num;
        break;
      }
    }
  }

  // 3. Fallback logic:
  // If product has valid Sale Price (> 0), use it.
  // If Sale Price is empty, null, 0, or not available, automatically use product MRP from existing data.
  let effectiveSalePrice = 0;
  if (rawSalePrice !== null && rawSalePrice > 0) {
    effectiveSalePrice = rawSalePrice;
  } else if (rawMrp !== null && rawMrp > 0) {
    effectiveSalePrice = rawMrp;
  }

  // 4. MRP determination:
  let effectiveMrp = 0;
  if (rawMrp !== null && rawMrp > 0) {
    effectiveMrp = rawMrp;
  } else if (effectiveSalePrice > 0) {
    const mult = parseFloat(config?.mrpMultiplier);
    effectiveMrp = (!isNaN(mult) && mult > 1) ? (effectiveSalePrice * mult) : effectiveSalePrice;
  }

  return {
    salePrice: effectiveSalePrice,
    mrp: effectiveMrp,
    hasValidSalePrice: rawSalePrice !== null && rawSalePrice > 0,
    hasValidMrp: rawMrp !== null && rawMrp > 0
  };
}

/**
 * Format store address for stickers:
 * - Display the address for a maximum of 3 lines.
 * - If the address exceeds 3 lines, truncate it after the third line and append: ...
 * Example:
 * ABC RETAIL STORE
 * 123 Main Road, Andheri
 * Mumbai, Maharashtra
 * ...
 */
export function formatStickerAddress(rawAddress, maxLines = 3) {
  if (!rawAddress || typeof rawAddress !== 'string') return [];
  const trimmed = rawAddress.trim();
  if (!trimmed) return [];

  let lines = [];
  if (trimmed.includes('\n')) {
    lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  } else if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
    let currentLine = '';
    for (const part of parts) {
      if (!currentLine) {
        currentLine = part;
      } else if ((currentLine + ', ' + part).length <= 28) {
        currentLine += ', ' + part;
      } else {
        lines.push(currentLine);
        currentLine = part;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  } else if (trimmed.length > 28) {
    const words = trimmed.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if ((currentLine + ' ' + word).length <= 28) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  } else {
    lines = [trimmed];
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  // Address exceeds maxLines (exceeds 3 lines):
  // Truncate after lines and append '...' as the 3rd line, guaranteeing at most 3 lines
  return [lines[0], lines[1], '...'];
}

/**
 * Extract existing product Size with fallbacks
 */
export function resolveItemSize(item, config = {}) {
  const candidates = [
    item?.size,
    item?.product_size,
    item?.variant_size,
    item?.item_size,
    item?.attributes?.size,
    item?.attributes?.Size,
    item?.variants?.[0]?.size,
    item?.variants?.[0]?.Size
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      return String(c).trim();
    }
  }
  if (config?.customSize && typeof config.customSize === 'string' && config.customSize.trim() !== '') {
    return config.customSize.trim();
  }
  if (config?.defaultSize && typeof config.defaultSize === 'string' && config.defaultSize.trim() !== '') {
    return config.defaultSize.trim();
  }
  return '';
}

/**
 * Extract existing product Color with fallbacks
 */
export function resolveItemColor(item, config = {}) {
  const candidates = [
    item?.color,
    item?.product_color,
    item?.variant_color,
    item?.item_color,
    item?.attributes?.color,
    item?.attributes?.Color,
    item?.variants?.[0]?.color,
    item?.variants?.[0]?.Color
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      return String(c).trim();
    }
  }
  if (config?.customColor && typeof config.customColor === 'string' && config.customColor.trim() !== '') {
    return config.customColor.trim();
  }
  if (config?.defaultColor && typeof config.defaultColor === 'string' && config.defaultColor.trim() !== '') {
    return config.defaultColor.trim();
  }
  return '';
}

/**
 * Extract existing product Weight or Quantity with fallbacks
 */
export function resolveItemWeight(item, config = {}) {
  if (config?.customWeight && typeof config.customWeight === 'string' && config.customWeight.trim() !== '') {
    return config.customWeight.trim();
  }
  if (item?.customWeight && typeof item.customWeight === 'string' && item.customWeight.trim() !== '') {
    return item.customWeight.trim();
  }
  const candidates = [
    item?.weight,
    item?.product_weight,
    item?.net_weight,
    item?.item_weight,
    item?.quantity_weight,
    item?.unit_weight,
    item?.attributes?.weight,
    item?.attributes?.Weight
  ];
  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      return String(c).trim();
    }
  }
  if (item?.unit && typeof item.unit === 'string' && item.unit.trim() !== '') {
    return item.unit.trim();
  }
  if (item?.sales_unit && typeof item.sales_unit === 'string' && item.sales_unit.trim() !== '') {
    return item.sales_unit.trim();
  }
  return '';
}

/**
 * Validate that a barcode string is non-empty and contains only valid Code 128 characters (ASCII 32 to 126).
 */
export function validateBarcodeCode128(code) {
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return { valid: false, error: 'Barcode value is empty', code: '' };
  }
  const cleanCode = code.trim();
  for (let i = 0; i < cleanCode.length; i++) {
    const ch = cleanCode.charCodeAt(i);
    if (ch < 32 || ch > 126) {
      return { valid: false, error: `Invalid character '${cleanCode[i]}' for Code128 (ASCII 32-126 only)`, code: cleanCode };
    }
  }
  return { valid: true, error: null, code: cleanCode };
}

/**
 * Estimate text width in mm at a specific font size in points
 */
export function measureTextWidthMm(text, fontSizePt, isBold = false, fontFamily = 'sans-serif') {
  if (!text) return 0;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 1 pt = 1.333333 px at 96 DPI
        const fontSizePx = fontSizePt * 1.333333;
        ctx.font = `${isBold ? 'bold ' : ''}${fontSizePx}px ${fontFamily}`;
        const pxWidth = ctx.measureText(text).width;
        // 1 px = 0.264583 mm
        return pxWidth * 0.264583;
      }
    } catch (e) {}
  }
  // Fallback approximation: 1 pt width ~ 0.52 * 0.3528 mm per character
  const charFactor = isBold ? 0.55 : 0.50;
  return text.length * fontSizePt * charFactor * 0.352778;
}

/**
 * Fit text inside a specified usable width in mm:
 * - Reduce font size in 0.25 pt steps down to minPt
 * - Wrap to a maximum of maxLines (default 2)
 * - If still wider than usable width, truncate with '…'
 * - Guarantees zero clipping or overflow beyond usableWidthMm
 */
export function fitTextToWidth(text, basePt, minPt, usableWidthMm, isBold = false, fontFamily = 'sans-serif', maxLines = 2) {
  if (!text) return { lines: [], fontSizePt: basePt };
  const cleanStr = String(text).trim();
  if (!cleanStr) return { lines: [], fontSizePt: basePt };

  // 1. Check if single line fits by stepping down in 0.25 pt increments
  for (let pt = basePt; pt >= minPt; pt -= 0.25) {
    const w = measureTextWidthMm(cleanStr, pt, isBold, fontFamily);
    if (w <= usableWidthMm) {
      return { lines: [cleanStr], fontSizePt: pt };
    }
  }

  if (maxLines <= 1) {
    // Single line mode: truncate with '…' at minPt
    let truncated = cleanStr;
    while (truncated.length > 2 && measureTextWidthMm(truncated + '…', minPt, isBold, fontFamily) > usableWidthMm) {
      truncated = truncated.slice(0, -1);
    }
    return { lines: [truncated.trim() + '…'], fontSizePt: minPt };
  }

  // 2. Multi-line (up to 2 lines): step down in 0.25 pt increments and wrap words
  const words = cleanStr.split(/\s+/);
  for (let pt = basePt; pt >= minPt; pt -= 0.25) {
    let line1 = '';
    let line2 = '';
    let canFit = true;
    let wordIdx = 0;

    for (; wordIdx < words.length; wordIdx++) {
      const test = line1 ? `${line1} ${words[wordIdx]}` : words[wordIdx];
      if (measureTextWidthMm(test, pt, isBold, fontFamily) <= usableWidthMm) {
        line1 = test;
      } else {
        break;
      }
    }

    for (; wordIdx < words.length; wordIdx++) {
      const test = line2 ? `${line2} ${words[wordIdx]}` : words[wordIdx];
      if (measureTextWidthMm(test, pt, isBold, fontFamily) <= usableWidthMm) {
        line2 = test;
      } else {
        canFit = false;
        break;
      }
    }

    if (canFit && wordIdx === words.length) {
      return { lines: line2 ? [line1, line2] : [line1], fontSizePt: pt };
    }
  }

  // 3. If it still doesn't fit into 2 lines at minPt, fill line 1 and truncate line 2 with '…'
  let line1 = '';
  let wordIdx = 0;
  for (; wordIdx < words.length; wordIdx++) {
    const test = line1 ? `${line1} ${words[wordIdx]}` : words[wordIdx];
    if (measureTextWidthMm(test, minPt, isBold, fontFamily) <= usableWidthMm) {
      line1 = test;
    } else {
      break;
    }
  }

  if (!line1 && words.length > 0) {
    let word = words[0];
    while (word.length > 2 && measureTextWidthMm(word + '…', minPt, isBold, fontFamily) > usableWidthMm) {
      word = word.slice(0, -1);
    }
    return { lines: [word + '…'], fontSizePt: minPt };
  }

  let line2 = words.slice(wordIdx).join(' ');
  while (line2.length > 2 && measureTextWidthMm(line2 + '…', minPt, isBold, fontFamily) > usableWidthMm) {
    line2 = line2.slice(0, -1);
  }
  line2 = line2.trim() + '…';

  return { lines: [line1, line2], fontSizePt: minPt };
}

/**
 * Generate a pure vector SVG Code128 barcode string
 * - Integer printer dot module widths based on printer DPI (203 or 300)
 * - 10-module quiet zone on each side: barcode + quiet zones <= usable width
 * - Full human-readable value printed in full under the barcode
 * - Pure black on white (#000000 on #ffffff) with crispEdges
 */
export function generateCode128Svg(code, options = {}) {
  const validation = validateBarcodeCode128(code);
  if (!validation.valid) {
    return `<div class="barcode-validation-error" style="font-family: monospace; font-size: 7pt; color: #dc2626; border: 1px dashed #dc2626; padding: 2px 4px; text-align: center; background: #fef2f2; border-radius: 2px;">⚠️ ${validation.error}</div>`;
  }
  const cleanCode = validation.code;

  const dpi = parseInt(options.dpi, 10) === 300 ? 300 : 203;
  const safePaddingMm = parseFloat(options.safePaddingMm !== undefined ? options.safePaddingMm : 2.5) || 2.5;
  const labelWidthMm = options.widthMm || 38;
  const usableWidthMm = options.usableWidthMm || Math.max(16, labelWidthMm - (safePaddingMm * 2));

  // Code128: 35 overhead modules + 11 modules per data character
  const barcodeModules = 35 + 11 * cleanCode.length;

  // Scanner quiet zone requirement: Code 128 requires at least 10 modules on each side.
  // We guarantee at least 2.5 mm to 3.0 mm quiet zone within the usable cell width.
  const maxAllowedBarcodeWidthMm = Math.max(14, usableWidthMm - 4.0);

  // Calculate module width in mm for high readability on 203 & 300 DPI barcode guns:
  // Target module width is between 0.18 mm (7 mil) and 0.25 mm (10 mil).
  let moduleWidthMm = maxAllowedBarcodeWidthMm / barcodeModules;
  if (moduleWidthMm > 0.25) moduleWidthMm = 0.25;
  if (moduleWidthMm < 0.17) moduleWidthMm = 0.17;

  // Ensure total width fits within usableWidthMm with at least 3.0 mm quiet zone
  if (barcodeModules * moduleWidthMm > usableWidthMm - 3.0) {
    moduleWidthMm = Math.max(0.15, (usableWidthMm - 3.0) / barcodeModules);
  }

  const actualBarcodeWidthMm = barcodeModules * moduleWidthMm;
  // Module width in CSS px for JsBarcode:
  const jsBarcodeModuleWidth = moduleWidthMm * 3.779528;

  // Standard retail bar height: 8.0 - 8.5 mm (provides large laser/CCD target area)
  const targetBarHeightMm = options.heightMm || (usableWidthMm >= 45 ? 8.0 : (options.labelHeightMm >= 45 ? 8.5 : 8.0));
  const barHeightPx = Math.round(targetBarHeightMm * 3.779528);

  const fontSizePt = options.fontSizePt || (usableWidthMm <= 33 ? 6.5 : 7.0);
  const fontSizePx = Math.round(fontSizePt * 1.333333);

  // Exact total SVG height in mm: bar height + text height + text margin
  const showText = options.displayValue !== false;
  const textHeightMm = showText ? ((fontSizePt * 0.352778) + 1.2) : 0;
  const totalSvgHeightMm = targetBarHeightMm + textHeightMm;

  try {
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, cleanCode, {
      format: 'CODE128',
      width: jsBarcodeModuleWidth,
      height: barHeightPx,
      displayValue: showText,
      text: options.text || cleanCode,
      font: 'monospace',
      fontOptions: 'bold',
      fontSize: fontSizePx,
      textMargin: 1.0,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000'
    });

    svgNode.setAttribute('shape-rendering', 'crispEdges');
    const rawW = svgNode.getAttribute('width');
    const rawH = svgNode.getAttribute('height');
    if (rawW && rawH) {
      svgNode.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
    }
    svgNode.setAttribute('width', `${actualBarcodeWidthMm.toFixed(2)}mm`);
    svgNode.setAttribute('height', `${totalSvgHeightMm.toFixed(2)}mm`);
    svgNode.setAttribute('style', `display: block; margin: 0 auto; width: ${actualBarcodeWidthMm.toFixed(2)}mm; height: ${totalSvgHeightMm.toFixed(2)}mm; max-width: 100%; shape-rendering: crispEdges;`);
    return new XMLSerializer().serializeToString(svgNode);
  } catch (err) {
    console.warn('[StickerGenerator] Barcode generation warning for code:', cleanCode, err);
    return `<div style="font-family: monospace; font-size: 7.5pt; font-weight: bold; border: 1px dashed #000; padding: 2px 4px; text-align: center;">${cleanCode}</div>`;
  }
}

/**
 * Get today's local date as YYYY-MM-DD for HTML5 date inputs
 */
export function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format ISO date string (YYYY-MM-DD) into Indian retail sticker format (DD/MM/YYYY)
 */
export function formatIsoToDisplayDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-');
    return `${d}/${m}/${y}`;
  }
  return trimmed;
}

/**
 * Convert display format (DD/MM/YYYY or DD-MM-YYYY) to ISO (YYYY-MM-DD) for HTML5 date inputs
 */
export function parseDisplayToIsoDate(displayStr) {
  if (!displayStr || typeof displayStr !== 'string') return '';
  const trimmed = displayStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const d = match[1].padStart(2, '0');
    const m = match[2].padStart(2, '0');
    const y = match[3];
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Build HTML content for a single sticker element
 */
/**
 * Build HTML content for a single sticker element
 */
export function renderSingleStickerHtml(item, config, shopData = {}) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const safePadding = parseFloat(config?.safePaddingMm !== undefined ? config.safePaddingMm : 2.5) || 2.5;
  const usableWidthMm = Math.max(16, sizeDef.width - (safePadding * 2));
  const usableHeightMm = Math.max(16, sizeDef.height - (safePadding * 2));
  const fontFamilyCss = getFontFamilyCss(config.fontFamily);

  const shopName = (config.customShopName || shopData.restaurant_name || shopData.name || 'Ariso Retail Store').trim();
  const rawAddress = (config.customAddress || shopData.address || shopData.store_address || shopData.restaurant_address || '').trim();
  const isCompact25 = sizeDef.height <= 25;
  const addressLines = formatStickerAddress(rawAddress, isCompact25 ? 1 : 2);
  const productName = resolveStickerProductName(item, config);

  const prices = resolveStickerPrices(item, config);
  const priceVal = prices.salePrice;
  const mrpVal = prices.mrp;

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const rawMfg = config.defaultMfgDate;
  const mfgDate = rawMfg ? formatIsoToDisplayDate(rawMfg) : todayStr;
  const expDate = config.defaultExpDate ? formatIsoToDisplayDate(config.defaultExpDate) : '';

  const hasWeight = config.printWeight && config.weightValue;
  const weightLine = hasWeight ? `Wt: ${config.weightValue} ${config.weightUnit || 'g'}` : '';

  const barcodeValue = (item?.barcode || item?.sku || ('PRD' + (item?.id || '001'))).trim();
  const barcodeSvg = config.showBarcode ? generateCode128Svg(barcodeValue, {
    widthMm: sizeDef.width,
    usableWidthMm,
    heightMm: sizeDef.barcodeHeightMm,
    labelHeightMm: sizeDef.height,
    dpi: config.dpi || 203,
    safePaddingMm: safePadding,
    displayValue: true
  }) : '';

  const itemSize = resolveItemSize(item, config);
  const itemColor = resolveItemColor(item, config);
  const itemWeight = resolveItemWeight(item, config);
  const showSize = !!config.showSize && !!itemSize;
  const showColor = !!config.showColor && !!itemColor;
  const showWeight = !!config.showWeight && !!itemWeight && !hasWeight;
  const displaySize = showSize ? (/^size:\s*/i.test(itemSize) ? itemSize : `Size: ${itemSize}`) : '';
  const displayColor = showColor ? (/^color:\s*/i.test(itemColor) ? itemColor : `Color: ${itemColor}`) : '';
  const displayWeight = showWeight ? (/^(wt|weight|qty|net\s*wt):\s*/i.test(itemWeight) ? itemWeight : `Net Wt: ${itemWeight}`) : '';

  const variantParts = [];
  if (showWeight) variantParts.push(displayWeight);
  if (showSize) variantParts.push(displaySize);
  if (showColor) variantParts.push(displayColor);
  const variantStr = variantParts.join(' • ');

  // Fit text with 0.25 pt step-down
  const shopFit = (config.showShopName && shopName)
    ? fitTextToWidth(shopName, isCompact25 ? 7.5 : 8.5, 5.5, usableWidthMm, true, fontFamilyCss, 1)
    : null;

  const fittedAddressLines = (config.showAddress && addressLines.length > 0)
    ? addressLines.slice(0, isCompact25 ? 1 : 2).map(line => fitTextToWidth(line, isCompact25 ? 6.0 : 7.0, 5.0, usableWidthMm, false, fontFamilyCss, 1).lines[0] || line)
    : [];

  const prodFit = (config.showProductName && productName)
    ? fitTextToWidth(productName, isCompact25 ? 7.5 : 8.5, 6.0, usableWidthMm, true, fontFamilyCss, isCompact25 ? 1 : 2)
    : null;

  const weightFit = hasWeight
    ? fitTextToWidth(weightLine, 7.0, 5.5, usableWidthMm, true, fontFamilyCss, 1)
    : null;

  const variantFit = (!hasWeight && variantParts.length > 0)
    ? fitTextToWidth(variantStr, 7.0, 5.5, usableWidthMm, false, fontFamilyCss, 1)
    : null;

  const dateParts = [];
  if (config.showMfgDate && mfgDate) dateParts.push(`Mfg: ${mfgDate}`);
  if (config.showExpDate && expDate) dateParts.push(`Exp: ${expDate}`);
  const dateStr = dateParts.join('  ');
  const dateFit = dateParts.length > 0
    ? fitTextToWidth(dateStr, 6.5, 5.0, usableWidthMm, false, fontFamilyCss, 1)
    : null;

  let priceHtml = '';
  if ((config.showMrp || config.showSellingPrice) && (priceVal > 0 || mrpVal > 0)) {
    if (config.showMrp && config.showSellingPrice) {
      if (mrpVal > priceVal) {
        priceHtml = `
          <span class="price-mrp" style="text-decoration: line-through !important; color: #444444 !important; font-weight: 700 !important; white-space: nowrap !important; font-size: ${isCompact25 ? '6.5pt' : '7pt'} !important;">MRP: ₹${mrpVal.toFixed(2)}</span>
          <span class="price-selling" style="font-weight: 900 !important; color: #000000 !important; white-space: nowrap !important; font-size: ${isCompact25 ? '7.5pt' : '8pt'} !important;">Our Price: ₹${priceVal.toFixed(2)}</span>
        `;
      } else {
        const label = (prices.hasValidMrp && !prices.hasValidSalePrice) ? 'MRP: ' : 'Price: ';
        priceHtml = `
          <span class="price-selling" style="font-weight: 900 !important; color: #000000 !important; white-space: nowrap !important; font-size: ${isCompact25 ? '7.5pt' : '8pt'} !important;">${label}₹${priceVal.toFixed(2)}</span>
        `;
      }
    } else if (config.showSellingPrice) {
      const label = (prices.hasValidMrp && !prices.hasValidSalePrice) ? 'MRP: ' : 'Our Price: ';
      priceHtml = `
        <span class="price-selling" style="font-weight: 900 !important; color: #000000 !important; white-space: nowrap !important; font-size: ${isCompact25 ? '7.5pt' : '8pt'} !important;">${label}₹${priceVal.toFixed(2)}</span>
      `;
    } else {
      priceHtml = `
        <span class="price-selling" style="font-weight: 900 !important; color: #000000 !important; white-space: nowrap !important; font-size: ${isCompact25 ? '7.5pt' : '8pt'} !important;">MRP: ₹${mrpVal.toFixed(2)}</span>
      `;
    }
  }

  const shopHtml = (shopFit && shopFit.lines.length > 0) ? `
    <div class="field-shop" style="font-size: ${shopFit.fontSizePt}pt !important; font-weight: 900 !important; text-transform: uppercase !important; letter-spacing: 0.2px !important; width: 100% !important; line-height: 1.1 !important; text-align: center !important; overflow: hidden !important; white-space: nowrap !important;">
      ${shopFit.lines[0]}
    </div>
  ` : '';

  const addressHtml = (fittedAddressLines.length > 0) ? `
    <div class="field-address" style="font-size: ${isCompact25 ? '6pt' : '6.5pt'} !important; font-weight: 500 !important; color: #333333 !important; width: 100% !important; line-height: 1.1 !important; text-align: center !important; overflow: hidden !important;">
      ${fittedAddressLines.map(line => `<div class="address-line">${line}</div>`).join('')}
    </div>
  ` : '';

  const productHtml = (prodFit && prodFit.lines.length > 0) ? `
    <div class="field-product" style="font-size: ${prodFit.fontSizePt}pt !important; font-weight: 800 !important; width: 100% !important; line-height: 1.15 !important; overflow: hidden !important; text-align: center !important;">
      ${prodFit.lines.map(l => `<div class="product-line" style="white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">${l}</div>`).join('')}
    </div>
  ` : '';

  const weightHtml = (weightFit && weightFit.lines.length > 0) ? `
    <div class="field-weight-row" style="font-size: ${weightFit.fontSizePt}pt !important; font-weight: 700 !important; line-height: 1.1 !important; width: 100% !important; text-align: center !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
      ${weightFit.lines[0]}
    </div>
  ` : '';

  const variantHtml = (variantFit && variantFit.lines.length > 0) ? `
    <div class="field-variant-row" style="font-size: ${variantFit.fontSizePt}pt !important; font-weight: 600 !important; color: #1e293b !important; line-height: 1.1 !important; width: 100% !important; text-align: center !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important;">
      ${variantFit.lines[0]}
    </div>
  ` : '';

  const dateHtml = (dateFit && dateFit.lines.length > 0) ? `
    <div class="field-date-row" style="font-size: ${dateFit.fontSizePt}pt !important; font-weight: 600 !important; color: #222222 !important; line-height: 1.1 !important; width: 100% !important; text-align: center !important; white-space: nowrap !important; overflow: hidden !important;">
      ${dateFit.lines[0]}
    </div>
  ` : '';

  const barcodeHtml = (config.showBarcode && barcodeSvg) ? `
    <div class="field-barcode" style="width: 100% !important; display: flex !important; justify-content: center !important; align-items: center !important; flex-shrink: 0 !important; margin-top: auto !important; padding-top: 0.4mm !important; overflow: hidden !important;">
      ${barcodeSvg}
    </div>
  ` : '';

  return `
    <div class="sticker-card sticker-${config.size}" style="width: ${sizeDef.width}mm !important; height: ${sizeDef.height}mm !important; font-family: ${fontFamilyCss} !important;">
      <div class="sticker-inner" style="width: 100% !important; height: 100% !important; padding: ${Math.min(safePadding, 1.8)}mm ${safePadding}mm !important; font-family: ${fontFamilyCss} !important; display: flex !important; flex-direction: column !important; justify-content: flex-start !important; align-items: center !important; text-align: center !important; gap: 0.5mm !important; box-sizing: border-box !important; overflow: hidden !important;">
        ${shopHtml}
        ${addressHtml}
        ${productHtml}
        ${weightHtml}
        ${variantHtml}
        ${priceHtml ? `<div class="field-price-row" style="display: flex !important; flex-wrap: wrap !important; justify-content: center !important; align-items: center !important; column-gap: 1.5mm !important; row-gap: 0.2mm !important; width: 100% !important; line-height: 1.15 !important; text-align: center !important;">${priceHtml}</div>` : ''}
        ${dateHtml}
        ${barcodeHtml}
      </div>
    </div>
  `;
}

/**
 * Render a single calibration label with edge boundaries, inner safe padding box, centre line, and diagnostic info
 */
export function renderCalibrationStickerHtml(labelPos, sizeDef, config) {
  const rot = getEffectiveRotation(config);
  const offX = parseFloat(config?.offsetXmm) || 0;
  const offY = parseFloat(config?.offsetYmm) || 0;
  const driverLeftComp = parseFloat(config?.driverLeftMarginMm) || 0;
  const totalLeftOffset = offX + driverLeftComp;
  const gapMm = parseFloat(config?.spacingMm) || 3;
  const safePadding = parseFloat(config?.safePaddingMm !== undefined ? config.safePaddingMm : 2.5) || 2.5;
  const usableWidth = (sizeDef.width - 2 * safePadding).toFixed(1);
  const usableHeight = (sizeDef.height - 2 * safePadding).toFixed(1);

  return `
    <div class="sticker-card calibration-card" style="width: ${sizeDef.width}mm !important; height: ${sizeDef.height}mm !important; border: 0.3mm solid #000000 !important; box-sizing: border-box !important; position: relative !important; overflow: hidden !important; background: #ffffff !important; color: #000000 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace !important; text-align: center !important;">
      <!-- INNER SAFE PADDING BOX (DASHED BLUE) -->
      <div style="position: absolute; top: ${safePadding}mm; left: ${safePadding}mm; width: ${usableWidth}mm; height: ${usableHeight}mm; border: 0.2mm dashed #0284c7; box-sizing: border-box; pointer-events: none; z-index: 1;"></div>

      <!-- TOP ARROW MARKER -->
      <div style="position: absolute; top: 0.8mm; left: 0; width: 100%; text-align: center; font-size: 7.5pt; font-weight: 900; letter-spacing: 0.5px; line-height: 1;">
        ▲▲ TOP OF LABEL ▲▲
      </div>

      <!-- CENTER DIAGNOSTICS & ALIGNMENT BOX -->
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; text-align: center; z-index: 2; background: rgba(255,255,255,0.95); padding: 1mm 1.5mm; border: 0.2mm solid #000;">
        <div style="display: inline-block; border: 0.3mm solid #000; padding: 0.6mm 2mm; font-size: 9.5pt; font-weight: 900; background: #fff; margin-bottom: 0.6mm;">
          ${labelPos}
        </div>
        <div style="font-size: 7.5pt; font-weight: 800; line-height: 1.15;">
          ${sizeDef.width}×${sizeDef.height} mm | Gap: ${gapMm}mm
        </div>
        <div style="font-size: 6.5pt; font-weight: 700; color: #1e293b; margin-top: 0.4mm;">
          Offsets: X=${offX}mm (Total: ${totalLeftOffset}mm) | Y=${offY}mm
        </div>
        <div style="font-size: 5.5pt; color: #475569; margin-top: 0.4mm; line-height: 1.1;">
          Outer Box: Die-Cut Edge (0.3mm)<br/>
          Dashed Box: ${safePadding}mm Safe Area (${usableWidth}×${usableHeight}mm)
        </div>
      </div>

      <!-- ALIGNMENT CROSSHAIRS -->
      <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 0.2mm; background: #94a3b8; z-index: 1;"></div>
      <div style="position: absolute; top: 0; left: 50%; width: 0.2mm; height: 100%; background: #94a3b8; z-index: 1;"></div>

      <!-- FEED DIRECTION MARKER -->
      <div style="position: absolute; bottom: 0.8mm; left: 0; width: 100%; text-align: center; font-size: 7pt; font-weight: 900; letter-spacing: 0.5px; line-height: 1;">
        ▼▼ FEED DIRECTION ▼▼
      </div>
    </div>
  `;
}

/**
 * Build a full HTML document for printing a single calibration row
 */
export function buildCalibrationPrintDocument(config, shopData = {}) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const is2Row = parseInt(config.rows, 10) === 2;
  const cols = is2Row ? 2 : 1;
  const gapMm = cols === 2 ? (parseFloat(config.spacingMm) || 3) : 0;
  const labelW = sizeDef.width;
  const labelH = sizeDef.height;
  const pageW = cols * labelW + (cols - 1) * gapMm;
  const pageH = labelH;

  const offX = parseFloat(config?.offsetXmm) || 0;
  const offY = parseFloat(config?.offsetYmm) || 0;
  const driverLeftComp = parseFloat(config?.driverLeftMarginMm) || 0;
  const totalLeftOffset = offX + driverLeftComp;
  const totalTopOffset = offY;

  const cell1Left = totalLeftOffset;
  const cell2Left = totalLeftOffset + labelW + gapMm;
  const cellTop = totalTopOffset;

  const rot = getEffectiveRotation(config);
  const rotInfo = getRotationTransform(rot, pageW, pageH, 0, 0);
  const printPageW = rotInfo.pageWidthMm;
  const printPageH = rotInfo.pageHeightMm;

  const leftLabelHtml = renderCalibrationStickerHtml(is2Row ? 'LEFT LABEL' : 'LABEL 1', sizeDef, config);
  const rightLabelHtml = is2Row ? renderCalibrationStickerHtml('RIGHT LABEL', sizeDef, config) : '';

  const sheetTransform = rotInfo.sheetTransform || 'none';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title> </title>
  <style>
    @page {
      size: ${printPageW}mm ${printPageH}mm;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${printPageW}mm !important;
      height: ${printPageH}mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
      overflow: hidden !important;
    }
    .sheet-page {
      width: ${printPageW}mm !important;
      height: ${printPageH}mm !important;
      max-height: ${printPageH}mm !important;
      position: relative !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      page-break-after: auto !important;
      break-after: auto !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
    }
    .sheet {
      width: ${pageW}mm !important;
      height: ${pageH}mm !important;
      max-height: ${pageH}mm !important;
      position: relative !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      ${sheetTransform !== 'none' ? `transform: ${sheetTransform} !important;` : ''}
    }
    .sticker-cell {
      position: absolute !important;
      width: ${labelW}mm !important;
      height: ${labelH}mm !important;
      max-height: ${labelH}mm !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .sticker-cell-1 {
      left: ${cell1Left}mm !important;
      top: ${cellTop}mm !important;
    }
    .sticker-cell-2 {
      left: ${cell2Left}mm !important;
      top: ${cellTop}mm !important;
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important;">
  <div class="sheet-page last-page">
    <div class="sheet">
      <div class="sticker-cell sticker-cell-1">
        ${leftLabelHtml}
      </div>
      ${is2Row ? `
        <div class="sticker-cell sticker-cell-2">
          ${rightLabelHtml}
        </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate full print-ready HTML page with CSS @page rules for roll printing
 * @param {Array} items - List of items with .quantity specified
 * @param {object} config - Sticker configuration
 * @param {object} shopData - Store details
 * @returns {string} Full HTML document
 */
export function buildStickerPrintDocument(items, config, shopData = {}) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const is2Row = parseInt(config.rows, 10) === 2;
  const cols = is2Row ? 2 : 1;
  const gapMm = cols === 2 ? (parseFloat(config.spacingMm) || 3) : 0;

  // Flatten items by quantity to get individual sticker instances
  const stickersList = [];
  items.forEach((item) => {
    const count = Math.max(1, parseInt(item.printQty || item.quantity || 1, 10));
    for (let i = 0; i < count; i++) {
      stickersList.push(item);
    }
  });

  const labelW = sizeDef.width;
  const labelH = sizeDef.height;
  const pageW = cols * labelW + (cols - 1) * gapMm;
  const pageH = labelH;

  const offX = parseFloat(config?.offsetXmm) || 0;
  const offY = parseFloat(config?.offsetYmm) || 0;
  const driverLeftComp = parseFloat(config?.driverLeftMarginMm) || 0;
  const totalLeftOffset = offX + driverLeftComp;
  const totalTopOffset = offY;

  const cell1Left = totalLeftOffset;
  const cell2Left = totalLeftOffset + labelW + gapMm;
  const cellTop = totalTopOffset;

  const rot = getEffectiveRotation(config);
  const rotInfo = getRotationTransform(rot, pageW, pageH, 0, 0);
  const printPageW = rotInfo.pageWidthMm;
  const printPageH = rotInfo.pageHeightMm;

  // Build rows: if 2-row, group in pairs of 2
  const rows = [];
  if (is2Row) {
    for (let i = 0; i < stickersList.length; i += 2) {
      rows.push([stickersList[i], stickersList[i + 1] || null]);
    }
  } else {
    stickersList.forEach((it) => rows.push([it]));
  }

  const sheetTransform = rotInfo.sheetTransform || 'none';
  const fontFamilyCss = getFontFamilyCss(config.fontFamily);
  const safePadding = parseFloat(config?.safePaddingMm !== undefined ? config.safePaddingMm : 2.5) || 2.5;

  const rowsHtml = rows.map((pair, idx) => {
    const isLastRow = idx === rows.length - 1;
    const leftHtml = renderSingleStickerHtml(pair[0], config, shopData);
    const rightHtml = pair[1]
      ? renderSingleStickerHtml(pair[1], config, shopData)
      : (is2Row ? `<div class="sticker-card sticker-empty" style="width: ${labelW}mm !important; height: ${labelH}mm !important; visibility: hidden !important;"></div>` : '');

    return `
      <div class="sheet-page ${isLastRow ? 'last-page' : ''}">
        <div class="sheet" style="${sheetTransform !== 'none' ? `transform: ${sheetTransform} !important;` : ''}">
          <div class="sticker-cell sticker-cell-1" style="position: absolute !important; left: ${cell1Left}mm !important; top: ${cellTop}mm !important; width: ${labelW}mm !important; height: ${labelH}mm !important; box-sizing: border-box !important; overflow: hidden !important;">
            ${leftHtml}
          </div>
          ${is2Row ? `
            <div class="sticker-cell sticker-cell-2 ${!pair[1] ? 'sticker-cell-empty' : ''}" style="position: absolute !important; left: ${cell2Left}mm !important; top: ${cellTop}mm !important; width: ${labelW}mm !important; height: ${labelH}mm !important; box-sizing: border-box !important; overflow: hidden !important; ${!pair[1] ? 'visibility: hidden !important;' : ''}">
              ${rightHtml}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title> </title>
  <link rel="stylesheet" href="/fonts/stickerFonts.css">
  <style>
    @page {
      size: ${printPageW}mm ${printPageH}mm;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${printPageW}mm !important;
      height: ${printPageH}mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: ${fontFamilyCss} !important;
      overflow: hidden !important;
    }
    .sheet-page {
      width: ${printPageW}mm !important;
      height: ${printPageH}mm !important;
      max-height: ${printPageH}mm !important;
      position: relative !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
    }
    .sheet-page.last-page,
    .sheet-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .sheet {
      width: ${pageW}mm !important;
      height: ${pageH}mm !important;
      max-height: ${pageH}mm !important;
      position: relative !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }
    .sticker-cell {
      position: absolute !important;
      width: ${labelW}mm !important;
      height: ${labelH}mm !important;
      max-height: ${labelH}mm !important;
      background: #ffffff !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .sticker-cell-empty {
      visibility: hidden !important;
    }
    .sticker-card {
      width: ${labelW}mm !important;
      height: ${labelH}mm !important;
      max-height: ${labelH}mm !important;
      position: relative !important;
      background: #ffffff !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      font-family: ${fontFamilyCss} !important;
    }
    .sticker-inner {
      width: 100% !important;
      height: 100% !important;
      max-height: 100% !important;
      padding: ${Math.min(safePadding, 1.8)}mm ${safePadding}mm !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: flex-start !important;
      align-items: center !important;
      text-align: center !important;
      gap: 0.5mm !important;
      overflow: hidden !important;
      font-family: ${fontFamilyCss} !important;
    }
  </style>
</head>
<body style="margin: 0 !important; padding: 0 !important;">
  ${rowsHtml}
</body>
</html>`;
}

/**
 * Convert a Uint8Array buffer into a standard Base64 string without stack overflow
 */
export function uint8ArrayToBase64(uint8) {
  let binary = '';
  const len = uint8.length;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = uint8.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

/**
 * Renders the text portion of a sticker (store name, product name, weight, MRP, price, Mfg date)
 * onto a 1-bit monochrome offscreen canvas at the exact printer DPI and coordinates,
 * with no anti-aliasing grey (50% luminance threshold).
 * Returns { widthInBytes, heightDots, binaryBytes }
 */
export function renderStickerTextCanvasBitmap(item, config, shopData, widthDots, heightDots, dpmm, dpi, fontFamilyCss) {
  if (typeof document === 'undefined') {
    return null;
  }

  const widthInBytes = Math.ceil(widthDots / 8);
  const canvasWidth = widthInBytes * 8; // Align strictly to 8-dot byte boundary
  const canvasHeight = Math.max(1, Math.round(heightDots));

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // 1. Fill pure white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 2. Resolve text content
  const shopName = (config.customShopName || shopData.restaurant_name || shopData.name || 'ARISO RETAIL').trim();
  const rawAddress = (config.customAddress || shopData.address || shopData.store_address || shopData.restaurant_address || '').trim();
  const addressLines = formatStickerAddress(rawAddress, heightDots < 200 ? 1 : 2);
  const productName = resolveStickerProductName(item, config);

  const prices = resolveStickerPrices(item, config);
  const priceVal = prices.salePrice;
  const mrpVal = prices.mrp;

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const rawMfg = config.defaultMfgDate;
  const mfgDate = rawMfg ? formatIsoToDisplayDate(rawMfg) : todayStr;
  const expDate = config.defaultExpDate ? formatIsoToDisplayDate(config.defaultExpDate) : '';

  const hasWeight = config.printWeight && config.weightValue;
  const weightText = hasWeight ? `Wt: ${config.weightValue} ${config.weightUnit || 'g'}` : '';

  const itemSize = resolveItemSize(item, config);
  const itemColor = resolveItemColor(item, config);
  const itemWeight = resolveItemWeight(item, config);
  const showSize = !!config.showSize && !!itemSize;
  const showColor = !!config.showColor && !!itemColor;
  const showWeight = !!config.showWeight && !!itemWeight && !hasWeight;
  const displaySize = showSize ? (/^size:\s*/i.test(itemSize) ? itemSize : `Size: ${itemSize}`) : '';
  const displayColor = showColor ? (/^color:\s*/i.test(itemColor) ? itemColor : `Color: ${itemColor}`) : '';
  const displayWeight = showWeight ? (/^(wt|weight|qty|net\s*wt):\s*/i.test(itemWeight) ? itemWeight : `Net Wt: ${itemWeight}`) : '';
  const variantParts = [displayWeight, displaySize, displayColor].filter(Boolean);
  const variantLine = variantParts.join(' • ');

  // Compute font sizes in dots based on DPI and available height
  const scale = dpi === 300 ? 1.48 : 1.0;
  const isCompact = canvasHeight <= 140; // 50x25 mm

  let shopFontSize = Math.round((isCompact ? 16 : 20) * scale);
  let addrFontSize = Math.round((isCompact ? 12 : 14) * scale);
  let prodFontSize = Math.round((isCompact ? 18 : 22) * scale);
  let weightFontSize = Math.round((isCompact ? 15 : 18) * scale);
  let mrpFontSize = Math.round((isCompact ? 14 : 17) * scale);
  let priceFontSize = Math.round((isCompact ? 18 : 22) * scale);
  let dateFontSize = Math.round((isCompact ? 13 : 15) * scale);

  // Helper to wrap text into lines fitting within canvasWidth - 4
  const wrapText = (text, fontSize, isBold, maxLines = 2) => {
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px ${fontFamilyCss}`;
    const maxW = canvasWidth - 4;
    const words = text.split(/\s+/);
    const lines = [];
    let curLine = '';
    for (const w of words) {
      const test = curLine ? `${curLine} ${w}` : w;
      if (ctx.measureText(test).width <= maxW) {
        curLine = test;
      } else {
        if (curLine) lines.push(curLine);
        curLine = w;
        if (lines.length === maxLines - 1) break;
      }
    }
    if (curLine && lines.length < maxLines) {
      let last = curLine;
      if (ctx.measureText(last).width > maxW) {
        while (last.length > 3 && ctx.measureText(last + '...').width > maxW) {
          last = last.slice(0, -1);
        }
        last += '...';
      }
      lines.push(last);
    }
    return lines;
  };

  // Build list of display items
  const itemsToRender = [];

  // 1. Shop Name
  if (config.showShopName && shopName) {
    itemsToRender.push({
      type: 'shop',
      lines: wrapText(shopName, shopFontSize, true, 1),
      fontSize: shopFontSize,
      isBold: true,
      lineH: Math.round(shopFontSize * 1.15)
    });
  }

  // 2. Shop Address (only if tall enough)
  if (config.showAddress && addressLines.length > 0 && !isCompact && canvasHeight >= 220) {
    itemsToRender.push({
      type: 'address',
      lines: addressLines.slice(0, 1),
      fontSize: addrFontSize,
      isBold: false,
      lineH: Math.round(addrFontSize * 1.15)
    });
  }

  // 3. Product Name (1-2 lines)
  if (config.showProductName && productName) {
    const prodLines = wrapText(productName, prodFontSize, true, isCompact ? 1 : 2);
    itemsToRender.push({
      type: 'product',
      lines: prodLines,
      fontSize: prodFontSize,
      isBold: true,
      lineH: Math.round(prodFontSize * 1.15)
    });
  }

  // 4. Weight line (if checked)
  if (hasWeight) {
    itemsToRender.push({
      type: 'weight',
      lines: [weightText],
      fontSize: weightFontSize,
      isBold: true,
      lineH: Math.round(weightFontSize * 1.15)
    });
  } else if (variantLine && !isCompact) {
    itemsToRender.push({
      type: 'variant',
      lines: [variantLine],
      fontSize: Math.round(14 * scale),
      isBold: false,
      lineH: Math.round(16 * scale)
    });
  }

  // 5. MRP & Price
  const showMrp = config.showMrp && mrpVal > priceVal;
  const showPrice = config.showSellingPrice && priceVal > 0;

  if (showMrp && showPrice) {
    if (isCompact) {
      itemsToRender.push({
        type: 'comboPrice',
        mrpStr: `MRP: ₹${mrpVal.toFixed(0)}`,
        priceStr: `Price: ₹${priceVal.toFixed(0)}`,
        fontSize: priceFontSize,
        isBold: true,
        lineH: Math.round(priceFontSize * 1.2)
      });
    } else {
      itemsToRender.push({
        type: 'mrp',
        text: `MRP: ₹${mrpVal.toFixed(2)}`,
        fontSize: mrpFontSize,
        isBold: false,
        lineH: Math.round(mrpFontSize * 1.15)
      });
      itemsToRender.push({
        type: 'price',
        text: `Our Price: ₹${priceVal.toFixed(2)}`,
        fontSize: priceFontSize,
        isBold: true,
        lineH: Math.round(priceFontSize * 1.2)
      });
    }
  } else if (showPrice) {
    itemsToRender.push({
      type: 'price',
      text: `Price: ₹${priceVal.toFixed(2)}`,
      fontSize: priceFontSize,
      isBold: true,
      lineH: Math.round(priceFontSize * 1.2)
    });
  } else if (showMrp) {
    itemsToRender.push({
      type: 'price',
      text: `MRP: ₹${mrpVal.toFixed(2)}`,
      fontSize: priceFontSize,
      isBold: true,
      lineH: Math.round(priceFontSize * 1.2)
    });
  }

  // 6. Mfg / Exp Date
  const dateParts = [];
  if (config.showMfgDate && mfgDate) dateParts.push(`Mfg: ${mfgDate}`);
  if (config.showExpDate && expDate) dateParts.push(`Exp: ${expDate}`);
  if (dateParts.length > 0) {
    itemsToRender.push({
      type: 'date',
      lines: [dateParts.join('  ')],
      fontSize: dateFontSize,
      isBold: false,
      lineH: Math.round(dateFontSize * 1.15)
    });
  }

  // Calculate total height of all items
  let totalHeight = 0;
  itemsToRender.forEach(it => {
    if (it.lines) {
      totalHeight += it.lines.length * it.lineH;
    } else {
      totalHeight += it.lineH;
    }
  });

  // Dynamic vertical scaling if totalHeight exceeds canvasHeight
  let fitRatio = 1.0;
  if (totalHeight > canvasHeight - 8) {
    fitRatio = Math.max(0.65, (canvasHeight - 8) / totalHeight);
  }

  const verticalSpacing = Math.max(1, Math.floor((canvasHeight - (totalHeight * fitRatio)) / (itemsToRender.length + 1)));
  let curY = verticalSpacing;

  // Render elements onto canvas
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  itemsToRender.forEach(it => {
    const fSize = Math.max(10, Math.round(it.fontSize * fitRatio));
    const lH = Math.max(11, Math.round(it.lineH * fitRatio));
    ctx.font = `${it.isBold ? 'bold ' : ''}${fSize}px ${fontFamilyCss}`;

    if (it.type === 'mrp') {
      const textW = ctx.measureText(it.text).width;
      const x = Math.max(0, Math.round((canvasWidth - textW) / 2));
      ctx.fillText(it.text, x, curY);
      // Draw strike-through line
      const strikeY = curY + Math.round(fSize * 0.55);
      const strikeThick = Math.max(1, Math.round(1.5 * scale));
      ctx.fillRect(x - 2, strikeY, textW + 4, strikeThick);
      curY += lH + verticalSpacing;
    } else if (it.type === 'comboPrice') {
      const mrpMeasure = ctx.measureText(it.mrpStr).width;
      const priceMeasure = ctx.measureText(it.priceStr).width;
      const totalW = mrpMeasure + 10 + priceMeasure;
      const startX = Math.max(0, Math.round((canvasWidth - totalW) / 2));

      // Draw MRP with strikethrough
      ctx.font = `${fSize - 2}px ${fontFamilyCss}`;
      ctx.fillText(it.mrpStr, startX, curY);
      const strikeY = curY + Math.round((fSize - 2) * 0.55);
      ctx.fillRect(startX - 1, strikeY, mrpMeasure + 2, Math.max(1, Math.round(1.5 * scale)));

      // Draw Price
      ctx.font = `bold ${fSize}px ${fontFamilyCss}`;
      ctx.fillText(it.priceStr, startX + mrpMeasure + 10, curY);
      curY += lH + verticalSpacing;
    } else if (it.type === 'price') {
      const textW = ctx.measureText(it.text).width;
      const x = Math.max(0, Math.round((canvasWidth - textW) / 2));
      ctx.fillText(it.text, x, curY);
      curY += lH + verticalSpacing;
    } else if (it.lines) {
      it.lines.forEach(line => {
        const textW = ctx.measureText(line).width;
        const x = Math.max(0, Math.round((canvasWidth - textW) / 2));
        ctx.fillText(line, x, curY);
        curY += lH;
      });
      curY += verticalSpacing;
    }
  });

  // 3. Pixel thresholding to 1-bit monochrome Uint8Array (no anti-aliasing grey, 50% luminance threshold)
  // TSPL BITMAP Polarity (mode 0 OVERWRITE):
  // Bit 1 = no dot (plain white unprinted background)
  // Bit 0 = burn dot (black text and strikethrough lines)
  const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const pixels = imgData.data;
  const binaryBytes = new Uint8Array(widthInBytes * canvasHeight);

  for (let y = 0; y < canvasHeight; y++) {
    const rowOffset = y * widthInBytes;
    const pxRowOffset = y * canvasWidth * 4;
    for (let byteX = 0; byteX < widthInBytes; byteX++) {
      let byteVal = 0xFF; // In TSPL: 1 = no dot (plain white unprinted background)
      const pxBase = pxRowOffset + byteX * 32;
      for (let bit = 0; bit < 8; bit++) {
        const p = pxBase + bit * 4;
        const r = pixels[p];
        const g = pixels[p + 1];
        const b = pixels[p + 2];
        const a = pixels[p + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Dark pixels (text, strikethrough line) -> clear bit to 0 (burn dot)
        if (a >= 128 && lum < 128) {
          byteVal &= ~(1 << (7 - bit));
        }
      }
      binaryBytes[rowOffset + byteX] = byteVal;
    }
  }

  return {
    widthInBytes,
    heightDots: canvasHeight,
    binaryBytes
  };
}

/**
 * Generate TSPL2 command payload for thermal barcode printers (TSC TE244, etc.)
 * Supports:
 * - Direct TSPL 1-bit monochrome canvas bitmap rendering for all text in selected font & language
 * - Native TSPL Code 128 BARCODE command with auto-subset selection
 * - 50x25mm, 38x38mm, 38x50mm labels in 1-Row and 2-Row twin roll feed
 * - High-speed caching of converted bitmaps per label design
 * - Configurable SPEED and DENSITY
 */
export async function buildTsplStickerPayload(items, config, shopData = {}) {
  // Preload and verify selected font family before rendering bitmap
  if (config?.fontFamily) {
    await ensureStickerFontLoaded(config.fontFamily);
  }

  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const w = sizeDef.width;
  const h = sizeDef.height;
  const is2Row = parseInt(config.rows, 10) === 2;
  const g = parseFloat(config.spacingMm) || 3;
  const dpi = parseInt(config.dpi, 10) || 203;
  const dpmm = dpi === 300 ? (300 / 25.4) : 8;

  // Flatten items list by print quantity
  const stickersList = [];
  items.forEach((item) => {
    const count = Math.max(1, parseInt(item.printQty || item.quantity || 1, 10));
    for (let i = 0; i < count; i++) {
      stickersList.push(item);
    }
  });

  if (stickersList.length === 0) {
    const emptyRes = { tsplPayload: '', b64Payload: '', rawBytes: new Uint8Array(0), warnings: [] };
    emptyRes.toString = () => '';
    return emptyRes;
  }

  const rollWidthMm = is2Row ? (w * 2 + g) : w;
  const cellWidthDots = Math.round(w * dpmm);
  const cellHeightDots = Math.round(h * dpmm);
  const gapDots = Math.round(g * dpmm);

  // Safe inner margin: 2mm (16 dots at 203 DPI, 24 dots at 300 DPI)
  const marginDots = Math.max(Math.round(2 * dpmm), 16);
  const usableDots = cellWidthDots - (marginDots * 2);
  const usableHeightDots = cellHeightDots - (marginDots * 2);

  const tsplDir = (config.tsplDirection !== undefined && config.tsplDirection !== null)
    ? parseInt(config.tsplDirection, 10)
    : 0;

  const totalLeftOffsetMm = (parseFloat(config.offsetXmm) || 0) + (parseFloat(config.driverLeftMarginMm) || 0);
  const offXDots = Math.round(totalLeftOffsetMm * dpmm);
  const offYDots = Math.round((parseFloat(config.offsetYmm) || 0) * dpmm);

  const cell1X = offXDots;
  const cell2X = offXDots + cellWidthDots + gapDots;

  const speed = config.speed || 4;
  const density = config.density || 8;

  const headerText = [
    `SIZE ${rollWidthMm} mm, ${h} mm`,
    `GAP ${g} mm, 0 mm`,
    `SPEED ${speed}`,
    `DENSITY ${density}`,
    `DIRECTION ${tsplDir}`,
    `REFERENCE 0,0`,
    `OFFSET 0 mm`,
    `SET PEEL OFF`,
    `SET CUTTER OFF`,
    `SET TEAR ON`,
    `SET PAUSE OFF\r\n`
  ].join('\r\n');

  const warnings = [];
  const fontFamilyCss = getFontFamilyCss(config.fontFamily);

  // Barcode dimensions & Code 128 calculations
  const minNarrow = dpi === 300 ? 3 : 2;
  const quietZoneModules = 20; // 10 modules on each side

  let barH = Math.round(8.5 * dpmm);
  if (h <= 25) {
    barH = Math.round(6.5 * dpmm);
  } else if (h <= 38) {
    barH = Math.round(7.5 * dpmm);
  }

  const gapBarText = Math.round(1.5 * dpmm);
  const hrFont = dpi === 300 ? { id: '2', charW: 16, charH: 22 } : { id: '2', charW: 12, charH: 20 };
  const hrFontH = hrFont.charH;
  const barcodeAreaH = config.showBarcode ? (barH + gapBarText + hrFontH) : 0;

  const textAreaHeightDots = Math.max(1, usableHeightDots - (barcodeAreaH ? (barcodeAreaH + Math.round(2 * dpmm)) : 0));
  const textCanvasY = offYDots + marginDots;
  const barY = offYDots + marginDots + textAreaHeightDots + Math.round(2 * dpmm);
  const hrY = barY + barH + gapBarText;

  // Bitmap Cache: Render each unique item text canvas once
  const bitmapCache = new Map();

  const getOrRenderBitmap = (item) => {
    if (!item) return null;
    const itemKey = [
      item.id || item.sku || item.name,
      resolveStickerProductName(item, config),
      item.price || '',
      item.mrp || '',
      config.fontFamily,
      config.printWeight ? `${config.weightValue}_${config.weightUnit}` : 'nowt',
      config.size,
      dpi
    ].join('::');

    if (bitmapCache.has(itemKey)) {
      return bitmapCache.get(itemKey);
    }

    const bmp = renderStickerTextCanvasBitmap(
      item,
      config,
      shopData,
      usableDots,
      textAreaHeightDots,
      dpmm,
      dpi,
      fontFamilyCss
    );

    bitmapCache.set(itemKey, bmp);
    return bmp;
  };

  // Helper to compute barcode commands for a label cell
  const buildBarcodeCommands = (item, cellOriginX) => {
    const cmds = [];
    if (!item || !config.showBarcode) return cmds;

    const barcodeValue = String(item.barcode || item.sku || ('PRD' + (item.id || '001'))).trim().replace(/[^\x20-\x7E]/g, '');
    const isAllDigits = /^\d+$/.test(barcodeValue) && barcodeValue.length >= 4;
    const charCount = isAllDigits ? Math.ceil(barcodeValue.length / 2) : barcodeValue.length;
    const modules = 11 * (charCount + 2) + 2;

    let narrow = minNarrow;
    if ((modules + quietZoneModules) * (minNarrow + 1) <= usableDots) {
      narrow = minNarrow + 1;
    }

    const barcodeW = modules * narrow;
    if (barcodeW + (quietZoneModules * minNarrow) > usableDots) {
      warnings.push(`Barcode "${barcodeValue}" is too long for ${w}x${h}mm label safe area.`);
    }

    const wide = narrow * 2;
    const barX = Math.max(0, cellOriginX + marginDots + Math.round((usableDots - barcodeW) / 2));
    const hrTextW = barcodeValue.length * hrFont.charW;
    const hrX = Math.max(0, cellOriginX + marginDots + Math.round((usableDots - hrTextW) / 2));

    cmds.push(`BARCODE ${barX},${barY},"128",${barH},0,0,${narrow},${wide},"${barcodeValue}"`);
    cmds.push(`TEXT ${hrX},${hrY},"${hrFont.id}",0,1,1,"${barcodeValue}"`);

    return cmds;
  };

  // Assemble binary command stream
  const chunks = [];
  const enc = new TextEncoder();
  chunks.push(enc.encode(headerText));

  // Build row by row
  const appendLabelCommands = (item, cellOriginX) => {
    if (!item) return;

    // 1. Text Canvas Bitmap
    const bmp = getOrRenderBitmap(item);
    if (bmp && bmp.binaryBytes) {
      const bmpHeader = `BITMAP ${cellOriginX + marginDots},${textCanvasY},${bmp.widthInBytes},${bmp.heightDots},0,`;
      chunks.push(enc.encode(bmpHeader));
      chunks.push(bmp.binaryBytes);
      chunks.push(enc.encode('\r\n'));
    }

    // 2. Native Code 128 Barcode & Text
    const barCmds = buildBarcodeCommands(item, cellOriginX);
    if (barCmds.length > 0) {
      chunks.push(enc.encode(barCmds.join('\r\n') + '\r\n'));
    }
  };

  if (is2Row) {
    for (let i = 0; i < stickersList.length; i += 2) {
      const p1 = stickersList[i];
      const p2 = stickersList[i + 1] || null;

      chunks.push(enc.encode('CLS\r\n'));
      if (p1) appendLabelCommands(p1, cell1X);
      if (p2) appendLabelCommands(p2, cell2X);
      chunks.push(enc.encode('PRINT 1,1\r\n'));
    }
  } else {
    for (const item of stickersList) {
      chunks.push(enc.encode('CLS\r\n'));
      appendLabelCommands(item, cell1X);
      chunks.push(enc.encode('PRINT 1,1\r\n'));
    }
  }

  // Combine chunks into single Uint8Array
  let totalByteLength = 0;
  for (const c of chunks) {
    totalByteLength += c.length;
  }

  const combinedBytes = new Uint8Array(totalByteLength);
  let writeOffset = 0;
  for (const c of chunks) {
    combinedBytes.set(c, writeOffset);
    writeOffset += c.length;
  }

  const b64Payload = uint8ArrayToBase64(combinedBytes);

  // Text representation for preview or debug
  const textRepresentation = new TextDecoder('latin1').decode(combinedBytes);

  const resultObj = {
    tsplPayload: textRepresentation,
    b64Payload,
    rawBytes: combinedBytes,
    warnings
  };

  // Enable string coercion for backwards compatibility
  resultObj.toString = () => textRepresentation;
  resultObj[Symbol.toPrimitive] = () => textRepresentation;

  return resultObj;
}

/**
 * Generate native TSPL calibration payload that draws exact cell borders, margins, and diagnostic info
 */
export function buildCalibrationTsplPayload(config = {}, shopData = {}) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const w = sizeDef.width;
  const h = sizeDef.height;
  const is2Row = parseInt(config.rows, 10) === 2;
  const g = parseFloat(config.spacingMm) || 3;
  const dpi = parseInt(config.dpi, 10) || 203;
  const dpmm = dpi === 300 ? (300 / 25.4) : 8;

  const rollWidthMm = is2Row ? (w * 2 + g) : w;
  const cellWidthDots = Math.round(w * dpmm);
  const cellHeightDots = Math.round(h * dpmm);
  const gapDots = Math.round(g * dpmm);

  const marginDots = Math.max(Math.round(2 * dpmm), 16);
  const usableDots = cellWidthDots - (marginDots * 2);
  const usableHeightDots = cellHeightDots - (marginDots * 2);

  const tsplDir = (config.tsplDirection !== undefined && config.tsplDirection !== null)
    ? parseInt(config.tsplDirection, 10)
    : 0;

  const offXDots = Math.round((parseFloat(config.offsetXmm) || 0) * dpmm);
  const offYDots = Math.round((parseFloat(config.offsetYmm) || 0) * dpmm);

  const cell1X = offXDots;
  const cell2X = offXDots + cellWidthDots + gapDots;

  const headerLines = [
    `SIZE ${rollWidthMm} mm, ${h} mm`,
    `GAP ${g} mm, 0 mm`,
    `SPEED 4`,
    `DENSITY 8`,
    `DIRECTION ${tsplDir}`,
    `REFERENCE 0,0`,
    `OFFSET 0 mm`,
    `SET PEEL OFF`,
    `SET CUTTER OFF`,
    `SET TEAR ON`,
    `SET PAUSE OFF`,
    `GAPDETECT`
  ];

  const font = dpi === 300 ? {
    small: { id: '1', charW: 10, charH: 14, lineH: 18 },
    regular: { id: '2', charW: 16, charH: 22, lineH: 26 }
  } : {
    small: { id: '1', charW: 8, charH: 12, lineH: 16 },
    regular: { id: '2', charW: 12, charH: 20, lineH: 24 }
  };

  const centerTextX = (str, charWidth, cellOriginX) => {
    const textLen = (str || '').length;
    const textWidth = textLen * charWidth;
    return Math.max(0, cellOriginX + marginDots + Math.max(0, Math.round((usableDots - textWidth) / 2)));
  };

  const buildCellCalibration = (labelTag, cellOriginX) => {
    const cmds = [];
    const x0 = Math.max(0, cellOriginX);
    const x1 = Math.max(0, cellOriginX + cellWidthDots - 1);
    const y0 = Math.max(0, offYDots);
    const y1 = Math.max(0, offYDots + cellHeightDots - 1);

    // Outer die-cut boundary box (2 dots thick)
    cmds.push(`BOX ${x0},${y0},${x1},${y1},2`);

    // 2mm safe margin guide box (1 dot thin line)
    const mX0 = Math.max(0, cellOriginX + marginDots);
    const mX1 = Math.max(0, cellOriginX + cellWidthDots - marginDots);
    const mY0 = Math.max(0, offYDots + marginDots);
    const mY1 = Math.max(0, offYDots + cellHeightDots - marginDots);
    cmds.push(`BOX ${mX0},${mY0},${mX1},${mY1},1`);

    // Diagnostic text
    let curY = mY0 + Math.round(2 * dpmm);
    const topStr = '▲▲ TOP OF LABEL ▲▲';
    cmds.push(`TEXT ${centerTextX(topStr, font.small.charW, cellOriginX)},${curY},"${font.small.id}",0,1,1,"${topStr}"`);
    curY += font.small.lineH + 4;

    const tagStr = `[ ${labelTag} ]`;
    cmds.push(`TEXT ${centerTextX(tagStr, font.regular.charW, cellOriginX)},${curY},"${font.regular.id}",0,1,1,"${tagStr}"`);
    curY += font.regular.lineH;

    const szStr = `${w}x${h} mm | ${dpi} DPI | X:${config.offsetXmm || 0} Y:${config.offsetYmm || 0}mm`;
    cmds.push(`TEXT ${centerTextX(szStr, font.small.charW, cellOriginX)},${curY},"${font.small.id}",0,1,1,"${szStr}"`);
    curY += font.small.lineH;

    const guide1 = 'Outer Box: Die-Cut Edge';
    const guide2 = 'Inner Box: 2mm Safe Area';
    cmds.push(`TEXT ${centerTextX(guide1, font.small.charW, cellOriginX)},${curY},"${font.small.id}",0,1,1,"${guide1}"`);
    curY += font.small.lineH;
    cmds.push(`TEXT ${centerTextX(guide2, font.small.charW, cellOriginX)},${curY},"${font.small.id}",0,1,1,"${guide2}"`);

    // Alignment Crosshairs
    const midX = cellOriginX + Math.round(cellWidthDots / 2);
    const midY = offYDots + Math.round(cellHeightDots / 2);
    cmds.push(`BAR ${mX0},${midY},${usableDots},1`);
    cmds.push(`BAR ${midX},${mY0},1,${usableHeightDots}`);

    // Bottom Feed Direction
    const btmStr = '▼▼ FEED DIRECTION ▼▼';
    const btmY = mY1 - font.small.charH - 2;
    cmds.push(`TEXT ${centerTextX(btmStr, font.small.charW, cellOriginX)},${btmY},"${font.small.id}",0,1,1,"${btmStr}"`);

    return cmds;
  };

  const allLines = [...headerLines];
  allLines.push('CLS');
  allLines.push(...buildCellCalibration(is2Row ? 'LEFT LABEL' : 'LABEL 1', cell1X));
  if (is2Row) {
    allLines.push(...buildCellCalibration('RIGHT LABEL', cell2X));
  }
  allLines.push('PRINT 1,1');

  return allLines.join('\r\n') + '\r\n';
}

/**
 * Unified cross-platform sticker printer
 * Works in both Web Browser and Windows Electron application
 */
export async function printStickers(items, config, shopData = {}, printerTarget = null, options = {}) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const is2Row = parseInt(config.rows, 10) === 2;
  const gapMm = parseFloat(config.spacingMm) || 3;
  const rollWidthMm = is2Row ? (sizeDef.width * 2 + gapMm) : sizeDef.width;
  const rollHeightMm = sizeDef.height;

  // 1. Electron Desktop Native Direct TSPL Spooler Printing (Fastest, zero-rotation, pixel-perfect 203 DPI)
  if (window.electron && typeof window.electron.printWindowsRaw === 'function' && printerTarget && !options.isCalibration) {
    try {
      const tsplRes = await buildTsplStickerPayload(items, config, shopData);
      if (tsplRes?.b64Payload) {
        const rawRes = await window.electron.printWindowsRaw(printerTarget, tsplRes.b64Payload);
        if (rawRes && rawRes.success !== false) {
          return { success: true, method: 'electron-raw-tspl', printer: printerTarget };
        }
      }
    } catch (rawErr) {
      console.warn('[StickerGenerator] Direct TSPL raw spooler attempt failed, falling back to silent print:', rawErr);
    }
  }

  const htmlContent = options.isCalibration
    ? buildCalibrationPrintDocument(config, shopData)
    : buildStickerPrintDocument(items, config, shopData);

  // 2. Electron Desktop Native Silent / Spooler Printing
  const isElectron = !!(window.electron && (typeof window.electron.printSystemSilent === 'function' || typeof window.electron.printStickers === 'function'));
  if (isElectron) {
    try {
      const rot = getEffectiveRotation(config);
      const rotInfo = getRotationTransform(rot, rollWidthMm, rollHeightMm, 0, 0);
      const widthMicrons = Math.round(rotInfo.pageWidthMm * 1000);
      const heightMicrons = Math.round(rotInfo.pageHeightMm * 1000);

      const printFn = window.electron.printStickers || window.electron.printSystemSilent;
      const res = await printFn(htmlContent, printerTarget, {
        pageSize: { width: widthMicrons, height: heightMicrons },
        landscape: false,
        noCut: true, // Crucial for sticker rolls so the printer cutter doesn't cut every label
        color: false,
        margins: { marginType: 'none' }
      });
      return { success: true, method: 'electron', printer: res?.printer || printerTarget || 'Default' };
    } catch (electronErr) {
      console.warn('[StickerGenerator] Electron direct printing error, falling back to iframe print:', electronErr);
    }
  }

  // 3. Web Browser Fallback: Isolated offscreen print iframe with font readiness check
  return new Promise((resolve, reject) => {
    try {
      // Remove any prior print iframe to avoid stale DOM or document state caching
      const oldIframe = document.getElementById('ariso-sticker-print-iframe');
      if (oldIframe) {
        oldIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'ariso-sticker-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.zIndex = '-9999';
      document.body.appendChild(iframe);

      const originalDocTitle = document.title;
      document.title = ' ';

      const restoreTitle = () => {
        try {
          document.title = originalDocTitle;
        } catch (e) {}
      };

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();
      if (doc) {
        doc.title = ' ';
      }

      if (iframe.contentWindow) {
        iframe.contentWindow.addEventListener('afterprint', restoreTitle);
      }
      window.addEventListener('afterprint', restoreTitle, { once: true });
      setTimeout(restoreTitle, 5000);

      const triggerPrint = async () => {
        try {
          if (doc.fonts && doc.fonts.ready) {
            await doc.fonts.ready;
          }
        } catch (fontErr) {}

        // Settle delay to ensure browser computes crisp SVG vectors and CSS page boxes
        setTimeout(() => {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            resolve({ success: true, method: 'web-iframe' });
          } catch (printErr) {
            console.warn('[StickerGenerator] Iframe print blocked, falling back to window:', printErr);
            try {
              const win = window.open('', '_blank', 'width=800,height=600');
              if (win) {
                win.document.open();
                win.document.write(htmlContent);
                win.document.close();
                win.document.title = ' ';
                setTimeout(() => {
                  win.focus();
                  win.print();
                  resolve({ success: true, method: 'web-window' });
                }, 400);
              } else {
                reject(new Error('Print popup was blocked by browser. Please allow popups for this site.'));
              }
            } catch (winErr) {
              reject(winErr);
            }
          }
        }, 350);
      };

      if (iframe.contentWindow.document.readyState === 'complete') {
        triggerPrint();
      } else {
        iframe.onload = triggerPrint;
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Print a single calibration test row (1 page)
 */
export async function printCalibrationStickers(config, shopData = {}, printerTarget = null) {
  return printStickers([], config, shopData, printerTarget, { isCalibration: true });
}

/**
 * Direct WebUSB thermal printer transmission fallback
 */
export async function printViaWebUsb(rawCommands) {
  if (typeof navigator === 'undefined' || !navigator.usb) {
    throw new Error('WebUSB is not supported in this browser. Please use Google Chrome or Edge.');
  }
  const device = await navigator.usb.requestDevice({ filters: [] });
  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);
  const encoder = new TextEncoder();
  const data = encoder.encode(rawCommands);
  await device.transferOut(1, data);
  await device.close();
  return { success: true, method: 'webusb', deviceName: device.productName || 'USB Thermal Printer' };
}

/**
 * Download raw TSPL/ZPL payload as a .prn file for Windows manual copy/spooler printing
 */
export async function downloadRawTsplFile(payloadOrItems, configOrFilename = 'ariso-labels.prn', shopData = {}) {
  let rawBytes = null;
  let filename = typeof configOrFilename === 'string' ? configOrFilename : 'ariso-labels.prn';

  if (payloadOrItems instanceof Uint8Array) {
    rawBytes = payloadOrItems;
  } else if (payloadOrItems?.rawBytes instanceof Uint8Array) {
    rawBytes = payloadOrItems.rawBytes;
  } else if (typeof payloadOrItems === 'string') {
    rawBytes = new TextEncoder().encode(payloadOrItems);
  } else if (Array.isArray(payloadOrItems)) {
    const res = await buildTsplStickerPayload(payloadOrItems, typeof configOrFilename === 'object' ? configOrFilename : {}, shopData);
    rawBytes = res?.rawBytes || new TextEncoder().encode(res?.tsplPayload || String(res));
  }

  if (!rawBytes || rawBytes.length === 0) return;

  const blob = new Blob([rawBytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
