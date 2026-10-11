import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  QrCode,
  Printer,
  Save,
  Check,
  X,
  Sliders,
  Eye,
  Grid,
  Columns,
  Calendar,
  Store,
  MapPin,
  RotateCw,
  Plus,
  Minus,
  Sparkles,
  Info,
  AlertTriangle,
  Compass,
  Crosshair,
  Move,
  Download,
  Type,
  Scale,
  ScanLine
} from 'lucide-react';
import {
  STICKER_SIZES,
  STICKER_FONTS,
  DEFAULT_STICKER_CONFIG,
  loadSavedStickerConfig,
  saveStickerConfig,
  getFontFamilyCss,
  ensureStickerFontLoaded,
  validateWeightInput,
  resolveStickerProductName,
  fitTextToWidth,
  generateCode128Svg,
  validateBarcodeCode128,
  printStickers,
  printCalibrationStickers,
  renderCalibrationStickerHtml,
  getEffectiveRotation,
  getPreviewRotation,
  getRotationTransform,
  buildTsplStickerPayload,
  buildCalibrationTsplPayload,
  downloadRawTsplFile,
  printViaWebUsb,
  resolveStickerPrices,
  formatStickerAddress,
  getTodayIsoDate,
  formatIsoToDisplayDate,
  parseDisplayToIsoDate,
  resolveItemSize,
  resolveItemColor,
  resolveItemWeight
} from '../utils/stickerGenerator';
import { apiFetch } from '../utils/api';

/**
 * Shared StickerCard component for pixel-perfect 1:1 Live Preview
 * Matches the exact HTML/CSS generated in print document
 */
function StickerCard({ item, config, shopData = {} }) {
  const sizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
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

  const safePadding = parseFloat(config?.safePaddingMm !== undefined ? config.safePaddingMm : 2.5) || 2.5;
  const usableWidthMm = Math.max(16, sizeDef.width - (safePadding * 2));

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

  // Fit text with 0.25 pt step-down to usable width
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

  return (
    <div
      className={`sticker-card sticker-${config.size}`}
      style={{
        width: `${sizeDef.width}mm`,
        height: `${sizeDef.height}mm`,
        maxWidth: `${sizeDef.width}mm`,
        maxHeight: `${sizeDef.height}mm`,
        backgroundColor: '#ffffff',
        color: '#000000',
        fontFamily: fontFamilyCss,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0
      }}
    >
      <div
        className="sticker-inner"
        style={{
          width: '100%',
          height: '100%',
          padding: `${Math.min(safePadding, 1.8)}mm ${safePadding}mm`,
          fontFamily: fontFamilyCss,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          textAlign: 'center',
          gap: '0.5mm',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {shopFit && shopFit.lines.length > 0 && (
          <div
            className="field-shop"
            style={{
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              lineHeight: 1.1,
              textAlign: 'center',
              fontSize: `${shopFit.fontSizePt}pt`
            }}
          >
            {shopFit.lines[0]}
          </div>
        )}

        {fittedAddressLines.length > 0 && (
          <div
            className="field-address"
            style={{
              fontWeight: 500,
              color: '#333333',
              width: '100%',
              lineHeight: 1.1,
              textAlign: 'center',
              overflow: 'hidden',
              fontSize: isCompact25 ? '6pt' : '6.5pt'
            }}
          >
            {fittedAddressLines.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {line}
              </div>
            ))}
          </div>
        )}

        {prodFit && prodFit.lines.length > 0 && (
          <div
            className="field-product"
            style={{
              fontWeight: 800,
              width: '100%',
              lineHeight: 1.15,
              overflow: 'hidden',
              textAlign: 'center',
              fontSize: `${prodFit.fontSizePt}pt`
            }}
          >
            {prodFit.lines.map((l, idx) => (
              <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l}
              </div>
            ))}
          </div>
        )}

        {weightFit && weightFit.lines.length > 0 && (
          <div
            className="field-weight-row"
            style={{
              fontWeight: 700,
              width: '100%',
              lineHeight: 1.1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: `${weightFit.fontSizePt}pt`
            }}
          >
            {weightFit.lines[0]}
          </div>
        )}

        {variantFit && variantFit.lines.length > 0 && (
          <div
            className="field-variant-row"
            style={{
              fontWeight: 600,
              color: '#1e293b',
              width: '100%',
              lineHeight: 1.1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: `${variantFit.fontSizePt}pt`
            }}
          >
            {variantFit.lines[0]}
          </div>
        )}

        {(config.showMrp || config.showSellingPrice) && (priceVal > 0 || mrpVal > 0) && (
          <div
            className="field-price-row"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              columnGap: '1.5mm',
              rowGap: '0.2mm',
              width: '100%',
              lineHeight: 1.15,
              textAlign: 'center'
            }}
          >
            {config.showMrp && config.showSellingPrice ? (
              mrpVal > priceVal ? (
                <>
                  <span style={{ textDecoration: 'line-through', color: '#444444', fontWeight: 700, whiteSpace: 'nowrap', fontSize: isCompact25 ? '6.5pt' : '7pt' }}>
                    MRP: ₹{mrpVal.toFixed(2)}
                  </span>
                  <span style={{ fontWeight: 900, color: '#000000', whiteSpace: 'nowrap', fontSize: isCompact25 ? '7.5pt' : '8pt' }}>
                    Our Price: ₹{priceVal.toFixed(2)}
                  </span>
                </>
              ) : (
                <span style={{ fontWeight: 900, color: '#000000', whiteSpace: 'nowrap', fontSize: isCompact25 ? '7.5pt' : '8pt' }}>
                  {(prices.hasValidMrp && !prices.hasValidSalePrice ? 'MRP: ' : 'Price: ')}₹{priceVal.toFixed(2)}
                </span>
              )
            ) : config.showSellingPrice ? (
              <span style={{ fontWeight: 900, color: '#000000', whiteSpace: 'nowrap', fontSize: isCompact25 ? '7.5pt' : '8pt' }}>
                {(prices.hasValidMrp && !prices.hasValidSalePrice ? 'MRP: ' : 'Our Price: ')}₹{priceVal.toFixed(2)}
              </span>
            ) : (
              <span style={{ fontWeight: 900, color: '#000000', whiteSpace: 'nowrap', fontSize: isCompact25 ? '7.5pt' : '8pt' }}>
                MRP: ₹{mrpVal.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {dateFit && dateFit.lines.length > 0 && (
          <div
            className="field-date-row"
            style={{
              fontSize: `${dateFit.fontSizePt}pt`,
              fontWeight: 600,
              color: '#222222',
              width: '100%',
              lineHeight: 1.1,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}
          >
            {dateFit.lines[0]}
          </div>
        )}

        {config.showBarcode && barcodeSvg && (
          <div
            className="field-barcode"
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
              marginTop: 'auto',
              paddingTop: '0.4mm',
              overflow: 'hidden'
            }}
            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
          />
        )}
      </div>
    </div>
  );
}

export default function ProductStickerModal({
  open,
  onClose,
  items = [], // Array of product objects to print stickers for
  shopData = {}, // Store name, address, etc.
  initialPreviewMode = null // Optional initial preview mode: 'single' | 'roll'
}) {
  // Local state for sticker configuration
  const [config, setConfig] = useState(() => {
    const saved = loadSavedStickerConfig();
    return {
      ...saved,
      dpi: saved.dpi || 203,
      rotation: saved.rotation !== undefined ? saved.rotation : 0,
      driverBaseOffset: saved.driverBaseOffset !== undefined ? saved.driverBaseOffset : 0,
      autoFixOrientation: saved.autoFixOrientation !== undefined ? saved.autoFixOrientation : false,
      offsetXmm: saved.offsetXmm !== undefined ? saved.offsetXmm : 0,
      offsetYmm: saved.offsetYmm !== undefined ? saved.offsetYmm : 0,
      safePaddingMm: saved.safePaddingMm !== undefined ? saved.safePaddingMm : 2.5,
      mediaWidthMm: saved.mediaWidthMm !== undefined ? saved.mediaWidthMm : '',
      driverLeftMarginMm: saved.driverLeftMarginMm !== undefined ? saved.driverLeftMarginMm : 0,
      directThermalMode: saved.directThermalMode !== undefined ? saved.directThermalMode : false,
      tsplDirection: saved.tsplDirection !== undefined ? saved.tsplDirection : 0,
      defaultMfgDate: saved.defaultMfgDate || getTodayIsoDate(),
      showAddress: saved.showAddress !== undefined ? saved.showAddress : true,
      showSize: saved.showSize !== undefined ? saved.showSize : false,
      showColor: saved.showColor !== undefined ? saved.showColor : false,
      showWeight: saved.showWeight !== undefined ? saved.showWeight : false,
      customShopName: saved.customShopName || shopData.restaurant_name || shopData.name || '',
      customAddress: saved.customAddress || shopData.address || shopData.store_address || shopData.restaurant_address || '',
      customSize: saved.customSize || '',
      customColor: saved.customColor || '',
      customWeight: saved.customWeight || '',
      fontFamily: saved.fontFamily || 'default',
      localProductName: saved.localProductName || '',
      printWeight: saved.printWeight !== undefined ? saved.printWeight : false,
      weightValue: saved.weightValue !== undefined ? saved.weightValue : '500',
      weightUnit: saved.weightUnit || 'g',
      speed: saved.speed || 4,
      density: saved.density || 8
    };
  });

  // Inline validation for weight input
  const weightValidation = useMemo(() => {
    return validateWeightInput(config);
  }, [config.printWeight, config.weightValue]);

  // Preload and register fonts whenever selected font changes
  useEffect(() => {
    if (open && config.fontFamily) {
      ensureStickerFontLoaded(config.fontFamily);
    }
  }, [open, config.fontFamily]);

  // USB Barcode Scanner calibration test state
  const [scanTestInput, setScanTestInput] = useState('');
  const [scanTestResult, setScanTestResult] = useState(null);
  const scanInputRef = useRef(null);

  // Items with individual quantities
  const [itemQuantities, setItemQuantities] = useState(() => {
    const map = {};
    items.forEach((item, idx) => {
      map[item.id || idx] = 1;
    });
    return map;
  });

  // Selected preview item index (for single item preview)
  const [previewItemIndex, setPreviewItemIndex] = useState(0);

  // Preview view mode: 'single' | 'roll'
  const [previewMode, setPreviewMode] = useState(() => {
    if (initialPreviewMode) return initialPreviewMode;
    return items.length === 1 ? 'single' : 'roll';
  });

  // Update preview mode when modal opens or initialPreviewMode / items change
  useEffect(() => {
    if (open) {
      if (initialPreviewMode) {
        setPreviewMode(initialPreviewMode);
      } else if (items.length === 1) {
        setPreviewMode('single');
      } else {
        setPreviewMode('roll');
      }
    }
  }, [open, initialPreviewMode, items.length]);

  // Printing state
  const [isPrinting, setIsPrinting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState('');
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  // Detect available Windows printers (Electron native or backend dynamic discovery)
  useEffect(() => {
    if (window.electron && typeof window.electron.getPrinters === 'function') {
      window.electron.getPrinters().then((printers) => {
        if (Array.isArray(printers)) {
          setSystemPrinters(printers);
          const defaultPrn = printers.find(p => p.isDefault) || printers[0];
          if (defaultPrn) setSelectedPrinter(defaultPrn.name);
        }
      }).catch((e) => console.warn('Could not fetch system printers:', e));
    } else {
      // In web browser: dynamically query backend for connected printers (USB and LAN)
      apiFetch('/api/printers/discover')
        .then(res => res.json())
        .then(data => {
          const list = (data.discovered || data.printers || []).filter(p => !p.is_virtual);
          if (Array.isArray(list) && list.length > 0) {
            setSystemPrinters(list);
            const preferred = list.find(p => p.is_label || /tsc|te244|zebra|label|barcode/i.test(p.name))
                           || list.find(p => p.type === 'usb')
                           || list[0];
            if (preferred) setSelectedPrinter(preferred.name);
          }
        })
        .catch(e => console.warn('Could not fetch backend printers:', e));
    }
  }, []);

  // Load saved printer profile configuration when selectedPrinter changes
  useEffect(() => {
    if (selectedPrinter) {
      const printerProfile = loadSavedStickerConfig(selectedPrinter);
      if (printerProfile && Object.keys(printerProfile).length > 0) {
        setConfig((prev) => ({
          ...prev,
          driverLeftMarginMm: printerProfile.driverLeftMarginMm !== undefined ? printerProfile.driverLeftMarginMm : prev.driverLeftMarginMm,
          offsetXmm: printerProfile.offsetXmm !== undefined ? printerProfile.offsetXmm : prev.offsetXmm,
          offsetYmm: printerProfile.offsetYmm !== undefined ? printerProfile.offsetYmm : prev.offsetYmm,
          safePaddingMm: printerProfile.safePaddingMm !== undefined ? printerProfile.safePaddingMm : prev.safePaddingMm,
          mediaWidthMm: printerProfile.mediaWidthMm !== undefined ? printerProfile.mediaWidthMm : prev.mediaWidthMm
        }));
      }
    }
  }, [selectedPrinter]);

  // Update item quantities when items prop changes
  useEffect(() => {
    setItemQuantities((prev) => {
      const next = { ...prev };
      items.forEach((item, idx) => {
        const key = item.id || idx;
        if (next[key] === undefined || next[key] === '' || isNaN(next[key])) {
          next[key] = 1;
        }
      });
      return next;
    });
  }, [items]);

  // Current active preview item
  const currentPreviewItem = items[previewItemIndex] || items[0] || {
    name: 'Sample Retail Product',
    price: 199,
    mrp: 249,
    sku: 'SKU-10024',
    barcode: '890123456789',
    size: 'L',
    color: 'Navy Blue'
  };

  // Flattened items list taking quantities into account
  const printItemsList = useMemo(() => {
    return items.map((it, idx) => ({
      ...it,
      printQty: Math.max(1, parseInt(itemQuantities[it.id || idx], 10) || 1)
    }));
  }, [items, itemQuantities]);

  const totalStickersCount = useMemo(() => {
    return Object.values(itemQuantities).reduce((acc, q) => {
      const parsed = parseInt(q, 10);
      return acc + (isNaN(parsed) || parsed < 1 ? 0 : parsed);
    }, 0);
  }, [itemQuantities]);

  const currentSizeDef = STICKER_SIZES[config.size] || STICKER_SIZES['50x25'];
  const is2Row = parseInt(config.rows, 10) === 2;
  const cols = is2Row ? 2 : 1;
  const gapMm = cols === 2 ? (parseFloat(config.spacingMm) || 3) : 0;
  const pageW = cols * currentSizeDef.width + (cols - 1) * gapMm;
  const pageH = currentSizeDef.height;

  const effectiveMediaWidth = parseFloat(config.mediaWidthMm) > 0 ? parseFloat(config.mediaWidthMm) : pageW;
  const leftOffset_auto = Math.round(((effectiveMediaWidth - pageW) / 2) * 10) / 10;

  const offX = parseFloat(config.offsetXmm) || 0;
  const offY = parseFloat(config.offsetYmm) || 0;
  const driverLeftComp = parseFloat(config.driverLeftMarginMm) || 0;
  const totalLeftOffset = offX + driverLeftComp;
  const totalTopOffset = offY;

  const cell1Left = totalLeftOffset;
  const cell2Left = totalLeftOffset + currentSizeDef.width + gapMm;
  const cellTop = totalTopOffset;

  // Number of roll rows dynamically computed based on quantity to accurately reflect preview
  const rollRowsCount = useMemo(() => {
    const itKey = currentPreviewItem?.id || previewItemIndex;
    const currentItemQty = parseInt(itemQuantities[itKey], 10) || 1;
    const targetCount = items.length === 1 ? currentItemQty : (totalStickersCount || 1);
    const rowsNeeded = is2Row ? Math.ceil(targetCount / 2) : targetCount;
    return Math.min(Math.max(1, rowsNeeded), 20);
  }, [itemQuantities, currentPreviewItem, previewItemIndex, items.length, totalStickersCount, is2Row]);

  const rollRows = useMemo(() => {
    return Array.from({ length: rollRowsCount }, (_, i) => i + 1);
  }, [rollRowsCount]);

  const rollWidthMm = pageW;

  const effectiveRotation = useMemo(() => {
    return getEffectiveRotation(config);
  }, [config]);

  const previewRotation = useMemo(() => {
    return getPreviewRotation(config);
  }, [config]);

  const rotTransform = useMemo(() => {
    return getRotationTransform(
      previewRotation,
      pageW,
      pageH,
      0,
      0
    );
  }, [previewRotation, pageW, pageH]);

  const singleRotTransform = useMemo(() => {
    return getRotationTransform(
      previewRotation,
      currentSizeDef.width,
      currentSizeDef.height,
      0,
      0
    );
  }, [previewRotation, currentSizeDef.width, currentSizeDef.height]);

  const naturalSingleWidthPx = singleRotTransform.pageWidthMm * 3.779528;
  const naturalSingleHeightPx = singleRotTransform.pageHeightMm * 3.779528;
  const singleScaleFactor = useMemo(() => {
    return Math.min(2.0, Math.max(1.1, 290 / Math.max(naturalSingleWidthPx, naturalSingleHeightPx)));
  }, [naturalSingleWidthPx, naturalSingleHeightPx]);
  const singlePreviewBoxWidth = Math.round(naturalSingleWidthPx * singleScaleFactor);
  const singlePreviewBoxHeight = Math.round(naturalSingleHeightPx * singleScaleFactor);

  const naturalRollWidthPx = rotTransform.pageWidthMm * 3.779528;
  const naturalRollHeightPx = rotTransform.pageHeightMm * 3.779528;
  const rollScaleFactor = useMemo(() => {
    return Math.min(1.4, Math.max(0.75, 330 / Math.max(naturalRollWidthPx, naturalRollHeightPx)));
  }, [naturalRollWidthPx, naturalRollHeightPx]);
  const rollBoxWidth = Math.round(naturalRollWidthPx * rollScaleFactor);
  const rollBoxHeight = Math.round(naturalRollHeightPx * rollScaleFactor);
  const rollGapPx = Math.round(gapMm * 3.779528 * rollScaleFactor);

  const previewBarcodeValue = (currentPreviewItem.barcode || currentPreviewItem.sku || ('PRD' + (currentPreviewItem.id || '101'))).trim();
  const previewBarcodeValidation = useMemo(() => {
    return validateBarcodeCode128(previewBarcodeValue);
  }, [previewBarcodeValue]);

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveLayout = () => {
    saveStickerConfig(config, selectedPrinter || null);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleQuantityChange = (itemId, delta) => {
    setItemQuantities((prev) => {
      const current = parseInt(prev[itemId], 10) || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleDirectQuantityChange = (itemId, rawValue) => {
    const cleaned = rawValue.replace(/[^0-9]/g, '');
    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: cleaned === '' ? '' : parseInt(cleaned, 10)
    }));
  };

  const handleQuantityBlur = (itemId) => {
    setItemQuantities((prev) => {
      const val = parseInt(prev[itemId], 10);
      const safeVal = isNaN(val) || val < 1 ? 1 : Math.min(val, 9999);
      return { ...prev, [itemId]: safeVal };
    });
  };

  const handleQuantityKeyDown = (e, itemId) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  const handlePrintInternal = async (itemsToPrint, isTestPrint = false) => {
    if (config.printWeight) {
      const v = validateWeightInput(config);
      if (!v.isValid) {
        alert('Weight validation error: ' + v.error);
        return;
      }
    }

    setIsPrinting(true);
    setPrintSuccessMsg('');
    try {
      await ensureStickerFontLoaded(config.fontFamily);
      const isBrowserPrintTarget = !selectedPrinter || selectedPrinter === '__browser_print__';

      // 1. Electron Desktop Native Direct TSPL Spooler Printing (Exact ScanGo method)
      if (!isBrowserPrintTarget && window.electron && typeof window.electron.printWindowsRaw === 'function') {
        const tsplRes = await buildTsplStickerPayload(itemsToPrint, config, shopData);
        if (tsplRes?.b64Payload) {
          const rawRes = await window.electron.printWindowsRaw(selectedPrinter, tsplRes.b64Payload);
          if (rawRes && rawRes.success !== false) {
            setPrintSuccessMsg(isTestPrint ? 'Test sticker printed!' : `Printed ${itemsToPrint.length} sticker(s) to "${selectedPrinter}"!`);
            setTimeout(() => setPrintSuccessMsg(''), 4500);
            return;
          }
        }
      }

      // 2. Web Browser: Send Raw TSPL Payload to Backend API for Native TSPL Windows Spooler Printing
      const targetPrnObj = systemPrinters.find(p => p.name === selectedPrinter);
      const isThermalHardware = targetPrnObj?.is_label || targetPrnObj?.protocol === 'tspl' || targetPrnObj?.type === 'usb' || /tsc|te244|te200|da210|ttp|gprinter|hprt|xprinter|godex|argox|label|barcode/i.test(selectedPrinter || '');

      if (!isBrowserPrintTarget && isThermalHardware) {
        try {
          const tsplRes = await buildTsplStickerPayload(itemsToPrint, config, shopData);
          if (tsplRes?.b64Payload) {
            const firstItem = itemsToPrint[0] || {};
            const firstPrices = resolveStickerPrices(firstItem, config);
            const totalCopies = itemsToPrint.reduce((acc, it) => acc + (it.printQty || 1), 0);

            const res = await apiFetch('/api/printers/print-label', {
              method: 'POST',
              body: {
                printer_name: selectedPrinter,
                payload_base64: tsplRes.b64Payload,
                copies: totalCopies,
                label_data: {
                  storeName: (config.customShopName || shopData.restaurant_name || shopData.name || 'ARISO RETAIL').trim(),
                  productName: resolveStickerProductName(firstItem, config),
                  barcode: (firstItem.barcode || firstItem.sku || '').trim(),
                  sku: firstItem.sku || '',
                  price: firstPrices.salePrice,
                  mrp: firstPrices.mrp,
                  rows: parseInt(config.rows, 10) || 1,
                  gapMm: parseFloat(config.spacingMm) || 3,
                  fontFamily: config.fontFamily,
                  localProductName: config.localProductName,
                  printWeight: config.printWeight,
                  weightValue: config.weightValue,
                  weightUnit: config.weightUnit,
                  speed: config.speed || 4,
                  density: config.density || 8
                }
              }
            });

            const result = await res.json();
            if (res.ok && (result.success || result.details?.success)) {
              setPrintSuccessMsg(isTestPrint ? 'Test sticker printed!' : `Printed stickers to "${selectedPrinter}"!`);
              setTimeout(() => setPrintSuccessMsg(''), 4500);
              return;
            } else {
              throw new Error(result.error || `Failed to print to "${selectedPrinter}".`);
            }
          }
        } catch (backendErr) {
          console.warn('[ProductStickerModal] Direct backend hardware print failed, falling back to browser print dialog:', backendErr);
        }
      }

      // 3. Fallback: Unified Cross-Platform Isolated Print Iframe
      const res = await printStickers(itemsToPrint, config, shopData, selectedPrinter || null);
      if (res && res.success) {
        setPrintSuccessMsg(isTestPrint ? 'Test sticker print dialog opened!' : `Stickers printed successfully!`);
        setTimeout(() => setPrintSuccessMsg(''), 4500);
      }
    } catch (err) {
      alert('Sticker printing error: ' + (err.message || 'Unknown printing failure'));
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrint = () => {
    handlePrintInternal(printItemsList, false);
  };

  const handleTestPrint = () => {
    const is2Row = parseInt(config.rows, 10) === 2;
    const testItem = [{
      ...currentPreviewItem,
      printQty: is2Row ? 2 : 1
    }];
    handlePrintInternal(testItem, true);
  };

  const handleCalibrationPrint = async () => {
    setIsPrinting(true);
    setPrintSuccessMsg('');
    try {
      await ensureStickerFontLoaded(config.fontFamily);
      const isBrowserPrintTarget = !selectedPrinter || selectedPrinter === '__browser_print__';
      const targetPrnObj = systemPrinters.find(p => p.name === selectedPrinter);
      const isThermalHardware = targetPrnObj?.is_label || targetPrnObj?.protocol === 'tspl' || targetPrnObj?.type === 'usb' || /tsc|te244|te200|da210|ttp|gprinter|hprt|xprinter|godex|argox|label|barcode/i.test(selectedPrinter || '');

      // 1. Electron Desktop Native Direct TSPL Spooler Printing
      if (!isBrowserPrintTarget && window.electron && typeof window.electron.printWindowsRaw === 'function') {
        const tsplPayload = buildCalibrationTsplPayload(config, shopData);
        if (tsplPayload) {
          const b64 = btoa(unescape(encodeURIComponent(tsplPayload)));
          const rawRes = await window.electron.printWindowsRaw(selectedPrinter, b64);
          if (rawRes && rawRes.success !== false) {
            setPrintSuccessMsg(`Calibration test row printed directly to "${selectedPrinter}"!`);
            setTimeout(() => setPrintSuccessMsg(''), 4500);
            return;
          }
        }
      }

      // 2. Direct backend hardware spooler printing
      if (!isBrowserPrintTarget && isThermalHardware) {
        try {
          const tsplPayload = buildCalibrationTsplPayload(config, shopData);
          if (tsplPayload) {
            const b64Payload = btoa(unescape(encodeURIComponent(tsplPayload)));
            const res = await apiFetch('/api/printers/print-label', {
              method: 'POST',
              body: {
                printer_name: selectedPrinter,
                payload_base64: b64Payload,
                copies: 1
              }
            });
            const result = await res.json();
            if (res.ok && (result.success || result.details?.success)) {
              setPrintSuccessMsg(`Calibration test row printed to "${selectedPrinter}"!`);
              setTimeout(() => setPrintSuccessMsg(''), 4500);
              return;
            }
          }
        } catch (backendErr) {
          console.warn('[ProductStickerModal] Calibration direct hardware print failed, falling back to browser print:', backendErr);
        }
      }

      // 3. Fallback: Browser print dialog / iframe
      const res = await printCalibrationStickers(config, shopData, selectedPrinter || null);
      if (res && res.success) {
        setPrintSuccessMsg('Calibration test row printed!');
        setTimeout(() => setPrintSuccessMsg(''), 4500);
      }
    } catch (err) {
      alert('Calibration print error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPrinting(false);
    }
  };

  // Price calculations for preview using the Sale Price fallback to MRP rule
  const previewPrices = useMemo(() => {
    return resolveStickerPrices(currentPreviewItem, config);
  }, [currentPreviewItem, config]);
  const previewPrice = previewPrices.salePrice;
  const previewMrp = previewPrices.mrp;

  const todayIso = getTodayIsoDate();
  const mfgDateIso = parseDisplayToIsoDate(config.defaultMfgDate) || todayIso;
  const expDateIso = parseDisplayToIsoDate(config.defaultExpDate) || '';

  const mfgDateDisplay = formatIsoToDisplayDate(mfgDateIso);
  const expDateDisplay = formatIsoToDisplayDate(expDateIso);

  const previewSize = useMemo(() => {
    return resolveItemSize(currentPreviewItem, config);
  }, [currentPreviewItem, config]);

  const previewColor = useMemo(() => {
    return resolveItemColor(currentPreviewItem, config);
  }, [currentPreviewItem, config]);

  const previewWeight = useMemo(() => {
    return resolveItemWeight(currentPreviewItem, config);
  }, [currentPreviewItem, config]);

  const itemRawSize = (currentPreviewItem?.size || currentPreviewItem?.product_size || currentPreviewItem?.variant_size || '').toString().trim();
  const itemRawColor = (currentPreviewItem?.color || currentPreviewItem?.product_color || currentPreviewItem?.variant_color || '').toString().trim();
  const itemRawWeight = (
    currentPreviewItem?.weight ||
    currentPreviewItem?.product_weight ||
    currentPreviewItem?.net_weight ||
    currentPreviewItem?.item_weight ||
    currentPreviewItem?.unit ||
    currentPreviewItem?.sales_unit ||
    ''
  ).toString().trim();

  const shopNameDisplay = (config.customShopName || shopData.restaurant_name || shopData.name || 'Ariso Retail Store').trim();
  const addressDisplay = (config.customAddress || shopData.address || shopData.store_address || shopData.restaurant_address || '').trim();
  const formattedAddressLines = useMemo(() => {
    return formatStickerAddress(addressDisplay, 3);
  }, [addressDisplay]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={styles.iconBadge}>
              <QrCode size={20} color="#0284C7" />
            </div>
            <div>
              <h2 style={styles.title}>Product Sticker & Barcode Label Designer</h2>
              <p style={styles.subtitle}>
                Dynamic thermal sticker printing for 50×25mm, 38×38mm, 38×50mm rolls (1-row / 2-row)
              </p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY: 2-COLUMN SPLIT */}
        <div style={styles.body}>
          {/* LEFT COLUMN: CONTROLS & FIELD TOGGLES */}
          <div style={styles.leftCol}>
            {/* 1. STICKER DIMENSION SELECTOR */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                <Sliders size={14} style={{ marginRight: 6 }} /> Physical Sticker Size
              </label>
              <div style={styles.pillGrid}>
                {Object.values(STICKER_SIZES).map((s) => {
                  const isSelected = config.size === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      style={{
                        ...styles.pillBtn,
                        ...(isSelected ? styles.pillBtnActive : {})
                      }}
                      onClick={() => handleConfigChange('size', s.id)}
                    >
                      <div style={{ fontWeight: '800', fontSize: '13px' }}>{s.name}</div>
                      <div style={{ fontSize: '10.5px', opacity: 0.8 }}>{s.aspect}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FONT FAMILY & LOCAL SCRIPT SELECTION */}
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.sectionLabel}>
                  <Type size={14} style={{ marginRight: 6 }} /> Font Family & Script
                </label>
                <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#0284C7' }}>
                  Offline Bundled
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  value={config.fontFamily || 'default'}
                  onChange={(e) => handleConfigChange('fontFamily', e.target.value)}
                  style={{
                    ...styles.textInput,
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    fontFamily: getFontFamilyCss(config.fontFamily),
                    height: '36px'
                  }}
                >
                  {STICKER_FONTS.map((f) => (
                    <option key={f.id} value={f.id} style={{ fontFamily: f.family, fontSize: '13px' }}>
                      {f.name}
                    </option>
                  ))}
                </select>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span style={styles.smallLabel}>Label Name (Local Language Override):</span>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>Optional</span>
                  </div>
                  <input
                    type="text"
                    value={config.localProductName || ''}
                    onChange={(e) => handleConfigChange('localProductName', e.target.value)}
                    placeholder="e.g. अमूल बटर / સ્થાનિક નામ / பெயர் (Overrides product name)"
                    style={{
                      ...styles.textInput,
                      fontFamily: getFontFamilyCss(config.fontFamily)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. ROLL CONFIGURATION: 1-ROW vs 2-ROW, SPACING, PADDING & CALIBRATION OFFSETS */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                <Columns size={14} style={{ marginRight: 6 }} /> Roll Format & Spacing
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    ...styles.pillBtn,
                    ...(parseInt(config.rows, 10) === 1 ? styles.pillBtnActive : {})
                  }}
                  onClick={() => handleConfigChange('rows', 1)}
                >
                  <div style={{ fontWeight: '800', fontSize: '12.5px' }}>1-Row Sticker Roll</div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>Single label per row</div>
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.pillBtn,
                    ...(parseInt(config.rows, 10) === 2 ? styles.pillBtnActive : {})
                  }}
                  onClick={() => handleConfigChange('rows', 2)}
                >
                  <div style={{ fontWeight: '800', fontSize: '12.5px' }}>2-Row Sticker Roll</div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>Twin labels side-by-side</div>
                </button>
              </div>

              {/* Inter-label Gap & Safe Padding */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Sticker Gap:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="15"
                      value={config.spacingMm}
                      onChange={(e) => handleConfigChange('spacingMm', e.target.value)}
                      style={styles.numberInput}
                      title="Inter-label gap in mm (standard 3 mm)"
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Safe Padding:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={config.safePaddingMm !== undefined ? config.safePaddingMm : 2.5}
                      onChange={(e) => handleConfigChange('safePaddingMm', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      title="Inner safe margin on all sides (default 2.5 mm)"
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', padding: '0 4px' }}>
                Usable label area: <strong>{((currentSizeDef.width) - 2 * (config.safePaddingMm !== undefined ? config.safePaddingMm : 2.5)).toFixed(1)} × {((currentSizeDef.height) - 2 * (config.safePaddingMm !== undefined ? config.safePaddingMm : 2.5)).toFixed(1)} mm</strong> (all text & barcode stay inside).
              </div>

              {/* Media Width & Auto-Center */}
              <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.03)', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                    Media Width (Backing Roll):
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min={pageW}
                      max="150"
                      placeholder={String(pageW)}
                      value={config.mediaWidthMm ?? ''}
                      onChange={(e) => handleConfigChange('mediaWidthMm', e.target.value)}
                      style={{ ...styles.numberInput, width: '56px' }}
                      title={`Physical roll backing width in mm (default pageW = ${pageW} mm)`}
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', fontSize: '10.5px' }}>
                  <span style={{ color: '#475569' }}>
                    Auto-center Left Offset: <strong>{leftOffset_auto >= 0 ? `+${leftOffset_auto.toFixed(1)}` : leftOffset_auto.toFixed(1)} mm</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('offsetXmm', leftOffset_auto)}
                    style={{
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      color: '#0284C7',
                      background: '#E0F2FE',
                      border: '1px solid #BAE6FD',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Apply Auto-Center
                  </button>
                </div>
              </div>

              {/* FINE-TUNE ALIGNMENT OFFSETS & DRIVER COMPENSATION */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Left Offset:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="-30"
                      max="30"
                      value={config.offsetXmm ?? 0}
                      onChange={(e) => handleConfigChange('offsetXmm', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      title="Row Left Offset fine-tuning (-30 to +30 mm)"
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>Top Offset:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="-30"
                      max="30"
                      value={config.offsetYmm ?? 0}
                      onChange={(e) => handleConfigChange('offsetYmm', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      title="Row Top Offset fine-tuning (-30 to +30 mm)"
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>
              </div>

              {/* Driver Left Margin Compensation */}
              <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                      Driver Left Margin Comp:
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748B' }}>
                      Compensates non-printable margin (saved per printer)
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="-30"
                      max="30"
                      value={config.driverLeftMarginMm ?? 0}
                      onChange={(e) => handleConfigChange('driverLeftMarginMm', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      title="Driver hardware non-printable margin (default 0 mm, e.g. +6 mm for TSC TE244)"
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#0284C7', marginTop: '4px' }}>
                  Total Effective Left: <strong>{totalLeftOffset >= 0 ? `+${totalLeftOffset.toFixed(1)}` : totalLeftOffset.toFixed(1)} mm</strong> (Left: {offX}mm + Driver: {driverLeftComp}mm)
                </div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('driverLeftMarginMm', 0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      backgroundColor: (config.driverLeftMarginMm || 0) === 0 ? '#E0F2FE' : '#F1F5F9',
                      color: (config.driverLeftMarginMm || 0) === 0 ? '#0284C7' : '#475569',
                      border: (config.driverLeftMarginMm || 0) === 0 ? '1px solid #38BDF8' : '1px solid #CBD5E1'
                    }}
                  >
                    0 mm (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('driverLeftMarginMm', 4.0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      backgroundColor: (config.driverLeftMarginMm || 0) === 4.0 ? '#DCFCE7' : '#F1F5F9',
                      color: (config.driverLeftMarginMm || 0) === 4.0 ? '#16A34A' : '#475569',
                      border: (config.driverLeftMarginMm || 0) === 4.0 ? '1px solid #86EFAC' : '1px solid #CBD5E1'
                    }}
                    title="Recommended compensation for 2-row rolls on TSC TE244 driver to center left and right labels"
                  >
                    +4.0 mm (TSC TE244 Center)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('driverLeftMarginMm', 6.0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10.5px',
                      fontWeight: '700',
                      backgroundColor: (config.driverLeftMarginMm || 0) === 6.0 ? '#FEF3C7' : '#F1F5F9',
                      color: (config.driverLeftMarginMm || 0) === 6.0 ? '#D97706' : '#475569',
                      border: (config.driverLeftMarginMm || 0) === 6.0 ? '1px solid #FCD34D' : '1px solid #CBD5E1'
                    }}
                  >
                    +6.0 mm (Wide Backing)
                  </button>
                </div>
              </div>
            </div>

            {/* 3. PRINT ORIENTATION & ROTATION */}
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.sectionLabel}>
                  <Compass size={14} style={{ marginRight: 6 }} /> Print Orientation / Rotation
                </label>
                <span style={{ fontSize: '10.5px', fontWeight: '800', color: effectiveRotation !== 0 ? '#0284C7' : '#64748B' }}>
                  Effective: {effectiveRotation}°
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    style={{
                      ...styles.pillBtn,
                      padding: '6px 4px',
                      ...((parseInt(config.rotation, 10) || 0) === deg ? styles.pillBtnActive : {})
                    }}
                    onClick={() => handleConfigChange('rotation', deg)}
                  >
                    <div style={{ fontWeight: '800', fontSize: '12px' }}>{deg}°</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.85 }}>
                      {deg === 0 ? 'Normal' : deg === 90 ? '90° CW' : deg === 180 ? '180° Inv' : '270° CCW'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Driver base offset dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>
                  Driver base offset:
                </span>
                <select
                  value={config.driverBaseOffset !== undefined ? config.driverBaseOffset : 0}
                  onChange={(e) => handleConfigChange('driverBaseOffset', parseInt(e.target.value, 10))}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value={0}>0° (None / Raw)</option>
                  <option value={90}>90° (TSC / Seagull Default)</option>
                  <option value={180}>180° (Inverted)</option>
                  <option value={270}>270° (CCW)</option>
                </select>
              </div>

              {/* Auto-fix orientation checkbox */}
              <div style={{ marginTop: '8px', padding: '8px 10px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!config.autoFixOrientation}
                    onChange={(e) => handleConfigChange('autoFixOrientation', e.target.checked)}
                    style={{ ...styles.checkbox, marginTop: '2px' }}
                  />
                  <div style={{ fontSize: '11.5px', lineHeight: 1.35, color: '#0369A1' }}>
                    <strong>Auto-fix orientation (Driver Compensation)</strong>
                    <div style={{ fontSize: '10.5px', color: '#0284C7', marginTop: '2px' }}>
                      Applies counter-rotation (+270°) to prevent thermal print drivers from automatically rotating 2-up landscape rolls.
                    </div>
                  </div>
                </label>
              </div>

              {/* Direct Thermal Command Mode toggle */}
              <div style={{ marginTop: '6px', padding: '8px 10px', background: 'rgba(0,0,0,0.02)', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#334155' }}>
                    Direct TSPL Thermal Command Mode
                  </span>
                  <input
                    type="checkbox"
                    checked={!!config.directThermalMode}
                    onChange={(e) => handleConfigChange('directThermalMode', e.target.checked)}
                    style={styles.checkbox}
                  />
                </label>
                {config.directThermalMode && (
                  <div style={{ marginTop: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>TSPL Direction:</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[0, 1].map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            style={{
                              ...styles.pillBtn,
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: '700',
                              ...((config.tsplDirection ?? 0) === dir ? styles.pillBtnActive : {})
                            }}
                            onClick={() => handleConfigChange('tsplDirection', dir)}
                          >
                            DIR {dir}
                          </button>
                        ))}
                        <button
                          type="button"
                          style={{
                            ...styles.pillBtn,
                            padding: '4px 8px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#F8FAFC'
                          }}
                          onClick={() => downloadRawTsplFile(items, config, shopData)}
                          title="Download raw TSPL .prn file for USB/cmd sending"
                        >
                          <Download size={11} /> .PRN
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                      <div>
                        <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Speed (IPS):</span>
                        <select
                          value={config.speed || 4}
                          onChange={(e) => handleConfigChange('speed', parseInt(e.target.value, 10))}
                          style={{ ...styles.textInput, padding: '3px 6px', fontSize: '11px', height: '28px' }}
                        >
                          <option value={2}>2 ips (Slow)</option>
                          <option value={3}>3 ips</option>
                          <option value={4}>4 ips (Default)</option>
                          <option value={5}>5 ips</option>
                          <option value={6}>6 ips (Fast)</option>
                        </select>
                      </div>
                      <div>
                        <span style={{ fontSize: '10.5px', color: '#64748B', display: 'block', marginBottom: '2px' }}>Density (1-15):</span>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          value={config.density || 8}
                          onChange={(e) => handleConfigChange('density', Math.min(15, Math.max(1, parseInt(e.target.value, 10) || 8)))}
                          style={{ ...styles.textInput, padding: '3px 6px', fontSize: '11px', height: '28px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. PRINTER HEAD RESOLUTION (DPI) */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                <Printer size={14} style={{ marginRight: 6 }} /> Printer Head Resolution (DPI)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    ...styles.pillBtn,
                    ...(parseInt(config.dpi, 10) === 203 ? styles.pillBtnActive : {})
                  }}
                  onClick={() => handleConfigChange('dpi', 203)}
                >
                  <div style={{ fontWeight: '800', fontSize: '12px' }}>203 DPI (Standard)</div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>TSC, Zebra, Xprinter, TVS</div>
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.pillBtn,
                    ...(parseInt(config.dpi, 10) === 300 ? styles.pillBtnActive : {})
                  }}
                  onClick={() => handleConfigChange('dpi', 300)}
                >
                  <div style={{ fontWeight: '800', fontSize: '12px' }}>300 DPI (High Res)</div>
                  <div style={{ fontSize: '10px', opacity: 0.85 }}>Ultra-fine 12 dots/mm</div>
                </button>
              </div>
            </div>

            {/* 5. DYNAMIC FIELD TOGGLES */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                <Grid size={14} style={{ marginRight: 6 }} /> Dynamic Fields to Print
              </label>
              <div style={styles.toggleGrid}>
                {[
                  { key: 'showShopName', label: 'Shop Name' },
                  { key: 'showProductName', label: 'Product Name' },
                  { key: 'showWeight', label: 'Weight / Quantity' },
                  { key: 'showSize', label: 'Size' },
                  { key: 'showColor', label: 'Color' },
                  { key: 'showMrp', label: 'MRP (Strikethrough)' },
                  { key: 'showSellingPrice', label: 'Selling Price' },
                  { key: 'showMfgDate', label: 'Mfg Date' },
                  { key: 'showExpDate', label: 'Exp Date' },
                  { key: 'showAddress', label: 'Shop Address' },
                  { key: 'showBarcode', label: 'Code128 Barcode' },
                ].map((f) => {
                  const isChecked = !!config[f.key];
                  return (
                    <label key={f.key} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleConfigChange(f.key, e.target.checked)}
                        style={styles.checkbox}
                      />
                      <span style={{ color: isChecked ? '#0F172A' : '#64748B', fontWeight: isChecked ? '700' : '500' }}>
                        {f.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 6. STORE & DATE DETAILS */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                <Calendar size={14} style={{ marginRight: 6 }} /> Store & Date Details
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div>
                  <label style={styles.smallLabel}>Shop Name:</label>
                  <input
                    type="text"
                    value={config.customShopName}
                    onChange={(e) => handleConfigChange('customShopName', e.target.value)}
                    placeholder={shopData.name || 'Store Name'}
                    style={styles.textInput}
                  />
                </div>
                <div>
                  <label style={styles.smallLabel}>Address:</label>
                  <input
                    type="text"
                    value={config.customAddress}
                    onChange={(e) => handleConfigChange('customAddress', e.target.value)}
                    placeholder={shopData.address || 'Address'}
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={styles.smallLabel}>Mfg Date (Default Today):</label>
                  <input
                    type="date"
                    value={mfgDateIso}
                    onChange={(e) => handleConfigChange('defaultMfgDate', e.target.value)}
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === 'function') e.target.showPicker();
                      } catch (err) {}
                    }}
                    style={{ ...styles.textInput, cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <label style={styles.smallLabel}>Exp Date / Best Before:</label>
                  <input
                    type="date"
                    value={expDateIso}
                    onChange={(e) => handleConfigChange('defaultExpDate', e.target.value)}
                    onClick={(e) => {
                      try {
                        if (typeof e.target.showPicker === 'function') e.target.showPicker();
                      } catch (err) {}
                    }}
                    style={{ ...styles.textInput, cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* WEIGHT OPTION: Print weight on label */}
              <div style={{
                marginTop: '10px',
                marginBottom: '10px',
                padding: '10px 12px',
                background: config.printWeight ? '#F0FDF4' : 'rgba(0,0,0,0.02)',
                border: config.printWeight ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                borderRadius: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: config.printWeight ? '8px' : '0' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: config.printWeight ? '#166534' : '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Scale size={14} color={config.printWeight ? '#16A34A' : '#64748B'} /> Print weight on label
                  </span>
                  <input
                    type="checkbox"
                    checked={!!config.printWeight}
                    onChange={(e) => handleConfigChange('printWeight', e.target.checked)}
                    style={styles.checkbox}
                  />
                </label>

                {config.printWeight && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid #DCFCE7' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#166534', marginBottom: '3px', display: 'block' }}>
                          Weight Value:
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          value={config.weightValue !== undefined ? config.weightValue : ''}
                          onChange={(e) => handleConfigChange('weightValue', e.target.value)}
                          placeholder="500"
                          style={{
                            ...styles.textInput,
                            borderColor: !weightValidation.isValid ? '#EF4444' : '#86EFAC',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#166534', marginBottom: '3px', display: 'block' }}>
                          Unit:
                        </label>
                        <select
                          value={config.weightUnit || 'g'}
                          onChange={(e) => handleConfigChange('weightUnit', e.target.value)}
                          style={{
                            ...styles.textInput,
                            fontWeight: '700',
                            cursor: 'pointer',
                            backgroundColor: '#FFFFFF',
                            height: '34px'
                          }}
                        >
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="ml">ml</option>
                          <option value="L">L</option>
                          <option value="pcs">pcs</option>
                        </select>
                      </div>
                    </div>
                    {!weightValidation.isValid && (
                      <div style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <AlertTriangle size={12} /> {weightValidation.error}
                      </div>
                    )}
                    <div style={{ fontSize: '10.5px', color: '#15803D' }}>
                      Prints "<strong>Wt: {config.weightValue || 0} {config.weightUnit || 'g'}</strong>" on every label between product name and MRP.
                    </div>
                  </div>
                )}
              </div>

              {/* Weight, Size & Color Fields with Checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginTop: '8px' }}>
                <div>
                  <label style={{ ...styles.smallLabel, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={!!config.showWeight}
                      onChange={(e) => handleConfigChange('showWeight', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Weight / Qty {itemRawWeight ? `(${itemRawWeight})` : ''}:</span>
                  </label>
                  <input
                    type="text"
                    value={config.customWeight !== undefined ? config.customWeight : ''}
                    onChange={(e) => handleConfigChange('customWeight', e.target.value)}
                    placeholder={itemRawWeight || 'e.g. 100g, 1 KG, 500 ml'}
                    style={styles.textInput}
                  />
                </div>
                <div>
                  <label style={{ ...styles.smallLabel, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={!!config.showSize}
                      onChange={(e) => handleConfigChange('showSize', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Size {itemRawSize ? `(${itemRawSize})` : ''}:</span>
                  </label>
                  <input
                    type="text"
                    value={config.customSize || ''}
                    onChange={(e) => handleConfigChange('customSize', e.target.value)}
                    placeholder={itemRawSize || 'e.g. M, L, XL, 42'}
                    style={styles.textInput}
                  />
                </div>
                <div>
                  <label style={{ ...styles.smallLabel, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={!!config.showColor}
                      onChange={(e) => handleConfigChange('showColor', e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Color {itemRawColor ? `(${itemRawColor})` : ''}:</span>
                  </label>
                  <input
                    type="text"
                    value={config.customColor || ''}
                    onChange={(e) => handleConfigChange('customColor', e.target.value)}
                    placeholder={itemRawColor || 'e.g. Blue, Black, Red'}
                    style={styles.textInput}
                  />
                </div>
              </div>
            </div>

            {/* 7. PRODUCT SELECTION & QUANTITIES */}
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={styles.sectionLabel}>
                  Products to Print ({items.length})
                </label>
                <span style={styles.countBadge}>{totalStickersCount} Total Stickers</span>
              </div>
              <div style={styles.itemsList}>
                {items.map((it, idx) => {
                  const itKey = it.id || idx;
                  const qty = itemQuantities[itKey] || 1;
                  const isCurrentPreview = previewItemIndex === idx;
                  const itPrices = resolveStickerPrices(it, config);
                  return (
                    <div
                      key={itKey}
                      style={{
                        ...styles.itemRow,
                        ...(isCurrentPreview ? styles.itemRowActive : {})
                      }}
                      onClick={() => setPreviewItemIndex(idx)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '12.5px', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {it.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Rs.{parseFloat(itPrices?.salePrice || 0).toFixed(2)} • SKU: {it.sku || it.barcode || 'N/A'}
                          {resolveItemSize(it, config) ? ` • Size: ${resolveItemSize(it, config)}` : ''}
                          {resolveItemColor(it, config) ? ` • Color: ${resolveItemColor(it, config)}` : ''}
                        </div>
                      </div>
                      <div style={styles.qtyControl} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          style={styles.qtyBtn}
                          onClick={() => handleQuantityChange(itKey, -1)}
                          title="Decrease stickers"
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={qty === '' ? '' : qty}
                          onChange={(e) => handleDirectQuantityChange(itKey, e.target.value)}
                          onBlur={() => handleQuantityBlur(itKey)}
                          onKeyDown={(e) => handleQuantityKeyDown(e, itKey)}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.stopPropagation()}
                          style={styles.qtyInput}
                          title="Click to type sticker quantity"
                          aria-label={`Sticker quantity for ${it.name}`}
                        />
                        <button
                          type="button"
                          style={styles.qtyBtn}
                          onClick={() => handleQuantityChange(itKey, 1)}
                          title="Increase stickers"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 8. PRINTER DESTINATION SELECTOR */}
            <div style={styles.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={styles.smallLabel}>Print Destination:</label>
                {printSuccessMsg && (
                  <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={13} /> {printSuccessMsg}
                  </span>
                )}
              </div>
              <select
                value={selectedPrinter || '__browser_print__'}
                onChange={(e) => setSelectedPrinter(e.target.value === '__browser_print__' ? '' : e.target.value)}
                style={styles.selectInput}
              >
                {systemPrinters.map((p) => {
                  const tag = p.is_label ? 'Thermal Label / TSPL Direct - Recommended' : (p.type === 'usb' ? 'USB Spooler' : 'Windows Spooler');
                  return (
                    <option key={p.name} value={p.name}>
                      🖨️ Direct: {p.name} ({tag}) {p.isDefault ? '• Default' : ''}
                    </option>
                  );
                })}
                <option value="__browser_print__">
                  🌐 Browser Print Dialog (Any Thermal / Laser Printer / Save to PDF)
                </option>
              </select>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE PRINT PREVIEW */}
          <div style={styles.rightCol}>
            <div style={styles.previewHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} color="#0284C7" />
                <span style={{ fontWeight: '800', fontSize: '13.5px', color: '#0F172A' }}>
                  Live Print Preview ({currentSizeDef.name})
                </span>
              </div>
              <div style={styles.previewViewToggle}>
                <button
                  type="button"
                  style={{
                    ...styles.previewToggleBtn,
                    ...(previewMode === 'single' ? styles.previewToggleBtnActive : {})
                  }}
                  onClick={() => setPreviewMode('single')}
                >
                  Single Sticker
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.previewToggleBtn,
                    ...(previewMode === 'roll' ? styles.previewToggleBtnActive : {})
                  }}
                  onClick={() => setPreviewMode('roll')}
                >
                  Roll Feed ({is2Row ? '2-Row' : '1-Row'})
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.previewToggleBtn,
                    ...(previewMode === 'calibration' ? styles.previewToggleBtnActive : {})
                  }}
                  onClick={() => setPreviewMode('calibration')}
                >
                  Calibration Grid
                </button>
              </div>
            </div>

            {/* BARCODE VALIDATION ERROR BANNER */}
            {!previewBarcodeValidation.valid && (
              <div style={styles.barcodeErrorBanner}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>Barcode Warning: {previewBarcodeValidation.error}</span>
              </div>
            )}

            <div style={styles.previewContainer}>
              {previewMode === 'single' ? (
                /* SINGLE STICKER DETAILED PREVIEW (EXACT 1:1 SCALED WITH ROTATION & OFFSETS) */
                <div style={styles.singlePreviewWrapper}>
                  <div
                    style={{
                      width: `${singlePreviewBoxWidth}px`,
                      height: `${singlePreviewBoxHeight}px`,
                      position: 'relative',
                      boxShadow: '0 8px 24px -4px rgba(0,0,0,0.18)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #94A3B8'
                    }}
                  >
                    {/* Simulated Virtual Print Page Box */}
                    <div
                      style={{
                        width: `${singleRotTransform.pageWidthMm}mm`,
                        height: `${singleRotTransform.pageHeightMm}mm`,
                        transform: `scale(${singleScaleFactor})`,
                        transformOrigin: 'top left',
                        position: 'relative',
                        pointerEvents: 'none'
                      }}
                    >
                      {/* Rotated & Translated Sticker Content */}
                      <div
                        style={{
                          width: `${currentSizeDef.width}mm`,
                          height: `${currentSizeDef.height}mm`,
                          transform: singleRotTransform.sheetTransform || 'none',
                          transformOrigin: 'top left',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: `${totalLeftOffset}mm`,
                            top: `${totalTopOffset}mm`,
                            width: `${currentSizeDef.width}mm`,
                            height: `${currentSizeDef.height}mm`,
                            overflow: 'hidden'
                          }}
                        >
                          <StickerCard
                            item={currentPreviewItem}
                            config={config}
                            shopData={shopData}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                    Label: <strong>{currentSizeDef.width}×{currentSizeDef.height}mm</strong> • Page: <strong>{singleRotTransform.pageWidthMm}×{singleRotTransform.pageHeightMm}mm</strong> @ <strong>{effectiveRotation}°</strong> • Offset: [Left: {config.offsetXmm || 0}mm (Total: {totalLeftOffset}mm), Top: {config.offsetYmm || 0}mm] • Safe: {config.safePaddingMm !== undefined ? config.safePaddingMm : 2.5}mm
                  </div>
                </div>
              ) : previewMode === 'roll' ? (
                /* ROLL FEED CONTINUOUS SIMULATION (EXACT 1:1 SCALED, UNCLIPPED 2-ROW WITH ROTATION & OFFSETS) */
                <div style={styles.rollFeedWrapper}>
                  <div style={styles.rollLiner}>
                    {rollRows.map((rowIdx) => (
                      <div
                        key={rowIdx}
                        style={{
                          width: `${rollBoxWidth}px`,
                          height: `${rollBoxHeight}px`,
                          position: 'relative',
                          marginBottom: `${rollGapPx}px`,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1'
                        }}
                      >
                        {/* Simulated Print Page Box */}
                        <div
                          style={{
                            width: `${rotTransform.pageWidthMm}mm`,
                            height: `${rotTransform.pageHeightMm}mm`,
                            transform: `scale(${rollScaleFactor})`,
                            transformOrigin: 'top left',
                            position: 'relative',
                            pointerEvents: 'none'
                          }}
                        >
                          {/* Rotated & Translated Sheet Content */}
                          <div
                            style={{
                              width: `${pageW}mm`,
                              height: `${pageH}mm`,
                              transform: rotTransform.sheetTransform || 'none',
                              transformOrigin: 'top left',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                left: `${cell1Left}mm`,
                                top: `${cellTop}mm`,
                                width: `${currentSizeDef.width}mm`,
                                height: `${currentSizeDef.height}mm`,
                                overflow: 'hidden'
                              }}
                            >
                              <StickerCard
                                item={currentPreviewItem}
                                config={config}
                                shopData={shopData}
                              />
                            </div>
                            {is2Row && (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: `${cell2Left}mm`,
                                  top: `${cellTop}mm`,
                                  width: `${currentSizeDef.width}mm`,
                                  height: `${currentSizeDef.height}mm`,
                                  overflow: 'hidden'
                                }}
                              >
                                <StickerCard
                                  item={currentPreviewItem}
                                  config={config}
                                  shopData={shopData}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                    Roll simulation: <strong>{is2Row ? '2 stickers per row' : '1 sticker per row'}</strong> with <strong>{gapMm}mm inter-label gap</strong> • Page: <strong>{rotTransform.pageWidthMm}×{rotTransform.pageHeightMm}mm</strong> @ <strong>{effectiveRotation}°</strong> • Cell 1: {cell1Left}mm{is2Row ? `, Cell 2: ${cell2Left}mm` : ''}
                  </div>
                </div>
              ) : (
                /* CALIBRATION GRID VIEW */
                <div style={styles.rollFeedWrapper}>
                  <div style={styles.rollLiner}>
                    <div
                      style={{
                        width: `${rollBoxWidth}px`,
                        height: `${rollBoxHeight}px`,
                        position: 'relative',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1'
                      }}
                    >
                      <div
                        style={{
                          width: `${rotTransform.pageWidthMm}mm`,
                          height: `${rotTransform.pageHeightMm}mm`,
                          transform: `scale(${rollScaleFactor})`,
                          transformOrigin: 'top left',
                          position: 'relative',
                          pointerEvents: 'none'
                        }}
                      >
                        <div
                          style={{
                            width: `${pageW}mm`,
                            height: `${pageH}mm`,
                            transform: rotTransform.sheetTransform || 'none',
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              left: `${cell1Left}mm`,
                              top: `${cellTop}mm`,
                              width: `${currentSizeDef.width}mm`,
                              height: `${currentSizeDef.height}mm`,
                              overflow: 'hidden'
                            }}
                            dangerouslySetInnerHTML={{ __html: renderCalibrationStickerHtml(is2Row ? 'LEFT LABEL' : 'LABEL 1', currentSizeDef, config) }}
                          />
                          {is2Row && (
                            <div
                              style={{
                                position: 'absolute',
                                left: `${cell2Left}mm`,
                                top: `${cellTop}mm`,
                                width: `${currentSizeDef.width}mm`,
                                height: `${currentSizeDef.height}mm`,
                                overflow: 'hidden'
                              }}
                              dangerouslySetInnerHTML={{ __html: renderCalibrationStickerHtml('RIGHT LABEL', currentSizeDef, config) }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                    Diagnostic Calibration Grid: 0.3mm outer die-cut border, dashed safe padding box ({config.safePaddingMm !== undefined ? config.safePaddingMm : 2.5}mm), crosshairs, and offsets.
                  </div>

                  {/* USB SCANNER CALIBRATION TEST */}
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    textAlign: 'left',
                    width: '100%',
                    maxWidth: `${Math.max(rollBoxWidth, 360)}px`,
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ScanLine size={16} color="#2563EB" /> USB Barcode Scanner Calibration Test
                      </div>
                      {scanTestInput && (
                        <button
                          type="button"
                          onClick={() => { setScanTestInput(''); setScanTestResult(null); scanInputRef.current?.focus(); }}
                          style={{ ...styles.pillBtn, padding: '2px 8px', fontSize: '10.5px' }}
                        >
                          Clear Test
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px', lineHeight: 1.4 }}>
                      After printing a calibration or test label, scan it with your USB barcode scanner to verify instant 1st-attempt scannability:
                      <div style={{ marginTop: '2px' }}>
                        Expected barcode: <strong style={{ color: '#0F172A' }}>"{previewBarcodeValue}"</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        ref={scanInputRef}
                        type="text"
                        value={scanTestInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setScanTestInput(val);
                          const cleanVal = val.trim();
                          const expected = previewBarcodeValue.trim();
                          if (cleanVal.length > 0) {
                            setScanTestResult({
                              matched: cleanVal === expected,
                              scanned: cleanVal,
                              expected
                            });
                          } else {
                            setScanTestResult(null);
                          }
                        }}
                        placeholder="Click here and scan label with USB scanner..."
                        style={{
                          ...styles.textInput,
                          borderColor: scanTestResult ? (scanTestResult.matched ? '#10B981' : '#EF4444') : '#CBD5E1',
                          backgroundColor: scanTestResult ? (scanTestResult.matched ? '#ECFDF5' : '#FEF2F2') : '#FFFFFF',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          fontWeight: '700'
                        }}
                      />
                    </div>
                    {scanTestResult && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: scanTestResult.matched ? '#D1FAE5' : '#FEE2E2',
                        color: scanTestResult.matched ? '#065F46' : '#991B1B'
                      }}>
                        {scanTestResult.matched ? (
                          <>
                            <Check size={14} color="#059669" />
                            <span>PASS / MATCH! Scanned barcode: "{scanTestResult.scanned}" ({scanTestResult.scanned.length} chars)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={14} color="#DC2626" />
                            <span>MISMATCH: Scanned "{scanTestResult.scanned}", expected "{scanTestResult.expected}"</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* THERMAL PRINT SETUP HELPER BOX */}
              <div style={styles.thermalHelperBox}>
                <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', color: '#92400E' }}>
                  <Info size={14} style={{ flexShrink: 0 }} /> Thermal Printer Chrome Print Setup:
                </div>
                <div style={{ lineHeight: 1.45, color: '#78350F' }}>
                  Set <strong>Paper size</strong> to match sheet ({rotTransform.pageWidthMm}×{rotTransform.pageHeightMm} mm), set <strong>Margins = None</strong>, <strong>Scale = 100%</strong>, and turn off <strong>Headers and footers</strong>. Current Rotation: <strong>{effectiveRotation}°</strong> (Swaps page dimensions when 90° or 270° to defeat driver auto-rotation).
                </div>
              </div>

              {/* USB SCANNER INFO CHIP */}
              <div style={styles.scannerInfoChip}>
                <Check size={13} style={{ flexShrink: 0 }} />
                <span>
                  High-contrast Code128 vector barcode (SVG). Crisp edges with integer printer dot module width for 100% reliable USB HID & camera scanning.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              style={styles.btnSecondary}
              onClick={handleSaveLayout}
              title="Save this sticker layout as default"
            >
              {savedSuccess ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669' }}>
                  <Check size={15} /> Saved!
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Save size={15} /> Save Layout as Default
                </span>
              )}
            </button>
            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => setConfig({ ...DEFAULT_STICKER_CONFIG, defaultMfgDate: getTodayIsoDate() })}
            >
              Reset
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              style={styles.btnCalibration}
              onClick={handleCalibrationPrint}
              disabled={isPrinting}
              title="Print a diagnostic calibration row with boundary lines and arrows to check orientation & alignment"
            >
              <Crosshair size={14} /> Calibration Print
            </button>
            <button type="button" style={styles.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              style={styles.btnTestPrint}
              onClick={handleTestPrint}
              disabled={isPrinting}
              title="Print a single test sticker to verify alignment and scanning"
            >
              <Printer size={15} /> Test Print (1 Sticker)
            </button>
            <button
              type="button"
              style={styles.btnPrint}
              onClick={handlePrint}
              disabled={isPrinting || totalStickersCount === 0}
            >
              {isPrinting ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCw size={16} className="spin" /> Printing...
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Printer size={16} /> Print {totalStickersCount} Sticker{totalStickersCount !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '16px',
    backdropFilter: 'blur(3px)'
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    width: '1000px',
    maxWidth: '96vw',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    border: '1px solid #E2E8F0'
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#E0F2FE',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    margin: 0,
    fontSize: '17px',
    fontWeight: '900',
    color: '#0F172A'
  },
  subtitle: {
    margin: '2px 0 0 0',
    fontSize: '12px',
    color: '#64748B'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    color: '#64748B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  leftCol: {
    flex: 1.1,
    overflowY: 'auto',
    padding: '16px 20px',
    borderRight: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  rightCol: {
    flex: 0.9,
    overflowY: 'auto',
    padding: '16px 20px',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    flexDirection: 'column'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    display: 'flex',
    alignItems: 'center'
  },
  smallLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    marginBottom: '3px',
    display: 'block'
  },
  pillGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px'
  },
  pillBtn: {
    padding: '8px 10px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease'
  },
  pillBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
    color: '#0369A1',
    boxShadow: '0 0 0 2px rgba(2, 132, 199, 0.2)'
  },
  toggleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    backgroundColor: '#F1F5F9',
    padding: '10px',
    borderRadius: '8px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  checkbox: {
    accentColor: '#0284C7',
    width: '15px',
    height: '15px',
    cursor: 'pointer'
  },
  textInput: {
    width: '100%',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '12.5px',
    color: '#0F172A',
    boxSizing: 'border-box'
  },
  numberInput: {
    width: '54px',
    padding: '4px 6px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '12.5px',
    fontWeight: '700',
    textAlign: 'center'
  },
  selectInput: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    fontSize: '12.5px',
    backgroundColor: '#FFFFFF',
    color: '#0F172A'
  },
  itemsList: {
    maxHeight: '140px',
    overflowY: 'auto',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF'
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #F1F5F9',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: 'transparent',
    cursor: 'pointer'
  },
  itemRowActive: {
    backgroundColor: '#F0F9FF',
    borderLeftColor: '#0284C7'
  },
  countBadge: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    padding: '2px 8px',
    borderRadius: '10px'
  },
  qtyControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  qtyBtn: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#0F172A',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  qtyInput: {
    width: '44px',
    height: '24px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: '800',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '4px',
    padding: '0 2px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  qtyValue: {
    fontSize: '12px',
    fontWeight: '800',
    minWidth: '18px',
    textAlign: 'center'
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  previewViewToggle: {
    display: 'flex',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid #CBD5E1'
  },
  previewToggleBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '700',
    border: 'none',
    backgroundColor: '#FFFFFF',
    color: '#64748B',
    cursor: 'pointer'
  },
  previewToggleBtnActive: {
    backgroundColor: '#0284C7',
    color: '#FFFFFF'
  },
  previewContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '260px',
    backgroundColor: '#E2E8F0',
    borderRadius: '12px',
    padding: '16px',
    position: 'relative'
  },
  singlePreviewWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px'
  },
  rollFeedWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxHeight: '340px',
    overflowY: 'auto'
  },
  rollLiner: {
    backgroundColor: '#FEF3C7',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px dashed #F59E0B'
  },
  stickerMockup: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #94A3B8',
    borderRadius: '4px',
    boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  stickerInnerMockup: {
    width: '100%',
    height: '100%',
    padding: '6px 8px 4px 8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center',
    boxSizing: 'border-box'
  },
  previewShopName: {
    fontSize: '10.5px',
    fontWeight: '900',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%'
  },
  previewAddress: {
    fontSize: '8px',
    color: '#475569',
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%'
  },
  previewAddressBlock: {
    width: '100%',
    textAlign: 'center',
    lineHeight: 1.15,
    margin: '1px 0'
  },
  previewAddressLine: {
    fontSize: '7.5px',
    color: '#475569',
    lineHeight: 1.15,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%'
  },
  previewProductName: {
    fontSize: '11px',
    fontWeight: '800',
    color: '#000000',
    lineHeight: 1.15,
    margin: '2px 0',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  previewPriceRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '9.5px',
    lineHeight: 1.1
  },
  previewMrp: {
    textDecoration: 'line-through',
    color: '#64748B',
    fontWeight: '700'
  },
  previewPrice: {
    fontWeight: '900',
    color: '#000000'
  },
  previewVariantRow: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    fontSize: '8.5px',
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 1.1,
    margin: '1px 0'
  },
  previewVariantBadge: {
    display: 'inline-block',
    whiteSpace: 'nowrap'
  },
  previewDateRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '8px',
    fontWeight: '600',
    color: '#334155'
  },
  previewBarcodeContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '1px'
  },
  previewBarcode: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  previewBarcodeText: {
    fontSize: '9px',
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#000000',
    letterSpacing: '0.8px',
    marginTop: '1px',
    textAlign: 'center',
    lineHeight: 1.1
  },
  scannerInfoChip: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10.5px',
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #BAE6FD',
    maxWidth: '100%'
  },
  footer: {
    padding: '12px 20px',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  btnSecondary: {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#334155',
    fontWeight: '700',
    fontSize: '12.5px',
    cursor: 'pointer'
  },
  btnGhost: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '6px 8px'
  },
  btnPrint: {
    padding: '9px 18px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.3)'
  },
  btnTestPrint: {
    padding: '9px 14px',
    borderRadius: '6px',
    border: '1px solid #0284C7',
    backgroundColor: '#F0F9FF',
    color: '#0369A1',
    fontWeight: '800',
    fontSize: '12.5px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  btnCalibration: {
    padding: '9px 14px',
    borderRadius: '6px',
    border: '1px solid #0D9488',
    backgroundColor: '#F0FDFA',
    color: '#0F766E',
    fontWeight: '800',
    fontSize: '12.5px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  },
  barcodeErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#FEF2F2',
    color: '#991B1B',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11.5px',
    fontWeight: '700',
    marginBottom: '10px'
  },
  thermalHelperBox: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    borderRadius: '8px',
    fontSize: '11px',
    textAlign: 'left',
    width: '100%',
    boxSizing: 'border-box'
  }
};
