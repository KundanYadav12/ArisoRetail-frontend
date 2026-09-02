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

export function generateLocalHtmlReceipt(order, items, restaurant, receiptSettings = null) {
  const s = receiptSettings || {};
  const isGstEnabled = s.gst_enabled === 1 || s.gst_enabled === true || s.gst_enabled === 'true';
  const paperSize = s.paper_size || '80mm';
  const widthClass = paperSize === '58mm' ? '200px' : '290px';

  let itemsHtml = '';
  items.forEach(item => {
    const rate = parseFloat(item.price || 0).toFixed(2);
    const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity}`;
    const total = parseFloat(item.total_price || 0).toFixed(2);
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <div style="flex: 2; padding-right: 4px;">
          <div>${item.name}</div>
          <div style="font-size: 10px; color: #555;">${qty} @ ₹${rate}</div>
        </div>
        <div style="flex: 1; text-align: right;">₹${total}</div>
      </div>
    `;
  });

  // Calculate CGST / SGST split
  let taxSplitHtml = '';
  if (isGstEnabled && parseFloat(order.tax_amount) > 0) {
    const totalTax = parseFloat(order.tax_amount || 0);
    if (order.tax_type === 'inter') {
      taxSplitHtml = `
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>IGST Summary:</span>
          <span>₹${totalTax.toFixed(2)}</span>
        </div>
      `;
    } else {
      const halfTax = (totalTax / 2).toFixed(2);
      taxSplitHtml = `
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span>CGST (Central Tax):</span>
          <span>₹${halfTax}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
          <span>SGST (State Tax):</span>
          <span>₹${halfTax}</span>
        </div>
      `;
    }
  }

  const invoiceNo = order.unique_order_number || order.offline_id || 'LOCAL-POS';

  return `
    <html>
      <head>
        <style>
          @page { size: auto; margin: 0mm; }
          body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 12px; }
          .receipt-container { width: ${widthClass}; max-width: 100%; box-sizing: border-box; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px double #000; margin: 8px 0; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center bold" style="font-size: 16px; margin-bottom: 4px;">
            ${(s.restaurant_name || restaurant.name || 'ARISO RETAIL').toUpperCase()}
          </div>
          ${s.branch_name ? `<div class="text-center">${s.branch_name}</div>` : ''}
          ${s.address || restaurant.address ? `<div class="text-center">${s.address || restaurant.address}</div>` : ''}
          ${s.phone || restaurant.phone ? `<div class="text-center">Ph: ${s.phone || restaurant.phone}</div>` : ''}
          ${s.gst_number || restaurant.gst_number ? `<div class="text-center">GSTIN: ${s.gst_number || restaurant.gst_number}</div>` : ''}
          ${s.header_message ? `<div class="text-center" style="margin-top: 4px; font-style: italic;">* ${s.header_message} *</div>` : ''}
          
          <div class="double-divider"></div>
          
          <div><span class="bold">Bill No:</span> #${invoiceNo}</div>
          <div><span class="bold">Date:</span> ${new Date(order.created_at || Date.now()).toLocaleString()}</div>
          <div><span class="bold">Cashier:</span> ${order.cashier_name || 'Cashier'}</div>
          <div><span class="bold">Customer:</span> ${order.customer_name || 'Walk-in Customer'}</div>
          <div><span class="bold">Payment:</span> ${(order.payment_mode || 'CASH').toUpperCase()}</div>
          
          <div class="divider"></div>
          
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px;">
            <div style="flex: 2;">Item Description</div>
            <div style="flex: 1; text-align: right;">Amount</div>
          </div>
          
          <div class="divider"></div>
          
          ${itemsHtml}
          
          <div class="divider"></div>
          
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span>₹${parseFloat(order.subtotal || 0).toFixed(2)}</span>
          </div>
          
          ${parseFloat(order.discount_amount) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span>Discounts:</span>
              <span>-₹${parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          
          ${taxSplitHtml}
          
          <div class="double-divider"></div>
          
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>GRAND TOTAL:</span>
            <span>₹${parseFloat(order.total_amount || 0).toFixed(2)}</span>
          </div>
          
          <div class="double-divider"></div>
          
          ${s.footer_message ? `<div class="text-center" style="margin-top: 8px;">${s.footer_message}</div>` : '<div class="text-center" style="margin-top: 8px;">Thank You! Please Visit Again.</div>'}
        </div>
      </body>
    </html>
  `;
}

export function generateLocalEscPosReceipt(order, items, restaurant, receiptSettings = null) {
  const s = receiptSettings || {};
  const isGstEnabled = s.gst_enabled === 1 || s.gst_enabled === true || s.gst_enabled === 'true';
  const paperSize = s.paper_size === '58mm' ? '58' : '80';
  const cols = paperSize === '58' ? 32 : 48;
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
  const CMD_CUT = GS + 'V\x41\x03';

  let cmds = CMD_INIT;

  // Header Center Aligned
  cmds += CMD_ALIGN_CENTER + CMD_BOLD_ON;
  if (cols === 48) cmds += CMD_FONT_DOUBLE;
  cmds += (s.restaurant_name || restaurant.name || 'ARISO RETAIL').toUpperCase() + '\n';
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
  cmds += `Cashier : ${order.cashier_name || 'Cashier'}\n`;
  cmds += `Customer: ${order.customer_name || 'Walk-in Customer'}\n`;
  cmds += `Payment : ${(order.payment_mode || 'CASH').toUpperCase()}\n`;
  cmds += divider;

  // Column Headers
  if (cols === 32) {
    cmds += 'Item              Qty     Amount\n';
  } else {
    cmds += 'Item Description         Quantity        Amount\n';
  }
  cmds += divider;

  // Print Items
  items.forEach(item => {
    const qtyStr = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity}`;
    const totalStr = 'Rs.' + parseFloat(item.total_price || 0).toFixed(2);
    const nameStr = item.name.substring(0, cols - 18);
    
    // Left align item name, right align quantity and amount
    const rightMargin = qtyStr.padEnd(8) + totalStr.padStart(8);
    const spacesCount = cols - nameStr.length - rightMargin.length;
    const spaces = ' '.repeat(Math.max(1, spacesCount));
    
    cmds += `${nameStr}${spaces}${rightMargin}\n`;
  });
  cmds += divider;

  // Summary Left aligned
  const subtotalVal = parseFloat(order.subtotal || 0).toFixed(2);
  const discountVal = parseFloat(order.discount_amount || 0).toFixed(2);
  const taxVal = parseFloat(order.tax_amount || 0).toFixed(2);
  const grandTotalVal = parseFloat(order.total_amount || 0).toFixed(2);

  cmds += `Subtotal: `.padEnd(cols - 14) + `Rs.${subtotalVal}`.padStart(14) + '\n';
  if (parseFloat(discountVal) > 0) {
    cmds += `Discount: `.padEnd(cols - 14) + `-Rs.${discountVal}`.padStart(14) + '\n';
  }

  if (isGstEnabled && parseFloat(taxVal) > 0) {
    if (order.tax_type === 'inter') {
      cmds += `IGST (Integrated): `.padEnd(cols - 14) + `Rs.${taxVal}`.padStart(14) + '\n';
    } else {
      const halfTax = (parseFloat(taxVal) / 2).toFixed(2);
      cmds += `CGST (Central): `.padEnd(cols - 14) + `Rs.${halfTax}`.padStart(14) + '\n';
      cmds += `SGST (State): `.padEnd(cols - 14) + `Rs.${halfTax}`.padStart(14) + '\n';
    }
  }
  cmds += doubleDivider;

  // Grand Total double sized
  cmds += CMD_BOLD_ON;
  if (cols === 48) cmds += CMD_FONT_DOUBLE;
  cmds += `TOTAL:`.padEnd(cols / 2) + `Rs.${grandTotalVal}`.padStart(cols / 2) + '\n';
  cmds += CMD_FONT_NORMAL + CMD_BOLD_OFF;
  cmds += doubleDivider;

  // Footer Message Center Aligned
  cmds += CMD_ALIGN_CENTER;
  cmds += (s.footer_message || 'Thank You! Please Visit Again.') + '\n\n\n\n';
  cmds += CMD_CUT;

  return cmds;
}

export function generateLocalEscPosKot(order, items, kotSettings = null) {
  const s = kotSettings || {};
  const paperSize = s.paper_size === '58mm' ? '58' : '80';
  const cols = paperSize === '58' ? 32 : 48;
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
  const CMD_CUT = GS + 'V\x41\x03';

  let cmds = CMD_INIT;

  // Header Center Aligned
  const kotTitle = s.kot_header || 'KITCHEN ORDER TICKET';
  cmds += CMD_ALIGN_CENTER + CMD_BOLD_ON;
  if (cols === 48) cmds += CMD_FONT_DOUBLE;
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

  // Items List (No Prices)
  if (cols === 32) {
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

export function generateLocalHtmlKot(order, items, kotSettings = null) {
  const s = kotSettings || {};
  const paperSize = s.paper_size || '80mm';
  const widthClass = paperSize === '58mm' ? '200px' : '290px';

  let itemsHtml = '';
  items.forEach(item => {
    const qty = item.is_weight_based ? `${item.item_weight} ${item.weight_unit || 'kg'}` : `x${item.quantity || 1}`;
    itemsHtml += `
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-weight: bold; font-size: 13px;">
        <div style="flex: 2; padding-right: 4px;">
          <div>${item.name}</div>
          ${item.notes ? `<div style="font-size: 10px; font-style: italic; color: #444;">* Notes: ${item.notes}</div>` : ''}
        </div>
        <div style="flex: 1; text-align: right;">${qty}</div>
      </div>
    `;
  });

  const invoiceNo = order.unique_order_number || order.offline_id || 'LOCAL-POS';

  return `
    <html>
      <head>
        <style>
          @page { size: auto; margin: 0mm; }
          body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; color: #000; font-size: 12px; }
          .kot-container { width: ${widthClass}; max-width: 100%; box-sizing: border-box; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .double-divider { border-top: 2px double #000; margin: 8px 0; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="kot-container">
          <div class="text-center bold" style="font-size: 16px; margin-bottom: 4px;">
            ${(s.kot_header || 'KITCHEN ORDER TICKET').toUpperCase()}
          </div>
          ${s.kitchen_name ? `<div class="text-center bold">[ ${s.kitchen_name.toUpperCase()} ]</div>` : ''}
          <div class="double-divider"></div>
          <div><span class="bold">Order No:</span> #${invoiceNo}</div>
          <div><span class="bold">Type:</span> ${order.table_number_or_takeaway || 'Takeaway'}</div>
          ${s.show_kot_time !== 0 ? `<div><span class="bold">Time:</span> ${new Date(order.created_at || Date.now()).toLocaleTimeString()}</div>` : ''}
          ${order.cashier_name ? `<div><span class="bold">Staff:</span> ${order.cashier_name}</div>` : ''}
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 6px;">
            <div style="flex: 2;">Item Description</div>
            <div style="flex: 1; text-align: right;">Qty</div>
          </div>
          <div class="divider"></div>
          ${itemsHtml}
          <div class="double-divider"></div>
          ${s.kot_footer_note ? `<div class="text-center" style="margin-top: 8px; font-style: italic;">${s.kot_footer_note}</div>` : ''}
        </div>
      </body>
    </html>
  `;
}
