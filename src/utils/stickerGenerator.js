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
    defaultBarcodeHeight: 28,
    defaultBarcodeWidth: 1.25,
    fontScale: {
      shop: '8.5px',
      address: '7px',
      product: '9.5px',
      variant: '8px',
      price: '9px',
      mrp: '8px',
      date: '7.5px'
    }
  },
  '38x38': {
    id: '38x38',
    name: '38 × 38 mm',
    width: 38,
    height: 38,
    aspect: '1:1 (Square Retail Label)',
    defaultBarcodeHeight: 32,
    defaultBarcodeWidth: 1.15,
    fontScale: {
      shop: '9px',
      address: '7.5px',
      product: '10px',
      variant: '8.5px',
      price: '9.5px',
      mrp: '8.5px',
      date: '8px'
    }
  },
  '38x50': {
    id: '38x50',
    name: '38 × 50 mm',
    width: 38,
    height: 50,
    aspect: '1:1.3 (Portrait Product Label)',
    defaultBarcodeHeight: 40,
    defaultBarcodeWidth: 1.2,
    fontScale: {
      shop: '9.5px',
      address: '8px',
      product: '10.5px',
      variant: '9px',
      price: '10px',
      mrp: '9px',
      date: '8.5px'
    }
  }
};

/**
 * Default sticker template layout configuration
 */
export const DEFAULT_STICKER_CONFIG = {
  size: '50x25',
  rows: 1, // 1 = 1-row roll, 2 = 2-row roll
  spacingMm: 3, // 3 mm standard gap between stickers
  showShopName: true,
  showProductName: true,
  showSize: false,
  showColor: false,
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
  mrpMultiplier: 1.25, // default suggested MRP calculation (125% of selling price if not specified)
  defaultMfgDate: '', // if empty, uses today
  defaultExpDate: ''
};

const STORAGE_KEY = 'ariso_sticker_config';

/**
 * Load persisted sticker configuration from localStorage
 */
export function loadSavedStickerConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STICKER_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STICKER_CONFIG, ...parsed };
  } catch (e) {
    console.warn('[StickerGenerator] Failed to load saved config:', e);
    return { ...DEFAULT_STICKER_CONFIG };
  }
}

/**
 * Save sticker configuration to localStorage
 */
export function saveStickerConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[StickerGenerator] Failed to save config:', e);
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
 * Generate a pure vector SVG Code128 barcode string
 * @param {string} code - The barcode or SKU to encode
 * @param {object} options - Sizing and styling options
 * @returns {string} SVG markup string
 */
export function generateCode128Svg(code, options = {}) {
  if (!code || typeof code !== 'string') {
    code = '000000';
  }
  const cleanCode = code.trim();
  try {
    // Create an in-memory SVG element
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svgNode, cleanCode, {
      format: 'CODE128',
      width: options.width || 1.2,
      height: options.height || 28,
      displayValue: options.displayValue !== false,
      text: options.text || cleanCode,
      font: 'monospace',
      fontOptions: 'bold',
      fontSize: options.fontSize || 9,
      textMargin: 1,
      margin: 0,
      background: 'transparent',
      lineColor: '#000000'
    });
    svgNode.setAttribute('shape-rendering', 'crispEdges');
    svgNode.setAttribute('style', 'max-width: 100%; height: auto; display: block; margin: 0 auto;');
    return new XMLSerializer().serializeToString(svgNode);
  } catch (err) {
    console.warn('[StickerGenerator] Barcode generation warning for code:', cleanCode, err);
    // Fallback: simple text block if barcode code fails Code128 parity
    return `<div style="font-family: monospace; font-size: 10px; font-weight: bold; border: 1px dashed #000; padding: 2px 4px; text-align: center;">${cleanCode}</div>`;
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
export function renderSingleStickerHtml(item, config, shopData = {}) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const fScale = sizeDef.fontScale;

  const shopName = (config.customShopName || shopData.restaurant_name || shopData.name || 'Ariso Retail Store').trim();
  const rawAddress = (config.customAddress || shopData.address || shopData.store_address || shopData.restaurant_address || '').trim();
  const addressLines = formatStickerAddress(rawAddress, 3);
  const productName = (item?.name || item?.item_name || 'Retail Item').trim();

  const prices = resolveStickerPrices(item, config);
  const priceVal = prices.salePrice;
  const mrpVal = prices.mrp;

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const rawMfg = config.defaultMfgDate;
  const mfgDate = rawMfg ? formatIsoToDisplayDate(rawMfg) : todayStr;
  const expDate = config.defaultExpDate ? formatIsoToDisplayDate(config.defaultExpDate) : '';

  const barcodeValue = (item?.barcode || item?.sku || ('PRD' + (item?.id || '001'))).trim();
  const barcodeSvg = config.showBarcode ? generateCode128Svg(barcodeValue, {
    height: sizeDef.defaultBarcodeHeight,
    width: sizeDef.defaultBarcodeWidth,
    displayValue: true,
    fontSize: 8.5
  }) : '';

  let priceHtml = '';
  if ((config.showMrp || config.showSellingPrice) && (priceVal > 0 || mrpVal > 0)) {
    if (config.showMrp && config.showSellingPrice) {
      if (mrpVal > priceVal) {
        priceHtml = `
          <span class="price-mrp" style="font-size: ${fScale.mrp};">MRP: ₹${mrpVal.toFixed(2)}</span>
          <span class="price-selling" style="font-size: ${fScale.price};">Our Price: ₹${priceVal.toFixed(2)}</span>
        `;
      } else {
        const label = (prices.hasValidMrp && !prices.hasValidSalePrice) ? 'MRP: ' : 'Price: ';
        priceHtml = `
          <span class="price-selling" style="font-size: ${fScale.price};">${label}₹${priceVal.toFixed(2)}</span>
        `;
      }
    } else if (config.showSellingPrice) {
      const label = (prices.hasValidMrp && !prices.hasValidSalePrice) ? 'MRP: ' : 'Our Price: ';
      priceHtml = `
        <span class="price-selling" style="font-size: ${fScale.price};">${label}₹${priceVal.toFixed(2)}</span>
      `;
    } else {
      priceHtml = `
        <span class="price-selling" style="font-size: ${fScale.price};">MRP: ₹${mrpVal.toFixed(2)}</span>
      `;
    }
  }

  const addressHtml = (config.showAddress && addressLines.length > 0) ? `
    <div class="field-address" style="font-size: ${fScale.address};">
      ${addressLines.map(line => `<div class="address-line">${line}</div>`).join('')}
    </div>
  ` : '';

  const itemSize = resolveItemSize(item, config);
  const itemColor = resolveItemColor(item, config);
  const showSize = !!config.showSize && !!itemSize;
  const showColor = !!config.showColor && !!itemColor;
  const displaySize = showSize ? (/^size:\s*/i.test(itemSize) ? itemSize : `Size: ${itemSize}`) : '';
  const displayColor = showColor ? (/^color:\s*/i.test(itemColor) ? itemColor : `Color: ${itemColor}`) : '';

  let variantHtml = '';
  if (showSize || showColor) {
    variantHtml = `
      <div class="field-variant-row" style="font-size: ${fScale.variant || '8px'};">
        ${showSize ? `<span class="badge-size">${displaySize}</span>` : ''}
        ${showSize && showColor ? `<span class="badge-sep">•</span>` : ''}
        ${showColor ? `<span class="badge-color">${displayColor}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="sticker-card sticker-${config.size}" style="width: ${sizeDef.width}mm; height: ${sizeDef.height}mm;">
      <div class="sticker-inner">
        ${config.showShopName && shopName ? `
          <div class="field-shop" style="font-size: ${fScale.shop};">${shopName}</div>
        ` : ''}

        ${addressHtml}

        ${config.showProductName && productName ? `
          <div class="field-product" style="font-size: ${fScale.product};">${productName}</div>
        ` : ''}

        ${variantHtml}

        ${priceHtml ? `
          <div class="field-price-row">
            ${priceHtml}
          </div>
        ` : ''}

        ${(config.showMfgDate || (config.showExpDate && expDate)) ? `
          <div class="field-date-row" style="font-size: ${fScale.date};">
            ${config.showMfgDate && mfgDate ? `<span>Mfg: ${mfgDate}</span>` : ''}
            ${config.showExpDate && expDate ? `<span>Exp: ${expDate}</span>` : ''}
          </div>
        ` : ''}

        ${config.showBarcode && barcodeSvg ? `
          <div class="field-barcode">
            ${barcodeSvg}
          </div>
        ` : ''}
      </div>
    </div>
  `;
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
  const gapMm = parseFloat(config.spacingMm) || 3;

  // Flatten items by quantity to get individual sticker instances
  const stickersList = [];
  items.forEach((item) => {
    const count = Math.max(1, parseInt(item.printQty || item.quantity || 1, 10));
    for (let i = 0; i < count; i++) {
      stickersList.push(item);
    }
  });

  // Calculate physical roll page dimensions
  const singleWidthMm = sizeDef.width;
  const singleHeightMm = sizeDef.height;
  const rollWidthMm = is2Row ? (singleWidthMm * 2 + gapMm) : singleWidthMm;
  const pageHeightMm = singleHeightMm + gapMm;

  // Build rows: if 2-row, group in pairs of 2
  const rows = [];
  if (is2Row) {
    for (let i = 0; i < stickersList.length; i += 2) {
      rows.push([stickersList[i], stickersList[i + 1] || null]);
    }
  } else {
    stickersList.forEach((it) => rows.push([it]));
  }

  const rowsHtml = rows.map((pair) => {
    const leftHtml = renderSingleStickerHtml(pair[0], config, shopData);
    const rightHtml = pair[1] ? renderSingleStickerHtml(pair[1], config, shopData) : (is2Row ? `<div class="sticker-card sticker-empty" style="width: ${singleWidthMm}mm; height: ${singleHeightMm}mm; visibility: hidden;"></div>` : '');
    return `
      <div class="sticker-row ${is2Row ? 'row-2col' : 'row-1col'}">
        ${leftHtml}
        ${is2Row ? rightHtml : ''}
      </div>
    `;
  }).join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Product Barcode Stickers - Ariso Retail</title>
  <style>
    @page {
      size: ${rollWidthMm}mm ${pageHeightMm}mm;
      margin: 0;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: ${rollWidthMm}mm;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .sticker-row {
      width: ${rollWidthMm}mm;
      height: ${singleHeightMm}mm;
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
      margin-bottom: ${gapMm}mm;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .row-2col {
      gap: ${gapMm}mm;
    }
    .sticker-card {
      width: ${singleWidthMm}mm;
      height: ${singleHeightMm}mm;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sticker-inner {
      width: 100%;
      height: 100%;
      padding: 1.2mm 1.5mm 0.8mm 1.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      overflow: hidden;
    }
    .field-shop {
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      line-height: 1.15;
    }
    .field-address {
      font-weight: 500;
      color: #333333;
      width: 100%;
      line-height: 1.15;
      text-align: center;
      overflow: hidden;
      margin: 0.2mm 0;
    }
    .address-line {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .field-product {
      font-weight: 800;
      width: 100%;
      line-height: 1.15;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
      margin: 0.5mm 0;
    }
    .field-variant-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1.5mm;
      width: 100%;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.15;
      margin: 0.2mm 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge-size, .badge-color {
      display: inline-block;
      white-space: nowrap;
    }
    .badge-sep {
      opacity: 0.5;
      font-size: 0.9em;
      margin: 0 0.5mm;
    }
    .field-price-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2mm;
      width: 100%;
      line-height: 1.2;
    }
    .price-mrp {
      text-decoration: line-through;
      color: #444444;
      font-weight: 700;
    }
    .price-selling {
      font-weight: 900;
      color: #000000;
    }
    .field-date-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2mm;
      width: 100%;
      font-weight: 600;
      color: #222222;
      line-height: 1.1;
    }
    .field-barcode {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      margin-top: 0.5mm;
      overflow: hidden;
    }
    .field-barcode svg {
      display: block;
      margin: 0 auto;
    }
    @media screen {
      body {
        padding: 10px;
        background: #f1f5f9;
      }
      .sticker-row {
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px dashed #cbd5e1;
      }
    }
  </style>
</head>
<body>
  ${rowsHtml}
</body>
</html>`;
}

/**
 * Unified cross-platform sticker printer
 * Works in both Web Browser and Windows Electron application
 */
export async function printStickers(items, config, shopData = {}, printerTarget = null) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const is2Row = parseInt(config.rows, 10) === 2;
  const gapMm = parseFloat(config.spacingMm) || 3;
  const rollWidthMm = is2Row ? (sizeDef.width * 2 + gapMm) : sizeDef.width;
  const rollHeightMm = sizeDef.height + gapMm;

  const htmlContent = buildStickerPrintDocument(items, config, shopData);

  // 1. Electron Desktop Native Silent / Spooler Printing
  const isElectron = !!(window.electron && (typeof window.electron.printSystemSilent === 'function' || typeof window.electron.printStickers === 'function'));
  if (isElectron) {
    try {
      const widthMicrons = Math.round(rollWidthMm * 1000);
      const heightMicrons = Math.round(rollHeightMm * 1000);

      const printFn = window.electron.printStickers || window.electron.printSystemSilent;
      const res = await printFn(htmlContent, printerTarget, {
        pageSize: { width: widthMicrons, height: heightMicrons },
        noCut: true, // Crucial for sticker rolls so the printer cutter doesn't cut every label
        color: false,
        margins: { marginType: 'none' }
      });
      return { success: true, method: 'electron', printer: res?.printer || printerTarget || 'Default' };
    } catch (electronErr) {
      console.warn('[StickerGenerator] Electron direct printing error, falling back to iframe print:', electronErr);
    }
  }

  // 2. Web Browser Fallback: Hidden print iframe with exact dimensions
  return new Promise((resolve, reject) => {
    try {
      let iframe = document.getElementById('ariso-sticker-print-iframe');
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'ariso-sticker-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      iframe.contentWindow.focus();
      setTimeout(() => {
        try {
          iframe.contentWindow.print();
          resolve({ success: true, method: 'web-iframe' });
        } catch (printErr) {
          reject(printErr);
        }
      }, 350);
    } catch (err) {
      reject(err);
    }
  });
}
