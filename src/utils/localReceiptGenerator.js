import { resolveImageUrl } from './api.js';

/**
 * Formats a date value into dd/mm/yy, hh:mm:ss a (e.g. 12/09/26, 10:43:18 AM).
 */
export function formatReceiptDateTime(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date();
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return `${day}/${month}/${year}, ${timeStr}`;
}

/**
 * Safely encodes raw binary ESC/POS payload strings into base64 without UTF-8 corruption.
 */
export function safeUtf8ToBase64(str) {
  if (!str) return '';
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    try {
      return window.btoa(str);
    } catch (e) {
      let binary = '';
      for (let i = 0; i < str.length; i++) {
        binary += String.fromCharCode(str.charCodeAt(i) & 0xFF);
      }
      return window.btoa(binary);
    }
  }
  return Buffer.from(str, 'binary').toString('base64');
}

/**
 * Checks if settings or printer specify a 2-inch (58mm) thermal paper width.
 */
export function is2InchPaper(settings, printerName = '') {
  if (!settings && !printerName) return false;
  const s = settings || {};
  const raw = String(s.paper_size || s.receipt_paper_size || s.paperSize || s.paper_width || 'auto').toLowerCase().trim();
  
  if (raw === '58mm' || raw === '2inch' || raw === '2"' || raw === '58' || raw === '2' || raw.includes('58') || raw.includes('2in')) {
    return true;
  }
  if (raw === '80mm' || raw === '3inch' || raw === '3"' || raw === '80' || raw === '3' || raw.includes('80') || raw.includes('3in') || raw.includes('76')) {
    return false;
  }
  
  // If set to 'auto', inspect printer name/driver name for 58mm cues
  const pName = String(printerName || s.default_printer_name || s.name || '').toLowerCase();
  if (pName.includes('58') || pName.includes('2inch') || pName.includes('xp-58') || pName.includes('pos-58') || pName.includes('zj-58') || pName.includes('rp58')) {
    return true;
  }
  return false;
}

/**
 * Converts any uploaded image (URL or Data URL) into crisp, high-contrast ESC/POS raster bitmap (GS v 0) bytes.
 */
export async function convertImageUrlToEscPosRaster(imageUrl, is2Inch = false) {
  if (!imageUrl || typeof document === 'undefined') return '';
  return new Promise((resolve) => {
    try {
      const fullUrl = resolveImageUrl(imageUrl);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          // Standard thermal printable width: 384 dots for 80mm paper, 256 dots for 58mm paper
          const targetDimension = is2Inch ? 224 : 280;
          const scale = Math.min(1, targetDimension / img.width, targetDimension / img.height);
          let w = Math.round(img.width * scale);
          let h = Math.round(img.height * scale);

          // Force width to be a multiple of 8 dots for ESC/POS byte alignment
          const widthBytes = Math.ceil(w / 8);
          const finalWidth = widthBytes * 8;
          if (finalWidth <= 0 || h <= 0) return resolve('');

          const canvas = document.createElement('canvas');
          canvas.width = finalWidth;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          // Pure white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, finalWidth, h);

          // Center horizontally within canvas
          const offsetX = Math.floor((finalWidth - w) / 2);
          ctx.drawImage(img, offsetX, 0, w, h);

          const imgData = ctx.getImageData(0, 0, finalWidth, h).data;
          let rasterCmd = '\x1Ba\x01'; // Center align command
          const xL = String.fromCharCode(widthBytes % 256);
          const xH = String.fromCharCode(Math.floor(widthBytes / 256));
          const yL = String.fromCharCode(h % 256);
          const yH = String.fromCharCode(Math.floor(h / 256));
          // GS v 0 0 xL xH yL yH
          rasterCmd += '\x1Dv0\x00' + xL + xH + yL + yH;

          let rawBytes = '';
          for (let y = 0; y < h; y++) {
            for (let xByte = 0; xByte < widthBytes; xByte++) {
              let byteVal = 0;
              for (let bit = 0; bit < 8; bit++) {
                const x = xByte * 8 + bit;
                const idx = (y * finalWidth + x) * 4;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const a = imgData[idx + 3];
                // ITU-R standard luminance
                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                // High contrast threshold: dark or transparent pixels become black dots (bit 1)
                if (a > 30 && luminance < 175) {
                  byteVal |= (1 << (7 - bit));
                }
              }
              rawBytes += String.fromCharCode(byteVal);
            }
          }
          rasterCmd += rawBytes + '\n\x1Ba\x00';
          resolve(rasterCmd);
        } catch (err) {
          console.warn('[Raster Conversion Error]', err);
          resolve('');
        }
      };
      img.onerror = () => {
        resolve('');
      };
      img.src = fullUrl;
    } catch (e) {
      resolve('');
    }
  });
}

/**
 * Generates thermal-optimized, production-grade, printer-agnostic HTML receipt for 80mm (3"), 58mm (2"), 76mm, or Auto-Detect printers.
 */
export function generateLocalHtmlReceipt(order, items, restaurant, receiptSettings = null) {
  const s = receiptSettings || {};
  const isGstEnabled = s.gst_enabled === 1 || s.gst_enabled === true || s.gst_enabled === 'true';
  const is2Inch = is2InchPaper(s);

  // Safe thermal printable widths: 80mm paper = 68mm max printable, 58mm paper = 44mm max printable
  // Centered with equal left and right margins across the thermal paper roll
  const containerMaxWidth = is2Inch ? '44mm' : '68mm';
  const bodyFontSize = is2Inch ? '10px' : '11.5px';
  const titleFontSize = is2Inch ? '13px' : '15px';
  const totalFontSize = is2Inch ? '12px' : '14px';
  const subFontSize = is2Inch ? '8.5px' : '9.5px';

  let itemsHtml = '';
  if (is2Inch) {
    // High-readability 2-tier layout for 58mm (2-inch) thermal rolls
    itemsHtml = items.map((item, idx) => {
      const rate = parseFloat(item.price || item.unit_price || 0).toFixed(2);
      const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
      const total = parseFloat(item.total_price || 0).toFixed(2);
      return `
        <div style="margin-bottom: 3.5px; ${idx < items.length - 1 ? 'border-bottom: 1px dashed #000; padding-bottom: 3px;' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="flex: 1; min-width: 0; word-break: normal; overflow-wrap: break-word; font-weight: 700; color: #000000; padding-right: 4px; line-height: 1.25;">
              ${item.name}
            </span>
            <span style="width: 34%; text-align: right; white-space: nowrap; font-weight: 800; color: #000000; flex-shrink: 0; padding-right: 2px;">
              ₹${total}
            </span>
          </div>
          <div style="font-size: ${subFontSize}; font-weight: 700; color: #000000; display: flex; justify-content: space-between; align-items: center; margin-top: 1px;">
            <span>${qty} @ ₹${rate}</span>
            ${item.sku ? `<span>SKU: ${item.sku}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Robust fixed-table 4-column layout for 80mm (3-inch) thermal rolls
    // Columns: Item (45%), Qty (12%), Rate (19%), Total (24% with right padding buffer)
    const rowsHtml = items.map(item => {
      const rate = parseFloat(item.price || item.unit_price || 0).toFixed(2);
      const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `${item.quantity || 1}`;
      const total = parseFloat(item.total_price || 0).toFixed(2);
      return `
        <tr style="border-bottom: 1px dotted #000;">
          <td style="width: 45%; text-align: left; vertical-align: top; padding: 2.5px 2px 2.5px 0; word-break: normal; overflow-wrap: break-word; line-height: 1.25;">
            <div style="font-weight: 700; color: #000000;">${item.name}</div>
            ${item.sku ? `<div style="font-size: 8.5px; font-weight: 700; color: #000000; margin-top: 1px;">SKU: ${item.sku}</div>` : ''}
          </td>
          <td style="width: 12%; text-align: center; vertical-align: top; padding: 2.5px 1px; white-space: nowrap; font-weight: 700; color: #000000;">
            ${qty}
          </td>
          <td style="width: 19%; text-align: right; vertical-align: top; padding: 2.5px 1px; white-space: nowrap; font-weight: 700; color: #000000;">
            ₹${rate}
          </td>
          <td style="width: 24%; text-align: right; vertical-align: top; padding: 2.5px 2px 2.5px 1px; white-space: nowrap; font-weight: 800; color: #000000;">
            ₹${total}
          </td>
        </tr>
      `;
    }).join('');

    itemsHtml = `
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed; margin: 2px 0;">
        <thead>
          <tr style="border-bottom: 1.5px dashed #000; font-weight: 800; font-size: 11px;">
            <th style="width: 45%; text-align: left; padding: 3px 2px 3px 0; word-break: normal;">Item</th>
            <th style="width: 12%; text-align: center; padding: 3px 1px; white-space: nowrap;">Qty</th>
            <th style="width: 19%; text-align: right; padding: 3px 1px; white-space: nowrap;">Rate</th>
            <th style="width: 24%; text-align: right; padding: 3px 2px 3px 1px; white-space: nowrap;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // Calculate CGST / SGST / IGST split
  let taxSplitHtml = '';
  if (isGstEnabled && parseFloat(order.tax_amount || 0) > 0) {
    const totalTax = parseFloat(order.tax_amount || 0);
    if (order.tax_type === 'inter') {
      taxSplitHtml = `
        <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 700; margin-top: 1.5px;">
          <span>IGST:</span>
          <span style="white-space: nowrap; padding-right: 2px;">₹${totalTax.toFixed(2)}</span>
        </div>
      `;
    } else {
      const halfTax = (totalTax / 2).toFixed(2);
      taxSplitHtml = `
        <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 700; margin-top: 1.5px;">
          <span>CGST:</span>
          <span style="white-space: nowrap; padding-right: 2px;">₹${halfTax}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 700; margin-top: 1.5px;">
          <span>SGST:</span>
          <span style="white-space: nowrap; padding-right: 2px;">₹${halfTax}</span>
        </div>
      `;
    }
  }

  const isComposition = (s.gst_registration_type === 'composition' || order.tax_invoice_type === 'BILL_OF_SUPPLY');
  const docTitle = isComposition
    ? 'BILL OF SUPPLY'
    : (isGstEnabled && parseFloat(order.tax_amount || 0) > 0 ? 'TAX INVOICE' : 'RETAIL INVOICE');

  const invoiceNo = order.unique_order_number || order.offline_id || 'LOCAL-POS';
  const restName = (s.restaurant_name || restaurant.name || 'ARISO RETAIL STORE').toUpperCase();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt #${invoiceNo}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Consolas', 'Courier New', 'Lucida Console', monospace;
            font-size: ${bodyFontSize};
            font-weight: 700;
            line-height: 1.28;
            letter-spacing: 0.1px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: none !important;
            text-rendering: geometricPrecision !important;
          }
          .receipt-container {
            width: 100% !important;
            max-width: ${containerMaxWidth} !important;
            margin: 0 auto !important;
            padding: 1mm 1.5mm 1mm 1.5mm !important;
            box-sizing: border-box;
          }
          .divider { border-top: 1.5px dashed #000000; margin: 4px 0; }
          .double-divider { border-top: 2px dashed #000000; margin: 4px 0; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: 800; }
          
          @media print {
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              display: flex !important;
              justify-content: center !important;
              align-items: flex-start !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .receipt-container {
              width: 100% !important;
              max-width: ${containerMaxWidth} !important;
              margin: 0 auto !important;
              padding: 1mm 1.5mm 1mm 1.5mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Document Compliance Header -->
          <div class="text-center bold" style="font-size: ${subFontSize}; border-bottom: 1.5px solid #000; padding: 2px 0; margin-bottom: 3px; letter-spacing: 0.5px;">
            ${docTitle} ${isComposition ? '(COMPOSITION SCHEME)' : ''}
          </div>

          <!-- Header -->
          <div class="text-center bold" style="font-size: ${titleFontSize}; margin-bottom: 2px; word-break: normal; overflow-wrap: break-word;">
            ${restName}
          </div>
          ${s.legal_name && s.legal_name.toUpperCase() !== restName ? `<div class="text-center" style="font-size: ${subFontSize}; font-weight: 700;">Legal: ${s.legal_name}</div>` : ''}
          ${s.branch_name ? `<div class="text-center" style="font-size: ${subFontSize}; font-weight: 700;">${s.branch_name}</div>` : ''}
          ${s.address || restaurant.address ? `<div class="text-center" style="font-size: ${subFontSize}; font-weight: 700; word-break: normal; overflow-wrap: break-word;">${s.address || restaurant.address}</div>` : ''}
          ${s.state || restaurant.state ? `<div class="text-center" style="font-size: ${subFontSize}; font-weight: 700;">State: ${s.state || restaurant.state} (${s.state_code || restaurant.state_code || '27'})</div>` : ''}
          ${s.phone || restaurant.phone ? `<div class="text-center" style="font-size: ${subFontSize}; font-weight: 700;">Ph: ${s.phone || restaurant.phone}</div>` : ''}
          ${s.gst_number || restaurant.gst_number ? `<div class="text-center" style="font-size: ${subFontSize}; font-weight: 800;">GSTIN: ${s.gst_number || restaurant.gst_number}</div>` : ''}
          ${s.header_message ? `<div class="text-center" style="margin-top: 2px; font-style: italic; font-size: ${subFontSize}; font-weight: 700;">* ${s.header_message} *</div>` : ''}
          
          <div class="double-divider"></div>
          
          <!-- Order Meta -->
          <div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Bill No :</span> #${invoiceNo}</div>
          <div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Date    :</span> ${formatReceiptDateTime(order.created_at)}</div>
          ${order.customer_name && order.customer_name !== 'Walk-in Customer' ? `<div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Customer:</span> ${order.customer_name}</div>` : ''}
          ${order.gst_number ? `<div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Buyer GSTIN:</span> ${order.gst_number}</div>` : ''}
          ${order.tax_type ? `<div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Place of Supply:</span> ${order.place_of_supply || (order.tax_type === 'inter' ? 'Inter-State' : 'Intra-State')}</div>` : ''}
          
          <div class="divider"></div>
          
          <!-- Items List / Table -->
          ${is2Inch ? `
            <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 10px; margin-bottom: 3px; border-bottom: 1.5px dashed #000; padding-bottom: 2px;">
              <span>Item Description</span>
              <span style="text-align: right; padding-right: 2px;">Amount</span>
            </div>
          ` : ''}
          ${itemsHtml}
          
          <div class="divider"></div>
          
          <!-- Totals Section -->
          <div style="width: 100%;">
            <div style="font-weight: 700; font-size: ${subFontSize}; padding: 1px 0; margin-bottom: 2px;">
              Total Items: ${items.length} | Total Qty: ${items.reduce((sum, it) => sum + (it.is_weight_based ? parseFloat(it.item_weight || 1) : (parseFloat(it.quantity ?? it.qty ?? 1) || 1)), 0) % 1 === 0 ? items.reduce((sum, it) => sum + (it.is_weight_based ? parseFloat(it.item_weight || 1) : (parseFloat(it.quantity ?? it.qty ?? 1) || 1)), 0) : parseFloat(items.reduce((sum, it) => sum + (it.is_weight_based ? parseFloat(it.item_weight || 1) : (parseFloat(it.quantity ?? it.qty ?? 1) || 1)), 0).toFixed(3))}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; padding: 1px 0;">
              <span>Subtotal:</span>
              <span style="white-space: nowrap; font-weight: 800; padding-right: 2px;">₹${parseFloat(order.subtotal || 0).toFixed(2)}</span>
            </div>
            
            ${parseFloat(order.discount_amount || 0) > 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; padding: 1px 0;">
                <span>Discount:</span>
                <span style="white-space: nowrap; font-weight: 800; padding-right: 2px;">-₹${parseFloat(order.discount_amount).toFixed(2)}</span>
              </div>
            ` : ''}
            
            ${taxSplitHtml}

            ${order.round_off && parseFloat(order.round_off) !== 0 ? `
              <div style="display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; padding: 1px 0; font-size: ${subFontSize};">
                <span>Round Off:</span>
                <span style="white-space: nowrap; font-weight: 800; padding-right: 2px;">${parseFloat(order.round_off) > 0 ? `+₹${parseFloat(order.round_off).toFixed(2)}` : `-₹${Math.abs(parseFloat(order.round_off)).toFixed(2)}`}</span>
              </div>
            ` : ''}
            
            <div class="double-divider"></div>
            
            <div style="display: flex; justify-content: space-between; align-items: baseline; font-weight: 900; font-size: ${totalFontSize}; padding: 2px 0;">
              <span>GRAND TOTAL:</span>
              <span style="white-space: nowrap; font-weight: 900; padding-right: 2px;">₹${parseFloat(order.total_amount || 0).toFixed(2)}</span>
            </div>
            
            <div class="double-divider"></div>

            <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 700; margin-top: 2px;">
              <span>Payment Mode:</span>
              <span class="bold">${(['credit', 'due', 'udhar'].includes((order.payment_mode || '').toLowerCase())) ? 'CREDIT / UDHAR' : (order.payment_mode || 'CASH').toUpperCase()}</span>
            </div>
            ${(['credit', 'due', 'udhar'].includes((order.payment_mode || '').toLowerCase()) || (order.paid_amount !== undefined && parseFloat(order.paid_amount) < parseFloat(order.total_amount || 0))) ? `
              <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 700;">
                <span>Amount Paid:</span>
                <span>₹${parseFloat(order.paid_amount || 0).toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 800;">
                <span>Outstanding / Due:</span>
                <span>₹${Math.max(0, parseFloat(order.total_amount || 0) - parseFloat(order.paid_amount || 0)).toFixed(2)}</span>
              </div>
              ${order.due_date ? `
                <div style="display: flex; justify-content: space-between; font-size: ${subFontSize}; font-weight: 700;">
                  <span>Due Date:</span>
                  <span>${order.due_date}</span>
                </div>
              ` : ''}
              <div class="divider"></div>
            ` : ''}
          </div>
          
          <!-- Custom Messages & Footer -->
          <div class="text-center" style="margin-top: 6px; font-size: ${subFontSize}; font-weight: 700;">
            ${(s.thank_you_message !== undefined ? s.thank_you_message : (restaurant.thank_you_message || 'Thank You! Visit Again.')) ? `<div style="font-weight: 800;">${s.thank_you_message !== undefined ? s.thank_you_message : (restaurant.thank_you_message || 'Thank You! Visit Again.')}</div>` : ''}
            ${(s.footer_message || restaurant.footer_message) ? `<div style="margin-top: 2px; font-weight: 700; word-break: normal; overflow-wrap: break-word; white-space: pre-line;">${s.footer_message || restaurant.footer_message}</div>` : ''}
            ${(() => {
              const terms = (s.terms_conditions !== undefined ? s.terms_conditions : (s.terms_and_conditions !== undefined ? s.terms_and_conditions : (restaurant.terms_conditions || '')) || '').trim();
              if (!terms) return '';
              return `<div style="margin-top: 4px; font-size: 8.5px; font-weight: 700; color: #000000; word-break: normal; overflow-wrap: break-word; white-space: pre-line; text-align: left; border-top: 1px dashed #000; padding-top: 2px;"><span style="font-weight: 800;">T&C:</span> ${terms}</div>`;
            })()}
          </div>
          <!-- QR / Barcode image (only rendered if Show QR Code is ON and an image has been uploaded) -->
          ${Boolean(s.show_qr_code) && s.qr_code_url ? `
            <div style="display: flex; justify-content: center; align-items: center; margin-top: 6px; text-align: center;">
              <img src="${resolveImageUrl(s.qr_code_url)}" alt="QR Code" style="max-height: 85px; max-width: 130px; object-fit: contain;" />
            </div>
          ` : ''}
          <!-- Anti-clipping margin buffer for hardware thermal auto-cutters -->
          <div style="height: 6mm; width: 100%;"></div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates ESC/POS byte-commands formatted for 2-inch (32-col) and 3-inch (48-col) thermal receipt printers.
 */
export function generateLocalEscPosReceipt(order, items, restaurant, receiptSettings = null) {
  const s = receiptSettings || {};
  const isGstEnabled = s.gst_enabled === 1 || s.gst_enabled === true || s.gst_enabled === 'true';
  const is2Inch = is2InchPaper(s);
  const cols = is2Inch ? 32 : 42;
  const divider = '-'.repeat(cols) + '\n';
  const doubleDivider = '='.repeat(cols) + '\n';

  // Raw ESC/POS commands
  const ESC = '\x1B';
  const GS = '\x1D';
  const CMD_INIT = ESC + '@';
  const CMD_ALIGN_CENTER = ESC + 'a\x01';
  const CMD_ALIGN_LEFT = ESC + 'a\x00';
  const CMD_BOLD_ON = ESC + 'E\x01';
  const CMD_BOLD_OFF = ESC + 'E\x00';
  const CMD_FONT_NORMAL = GS + '!\x00';
  const CMD_FONT_DOUBLE = GS + '!\x11';
  const CMD_CUT = '\n\n\n\n\n' + GS + 'V\x42\x00' + GS + 'V\x00';

  let cmds = CMD_INIT;

  const isComposition = (s.gst_registration_type === 'composition' || order.tax_invoice_type === 'BILL_OF_SUPPLY');
  const docTitle = isComposition
    ? 'BILL OF SUPPLY'
    : (isGstEnabled && parseFloat(order.tax_amount || 0) > 0 ? 'TAX INVOICE' : 'RETAIL INVOICE');

  // Header Center Aligned
  cmds += CMD_ALIGN_CENTER + CMD_BOLD_ON + docTitle + (isComposition ? ' (COMPOSITION)' : '') + '\n' + CMD_BOLD_OFF;
  cmds += CMD_ALIGN_CENTER + CMD_BOLD_ON;
  if (!is2Inch) cmds += CMD_FONT_DOUBLE;
  cmds += (s.restaurant_name || restaurant.name || 'ARISO RETAIL STORE').toUpperCase() + '\n';
  cmds += CMD_FONT_NORMAL + CMD_BOLD_OFF;

  if (s.branch_name) cmds += s.branch_name + '\n';
  const addr = s.address !== undefined ? s.address : restaurant.address;
  if (addr) cmds += addr + '\n';
  const phone = s.phone !== undefined ? s.phone : restaurant.phone;
  if (phone) cmds += 'Ph: ' + phone + '\n';
  if (s.state || restaurant.state) cmds += `State: ${s.state || restaurant.state} (${s.state_code || restaurant.state_code || '27'})\n`;
  const gstin = s.gst_number !== undefined ? s.gst_number : restaurant.gst_number;
  if (gstin) cmds += 'GSTIN: ' + gstin + '\n';
  const headerWelcome = s.header_message || restaurant.header_message;
  if (headerWelcome) cmds += `* ${headerWelcome} *\n`;
  cmds += doubleDivider;

  // Order Details Left Aligned
  cmds += CMD_ALIGN_LEFT;
  cmds += `Bill No : #${order.unique_order_number || order.offline_id || 'LOCAL-POS'}\n`;
  cmds += `Date    : ${formatReceiptDateTime(order.created_at)}\n`;
  if (order.customer_name && order.customer_name !== 'Walk-in Customer') cmds += `Customer: ${order.customer_name}\n`;
  if (order.gst_number) cmds += `Buyer GSTIN: ${order.gst_number}\n`;
  if (order.tax_type) cmds += `Place of Supply: ${order.tax_type === 'inter' ? 'Inter-State' : 'Intra-State'}\n`;
  cmds += divider;

  // Column Headers
  if (is2Inch) {
    cmds += 'Item Description          Amount\n';
  } else {
    cmds += 'Item Description  Qty    Rate    Amount\n';
  }
  cmds += divider;

  // Print Items
  items.forEach(item => {
    const qtyStr = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `${item.quantity || 1}`;
    const rateStr = 'Rs.' + parseFloat(item.price || item.unit_price || 0).toFixed(2);
    const totalStr = 'Rs.' + parseFloat(item.total_price || 0).toFixed(2);

    if (is2Inch) {
      const nameStr = item.name.length > 18 ? item.name.substring(0, 18) : item.name;
      const spaces = ' '.repeat(Math.max(1, cols - nameStr.length - totalStr.length));
      cmds += `${nameStr}${spaces}${totalStr}\n`;
      cmds += `  Qty: ${qtyStr} @ ${rateStr}` + (item.sku ? ` [${item.sku}]` : '') + '\n';
    } else {
      let nameStr = item.name;
      if (nameStr.length > 17) {
        nameStr = nameStr.substring(0, 17);
      }
      const namePart = nameStr.padEnd(18, ' ');
      const qtyPart = qtyStr.padEnd(5, ' ');
      const ratePart = rateStr.padStart(9, ' ');
      const amtPart = totalStr.padStart(10, ' ');
      let line = `${namePart}${qtyPart}${ratePart}${amtPart}`;
      if (line.length > cols) line = line.substring(0, cols);
      cmds += `${line}\n`;
      if (item.sku) {
        cmds += `  SKU: ${item.sku}\n`;
      }
    }
  });
  cmds += divider;

  // Summary Left aligned
  const totalItemsCount = items.length;
  const totalQtySum = items.reduce((sum, it) => sum + (it.is_weight_based ? parseFloat(it.item_weight || 1) : (parseFloat(it.quantity ?? it.qty ?? 1) || 1)), 0);
  const formattedQty = totalQtySum % 1 === 0 ? totalQtySum : parseFloat(totalQtySum.toFixed(3));
  cmds += `Total Items: ${totalItemsCount} | Total Qty: ${formattedQty}\n`;

  const subtotalVal = parseFloat(order.subtotal || 0).toFixed(2);
  const discountVal = parseFloat(order.discount_amount || 0).toFixed(2);
  const taxVal = parseFloat(order.tax_amount || 0).toFixed(2);
  const grandTotalVal = parseFloat(order.total_amount || 0).toFixed(2);

  cmds += `Subtotal:`.padEnd(cols - 12, ' ') + `Rs.${subtotalVal}`.padStart(12, ' ') + '\n';
  if (parseFloat(discountVal) > 0) {
    cmds += `Discount:`.padEnd(cols - 12, ' ') + `-Rs.${discountVal}`.padStart(12, ' ') + '\n';
  }

  if (isGstEnabled && parseFloat(taxVal) > 0) {
    if (order.tax_type === 'inter') {
      cmds += `IGST:`.padEnd(cols - 12, ' ') + `Rs.${taxVal}`.padStart(12, ' ') + '\n';
    } else {
      const halfTax = (parseFloat(taxVal) / 2).toFixed(2);
      cmds += `CGST:`.padEnd(cols - 12, ' ') + `Rs.${halfTax}`.padStart(12, ' ') + '\n';
      cmds += `SGST:`.padEnd(cols - 12, ' ') + `Rs.${halfTax}`.padStart(12, ' ') + '\n';
    }
  }

  if (order.round_off && parseFloat(order.round_off) !== 0) {
    const roVal = parseFloat(order.round_off);
    const roStr = (roVal > 0 ? '+Rs.' : '-Rs.') + Math.abs(roVal).toFixed(2);
    cmds += `Round Off:`.padEnd(cols - 12, ' ') + roStr.padStart(12, ' ') + '\n';
  }
  cmds += doubleDivider;

  // Grand Total
  cmds += CMD_BOLD_ON;
  if (!is2Inch) {
    cmds += CMD_FONT_DOUBLE;
    cmds += `TOTAL:`.padEnd(9, ' ') + `Rs.${grandTotalVal}`.padStart(12, ' ') + '\n';
    cmds += CMD_FONT_NORMAL;
  } else {
    cmds += `TOTAL:`.padEnd(cols - 12, ' ') + `Rs.${grandTotalVal}`.padStart(12, ' ') + '\n';
  }
  cmds += CMD_BOLD_OFF;
  cmds += doubleDivider;

  // Payment Mode & Credit / Udhar breakdown
  const isCreditMode = ['credit', 'due', 'udhar'].includes((order.payment_mode || '').toLowerCase());
  const pModeLabel = isCreditMode ? 'CREDIT / UDHAR' : (order.payment_mode || 'CASH').toUpperCase();
  cmds += `Payment Mode:`.padEnd(cols - pModeLabel.length, ' ') + pModeLabel + '\n';

  if (isCreditMode || (order.paid_amount !== undefined && parseFloat(order.paid_amount) < parseFloat(order.total_amount || 0))) {
    const paidVal = parseFloat(order.paid_amount || 0).toFixed(2);
    const dueVal = Math.max(0, parseFloat(order.total_amount || 0) - parseFloat(order.paid_amount || 0)).toFixed(2);
    cmds += `Amount Paid:`.padEnd(cols - 12, ' ') + `Rs.${paidVal}`.padStart(12, ' ') + '\n';
    cmds += CMD_BOLD_ON;
    cmds += `Outstanding:`.padEnd(cols - 12, ' ') + `Rs.${dueVal}`.padStart(12, ' ') + '\n';
    cmds += CMD_BOLD_OFF;
    if (order.due_date) {
      cmds += `Due Date:`.padEnd(cols - 12, ' ') + String(order.due_date).padStart(12, ' ') + '\n';
    }
    cmds += divider;
  }

  // Footer Messages Center Aligned
  cmds += CMD_ALIGN_CENTER;
  const thankYouMsg = (s.thank_you_message !== undefined ? s.thank_you_message : (restaurant.thank_you_message || 'Thank You! Visit Again.') || '').trim();
  if (thankYouMsg) cmds += thankYouMsg + '\n';
  const footerMsg = (s.footer_message || restaurant.footer_message || '').trim();
  if (footerMsg) cmds += footerMsg + '\n';
  
  const rawTerms = s.terms_conditions !== undefined ? s.terms_conditions : (s.terms_and_conditions !== undefined ? s.terms_and_conditions : (restaurant.terms_conditions || ''));
  const terms = (rawTerms || '').trim();
  if (terms) {
    cmds += divider;
    cmds += 'T&C: ' + terms + '\n';
  }

  cmds += CMD_CUT;

  return cmds;
}

/**
 * Generates thermal KOT HTML for 3-inch (80mm), 2-inch (58mm), or Auto-Detect printers.
 */
export function generateLocalHtmlKot(order, items, kotSettings = null) {
  const s = kotSettings || {};
  const is2Inch = is2InchPaper(s);

  const containerMaxWidth = is2Inch ? '44mm' : '68mm';
  const bodyFontSize = is2Inch ? '10px' : '12px';
  const subFontSize = is2Inch ? '8.5px' : '10px';

  let itemsHtml = '';
  items.forEach(item => {
    const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; font-weight: 800; font-size: ${is2Inch ? '11px' : '13px'}; color: #000000;">
        <div style="flex: 2; padding-right: 4px; min-width: 0; word-break: normal; overflow-wrap: break-word; line-height: 1.25;">
          <div>${item.name}</div>
          ${item.notes ? `<div style="font-size: ${subFontSize}; font-style: italic; font-weight: 700; color: #000000; margin-top: 1px;">* Notes: ${item.notes}</div>` : ''}
        </div>
        <div style="flex: 1; text-align: right; white-space: nowrap; flex-shrink: 0; font-weight: 900; padding-right: 2px;">${qty}</div>
      </div>
    `;
  });

  const invoiceNo = order.unique_order_number || order.offline_id || 'LOCAL-POS';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>KOT #${invoiceNo}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Consolas', 'Courier New', 'Lucida Console', monospace;
            font-size: ${bodyFontSize};
            font-weight: 700;
            line-height: 1.28;
            letter-spacing: 0.1px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            -webkit-font-smoothing: none !important;
            text-rendering: geometricPrecision !important;
          }
          .kot-container {
            width: 100% !important;
            max-width: ${containerMaxWidth} !important;
            margin: 0 !important;
            padding: 1mm 2mm 1mm 1mm !important;
            box-sizing: border-box;
          }
          .divider { border-top: 1.5px dashed #000000; margin: 4px 0; }
          .double-divider { border-top: 2px dashed #000000; margin: 4px 0; }
          .text-center { text-align: center; }
          .bold { font-weight: 800; }
          
          @media print {
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            .kot-container {
              width: 100% !important;
              max-width: ${containerMaxWidth} !important;
              margin: 0 !important;
              padding: 1mm 2mm 1mm 1mm !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="kot-container">
          <div class="text-center bold" style="font-size: ${is2Inch ? '13px' : '15px'}; margin-bottom: 2px; word-break: normal; overflow-wrap: break-word;">
            ${(s.kot_header || 'KITCHEN ORDER TICKET').toUpperCase()}
          </div>
          ${s.kitchen_name ? `<div class="text-center bold" style="font-size: 11px;">[ ${s.kitchen_name.toUpperCase()} ]</div>` : ''}
          <div class="double-divider"></div>
          <div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Order No:</span> #${invoiceNo}</div>
          <div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Type:</span> ${order.table_number_or_takeaway || 'Takeaway'}</div>
          ${s.show_kot_time !== 0 ? `<div style="font-weight: 700; font-size: ${subFontSize};"><span class="bold">Time:</span> ${new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 3px; font-size: 11px;">
            <div style="flex: 2;">Item Description</div>
            <div style="flex: 1; text-align: right;">Qty</div>
          </div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="double-divider"></div>
          ${s.kot_footer_note ? `<div class="text-center" style="margin-top: 5px; font-style: italic; font-weight: 700; font-size: ${subFontSize};">${s.kot_footer_note}</div>` : ''}
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates ESC/POS byte-commands for KOT tickets on 2-inch and 3-inch thermal printers.
 */
export function generateLocalEscPosKot(order, items, kotSettings = null) {
  const s = kotSettings || {};
  const is2Inch = is2InchPaper(s);
  const cols = is2Inch ? 32 : 48;
  const divider = '-'.repeat(cols) + '\n';
  const doubleDivider = '='.repeat(cols) + '\n';

  const ESC = '\x1B';
  const GS = '\x1D';
  const CMD_INIT = ESC + '@';
  const CMD_ALIGN_CENTER = ESC + 'a\x01';
  const CMD_ALIGN_LEFT = ESC + 'a\x00';
  const CMD_BOLD_ON = ESC + 'E\x01';
  const CMD_BOLD_OFF = ESC + 'E\x00';
  const CMD_FONT_NORMAL = GS + '!\x00';
  const CMD_FONT_DOUBLE = GS + '!\x11';
  const CMD_CUT = '\n\n\n\n\n' + GS + 'V\x42\x00' + GS + 'V\x00';

  let cmds = CMD_INIT;

  // Header Center Aligned
  const kotTitle = s.kot_header || 'KITCHEN ORDER TICKET';
  cmds += CMD_ALIGN_CENTER + CMD_BOLD_ON;
  if (!is2Inch) cmds += CMD_FONT_DOUBLE;
  cmds += kotTitle.toUpperCase() + '\n';
  cmds += CMD_FONT_NORMAL + CMD_BOLD_OFF;

  if (s.kitchen_name) cmds += `[ ${s.kitchen_name.toUpperCase()} ]\n`;
  cmds += doubleDivider;

  // Order Details Left Aligned
  cmds += CMD_ALIGN_LEFT;
  cmds += `Order No: #${order.unique_order_number || order.offline_id || 'LOCAL-POS'}\n`;
  cmds += `Type    : ${order.table_number_or_takeaway || 'Takeaway'}\n`;
  if (s.show_kot_time !== 0) {
    cmds += `Time    : ${new Date(order.created_at || Date.now()).toLocaleTimeString()}\n`;
  }
  if (order.cashier_name) {
    cmds += `Staff   : ${order.cashier_name}\n`;
  }
  cmds += divider;

  // Items List
  if (is2Inch) {
    cmds += CMD_BOLD_ON + 'Item Description           Qty\n' + CMD_BOLD_OFF;
  } else {
    cmds += CMD_BOLD_ON + 'Item Description                       Quantity\n' + CMD_BOLD_OFF;
  }
  cmds += divider;

  items.forEach(item => {
    const qtyStr = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
    const nameStr = item.name.substring(0, cols - 10);
    const spacesCount = cols - nameStr.length - qtyStr.length;
    const spaces = ' '.repeat(Math.max(1, spacesCount));

    cmds += CMD_BOLD_ON + `${nameStr}${spaces}${qtyStr}\n` + CMD_BOLD_OFF;
    if (item.notes) {
      cmds += `  * Notes: ${item.notes}\n`;
    }
  });

  cmds += doubleDivider;

  if (s.kot_footer_note) {
    cmds += CMD_ALIGN_CENTER + s.kot_footer_note + '\n';
  }
  cmds += '\n\n\n' + CMD_CUT;

  return cmds;
}
