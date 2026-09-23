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
  Info
} from 'lucide-react';
import {
  STICKER_SIZES,
  DEFAULT_STICKER_CONFIG,
  loadSavedStickerConfig,
  saveStickerConfig,
  generateCode128Svg,
  printStickers
} from '../utils/stickerGenerator';

export default function ProductStickerModal({
  open,
  onClose,
  items = [], // Array of product objects to print stickers for
  shopData = {}, // Store name, address, etc.
  initialPreviewMode = null // Optional initial preview mode: 'single' | 'roll'
}) {
  if (!open) return null;

  // Local state for sticker configuration
  const [config, setConfig] = useState(() => {
    const saved = loadSavedStickerConfig();
    return {
      ...saved,
      customShopName: saved.customShopName || shopData.restaurant_name || shopData.name || '',
      customAddress: saved.customAddress || shopData.address || ''
    };
  });

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
  const [systemPrinters, setSystemPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');

  // Detect Electron environment and fetch available Windows printers
  useEffect(() => {
    if (window.electron && typeof window.electron.getPrinters === 'function') {
      window.electron.getPrinters().then((printers) => {
        if (Array.isArray(printers)) {
          setSystemPrinters(printers);
          const defaultPrn = printers.find(p => p.isDefault) || printers[0];
          if (defaultPrn) setSelectedPrinter(defaultPrn.name);
        }
      }).catch((e) => console.warn('Could not fetch system printers:', e));
    }
  }, []);

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
    barcode: '890123456789'
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
  const gapMm = parseFloat(config.spacingMm) || 3;

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

  // Barcode SVG for preview
  const previewBarcodeSvg = useMemo(() => {
    if (!config.showBarcode) return null;
    const code = (currentPreviewItem.barcode || currentPreviewItem.sku || ('PRD' + (currentPreviewItem.id || '101'))).trim();
    return generateCode128Svg(code, {
      height: currentSizeDef.defaultBarcodeHeight,
      width: currentSizeDef.defaultBarcodeWidth,
      displayValue: true,
      fontSize: 8.5
    });
  }, [currentPreviewItem, currentSizeDef, config.showBarcode]);

  const handleConfigChange = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveLayout = () => {
    saveStickerConfig(config);
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

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printStickers(printItemsList, config, shopData, selectedPrinter || null);
    } catch (err) {
      alert('Sticker printing error: ' + (err.message || 'Unknown printing failure'));
    } finally {
      setIsPrinting(false);
    }
  };

  // Price calculations for preview
  const previewPrice = parseFloat(currentPreviewItem.price || currentPreviewItem.selling_price || 0);
  const previewMrp = currentPreviewItem.mrp
    ? parseFloat(currentPreviewItem.mrp)
    : (previewPrice * (parseFloat(config.mrpMultiplier) || 1.25));

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const mfgDateDisplay = config.defaultMfgDate || todayStr;
  const expDateDisplay = config.defaultExpDate || '';

  const shopNameDisplay = (config.customShopName || shopData.restaurant_name || shopData.name || 'Ariso Retail Store').trim();
  const addressDisplay = (config.customAddress || shopData.address || '').trim();

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

            {/* 2. ROLL CONFIGURATION: 1-ROW vs 2-ROW & GAP */}
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', background: 'rgba(0,0,0,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Sticker Gap / Margin:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    value={config.spacingMm}
                    onChange={(e) => handleConfigChange('spacingMm', e.target.value)}
                    style={styles.numberInput}
                  />
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A' }}>mm</span>
                </div>
              </div>
            </div>

            {/* 3. DYNAMIC FIELD TOGGLES */}
            <div style={styles.section}>
              <label style={styles.sectionLabel}>
                <Grid size={14} style={{ marginRight: 6 }} /> Dynamic Fields to Print
              </label>
              <div style={styles.toggleGrid}>
                {[
                  { key: 'showShopName', label: 'Shop Name' },
                  { key: 'showProductName', label: 'Product Name' },
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

            {/* 4. CUSTOM OVERRIDES & DATES */}
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
                    type="text"
                    value={config.defaultMfgDate}
                    onChange={(e) => handleConfigChange('defaultMfgDate', e.target.value)}
                    placeholder={todayStr}
                    style={styles.textInput}
                  />
                </div>
                <div>
                  <label style={styles.smallLabel}>Exp Date / Best Before:</label>
                  <input
                    type="text"
                    value={config.defaultExpDate}
                    onChange={(e) => handleConfigChange('defaultExpDate', e.target.value)}
                    placeholder="e.g. 19/12/2026"
                    style={styles.textInput}
                  />
                </div>
              </div>
            </div>

            {/* 5. PRODUCT SELECTION & QUANTITIES */}
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
                          ₹{parseFloat(it.price || 0).toFixed(2)} • SKU: {it.sku || it.barcode || 'N/A'}
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

            {/* 6. WINDOWS PRINTER SELECTOR (IF IN ELECTRON) */}
            {systemPrinters.length > 0 && (
              <div style={styles.section}>
                <label style={styles.smallLabel}>Target Windows Label Printer:</label>
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  style={styles.selectInput}
                >
                  {systemPrinters.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              </div>
            </div>

            <div style={styles.previewContainer}>
              {previewMode === 'single' ? (
                /* SINGLE STICKER DETAILED PREVIEW */
                <div style={styles.singlePreviewWrapper}>
                  <div
                    style={{
                      ...styles.stickerMockup,
                      width: `${currentSizeDef.width * 5}px`,
                      height: `${currentSizeDef.height * 5}px`,
                    }}
                  >
                    <div style={styles.stickerInnerMockup}>
                      {config.showShopName && shopNameDisplay && (
                        <div style={styles.previewShopName}>{shopNameDisplay}</div>
                      )}
                      {config.showAddress && addressDisplay && (
                        <div style={styles.previewAddress}>{addressDisplay}</div>
                      )}
                      {config.showProductName && (
                        <div style={styles.previewProductName}>{currentPreviewItem.name}</div>
                      )}
                      {(config.showMrp || config.showSellingPrice) && (
                        <div style={styles.previewPriceRow}>
                          {config.showMrp && (
                            <span style={styles.previewMrp}>MRP: ₹{previewMrp.toFixed(2)}</span>
                          )}
                          {config.showSellingPrice && (
                            <span style={styles.previewPrice}>Our Price: ₹{previewPrice.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                      {(config.showMfgDate || (config.showExpDate && expDateDisplay)) && (
                        <div style={styles.previewDateRow}>
                          {config.showMfgDate && <span>Mfg: {mfgDateDisplay}</span>}
                          {config.showExpDate && expDateDisplay && <span>Exp: {expDateDisplay}</span>}
                        </div>
                      )}
                      {config.showBarcode && previewBarcodeSvg && (
                        <div
                          style={styles.previewBarcode}
                          dangerouslySetInnerHTML={{ __html: previewBarcodeSvg }}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                    Physical dimensions: <strong>{currentSizeDef.width}mm × {currentSizeDef.height}mm</strong>
                  </div>
                </div>
              ) : (
                /* ROLL FEED CONTINUOUS SIMULATION */
                <div style={styles.rollFeedWrapper}>
                  <div style={styles.rollLiner}>
                    {rollRows.map((rowIdx) => (
                      <div
                        key={rowIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'center',
                          gap: `${gapMm * 3}px`,
                          marginBottom: `${gapMm * 3}px`
                        }}
                      >
                        {/* Column 1 Sticker */}
                        <div
                          style={{
                            ...styles.stickerMockup,
                            width: `${currentSizeDef.width * 3.4}px`,
                            height: `${currentSizeDef.height * 3.4}px`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                          }}
                        >
                          <div style={{ ...styles.stickerInnerMockup, padding: '4px' }}>
                            {config.showShopName && <div style={{ fontSize: '8px', fontWeight: '900' }}>{shopNameDisplay}</div>}
                            {config.showProductName && <div style={{ fontSize: '9px', fontWeight: '800' }}>{currentPreviewItem.name}</div>}
                            {(config.showMrp || config.showSellingPrice) && (
                              <div style={{ fontSize: '8px', display: 'flex', gap: '4px' }}>
                                {config.showMrp && <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>₹{previewMrp.toFixed(0)}</span>}
                                {config.showSellingPrice && <span style={{ fontWeight: '800' }}>₹{previewPrice.toFixed(0)}</span>}
                              </div>
                            )}
                            {config.showBarcode && previewBarcodeSvg && (
                              <div
                                style={{ maxHeight: '22px', overflow: 'hidden', transform: 'scale(0.85)', transformOrigin: 'top center' }}
                                dangerouslySetInnerHTML={{ __html: previewBarcodeSvg }}
                              />
                            )}
                          </div>
                        </div>

                        {/* Column 2 Sticker (if 2-Row mode) */}
                        {is2Row && (
                          <div
                            style={{
                              ...styles.stickerMockup,
                              width: `${currentSizeDef.width * 3.4}px`,
                              height: `${currentSizeDef.height * 3.4}px`,
                              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                            }}
                          >
                            <div style={{ ...styles.stickerInnerMockup, padding: '4px' }}>
                              {config.showShopName && <div style={{ fontSize: '8px', fontWeight: '900' }}>{shopNameDisplay}</div>}
                              {config.showProductName && <div style={{ fontSize: '9px', fontWeight: '800' }}>{currentPreviewItem.name}</div>}
                              {(config.showMrp || config.showSellingPrice) && (
                                <div style={{ fontSize: '8px', display: 'flex', gap: '4px' }}>
                                  {config.showMrp && <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>₹{previewMrp.toFixed(0)}</span>}
                                  {config.showSellingPrice && <span style={{ fontWeight: '800' }}>₹{previewPrice.toFixed(0)}</span>}
                                </div>
                              )}
                              {config.showBarcode && previewBarcodeSvg && (
                                <div
                                  style={{ maxHeight: '22px', overflow: 'hidden', transform: 'scale(0.85)', transformOrigin: 'top center' }}
                                  dangerouslySetInnerHTML={{ __html: previewBarcodeSvg }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                    Roll simulation: <strong>{is2Row ? '2 stickers per row' : '1 sticker per row'}</strong> with <strong>{gapMm}mm inter-label gap</strong> ({totalStickersCount} sticker{totalStickersCount !== 1 ? 's' : ''} total)
                  </div>
                </div>
              )}

              {/* USB SCANNER INFO CHIP */}
              <div style={styles.scannerInfoChip}>
                <Info size={13} style={{ flexShrink: 0 }} />
                <span>
                  High-contrast Code128 vector barcode. Scannable with any standard USB HID handheld scanner and camera scanner.
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
              onClick={() => setConfig({ ...DEFAULT_STICKER_CONFIG })}
            >
              Reset
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" style={styles.btnSecondary} onClick={onClose}>
              Cancel
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
    padding: '8px',
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
  previewDateRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '8px',
    fontWeight: '600',
    color: '#334155'
  },
  previewBarcode: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    overflow: 'hidden'
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
  }
};
