/**
 * Helper to generate professional, printed-receipt-styled WhatsApp messages for customers.
 */
export function formatWhatsAppReceipt(orderData, receiptSettings = {}) {
  const order = orderData.order || orderData;
  const items = orderData.items || order.items || [];

  const restName = receiptSettings.restaurant_name || 'RESTAURANT POS';
  const branchName = receiptSettings.branch_name || '';
  const address = receiptSettings.address || '';
  const phone = receiptSettings.phone || '';
  const gstin = receiptSettings.gst_number || '';
  const fssai = receiptSettings.fssai_number || '';
  const headerMsg = receiptSettings.header_message || 'Welcome!';
  const thankMsg = receiptSettings.thank_you_message || 'Thank You! Visit Again.';
  const termsMsg = receiptSettings.terms_conditions || '';

  const isGstEnabled = receiptSettings.gst_enabled !== undefined ? Boolean(receiptSettings.gst_enabled) : true;

  const orderNum = order.unique_order_number || (order.id ? `ORD-${order.id}` : 'ORDER');
  const dateStr = order.created_at ? new Date(order.created_at).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : new Date().toLocaleString();

  const customerName = order.customer_name || 'Walk-in Customer';
  const customerPhone = order.customer_phone || '';
  const cashierName = order.cashier_name || 'Cashier';
  const orderType = order.table_number_or_takeaway || 'Takeaway';
  const paymentMode = (order.payment_mode || 'cash').toUpperCase();

  const subtotal = parseFloat(order.subtotal || 0);
  const discountAmount = parseFloat(order.discount_amount || 0);
  const taxAmount = isGstEnabled ? parseFloat(order.tax_amount || 0) : 0;
  const totalAmount = parseFloat(order.total_amount || 0);

  const cgstAmount = taxAmount / 2;
  const sgstAmount = taxAmount / 2;

  // Build Monospace/Markdown Boxed Receipt Message
  let lines = [];

  lines.push(`====================================`);
  lines.push(`🧾 *${restName.toUpperCase()}*`);
  if (branchName) lines.push(`${branchName}`);
  if (address) lines.push(`${address}`);
  if (phone) lines.push(`Ph: ${phone}`);
  if (isGstEnabled && gstin) lines.push(`GSTIN: ${gstin}`);
  if (fssai) lines.push(`FSSAI: ${fssai}`);
  lines.push(`====================================`);
  if (headerMsg) lines.push(`_${headerMsg}_`);
  lines.push(isGstEnabled ? `*OFFICIAL DIGITAL TAX INVOICE*` : `*OFFICIAL DIGITAL RECEIPT*`);
  lines.push(`------------------------------------`);
  lines.push(`*Invoice No:* ${orderNum}`);
  lines.push(`*Date & Time:* ${dateStr}`);
  lines.push(`*Order Type:* ${orderType}`);
  if (customerName) lines.push(`*Customer:* ${customerName}${customerPhone ? ` (${customerPhone})` : ''}`);
  lines.push(`*Cashier:* ${cashierName}`);
  lines.push(`------------------------------------`);
  lines.push(`*ITEMS ORDERED:*`);
  lines.push(`------------------------------------`);

  if (items.length > 0) {
    items.forEach((item, idx) => {
      const qty = item.quantity || 1;
      const unitPrice = parseFloat(item.price || 0);
      const lineTotal = unitPrice * qty;
      lines.push(`${idx + 1}. *${item.name}*`);
      lines.push(`   ${qty} x ₹${unitPrice.toFixed(2)} = *₹${lineTotal.toFixed(2)}*`);
      if (item.notes) {
        lines.push(`   _Note: ${item.notes}_`);
      }
    });
  } else {
    lines.push(`(Item details attached to bill)`);
  }

  lines.push(`------------------------------------`);
  lines.push(`*Subtotal:* ₹${subtotal.toFixed(2)}`);
  if (discountAmount > 0) {
    const discLabel = order.discount_type === 'percentage' && order.discount_value ? ` (${order.discount_value}%)` : '';
    lines.push(`*Discount${discLabel}:* -₹${discountAmount.toFixed(2)}`);
  }
  if (taxAmount > 0) {
    lines.push(`*CGST:* ₹${cgstAmount.toFixed(2)}`);
    lines.push(`*SGST:* ₹${sgstAmount.toFixed(2)}`);
    lines.push(`*Total Tax:* ₹${taxAmount.toFixed(2)}`);
  }
  lines.push(`------------------------------------`);
  lines.push(`*TOTAL AMOUNT PAID:* *₹${totalAmount.toFixed(2)}*`);
  lines.push(`*Payment Mode:* ${paymentMode}`);
  lines.push(`====================================`);
  if (thankMsg) lines.push(`*${thankMsg}*`);
  if (termsMsg) lines.push(`_${termsMsg}_`);
  lines.push(`====================================`);

  return lines.join('\n');
}

/**
 * Trigger WhatsApp share by constructing URL and opening target tab
 */
export function openWhatsAppShare(orderData, receiptSettings, phone) {
  const text = formatWhatsAppReceipt(orderData, receiptSettings);
  const cleanPhone = (phone != null && typeof phone !== 'object') ? String(phone).replace(/\D/g, '') : '';
  const waUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  
  window.open(waUrl, '_blank');
}
