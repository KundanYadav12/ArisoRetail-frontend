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
  ScanLine,
  Copy
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
  renderSingleStickerHtml,
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
  resolveItemWeight,
  resolveSheetLayout,
  renderOrientationTestStickerHtml,
  renderFullWidthRulerSvg
} from '../utils/stickerGenerator';
import { apiFetch } from '../utils/api';
import {
  checkAgentHealth,
  getAgentPrinters,
  printViaAgent,
  testAgentPrint,
  DEFAULT_AGENT_URL
} from '../utils/printAgentService';

/**
 * Shared StickerCard component for pixel-perfect 1:1 Live Preview
 * Matches the exact HTML/CSS generated in print document
 */
export function StickerCard({ item, config, shopData = {} }) {
  const html = useMemo(() => {
    return renderSingleStickerHtml(item, config, shopData);
  }, [item, config, shopData]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
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
      mediaAlignment: saved.mediaAlignment || 'centre',
      printheadWidthMm: saved.printheadWidthMm !== undefined ? saved.printheadWidthMm : 104,
      linerWidthMm: saved.linerWidthMm !== undefined ? saved.linerWidthMm : 83,
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
      density: saved.density || 8,
      printMode: saved.printMode || 'portrait_sheet',
      paperSizeName: saved.paperSizeName || 'USER',
      paperWidthMm: saved.paperWidthMm !== undefined ? saved.paperWidthMm : '',
      paperHeightMm: saved.paperHeightMm !== undefined ? saved.paperHeightMm : '',
      sheetColumns: saved.sheetColumns !== undefined ? saved.sheetColumns : (saved.rows === 1 ? 1 : 2),
      sheetRows: saved.sheetRows !== undefined ? saved.sheetRows : ''
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
  const [isPreparingLabels, setIsPreparingLabels] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const lastPrintActionRef = useRef(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [printSuccessMsg, setPrintSuccessMsg] = useState('');
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('__browser_print__');
  const [agentStatus, setAgentStatus] = useState('checking'); // 'checking' | 'connected' | 'offline'
  const [agentInfo, setAgentInfo] = useState(null);
  const [agentChecking, setAgentChecking] = useState(false);

  // Detect available Windows printers (Local Print Agent or Electron or backend dynamic discovery)
  const refreshPrintersList = async () => {
    setAgentChecking(true);
    if (window.electron && typeof window.electron.getPrinters === 'function') {
      try {
        const printers = await window.electron.getPrinters();
        if (Array.isArray(printers)) {
          setSystemPrinters(printers);
          const defaultPrn = printers.find(p => p.isDefault) || printers[0];
          if (defaultPrn && selectedPrinter === '__browser_print__') setSelectedPrinter(defaultPrn.name);
          setAgentStatus('connected');
          setAgentInfo({ connected: true, agent: 'Electron Native Spooler', defaultPrinter: defaultPrn?.name });
        }
      } catch (e) {
        console.warn('Could not fetch electron printers:', e);
      } finally {
        setAgentChecking(false);
      }
      return;
    }

    // Web Browser: Query Local Print Agent first for direct Win32 Spooler printers (Zero Dialog)
    try {
      const health = await checkAgentHealth(1500);
      if (health.connected) {
        setAgentStatus('connected');
        setAgentInfo(health);
        const agentPrintersRes = await getAgentPrinters(3500);
        if (agentPrintersRes.ok && Array.isArray(agentPrintersRes.printers) && agentPrintersRes.printers.length > 0) {
          setSystemPrinters(agentPrintersRes.printers);
          setAgentChecking(false);
          return;
        }
      } else {
        setAgentStatus('offline');
        setAgentInfo(null);
      }
    } catch (agentErr) {
      console.warn('Agent check failed:', agentErr);
      setAgentStatus('offline');
    }

    // Secondary fallback: Query backend /api/printers/discover
    try {
      const res = await apiFetch('/api/printers/discover');
      const data = await res.json();
      const list = (data.discovered || data.printers || []).filter(p => !p.is_virtual);
      if (Array.isArray(list) && list.length > 0) {
        setSystemPrinters(list);
      }
    } catch (e) {
      console.warn('Could not fetch backend printers:', e);
    } finally {
      setAgentChecking(false);
    }
  };

  useEffect(() => {
    if (open) {
      refreshPrintersList();
    }
  }, [open]);

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
          mediaAlignment: printerProfile.mediaAlignment !== undefined ? printerProfile.mediaAlignment : prev.mediaAlignment,
          printheadWidthMm: printerProfile.printheadWidthMm !== undefined ? printerProfile.printheadWidthMm : prev.printheadWidthMm,
          linerWidthMm: printerProfile.linerWidthMm !== undefined ? printerProfile.linerWidthMm : prev.linerWidthMm,
          mediaWidthMm: printerProfile.mediaWidthMm !== undefined ? printerProfile.mediaWidthMm : prev.mediaWidthMm,
          printMode: printerProfile.printMode !== undefined ? printerProfile.printMode : prev.printMode,
          paperSizeName: printerProfile.paperSizeName !== undefined ? printerProfile.paperSizeName : prev.paperSizeName,
          paperWidthMm: printerProfile.paperWidthMm !== undefined ? printerProfile.paperWidthMm : prev.paperWidthMm,
          paperHeightMm: printerProfile.paperHeightMm !== undefined ? printerProfile.paperHeightMm : prev.paperHeightMm,
          sheetColumns: printerProfile.sheetColumns !== undefined ? printerProfile.sheetColumns : prev.sheetColumns,
          sheetRows: printerProfile.sheetRows !== undefined ? printerProfile.sheetRows : prev.sheetRows
        }));
      }
    }
  }, [selectedPrinter]);

  // Find active printer details from detected systemPrinters
  const selectedPrinterObj = useMemo(() => {
    if (!selectedPrinter || selectedPrinter === '__browser_print__') return null;
    return systemPrinters.find(p => p.name === selectedPrinter || p.displayName === selectedPrinter) || null;
  }, [selectedPrinter, systemPrinters]);

  // Auto-prefill Paper WxH from driver form if designer values are blank
  useEffect(() => {
    if (selectedPrinterObj && selectedPrinterObj.paperWidthMm > 0 && selectedPrinterObj.paperHeightMm > 0) {
      if (!config.paperWidthMm && !config.paperHeightMm) {
        setConfig(prev => ({
          ...prev,
          paperWidthMm: selectedPrinterObj.paperWidthMm,
          paperHeightMm: selectedPrinterObj.paperHeightMm,
          paperSizeName: selectedPrinterObj.formName || prev.paperSizeName
        }));
      }
    }
  }, [selectedPrinterObj]);

  // Copy driver custom form setup steps to clipboard
  const handleCopySetupSteps = () => {
    const stepsText = `TSC TE244 Windows Driver Form Setup Steps:
1. Open Windows Control Panel → Devices and Printers (or Settings → Printers & Scanners).
2. Right-click "TSC TE244" (or your label printer) → select "Printing Preferences".
3. Navigate to the "Page Setup" tab.
4. Click "New..." (or Edit custom stock).
5. Name: ${layout.paperSizeName}
6. Width: ${layout.paperW} mm
7. Height: ${layout.paperH} mm
8. Type: Die-Cut Label with ${layout.gap} mm gap
9. Orientation: Portrait, Rotation: 0°
10. Click OK → Apply → OK.
11. In Chrome print dialog: Paper size must show ${layout.paperSizeName} (${layout.paperW}×${layout.paperH} mm), Margins None, Scale 100%.`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(stepsText).then(() => {
        setPrintSuccessMsg('Windows form setup steps copied to clipboard!');
      }).catch(() => {
        alert(stepsText);
      });
    } else {
      alert(stepsText);
    }
  };

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

  const layout = useMemo(() => {
    return resolveSheetLayout(config);
  }, [config]);

  const driverFormMismatch = useMemo(() => {
    if (!selectedPrinterObj || !selectedPrinterObj.paperWidthMm || !selectedPrinterObj.paperHeightMm) {
      return null;
    }
    const diffW = Math.abs(selectedPrinterObj.paperWidthMm - layout.paperW);
    const diffH = Math.abs(selectedPrinterObj.paperHeightMm - layout.paperH);
    if (diffW > 1.5 || diffH > 1.5) {
      return {
        driverW: selectedPrinterObj.paperWidthMm,
        driverH: selectedPrinterObj.paperHeightMm,
        formName: selectedPrinterObj.formName || 'Current Form',
        designerW: layout.paperW,
        designerH: layout.paperH
      };
    }
    return null;
  }, [selectedPrinterObj, layout.paperW, layout.paperH]);

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

  const isPortraitSheetMode = config.printMode !== 'legacy_landscape';

  const targetStickersCount = useMemo(() => {
    if (items.length === 1) {
      const itKey = currentPreviewItem?.id || previewItemIndex;
      return Math.max(1, parseInt(itemQuantities[itKey], 10) || 1);
    }
    return Math.max(1, totalStickersCount || 1);
  }, [items.length, currentPreviewItem, previewItemIndex, itemQuantities, totalStickersCount]);

  const totalSheetsNeeded = useMemo(() => {
    return Math.max(1, Math.ceil(targetStickersCount / layout.stickersPerSheet));
  }, [targetStickersCount, layout.stickersPerSheet]);

  // Number of roll rows dynamically computed based on quantity for legacy preview
  const rollRowsCount = useMemo(() => {
    const rowsNeeded = is2Row ? Math.ceil(targetStickersCount / 2) : targetStickersCount;
    return Math.min(Math.max(1, rowsNeeded), 20);
  }, [targetStickersCount, is2Row]);

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

  const naturalSingleWidthPx = currentSizeDef.width * 3.779528;
  const naturalSingleHeightPx = currentSizeDef.height * 3.779528;
  const singleScaleFactor = useMemo(() => {
    return Math.min(2.0, Math.max(1.1, 290 / Math.max(naturalSingleWidthPx, naturalSingleHeightPx)));
  }, [naturalSingleWidthPx, naturalSingleHeightPx]);
  const singlePreviewBoxWidth = Math.round(naturalSingleWidthPx * singleScaleFactor);
  const singlePreviewBoxHeight = Math.round(naturalSingleHeightPx * singleScaleFactor);

  // Portrait sheet preview dimensions
  const naturalSheetWidthPx = layout.paperW * 3.779528;
  const naturalSheetHeightPx = layout.paperH * 3.779528;
  const sheetScaleFactor = useMemo(() => {
    return Math.min(1.3, Math.max(0.65, 340 / Math.max(naturalSheetWidthPx, naturalSheetHeightPx)));
  }, [naturalSheetWidthPx, naturalSheetHeightPx]);
  const sheetBoxWidth = Math.round(naturalSheetWidthPx * sheetScaleFactor);
  const sheetBoxHeight = Math.round(naturalSheetHeightPx * sheetScaleFactor);

  // Legacy roll preview dimensions
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
    return validateBarcodeCode128(previewBarcodeValue, { widthMm: currentSizeDef.width, dpi: config.dpi || 203 });
  }, [previewBarcodeValue, currentSizeDef.width, config.dpi]);

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

  const handlePrintInternal = async (itemsToPrint, isTestPrint = false, preOpenedWin = null) => {
    if (config.printWeight) {
      const v = validateWeightInput(config);
      if (!v.isValid) {
        if (preOpenedWin && !preOpenedWin.closed) {
          try { preOpenedWin.close(); } catch (_) {}
        }
        alert('Weight validation error: ' + v.error);
        return;
      }
    }

    if (driverFormMismatch) {
      const proceed = window.confirm(
        `Driver Form Mismatch Warning:\n\nDetected Windows driver form is ${driverFormMismatch.driverW}×${driverFormMismatch.driverH} mm ("${driverFormMismatch.formName}"), but the designer sheet is configured as ${driverFormMismatch.designerW}×${driverFormMismatch.designerH} mm.\n\nPrinting with mismatched form size may cause labels to print misaligned or skip rows.\n\nDo you want to continue anyway?`
      );
      if (!proceed) {
        if (preOpenedWin && !preOpenedWin.closed) {
          try { preOpenedWin.close(); } catch (_) {}
        }
        return;
      }
    }

    setIsPrinting(true);
    setPrintSuccessMsg('');
    try {
      await ensureStickerFontLoaded(config.fontFamily);
      const isBrowserPrintTarget = selectedPrinter === '__browser_print__' || (!window.electron && agentStatus !== 'connected');
      const targetPrinter = selectedPrinter || agentInfo?.defaultPrinter || 'TSC TE244';

      // 1. Electron Desktop Native Direct TSPL Spooler Printing (if running in desktop app)
      if (!isBrowserPrintTarget && window.electron && typeof window.electron.printWindowsRaw === 'function') {
        const tsplRes = await buildTsplStickerPayload(itemsToPrint, config, shopData);
        if (tsplRes?.b64Payload) {
          const rawRes = await window.electron.printWindowsRaw(targetPrinter, tsplRes.b64Payload);
          if (rawRes && rawRes.success !== false) {
            setPrintSuccessMsg(isTestPrint ? 'Test sticker printed!' : `Printed ${itemsToPrint.length} sticker(s) to "${targetPrinter}"!`);
            setTimeout(() => setPrintSuccessMsg(''), 4500);
            return;
          }
        }
      }

      // 2. Web Browser: Local Print Agent Direct Win32 Spooler Printing (only if agent is actively connected)
      if (!isBrowserPrintTarget && agentStatus === 'connected') {
        try {
          const tsplRes = await buildTsplStickerPayload(itemsToPrint, config, shopData);
          if (tsplRes?.tsplPayload) {
            const agentRes = await printViaAgent(targetPrinter, tsplRes.tsplPayload, {
              docTitle: isTestPrint ? 'Ariso Test Sticker' : `Ariso Product Labels (${itemsToPrint.length})`
            });
            if (agentRes && agentRes.success) {
              setPrintSuccessMsg(isTestPrint ? 'Test sticker printed directly to printer!' : `Printed ${itemsToPrint.length} sticker(s) to "${targetPrinter}"!`);
              setTimeout(() => setPrintSuccessMsg(''), 4500);
              return;
            }
          }
        } catch (_) {}
      }

      // 3. Browser Print Dialog (Dedicated Blob Window Popup - zero agent requirement)
      const res = await printStickers(itemsToPrint, config, shopData, selectedPrinter || null, {
        popupWindow: preOpenedWin
      });

      if (res?.popupBlocked) {
        setPopupBlocked(true);
        return;
      }

      setPopupBlocked(false);
      if (res && res.success) {
        setPrintSuccessMsg(isTestPrint ? 'Test sticker print dialog opened!' : `Stickers print dialog opened!`);
        setTimeout(() => setPrintSuccessMsg(''), 4500);
      }
    } catch (err) {
      if (preOpenedWin && !preOpenedWin.closed) {
        try { preOpenedWin.close(); } catch (_) {}
      }
      alert('Sticker printing error: ' + (err.message || 'Unknown printing failure'));
    } finally {
      setIsPrinting(false);
      setIsPreparingLabels(false);
    }
  };

  const handlePrint = async () => {
    lastPrintActionRef.current = handlePrint;
    const isBrowserPrintTarget = selectedPrinter === '__browser_print__' || (!window.electron && agentStatus !== 'connected');
    let preOpenedWin = null;

    if (isBrowserPrintTarget) {
      try {
        preOpenedWin = window.open('about:blank', 'ariso_label_print', 'popup,width=900,height=700');
        if (preOpenedWin) {
          try {
            preOpenedWin.document.write(`<!DOCTYPE html><html><head><title>Ariso Label Print</title></head><body style="background:#525659;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><div style="text-align:center;"><div style="font-size:16px;font-weight:700;">Preparing labels...</div><div style="font-size:12px;color:#cbd5e1;margin-top:6px;">Generating ${totalStickersCount} label(s)...</div></div></body></html>`);
          } catch (_) {}
        } else {
          setPopupBlocked(true);
          return;
        }
      } catch (err) {
        console.warn('Popup blocked:', err);
        setPopupBlocked(true);
        return;
      }
    }

    if (totalStickersCount > 50) {
      setIsPreparingLabels(true);
      await new Promise(r => setTimeout(r, 20));
    }

    handlePrintInternal(printItemsList, false, preOpenedWin);
  };

  const handleTestPrint = () => {
    lastPrintActionRef.current = handleTestPrint;
    const is2Row = parseInt(config.rows, 10) === 2;
    const testItem = [{
      ...currentPreviewItem,
      printQty: is2Row ? 2 : 1
    }];

    const isBrowserPrintTarget = selectedPrinter === '__browser_print__' || (!window.electron && agentStatus !== 'connected');
    let preOpenedWin = null;

    if (isBrowserPrintTarget) {
      try {
        preOpenedWin = window.open('about:blank', 'ariso_label_print', 'popup,width=900,height=700');
        if (preOpenedWin) {
          try {
            preOpenedWin.document.write(`<!DOCTYPE html><html><head><title>Ariso Test Print</title></head><body style="background:#525659;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><div style="text-align:center;"><div style="font-size:16px;font-weight:700;">Preparing test sticker...</div></div></body></html>`);
          } catch (_) {}
        } else {
          setPopupBlocked(true);
          return;
        }
      } catch (err) {
        setPopupBlocked(true);
        return;
      }
    }

    handlePrintInternal(testItem, true, preOpenedWin);
  };

  const handleCalibrationPrint = async () => {
    lastPrintActionRef.current = handleCalibrationPrint;
    const isBrowserPrintTarget = selectedPrinter === '__browser_print__' || (!window.electron && agentStatus !== 'connected');
    let preOpenedWin = null;

    if (isBrowserPrintTarget) {
      try {
        preOpenedWin = window.open('about:blank', 'ariso_label_print', 'popup,width=900,height=700');
        if (preOpenedWin) {
          try {
            preOpenedWin.document.write(`<!DOCTYPE html><html><head><title>Ariso Calibration Print</title></head><body style="background:#525659;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><div style="text-align:center;"><div style="font-size:16px;font-weight:700;">Preparing calibration test...</div></div></body></html>`);
          } catch (_) {}
        } else {
          setPopupBlocked(true);
          return;
        }
      } catch (err) {
        setPopupBlocked(true);
        return;
      }
    }

    if (driverFormMismatch) {
      const proceed = window.confirm(
        `Driver Form Mismatch Warning:\n\nDetected Windows driver form is ${driverFormMismatch.driverW}×${driverFormMismatch.driverH} mm ("${driverFormMismatch.formName}"), but the designer sheet is configured as ${driverFormMismatch.designerW}×${driverFormMismatch.designerH} mm.\n\nDo you want to continue anyway?`
      );
      if (!proceed) {
        if (preOpenedWin && !preOpenedWin.closed) {
          try { preOpenedWin.close(); } catch (_) {}
        }
        return;
      }
    }

    setIsPrinting(true);
    setPrintSuccessMsg('');
    try {
      await ensureStickerFontLoaded(config.fontFamily);
      const targetPrinter = selectedPrinter || agentInfo?.defaultPrinter || 'TSC TE244';

      // 1. Electron Desktop Native Direct TSPL Spooler Printing
      if (!isBrowserPrintTarget && window.electron && typeof window.electron.printWindowsRaw === 'function') {
        const tsplPayload = buildCalibrationTsplPayload(config, shopData);
        if (tsplPayload) {
          const b64 = btoa(unescape(encodeURIComponent(tsplPayload)));
          const rawRes = await window.electron.printWindowsRaw(targetPrinter, b64);
          if (rawRes && rawRes.success !== false) {
            setPrintSuccessMsg(`Calibration test row printed directly to "${targetPrinter}"!`);
            setTimeout(() => setPrintSuccessMsg(''), 4500);
            return;
          }
        }
      }

      // 2. Web Browser: Local Print Agent Direct Win32 Spooler Printing (only if agent is actively connected)
      if (!isBrowserPrintTarget && agentStatus === 'connected') {
        try {
          const tsplPayload = buildCalibrationTsplPayload(config, shopData);
          if (tsplPayload) {
            const agentRes = await printViaAgent(targetPrinter, tsplPayload, {
              docTitle: 'Ariso Calibration Label'
            });
            if (agentRes && agentRes.success) {
              setPrintSuccessMsg(`Calibration test row printed directly to "${targetPrinter}"!`);
              setTimeout(() => setPrintSuccessMsg(''), 4500);
              return;
            }
          }
        } catch (_) {}
      }

      // 3. Browser Print Dialog (Dedicated Blob Window Popup - zero agent requirement)
      const res = await printCalibrationStickers(config, shopData, selectedPrinter || null, {
        popupWindow: preOpenedWin
      });

      if (res?.popupBlocked) {
        setPopupBlocked(true);
        return;
      }

      setPopupBlocked(false);
      if (res && res.success) {
        setPrintSuccessMsg('Calibration test row print dialog opened!');
        setTimeout(() => setPrintSuccessMsg(''), 4500);
      }
    } catch (err) {
      if (preOpenedWin && !preOpenedWin.closed) {
        try { preOpenedWin.close(); } catch (_) {}
      }
      alert('Calibration print error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPrinting(false);
      setIsPreparingLabels(false);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {agentStatus === 'connected' ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#065F46'
                }}
                title="Direct Win32 RAW Spooling enabled via 127.0.0.1:9101 (Zero dialog, pixel-perfect 203 DPI)"
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }}></span>
                <span>Print Agent Active: {selectedPrinter || agentInfo?.defaultPrinter || 'TSC TE244'}</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#0369A1'
                }}
                title="Browser print mode active (Direct Chrome dialog - no agent needed)"
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0284C7' }}></span>
                <span>Browser Print Ready</span>
              </div>
            )}
            <button style={styles.closeBtn} onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
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

              {/* Print Mode Selector */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '5px' }}>
                  Print Mode (Browser & Driver):
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    style={{
                      ...styles.pillBtn,
                      textAlign: 'left',
                      padding: '8px 10px',
                      ...(config.printMode !== 'legacy_landscape' ? styles.pillBtnActive : {})
                    }}
                    onClick={() => handleConfigChange('printMode', 'portrait_sheet')}
                  >
                    <div style={{ fontWeight: '800', fontSize: '12px' }}>Portrait sheet (recommended)</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.85 }}>Vertical Portrait Sheet · Upright</div>
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.pillBtn,
                      textAlign: 'left',
                      padding: '8px 10px',
                      ...(config.printMode === 'legacy_landscape' ? styles.pillBtnActive : {})
                    }}
                    onClick={() => handleConfigChange('printMode', 'legacy_landscape')}
                  >
                    <div style={{ fontWeight: '800', fontSize: '12px' }}>Legacy 2-up row (landscape)</div>
                    <div style={{ fontSize: '9.5px', opacity: 0.85 }}>Single row · Driver rotated</div>
                  </button>
                </div>
              </div>

              {/* Driver Form Configuration for Portrait Sheet */}
              {isPortraitSheetMode && (
                <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0F172A' }}>
                      TSC TE244 Driver Form Settings:
                    </span>
                    <span style={{ fontSize: '10px', background: '#E0F2FE', color: '#0369A1', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                      Portrait Sheet
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569' }}>Paper Size Name:</span>
                      <input
                        type="text"
                        value={config.paperSizeName || ''}
                        onChange={(e) => handleConfigChange('paperSizeName', e.target.value)}
                        placeholder="USER"
                        style={{ ...styles.textInput, padding: '4px 8px', fontSize: '11px', marginTop: '2px' }}
                        title="Form name in TSC TE244 Windows Printing Preferences (default 'USER')"
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569' }}>Columns / Sheet:</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '2px' }}>
                        {[1, 2].map((c) => (
                          <button
                            key={c}
                            type="button"
                            style={{
                              ...styles.pillBtn,
                              padding: '4px 6px',
                              fontSize: '11px',
                              fontWeight: '700',
                              ...(layout.cols === c ? styles.pillBtnActive : {})
                            }}
                            onClick={() => {
                              handleConfigChange('sheetColumns', c);
                              handleConfigChange('rows', c);
                            }}
                          >
                            {c} Col
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>Paper W (mm):</span>
                      <input
                        type="number"
                        step="0.5"
                        min="10"
                        max="150"
                        value={config.paperWidthMm !== undefined ? config.paperWidthMm : ''}
                        onChange={(e) => handleConfigChange('paperWidthMm', e.target.value)}
                        placeholder={String(layout.paperW)}
                        style={{ ...styles.numberInput, width: '100%', boxSizing: 'border-box', marginTop: '2px' }}
                        title={`Form width in mm (default ${layout.paperW} mm)`}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>Paper H (mm):</span>
                      <input
                        type="number"
                        step="0.5"
                        min="10"
                        max="300"
                        value={config.paperHeightMm !== undefined ? config.paperHeightMm : ''}
                        onChange={(e) => handleConfigChange('paperHeightMm', e.target.value)}
                        placeholder={String(layout.paperH)}
                        style={{ ...styles.numberInput, width: '100%', boxSizing: 'border-box', marginTop: '2px' }}
                        title={`Form height in mm (must be > Paper W for portrait, default ${layout.paperH} mm)`}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>Rows / Sheet:</span>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="20"
                        value={config.sheetRows !== undefined ? config.sheetRows : ''}
                        onChange={(e) => handleConfigChange('sheetRows', e.target.value)}
                        placeholder={String(layout.rows)}
                        style={{ ...styles.numberInput, width: '100%', boxSizing: 'border-box', marginTop: '2px' }}
                        title={`Rows per sheet (default floor(paperH / (labelH + gap)) = ${layout.rows})`}
                      />
                    </div>
                  </div>

                  <div style={{ fontSize: '10px', color: '#0369A1', marginTop: '6px', fontWeight: '600' }}>
                    Form: <strong>{layout.paperSizeName} ({layout.paperW} × {layout.paperH} mm)</strong> · Grid: <strong>{layout.cols} col × {layout.rows} row ({layout.stickersPerSheet} labels/sheet)</strong>
                  </div>

                  {/* Chrome Print Dialog Checklist & Copy Setup Steps Button (Requirement 2) */}
                  <div style={{
                    marginTop: '8px',
                    padding: '8px 10px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📋 Chrome Print Dialog Checklist:</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopySetupSteps}
                        style={{
                          ...styles.pillBtn,
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          border: '1px solid #86EFAC',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Copy steps to create the custom form in Windows driver"
                      >
                        <Copy size={11} /> Copy setup steps
                      </button>
                    </div>
                    <div style={{ fontSize: '10px', color: '#14532D', lineHeight: 1.45 }}>
                      In Chrome's print dialog the Paper size must show <strong>{layout.paperSizeName} ({layout.paperW}×{layout.paperH} mm)</strong>, Margins <strong>None</strong>, Scale <strong>100%</strong>.
                    </div>
                  </div>
                </div>
              )}

              {/* Roll Format: 1-Row vs 2-Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    ...styles.pillBtn,
                    ...(parseInt(config.rows, 10) === 1 ? styles.pillBtnActive : {})
                  }}
                  onClick={() => {
                    handleConfigChange('rows', 1);
                    handleConfigChange('sheetColumns', 1);
                  }}
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
                  onClick={() => {
                    handleConfigChange('rows', 2);
                    handleConfigChange('sheetColumns', 2);
                  }}
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

              {/* MEDIA ALIGNMENT, PRINTHEAD & LINER DIMENSIONS (Requirement 3) */}
              <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.03)', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                    Media alignment on printhead:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                      { id: 'left', label: 'Left' },
                      { id: 'centre', label: 'Centre' },
                      { id: 'right', label: 'Right' }
                    ].map(al => (
                      <button
                        key={al.id}
                        type="button"
                        onClick={() => handleConfigChange('mediaAlignment', al.id)}
                        style={{
                          ...styles.pillBtn,
                          padding: '3px 8px',
                          fontSize: '10px',
                          fontWeight: '700',
                          backgroundColor: (config.mediaAlignment || 'centre') === al.id ? '#0284C7' : '#F1F5F9',
                          color: (config.mediaAlignment || 'centre') === al.id ? '#FFFFFF' : '#475569',
                          border: (config.mediaAlignment || 'centre') === al.id ? '1px solid #0284C7' : '1px solid #CBD5E1'
                        }}
                      >
                        {al.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569' }}>Printhead Width:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="50"
                        max="160"
                        value={config.printheadWidthMm ?? 104}
                        onChange={(e) => handleConfigChange('printheadWidthMm', parseFloat(e.target.value) || 104)}
                        style={{ ...styles.numberInput, width: '48px', padding: '2px 4px', fontSize: '11px' }}
                        title="TSC TE244 printhead width (default 104 mm)"
                      />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', padding: '5px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: '700', color: '#475569' }}>Liner Width:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="20"
                        max="160"
                        value={config.linerWidthMm ?? 83}
                        onChange={(e) => handleConfigChange('linerWidthMm', parseFloat(e.target.value) || 83)}
                        style={{ ...styles.numberInput, width: '48px', padding: '2px 4px', fontSize: '11px' }}
                        title="Backing paper liner width (default 83 mm for 79 mm labels)"
                      />
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                    </div>
                  </div>
                </div>

                {/* COMPUTED COLUMN X INDICATOR */}
                <div style={{
                  marginTop: '8px',
                  padding: '5px 8px',
                  background: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '6px',
                  fontSize: '10.5px',
                  color: '#0369A1',
                  fontWeight: '700',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>
                    Computed Label X: Left label X = <strong>{layout.col0X.toFixed(1)} mm</strong>{layout.cols > 1 ? `, Right label X = ${layout.col1X.toFixed(1)} mm` : ''}
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#0284C7', fontWeight: '600' }}>
                    (mediaLeft: {layout.mediaLeft.toFixed(1)} mm)
                  </span>
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
                      min="-50"
                      max="50"
                      value={config.offsetXmm ?? 0}
                      onChange={(e) => handleConfigChange('offsetXmm', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      title="Left Offset accepts negative and positive values, applied once to whole sheet"
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
                      min="-50"
                      max="50"
                      value={config.offsetYmm ?? 0}
                      onChange={(e) => handleConfigChange('offsetYmm', parseFloat(e.target.value) || 0)}
                      style={styles.numberInput}
                      title="Row Top Offset fine-tuning (-50 to +50 mm)"
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
                      Driver Fine-Tune Shift:
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#64748B' }}>
                      Nudge labels horizontally across printhead
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
                      title="Driver hardware non-printable margin adjustment"
                    />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('driverLeftMarginMm', 0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10px',
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
                    onClick={() => handleConfigChange('driverLeftMarginMm', 2.0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: (config.driverLeftMarginMm || 0) === 2.0 ? '#DCFCE7' : '#F1F5F9',
                      color: (config.driverLeftMarginMm || 0) === 2.0 ? '#16A34A' : '#475569',
                      border: (config.driverLeftMarginMm || 0) === 2.0 ? '1px solid #86EFAC' : '1px solid #CBD5E1'
                    }}
                  >
                    +2.0 mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('driverLeftMarginMm', 4.0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: (config.driverLeftMarginMm || 0) === 4.0 ? '#FEF3C7' : '#F1F5F9',
                      color: (config.driverLeftMarginMm || 0) === 4.0 ? '#D97706' : '#475569',
                      border: (config.driverLeftMarginMm || 0) === 4.0 ? '1px solid #FCD34D' : '1px solid #CBD5E1'
                    }}
                  >
                    +4.0 mm
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('driverLeftMarginMm', -2.0)}
                    style={{
                      ...styles.pillBtn,
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: '700',
                      backgroundColor: (config.driverLeftMarginMm || 0) === -2.0 ? '#FEE2E2' : '#F1F5F9',
                      color: (config.driverLeftMarginMm || 0) === -2.0 ? '#DC2626' : '#475569',
                      border: (config.driverLeftMarginMm || 0) === -2.0 ? '1px solid #FCA5A5' : '1px solid #CBD5E1'
                    }}
                  >
                    -2.0 mm
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
                <span style={{ fontSize: '10.5px', fontWeight: '800', color: isPortraitSheetMode ? '#059669' : (effectiveRotation !== 0 ? '#0284C7' : '#64748B') }}>
                  {isPortraitSheetMode ? 'Portrait Lock: 0° Upright' : `Effective: ${effectiveRotation}°`}
                </span>
              </div>

              {isPortraitSheetMode ? (
                <div style={{ padding: '9px 11px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: '800', fontSize: '12px' }}>
                    <Check size={15} /> 0° Upright Portrait Mode Active
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803D', marginTop: '3px', lineHeight: 1.4 }}>
                    Chrome sends native vertical pages ({layout.paperW}×{layout.paperH} mm) matching the TSC TE244 "{layout.paperSizeName}" driver form. Rotation is locked to 0° upright with zero software transformation so labels print along roll without rotating.
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}

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

              {agentStatus === 'connected' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '6px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '800', color: '#065F46' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }}></span>
                    <span>Local Print Agent Active (Port 9101 • Win32 RAW Spooler)</span>
                  </div>
                  <button
                    type="button"
                    onClick={refreshPrintersList}
                    disabled={agentChecking}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#047857', fontWeight: '800', textDecoration: 'underline' }}
                  >
                    {agentChecking ? '...' : 'Refresh'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px 10px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: '800', color: '#0369A1' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284C7' }}></span>
                    <span>Browser Print Active (No Agent Required)</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0284C7', lineHeight: 1.35 }}>
                    Prints directly through the Chrome print preview dialog using upright portrait sheets ({layout.paperW}×{layout.paperH} mm).
                  </div>
                </div>
              )}

              <select
                value={selectedPrinter || '__browser_print__'}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                style={styles.selectInput}
              >
                <option value="__browser_print__">
                  🌐 Browser Print Dialog (Portrait Sheet - Recommended)
                </option>
                {systemPrinters.map((p) => {
                  const tag = p.is_label ? 'Direct Spooler' : (p.type === 'usb' ? 'USB Spooler' : 'Windows Spooler');
                  return (
                    <option key={p.name} value={p.name}>
                      🖨️ Direct Spooler: {p.name} ({tag}) {p.isDefault ? '• Default' : ''}
                    </option>
                  );
                })}
              </select>

              {/* Chrome Print Dialog Hint */}
              <div style={{
                marginTop: '8px',
                padding: '7px 10px',
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#0369A1',
                lineHeight: 1.4
              }}>
                <div style={{ fontWeight: '800', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Info size={13} style={{ flexShrink: 0 }} /> Chrome Print Preview Values:
                </div>
                <div>
                  Printer: <strong>{selectedPrinter && selectedPrinter !== '__browser_print__' ? selectedPrinter : (agentInfo?.defaultPrinter || 'TSC TE244')}</strong> · Paper size: <strong>{layout.paperSizeName || 'USER'} ({layout.paperW}×{layout.paperH} mm)</strong> · Margins: <strong>None</strong> · Scale: <strong>100%</strong>
                </div>
              </div>
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

            {/* BARCODE VALIDATION ERROR & SCAN RELIABILITY BANNER */}
            {!previewBarcodeValidation.valid ? (
              <div style={styles.barcodeErrorBanner}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>Barcode Warning: {previewBarcodeValidation.error}</span>
              </div>
            ) : previewBarcodeValidation.isDense ? (
              <div style={{ ...styles.barcodeErrorBanner, backgroundColor: '#FFFBEB', borderColor: '#FCD34D', color: '#92400E' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, color: '#D97706' }} />
                <span>Barcode value too long, scan reliability reduced</span>
              </div>
            ) : null}

            {/* DRIVER FORM MISMATCH WARNING BANNER */}
            {driverFormMismatch && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FCD34D',
                borderRadius: '6px',
                marginBottom: '8px',
                color: '#92400E',
                fontSize: '11px',
                lineHeight: 1.4
              }}>
                <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Driver Form Mismatch:</strong> Windows driver reports <strong>{driverFormMismatch.driverW}×{driverFormMismatch.driverH} mm ({driverFormMismatch.formName})</strong>, but designer is set to <strong>{driverFormMismatch.designerW}×{driverFormMismatch.designerH} mm ({layout.paperSizeName})</strong>. Match the Windows driver form to prevent misalignment.
                </span>
              </div>
            )}

            {/* CONTENT TALLER THAN PAGE / ROWS SHRUNK NOTICE */}
            {layout.rowsShrunk && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #93C5FD',
                borderRadius: '6px',
                marginBottom: '8px',
                color: '#1E40AF',
                fontSize: '11px',
                lineHeight: 1.4
              }}>
                <Info size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Rows Shrunk:</strong> Requested {layout.requestedRows} rows exceed page height ({layout.paperH} mm). Automatically reduced to <strong>{layout.rows} row{layout.rows > 1 ? 's' : ''}</strong> per sheet to prevent overflow.
                </span>
              </div>
            )}

            {/* OUT OF BOUNDS WARNING BANNER */}
            {layout.isOutOfBounds && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                marginBottom: '8px',
                color: '#991B1B',
                fontSize: '11px',
                lineHeight: 1.4
              }}>
                <AlertTriangle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Printable Area Warning:</strong> Label content falls outside printable form boundary (Left edge: {layout.col0X.toFixed(1)} mm, Right edge: {layout.rightEdgeX.toFixed(1)} mm, Page: {layout.paperW} mm). Adjust Left Offset or Media Alignment.
                </span>
              </div>
            )}

            <div style={styles.previewContainer}>
              {previewMode === 'single' ? (
                /* SINGLE STICKER DETAILED PREVIEW */
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
                    {isPortraitSheetMode ? (
                      /* Upright Single Sticker (Zero Rotation) */
                      <div
                        style={{
                          width: `${currentSizeDef.width}mm`,
                          height: `${currentSizeDef.height}mm`,
                          transform: `scale(${singleScaleFactor})`,
                          transformOrigin: 'top left',
                          position: 'relative',
                          pointerEvents: 'none'
                        }}
                      >
                        <div
                          style={{
                            width: `${currentSizeDef.width}mm`,
                            height: `${currentSizeDef.height}mm`,
                            position: 'absolute',
                            top: 0,
                            left: 0,
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
                    ) : (
                      /* Legacy Rotated Simulated Virtual Print Page Box */
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
                    )}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                    Label: <strong>{currentSizeDef.width}×{currentSizeDef.height}mm</strong> {isPortraitSheetMode ? '(Upright Portrait)' : `@ ${effectiveRotation}°`} • Offset: [Left: {config.offsetXmm || 0}mm (Total: {totalLeftOffset}mm), Top: {config.offsetYmm || 0}mm] • Safe: {config.safePaddingMm !== undefined ? config.safePaddingMm : 2.5}mm
                  </div>
                </div>
              ) : previewMode === 'roll' ? (
                /* ROLL / SHEET FEED PREVIEW */
                isPortraitSheetMode ? (
                  /* PORTRAIT SHEET PREVIEW (Portrait Sheet: Grid of cells, page boundary & page count) */
                  <div style={styles.rollFeedWrapper}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                      {Array.from({ length: Math.min(totalSheetsNeeded, 4) }).map((_, sheetIdx) => (
                        <div key={sheetIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                            Sheet {sheetIdx + 1} of {totalSheetsNeeded} ({layout.paperSizeName} {layout.paperW}×{layout.paperH} mm)
                          </div>
                          <div
                            style={{
                              width: `${sheetBoxWidth}px`,
                              height: `${sheetBoxHeight}px`,
                              position: 'relative',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                              borderRadius: '3px',
                              overflow: 'hidden',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #94A3B8'
                            }}
                          >
                            {/* Simulated Portrait Print Sheet Box */}
                            <div
                              style={{
                                width: `${layout.paperW}mm`,
                                height: `${layout.paperH}mm`,
                                transform: `scale(${sheetScaleFactor})`,
                                transformOrigin: 'top left',
                                position: 'relative',
                                pointerEvents: 'none'
                              }}
                            >
                              {Array.from({ length: layout.rows }).map((_, r) => (
                                Array.from({ length: layout.cols }).map((_, c) => {
                                  const linearIdx = sheetIdx * layout.stickersPerSheet + r * layout.cols + c;
                                  const pos = layout.getCellPosition(c, r);
                                  const isFilled = linearIdx < targetStickersCount;
                                  const stickerItem = isFilled ? (items[linearIdx % items.length] || currentPreviewItem) : null;
                                  return (
                                    <div
                                      key={`cell-${c}-${r}`}
                                      style={{
                                        position: 'absolute',
                                        left: `${pos.x}mm`,
                                        top: `${pos.y}mm`,
                                        width: `${layout.labelW}mm`,
                                        height: `${layout.labelH}mm`,
                                        overflow: 'hidden',
                                        backgroundColor: isFilled ? '#FFFFFF' : 'rgba(241, 245, 249, 0.4)',
                                        border: isFilled ? '1px dashed #CBD5E1' : '1px dashed #E2E8F0',
                                        boxSizing: 'border-box'
                                      }}
                                    >
                                      {isFilled ? (
                                        <StickerCard
                                          item={stickerItem}
                                          config={config}
                                          shopData={shopData}
                                        />
                                      ) : (
                                        <div style={{
                                          width: '100%',
                                          height: '100%',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#94A3B8',
                                          fontSize: '9.5px',
                                          fontWeight: '700'
                                        }}>
                                          [ Blank / Unused ]
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {totalSheetsNeeded > 4 && (
                        <div style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                          + {totalSheetsNeeded - 4} more sheet{totalSheetsNeeded - 4 > 1 ? 's' : ''} will print in sequence
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                      Portrait sheet preview: <strong>{totalSheetsNeeded} sheet{totalSheetsNeeded > 1 ? 's' : ''} for {targetStickersCount} sticker{targetStickersCount > 1 ? 's' : ''}</strong> • Form: <strong>{layout.paperSizeName} ({layout.paperW}×{layout.paperH}mm)</strong> • Grid: <strong>{layout.cols} col × {layout.rows} row ({layout.stickersPerSheet} per sheet)</strong> • Inter-label gap: {layout.gap}mm
                    </div>
                  </div>
                ) : (
                  /* LEGACY CONTINUOUS ROLL FEED SIMULATION */
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
                )
              ) : (
                /* CALIBRATION GRID VIEW */
                <div style={styles.rollFeedWrapper}>
                  {isPortraitSheetMode ? (
                    /* PORTRAIT SHEET ORIENTATION TEST & CALIBRATION VIEW */
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                          Diagnostic Orientation Test Sheet (Form: {layout.paperSizeName} {layout.paperW}×{layout.paperH} mm)
                        </div>
                        <div
                          style={{
                            width: `${sheetBoxWidth}px`,
                            height: `${sheetBoxHeight}px`,
                            position: 'relative',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #94A3B8'
                          }}
                        >
                          <div
                            style={{
                              width: `${layout.paperW}mm`,
                              height: `${layout.paperH}mm`,
                              transform: `scale(${sheetScaleFactor})`,
                              transformOrigin: 'top left',
                              position: 'relative',
                              pointerEvents: 'none'
                            }}
                          >
                            {/* Full-width 0 to W mm Calibration Ruler across the page */}
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: `${layout.paperW}mm`,
                                zIndex: 10,
                                overflow: 'hidden'
                              }}
                              dangerouslySetInnerHTML={{
                                __html: renderFullWidthRulerSvg(layout, config)
                              }}
                            />
                            {Array.from({ length: layout.rows }).map((_, r) => (
                              Array.from({ length: layout.cols }).map((_, c) => {
                                const pos = layout.getCellPosition(c, r);
                                return (
                                  <div
                                    key={`cal-${c}-${r}`}
                                    style={{
                                      position: 'absolute',
                                      left: `${pos.x}mm`,
                                      top: `${pos.y}mm`,
                                      width: `${layout.labelW}mm`,
                                      height: `${layout.labelH}mm`,
                                      overflow: 'hidden'
                                    }}
                                    dangerouslySetInnerHTML={{
                                      __html: renderOrientationTestStickerHtml(`CELL (${c + 1}, ${r + 1})`, currentSizeDef, config, layout)
                                    }}
                                  />
                                );
                              })
                            ))}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                        Orientation Test Grid: Upright arrows <strong>TOP ↑</strong> & <strong>FEED ↓</strong> in every cell, 0.3mm cut borders, and paper {layout.paperW}×{layout.paperH}mm.
                      </div>

                      {/* Driver Setup Instructions Card */}
                      <div style={{
                        marginTop: '12px',
                        padding: '12px 14px',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        textAlign: 'left',
                        width: '100%',
                        maxWidth: `${Math.max(sheetBoxWidth, 380)}px`,
                        boxSizing: 'border-box'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Compass size={15} color="#2563EB" /> TSC TE244 Driver "USER" Form Setup Steps:
                        </div>
                        <div style={{ fontSize: '11px', color: '#1E3A8A', lineHeight: 1.45 }}>
                          If test labels come out rotated sideways, configure the driver stock form:
                          <ol style={{ margin: '4px 0 0 16px', padding: 0 }}>
                            <li>Open <strong>Control Panel → Devices and Printers → TSC TE244</strong> → <strong>Printing Preferences</strong>.</li>
                            <li>Go to <strong>Page Setup</strong> tab, click <strong>New...</strong> and set Name: <strong>"{layout.paperSizeName}"</strong>.</li>
                            <li>Set <strong>Width: {layout.paperW} mm</strong>, <strong>Height: {layout.paperH} mm</strong>, Type: <strong>Die-Cut with {layout.gap} mm gap</strong>.</li>
                            <li>Set <strong>Orientation: Portrait</strong> and <strong>Rotation: 0°</strong>.</li>
                            <li>In Chrome print dialog: select Paper size <strong>"{layout.paperSizeName}"</strong>, Margins: <strong>None</strong>, Scale: <strong>100%</strong>.</li>
                          </ol>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* LEGACY CALIBRATION ROW VIEW */
                    <>
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
                    </>
                  )}

                  {/* USB SCANNER CALIBRATION TEST */}
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    background: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    textAlign: 'left',
                    width: '100%',
                    maxWidth: `${Math.max(sheetBoxWidth, rollBoxWidth, 360)}px`,
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
                <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px', color: '#92400E' }}>
                  <Info size={14} style={{ flexShrink: 0 }} /> Chrome Thermal Print Settings (CRITICAL):
                </div>
                <div style={{ lineHeight: 1.45, color: '#78350F', fontSize: '11px' }}>
                  {isPortraitSheetMode ? (
                    <>
                      <div>1. <strong>Margins:</strong> Set to <strong>None</strong></div>
                      <div>2. <strong>Headers and footers:</strong> <strong>UNCHECK / TURN OFF</strong> (Prevents Chrome from printing date/time like <em>") 3 PM"</em> across labels)</div>
                      <div>3. <strong>Scale:</strong> Set to <strong>100% (Default)</strong></div>
                      <div style={{ marginTop: '3px', fontWeight: '700', color: '#0369A1' }}>
                        Auto-centered for TSC TE244 (104 mm printhead): Left Label = {layout.getCellPosition(0, 0).x.toFixed(1)} mm {layout.cols === 2 ? `| Right Label = ${layout.getCellPosition(1, 0).x.toFixed(1)} mm` : ''} ({layout.cols} col × {layout.rows} row portrait sheet).
                      </div>
                    </>
                  ) : (
                    <>
                      <div>1. Set <strong>Paper size</strong> to match sheet ({rotTransform.pageWidthMm}×{rotTransform.pageHeightMm} mm)</div>
                      <div>2. Set <strong>Margins = None</strong> and <strong>UNCHECK Headers and footers</strong></div>
                    </>
                  )}
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

        {/* POPUP BLOCKED WARNING BANNER */}
        {popupBlocked && (
          <div style={{
            margin: '0 20px 10px 20px',
            padding: '10px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: '12.5px', fontWeight: '600' }}>
              <AlertTriangle size={17} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>Allow pop-ups for this site to print labels. Chrome blocked the print preview window.</span>
            </div>
            <button
              type="button"
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                flexShrink: 0
              }}
              onClick={() => {
                setPopupBlocked(false);
                if (typeof lastPrintActionRef.current === 'function') {
                  lastPrintActionRef.current();
                }
              }}
            >
              Try again
            </button>
          </div>
        )}

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
              disabled={isPrinting || isPreparingLabels}
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
              disabled={isPrinting || isPreparingLabels}
              title="Print a single test sticker to verify alignment and scanning"
            >
              <Printer size={15} /> Test Print (1 Sticker)
            </button>
            <button
              type="button"
              style={styles.btnPrint}
              onClick={handlePrint}
              disabled={isPrinting || isPreparingLabels || totalStickersCount === 0}
            >
              {isPreparingLabels ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <RotateCw size={16} className="spin" /> Preparing labels...
                </span>
              ) : isPrinting ? (
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
