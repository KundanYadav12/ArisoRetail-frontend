import { safeUtf8ToBase64, is2InchPaper } from './localReceiptGenerator';

/**
 * Format currency number
 */
function fmt(num) {
  const n = parseFloat(num || 0);
  return `Rs. ${n.toFixed(2)}`;
}

/**
 * Center text for fixed column width
 */
function padCenter(text, width) {
  const t = String(text || '');
  if (t.length >= width) return t.slice(0, width);
  const left = Math.floor((width - t.length) / 2);
  const right = width - t.length - left;
  return ' '.repeat(left) + t + ' '.repeat(right);
}

/**
 * Left-Right aligned line: "Title ........ Value"
 */
function padLine(left, right, width) {
  const l = String(left || '');
  const r = String(right || '');
  if (l.length + r.length >= width) {
    return l.slice(0, width - r.length - 1) + ' ' + r;
  }
  const spaces = width - l.length - r.length;
  return l + ' '.repeat(spaces) + r;
}

/**
 * Generate Printable HTML for X Report or Z Report
 */
export function generateDayEndHtmlReport(reportData, isZReport = false) {
  if (!reportData) return '';

  const title = isZReport ? 'Z REPORT (FINAL DAY CLOSE)' : 'X REPORT (MID-DAY SNAPSHOT)';
  const store = reportData.store || {};
  const bDay = reportData.business_day || {};
  const sales = reportData.sales_summary || {};
  const cash = reportData.cash_reconciliation || {};
  const expense = reportData.expense_summary || {};
  const modes = reportData.payment_modes || reportData.payment_reconciliations || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${title} - ${bDay.business_date || ''}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          line-height: 1.4;
        }
        .container {
          max-width: 480px;
          margin: 0 auto;
          border: 1px solid #e2e8f0;
          padding: 20px;
          border-radius: 8px;
        }
        .header {
          text-align: center;
          margin-bottom: 16px;
          border-bottom: 2px dashed #cbd5e1;
          padding-bottom: 12px;
        }
        .header h1 {
          margin: 0 0 4px 0;
          font-size: 18px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .header .subtitle {
          font-size: 14px;
          font-weight: 700;
          color: #f97316;
          margin: 4px 0;
        }
        .header .store-info {
          font-size: 11px;
          color: #64748b;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 14px;
          font-size: 12px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 10px;
        }
        .meta-grid div span {
          color: #64748b;
        }
        .meta-grid div strong {
          color: #0f172a;
        }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          margin: 14px 0 6px 0;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 10px;
        }
        td {
          padding: 4px 0;
          font-size: 12px;
        }
        td.amt {
          text-align: right;
          font-weight: 700;
        }
        .total-row {
          border-top: 1px dashed #cbd5e1;
          border-bottom: 1px dashed #cbd5e1;
          font-weight: 800;
          font-size: 13px;
        }
        .variance-card {
          margin-top: 10px;
          padding: 8px 12px;
          border-radius: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-weight: 700;
        }
        .variance-short {
          background: #fef2f2;
          color: #ef4444;
          border-color: #fca5a5;
        }
        .variance-excess {
          background: #f0fdf4;
          color: #10b981;
          border-color: #86efac;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 2px dashed #cbd5e1;
          padding-top: 12px;
        }
        @media print {
          body { padding: 0; }
          .container { border: none; padding: 0; max-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${store.legal_name || store.name || 'ARISO RETAIL'}</h1>
          <div class="subtitle">${title}</div>
          <div class="store-info">
            ${store.address ? `<div>${store.address}</div>` : ''}
            ${store.phone ? `<div>Phone: ${store.phone}</div>` : ''}
            ${store.gst_number ? `<div>GSTIN: ${store.gst_number}</div>` : ''}
          </div>
        </div>

        <div class="meta-grid">
          <div><span>Date:</span> <strong>${bDay.business_date || ''}</strong></div>
          <div><span>Status:</span> <strong>${bDay.status || (isZReport ? 'CLOSED' : 'OPEN')}</strong></div>
          <div><span>Report #:</span> <strong>${reportData.z_report_number || 'X-SNAPSHOT'}</strong></div>
          <div><span>Time:</span> <strong>${new Date().toLocaleTimeString()}</strong></div>
          ${reportData.closed_by ? `<div><span>Closed By:</span> <strong>${reportData.closed_by}</strong></div>` : ''}
          ${reportData.approved_by ? `<div><span>Approved By:</span> <strong>${reportData.approved_by}</strong></div>` : ''}
        </div>

        <div class="section-title">Sales Summary</div>
        <table>
          <tr><td>Gross Sales:</td><td class="amt">${fmt(sales.gross_sales)}</td></tr>
          <tr><td>Discounts:</td><td class="amt">- ${fmt(sales.total_discount)}</td></tr>
          <tr><td>Total GST / Tax:</td><td class="amt">${fmt(sales.total_tax)}</td></tr>
          <tr class="total-row"><td>Net Sales (${sales.total_bills || 0} Bills):</td><td class="amt">${fmt(sales.net_sales)}</td></tr>
          <tr><td>Credit / Outstanding:</td><td class="amt">${fmt(sales.credit_amount)}</td></tr>
          <tr><td>Cancelled Bills (${sales.cancelled_bills || 0}):</td><td class="amt">${fmt(sales.cancelled_amount)}</td></tr>
          <tr><td>Sales Returns (${sales.returned_bills || 0}):</td><td class="amt">${fmt(sales.returned_amount)}</td></tr>
          <tr><td>Refunds Paid:</td><td class="amt">${fmt(sales.refunded_amount)}</td></tr>
        </table>

        <div class="section-title">Collections By Payment Mode</div>
        <table>
          ${modes.map(m => `
            <tr>
              <td>${(m.payment_mode || '').toUpperCase()}:</td>
              <td class="amt">${fmt(m.expected_amount || m.actual_amount)}</td>
            </tr>
          `).join('')}
        </table>

        <div class="section-title">Cash Drawer Reconciliation</div>
        <table>
          <tr><td>Opening Cash Float:</td><td class="amt">+ ${fmt(cash.opening_float)}</td></tr>
          <tr><td>Cash Sales:</td><td class="amt">+ ${fmt(cash.cash_sales)}</td></tr>
          ${cash.other_cash_in > 0 ? `<tr><td>Other Cash In:</td><td class="amt">+ ${fmt(cash.other_cash_in)}</td></tr>` : ''}
          ${cash.cash_transfers_in > 0 ? `<tr><td>Bank Contra In:</td><td class="amt">+ ${fmt(cash.cash_transfers_in)}</td></tr>` : ''}
          <tr><td>Cash Expenses:</td><td class="amt">- ${fmt(cash.cash_expenses)}</td></tr>
          ${cash.cash_withdrawals > 0 ? `<tr><td>Cash Withdrawals:</td><td class="amt">- ${fmt(cash.cash_withdrawals)}</td></tr>` : ''}
          ${cash.cash_transfers_out > 0 ? `<tr><td>Deposit Contra Out:</td><td class="amt">- ${fmt(cash.cash_transfers_out)}</td></tr>` : ''}
          ${cash.refunds_from_cash > 0 ? `<tr><td>Cash Refunds:</td><td class="amt">- ${fmt(cash.refunds_from_cash)}</td></tr>` : ''}
          <tr class="total-row"><td>Expected Cash in Drawer:</td><td class="amt">${fmt(cash.expected_cash)}</td></tr>
          <tr><td>Actual Physical Cash Count:</td><td class="amt">${fmt(cash.actual_cash !== undefined ? cash.actual_cash : cash.expected_cash)}</td></tr>
        </table>

        <div class="variance-card ${parseFloat(cash.cash_variance || 0) < 0 ? 'variance-short' : (parseFloat(cash.cash_variance || 0) > 0 ? 'variance-excess' : '')}">
          <div style="display:flex; justify-content:space-between;">
            <span>Cash Variance:</span>
            <span>${fmt(cash.cash_variance || 0)} ${parseFloat(cash.cash_variance || 0) < 0 ? '(SHORTAGE)' : (parseFloat(cash.cash_variance || 0) > 0 ? '(EXCESS)' : '(BALANCED)')}</span>
          </div>
          ${cash.cash_variance_reason ? `<div style="font-size:11px; margin-top:4px; font-weight:normal;">Reason: ${cash.cash_variance_reason}</div>` : ''}
        </div>

        <div class="section-title">Expense Summary</div>
        <table>
          <tr><td>Cash Expenses:</td><td class="amt">${fmt(expense.cash_expenses)}</td></tr>
          <tr><td>Bank / Digital Expenses:</td><td class="amt">${fmt(expense.bank_expenses)}</td></tr>
          <tr class="total-row"><td>Total Business Expenses:</td><td class="amt">${fmt(expense.total_expenses)}</td></tr>
        </table>

        <div class="footer">
          <div>Generated by Ariso Retail POS • All Rights Reserved</div>
          <div>${isZReport ? 'BUSINESS DAY COMPLETED & COMMITTED' : 'LIVE RUNNING AUDIT SNAPSHOT'}</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate ESC/POS Thermal Payload (Base64) for 2-inch or 3-inch printers
 */
export function generateDayEndEscPos(reportData, isZReport = false, is2Inch = false) {
  if (!reportData) return '';

  const width = is2Inch ? 32 : 42;
  const divider = '='.repeat(width);
  const thinDivider = '-'.repeat(width);

  const ESC = '\x1B';
  const GS = '\x1D';

  let raw = '';

  // Initialize printer
  raw += ESC + '@';
  // Text centering
  raw += ESC + 'a' + '\x01';

  // Header
  raw += ESC + 'E' + '\x01'; // Bold ON
  raw += (reportData.store?.name || 'ARISO RETAIL') + '\n';
  raw += (isZReport ? '*** Z REPORT (FINAL DAY CLOSE) ***' : '*** X REPORT (MID-DAY SNAPSHOT) ***') + '\n';
  raw += ESC + 'E' + '\x00'; // Bold OFF

  if (reportData.store?.gst_number) {
    raw += `GSTIN: ${reportData.store.gst_number}\n`;
  }
  raw += divider + '\n';

  // Left-align body
  raw += ESC + 'a' + '\x00';

  const bDay = reportData.business_day || {};
  const sales = reportData.sales_summary || {};
  const cash = reportData.cash_reconciliation || {};
  const expense = reportData.expense_summary || {};
  const modes = reportData.payment_modes || reportData.payment_reconciliations || [];

  raw += padLine('Business Date:', bDay.business_date || '', width) + '\n';
  raw += padLine('Report ID:', reportData.z_report_number || 'X-SNAPSHOT', width) + '\n';
  raw += padLine('Print Time:', new Date().toLocaleTimeString(), width) + '\n';
  raw += divider + '\n';

  // Sales Summary
  raw += ESC + 'E' + '\x01' + 'SALES SUMMARY' + ESC + 'E' + '\x00' + '\n';
  raw += padLine('Gross Sales:', fmt(sales.gross_sales), width) + '\n';
  raw += padLine('Discounts:', '-' + fmt(sales.total_discount), width) + '\n';
  raw += padLine('Total Tax/GST:', fmt(sales.total_tax), width) + '\n';
  raw += thinDivider + '\n';
  raw += ESC + 'E' + '\x01' + padLine(`Net Sales (${sales.total_bills || 0} Bills):`, fmt(sales.net_sales), width) + ESC + 'E' + '\x00' + '\n';
  raw += padLine('Credit Sales:', fmt(sales.credit_amount), width) + '\n';
  raw += padLine(`Cancelled (${sales.cancelled_bills || 0}):`, fmt(sales.cancelled_amount), width) + '\n';
  raw += divider + '\n';

  // Payment Modes
  raw += ESC + 'E' + '\x01' + 'PAYMENT COLLECTIONS' + ESC + 'E' + '\x00' + '\n';
  for (const m of modes) {
    raw += padLine((m.payment_mode || '').toUpperCase() + ':', fmt(m.expected_amount || m.actual_amount), width) + '\n';
  }
  raw += divider + '\n';

  // Cash Reconciliation
  raw += ESC + 'E' + '\x01' + 'CASH RECONCILIATION' + ESC + 'E' + '\x00' + '\n';
  raw += padLine('Opening Float:', '+' + fmt(cash.opening_float), width) + '\n';
  raw += padLine('Cash Sales:', '+' + fmt(cash.cash_sales), width) + '\n';
  raw += padLine('Cash Expenses:', '-' + fmt(cash.cash_expenses), width) + '\n';
  if (cash.refunds_from_cash > 0) {
    raw += padLine('Cash Refunds:', '-' + fmt(cash.refunds_from_cash), width) + '\n';
  }
  raw += thinDivider + '\n';
  raw += ESC + 'E' + '\x01' + padLine('Expected Cash:', fmt(cash.expected_cash), width) + ESC + 'E' + '\x00' + '\n';
  raw += padLine('Actual Physical:', fmt(cash.actual_cash !== undefined ? cash.actual_cash : cash.expected_cash), width) + '\n';
  raw += padLine('Cash Variance:', fmt(cash.cash_variance || 0), width) + '\n';
  if (cash.cash_variance_reason) {
    raw += `Reason: ${cash.cash_variance_reason}\n`;
  }
  raw += divider + '\n';

  // Expense Summary
  raw += ESC + 'E' + '\x01' + 'EXPENSES' + ESC + 'E' + '\x00' + '\n';
  raw += padLine('Cash Expenses:', fmt(expense.cash_expenses), width) + '\n';
  raw += padLine('Bank Expenses:', fmt(expense.bank_expenses), width) + '\n';
  raw += padLine('Total Expenses:', fmt(expense.total_expenses), width) + '\n';
  raw += divider + '\n';

  // Center Footer
  raw += ESC + 'a' + '\x01';
  raw += 'Ariso Retail Closing Audit\n';
  raw += (isZReport ? '** DAY END OFFICIALLY CLOSED **\n' : '** MID-DAY LIVE AUDIT **\n');

  // Feed & Cut
  raw += '\n\n\n\n';
  raw += GS + 'V' + '\x41' + '\x03'; // Partial Cut

  return safeUtf8ToBase64(raw);
}
