/**
 * Safely encodes any UTF-8 / Unicode text string into base64 without throwing Latin1 errors.
 */
export function safeUtf8ToBase64(str) {
  if (!str) return '';
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Checks if settings specify a 2-inch (58mm) thermal paper width.
 */
function is2InchPaper(settings) {
  if (!settings) return false;
  const raw = String(settings.paper_size || settings.receipt_paper_size || settings.paperSize || '80mm').toLowerCase().trim();
  return raw === '58mm' || raw === '2inch' || raw === '2"' || raw === '58' || raw === '2' || raw.includes('58') || raw.includes('2in');
}

/**
 * Generates thermal-optimized HTML receipt for both 3-inch (80mm) and 2-inch (58mm) paper.
 */
export function generateLocalHtmlReceipt(order, items, restaurant, receiptSettings = null) {
  const s = receiptSettings || {};
  const isGstEnabled = s.gst_enabled === 1 || s.gst_enabled === true || s.gst_enabled === 'true';
  const is2Inch = is2InchPaper(s);

  const containerWidth = is2Inch ? '48mm' : '72mm';
  const pageSize = is2Inch ? '58mm auto' : '80mm auto';
  const bodyFontSize = is2Inch ? '10px' : '12px';
  const titleFontSize = is2Inch ? '14px' : '16px';
  const totalFontSize = is2Inch ? '13px' : '15px';
  const paddingVal = is2Inch ? '1mm 1mm' : '2mm 2mm';

  let itemsHtml = '';
  if (is2Inch) {
    // Compact 2-inch (58mm) item layout: Title & Total on primary row, Qty @ Rate on subtitle
    items.forEach((item, idx) => {
      const rate = parseFloat(item.price || item.unit_price || 0).toFixed(2);
      const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
      const total = parseFloat(item.total_price || 0).toFixed(2);
      itemsHtml += `
        <div style="margin-bottom: 4px; ${idx < items.length - 1 ? 'border-bottom: 1px dotted #ccc; padding-bottom: 3px;' : ''}">
          <div style="display: flex; justify-content: space-between; font-weight: 700;">
            <span style="flex: 1; word-break: break-word; padding-right: 4px;">${item.name}</span>
            <span style="white-space: nowrap;">₹${total}</span>
          </div>
          <div style="font-size: 9px; color: #444; margin-top: 1px;">
            ${qty} @ ₹${rate}
          </div>
        </div>
      `;
    });
  } else {
    // 3-inch (80mm) structured 4-column item layout
    items.forEach(item => {
      const rate = parseFloat(item.price || item.unit_price || 0).toFixed(2);
      const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `${item.quantity || 1}`;
      const total = parseFloat(item.total_price || 0).toFixed(2);
      itemsHtml += `
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; font-size: 11px;">
          <span style="flex: 2.2; text-align: left; word-break: break-word; padding-right: 4px;">${item.name}</span>
          <span style="flex: 0.8; text-align: center; white-space: nowrap;">${qty}</span>
          <span style="flex: 1; text-align: right; white-space: nowrap;">₹${rate}</span>
          <span style="flex: 1.1; text-align: right; font-weight: 700; white-space: nowrap;">₹${total}</span>
        </div>
      `;
    });
  }

  // Calculate CGST / SGST split
  let taxSplitHtml = '';
  if (isGstEnabled && parseFloat(order.tax_amount || 0) > 0) {
    const totalTax = parseFloat(order.tax_amount || 0);
    if (order.tax_type === 'inter') {
      taxSplitHtml = `
        <div style="display: flex; justify-content: space-between; font-size: ${is2Inch ? '9.5px' : '11px'}; margin-top: 2px;">
          <span>IGST:</span>
          <span>₹${totalTax.toFixed(2)}</span>
        </div>
      `;
    } else {
      const halfTax = (totalTax / 2).toFixed(2);
      taxSplitHtml = `
        <div style="display: flex; justify-content: space-between; font-size: ${is2Inch ? '9.5px' : '11px'}; margin-top: 2px;">
          <span>CGST:</span>
          <span>₹${halfTax}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: ${is2Inch ? '9.5px' : '11px'}; margin-top: 2px;">
          <span>SGST:</span>
          <span>₹${halfTax}</span>
        </div>
      `;
    }
  }

  const invoiceNo = order.unique_order_number || order.offline_id || 'LOCAL-POS';
  const restName = (s.restaurant_name || restaurant.name || 'ARISO RETAIL STORE').toUpperCase();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt #${invoiceNo}</title>
        <style>
          @page { size: ${pageSize}; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: ${paddingVal};
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            color: #000;
            background: #fff;
            font-size: ${bodyFontSize};
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
          }
          .receipt-container {
            width: ${containerWidth};
            max-width: 100%;
            margin: 0 auto;
          }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="text-center bold" style="font-size: ${titleFontSize}; margin-bottom: 2px;">
            ${restName}
          </div>
          ${s.branch_name ? `<div class="text-center" style="font-size: ${is2Inch ? '9px' : '11px'};">${s.branch_name}</div>` : ''}
          ${s.address || restaurant.address ? `<div class="text-center" style="font-size: ${is2Inch ? '9px' : '11px'};">${s.address || restaurant.address}</div>` : ''}
          ${s.phone || restaurant.phone ? `<div class="text-center" style="font-size: ${is2Inch ? '9px' : '11px'};">Ph: ${s.phone || restaurant.phone}</div>` : ''}
          ${s.gst_number || restaurant.gst_number ? `<div class="text-center" style="font-size: ${is2Inch ? '9px' : '11px'}; font-weight: bold;">GSTIN: ${s.gst_number || restaurant.gst_number}</div>` : ''}
          ${s.header_message ? `<div class="text-center" style="margin-top: 3px; font-style: italic; font-size: ${is2Inch ? '9px' : '10.5px'};">* ${s.header_message} *</div>` : ''}
          
          <div class="double-divider"></div>
          
          <!-- Order Meta -->
          <div style="display: flex; justify-content: space-between;">
            <span><span class="bold">Bill:</span> #${invoiceNo}</span>
            <span>${(order.payment_mode || 'CASH').toUpperCase()}</span>
          </div>
          <div><span class="bold">Date:</span> ${new Date(order.created_at || Date.now()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
          ${order.cashier_name ? `<div><span class="bold">Staff:</span> ${order.cashier_name}</div>` : ''}
          ${order.customer_name && order.customer_name !== 'Walk-in Customer' ? `<div><span class="bold">Customer:</span> ${order.customer_name}</div>` : ''}
          
          <div class="divider"></div>
          
          <!-- Column Headers -->
          ${is2Inch ? `
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 10px; margin-bottom: 4px;">
              <span>Item Description</span>
              <span>Amount</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; margin-bottom: 4px;">
              <span style="flex: 2.2; text-align: left;">Item</span>
              <span style="flex: 0.8; text-align: center;">Qty</span>
              <span style="flex: 1; text-align: right;">Rate</span>
              <span style="flex: 1.1; text-align: right;">Total</span>
            </div>
          `}
          
          <div class="divider"></div>
          
          <!-- Items -->
          ${itemsHtml}
          
          <div class="divider"></div>
          
          <!-- Totals -->
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span class="bold">₹${parseFloat(order.subtotal || 0).toFixed(2)}</span>
          </div>
          
          ${parseFloat(order.discount_amount || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Discount:</span>
              <span class="bold">-₹${parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${taxSplitHtml}
          
          <div class="double-divider"></div>
          
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${totalFontSize};">
            <span>GRAND TOTAL:</span>
            <span>₹${parseFloat(order.total_amount || 0).toFixed(2)}</span>
          </div>
          
          <div class="double-divider"></div>
          
          <!-- Footer -->
          <div class="text-center" style="margin-top: 6px; font-size: ${is2Inch ? '9px' : '10.5px'};">
            ${s.footer_message || s.thank_you_message || 'Thank You! Please Visit Again.'}
          </div>
          ${s.terms_conditions ? `<div class="text-center" style="margin-top: 4px; font-size: 8px; color: #555;">${s.terms_conditions}</div>` : ''}
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
  const cols = is2Inch ? 32 : 48;
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
  const CMD_CUT = '\n\n\n' + GS + 'V\x42\x00';

  let cmds = CMD_INIT;

  // Header Center Aligned
  cmds += CMD_ALIGN_CENTER + CMD_BOLD_ON;
  if (!is2Inch) cmds += CMD_FONT_DOUBLE;
  cmds += (s.restaurant_name || restaurant.name || 'ARISO RETAIL STORE').toUpperCase() + '\n';
  cmds += CMD_FONT_NORMAL + CMD_BOLD_OFF;

  if (s.branch_name) cmds += s.branch_name + '\n';
  const addr = s.address !== undefined ? s.address : restaurant.address;
  if (addr) cmds += addr + '\n';
  const phone = s.phone !== undefined ? s.phone : restaurant.phone;
  if (phone) cmds += 'Ph: ' + phone + '\n';
  const gstin = s.gst_number !== undefined ? s.gst_number : restaurant.gst_number;
  if (gstin) cmds += 'GSTIN: ' + gstin + '\n';
  if (s.header_message) cmds += `* ${s.header_message} *\n`;
  cmds += doubleDivider;

  // Order Details Left Aligned
  cmds += CMD_ALIGN_LEFT;
  cmds += `Bill No : #${order.unique_order_number || order.offline_id || 'LOCAL-POS'}\n`;
  cmds += `Date    : ${new Date(order.created_at || Date.now()).toLocaleString()}\n`;
  if (order.cashier_name) cmds += `Cashier : ${order.cashier_name}\n`;
  if (order.customer_name && order.customer_name !== 'Walk-in Customer') cmds += `Customer: ${order.customer_name}\n`;
  cmds += `Payment : ${(order.payment_mode || 'CASH').toUpperCase()}\n`;
  cmds += divider;

  // Column Headers
  if (is2Inch) {
    cmds += 'Item Description          Amount\n';
  } else {
    cmds += 'Item Description         Qty    Rate    Amount\n';
  }
  cmds += divider;

  // Print Items
  items.forEach(item => {
    const qtyStr = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
    const rateStr = parseFloat(item.price || item.unit_price || 0).toFixed(2);
    const totalStr = 'Rs.' + parseFloat(item.total_price || 0).toFixed(2);

    if (is2Inch) {
      const nameStr = item.name.substring(0, 20);
      const spaces = ' '.repeat(Math.max(1, cols - nameStr.length - totalStr.length));
      cmds += `${nameStr}${spaces}${totalStr}\n`;
      cmds += `  ${qtyStr} @ Rs.${rateStr}\n`;
    } else {
      const nameStr = item.name.substring(0, 22);
      const qtyCol = qtyStr.padEnd(6);
      const rateCol = ('Rs.' + rateStr).padStart(8);
      const totalCol = totalStr.padStart(10);
      const rightPart = `${qtyCol}${rateCol}${totalCol}`;
      const spaces = ' '.repeat(Math.max(1, cols - nameStr.length - rightPart.length));
      cmds += `${nameStr}${spaces}${rightPart}\n`;
    }
  });
  cmds += divider;

  // Summary Left aligned
  const subtotalVal = parseFloat(order.subtotal || 0).toFixed(2);
  const discountVal = parseFloat(order.discount_amount || 0).toFixed(2);
  const taxVal = parseFloat(order.tax_amount || 0).toFixed(2);
  const grandTotalVal = parseFloat(order.total_amount || 0).toFixed(2);

  cmds += `Subtotal:`.padEnd(cols - 14) + `Rs.${subtotalVal}`.padStart(14) + '\n';
  if (parseFloat(discountVal) > 0) {
    cmds += `Discount:`.padEnd(cols - 14) + `-Rs.${discountVal}`.padStart(14) + '\n';
  }

  if (isGstEnabled && parseFloat(taxVal) > 0) {
    if (order.tax_type === 'inter') {
      cmds += `IGST:`.padEnd(cols - 14) + `Rs.${taxVal}`.padStart(14) + '\n';
    } else {
      const halfTax = (parseFloat(taxVal) / 2).toFixed(2);
      cmds += `CGST:`.padEnd(cols - 14) + `Rs.${halfTax}`.padStart(14) + '\n';
      cmds += `SGST:`.padEnd(cols - 14) + `Rs.${halfTax}`.padStart(14) + '\n';
    }
  }
  cmds += doubleDivider;

  // Grand Total double sized
  cmds += CMD_BOLD_ON;
  if (!is2Inch) cmds += CMD_FONT_DOUBLE;
  cmds += `TOTAL:`.padEnd(Math.floor(cols / 2)) + `Rs.${grandTotalVal}`.padStart(Math.ceil(cols / 2)) + '\n';
  cmds += CMD_FONT_NORMAL + CMD_BOLD_OFF;
  cmds += doubleDivider;

  // Footer Message Center Aligned
  cmds += CMD_ALIGN_CENTER;
  cmds += (s.footer_message || s.thank_you_message || 'Thank You! Please Visit Again.') + '\n\n\n\n';
  cmds += CMD_CUT;

  return cmds;
}

/**
 * Generates thermal KOT HTML for 3-inch (80mm) and 2-inch (58mm) printers.
 */
export function generateLocalHtmlKot(order, items, kotSettings = null) {
  const s = kotSettings || {};
  const is2Inch = is2InchPaper(s);

  const containerWidth = is2Inch ? '48mm' : '72mm';
  const pageSize = is2Inch ? '58mm auto' : '80mm auto';
  const bodyFontSize = is2Inch ? '10px' : '12px';
  const paddingVal = is2Inch ? '1mm 1mm' : '2mm 2mm';

  let itemsHtml = '';
  items.forEach(item => {
    const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold; font-size: ${is2Inch ? '11px' : '13px'};">
        <div style="flex: 2; padding-right: 4px; word-break: break-word;">
          <div>${item.name}</div>
          ${item.notes ? `<div style="font-size: 9px; font-style: italic; color: #444; font-weight: normal;">* Notes: ${item.notes}</div>` : ''}
        </div>
        <div style="flex: 1; text-align: right; white-space: nowrap;">${qty}</div>
      </div>
    `;
  });

  const invoiceNo = order.unique_order_number || order.offline_id || 'LOCAL-POS';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>KOT #${invoiceNo}</title>
        <style>
          @page { size: ${pageSize}; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: ${paddingVal};
            font-family: 'Courier New', Courier, 'Lucida Console', monospace;
            color: #000;
            background: #fff;
            font-size: ${bodyFontSize};
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
          }
          .kot-container {
            width: ${containerWidth};
            max-width: 100%;
            margin: 0 auto;
          }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="kot-container">
          <div class="text-center bold" style="font-size: ${is2Inch ? '14px' : '16px'}; margin-bottom: 2px;">
            ${(s.kot_header || 'KITCHEN ORDER TICKET').toUpperCase()}
          </div>
          ${s.kitchen_name ? `<div class="text-center bold" style="font-size: 11px;">[ ${s.kitchen_name.toUpperCase()} ]</div>` : ''}
          <div class="double-divider"></div>
          <div><span class="bold">Order No:</span> #${invoiceNo}</div>
          <div><span class="bold">Type:</span> ${order.table_number_or_takeaway || 'Takeaway'}</div>
          ${s.show_kot_time !== 0 ? `<div><span class="bold">Time:</span> ${new Date(order.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
          ${order.cashier_name ? `<div><span class="bold">Staff:</span> ${order.cashier_name}</div>` : ''}
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 4px;">
            <div style="flex: 2;">Item Description</div>
            <div style="flex: 1; text-align: right;">Qty</div>
          </div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="double-divider"></div>
          ${s.kot_footer_note ? `<div class="text-center" style="margin-top: 6px; font-style: italic; font-size: 9px;">${s.kot_footer_note}</div>` : ''}
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
  const CMD_CUT = '\n\n\n' + GS + 'V\x42\x00';

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
