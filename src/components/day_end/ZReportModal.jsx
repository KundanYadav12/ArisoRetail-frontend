import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, CircularProgress, IconButton, Paper, Divider, Chip
} from '@mui/material';
import { Printer, X, CheckCircle } from 'lucide-react';
import { generateDayEndHtmlReport } from '../../utils/dayEndReceiptGenerator';

export default function ZReportModal({ open, onClose, reportData, loading = false }) {
  const [printing, setPrinting] = useState(false);

  const handleBrowserPrint = () => {
    if (!reportData) return;
    setPrinting(true);
    try {
      const htmlContent = generateDayEndHtmlReport(reportData, true);
      const printWindow = window.open('', '_blank', 'width=600,height=800');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          setPrinting(false);
        }, 350);
      } else {
        alert('Pop-up blocked. Please allow pop-ups to print reports.');
        setPrinting(false);
      }
    } catch (e) {
      console.error('Print error:', e);
      setPrinting(false);
    }
  };

  const store = reportData?.store || {};
  const bDay = reportData?.business_day || {};
  const sales = reportData?.sales_summary || {};
  const cash = reportData?.cash_reconciliation || {};
  const expense = reportData?.expense_summary || {};
  const modes = reportData?.payment_reconciliations || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CheckCircle size={24} style={{ color: '#2e7d32' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Z Report (Final Day End Closing)</Typography>
            <Typography variant="caption" color="text.secondary">Official Financial Closing Audit Report</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small"><X size={20} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {loading || !reportData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 250 }}>
            <CircularProgress color="success" />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header Banner */}
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.06)', borderColor: 'success.light', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{store.name || 'Ariso Retail Store'}</Typography>
              <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 800 }}>
                *** Z REPORT — CLOSED & COMMITTED ***
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, my: 1 }}>
                <Chip
                  label={reportData.z_report_number || 'Z-REPORT'}
                  color="success"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  label="STATUS: CLOSED"
                  variant="outlined"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Business Date: <b>{bDay.business_date}</b> • Closed At: {reportData.closed_at ? new Date(reportData.closed_at).toLocaleString() : new Date().toLocaleString()}
              </Typography>
              {reportData.closed_by && (
                <Typography variant="caption" color="text.secondary">
                  Closed By: <b>{reportData.closed_by}</b> {reportData.approved_by ? `• Approved By: ${reportData.approved_by}` : ''}
                </Typography>
              )}
            </Paper>

            {/* Sales Summary */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Sales Summary
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.85rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Sales:</span>
                  <b>₹{(sales.gross_sales || 0).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discounts:</span>
                  <span style={{ color: '#ef4444' }}>- ₹{(sales.total_discount || 0).toFixed(2)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Tax / GST:</span>
                  <b>₹{(sales.total_tax || 0).toFixed(2)}</b>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem' }}>
                  <span>Net Sales ({sales.total_bills || 0} Bills):</span>
                  <span style={{ color: '#f97316' }}>₹{(sales.net_sales || 0).toFixed(2)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                  <span>Credit / Outstanding Sales:</span>
                  <span>₹{(sales.credit_amount || 0).toFixed(2)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                  <span>Cancelled Bills ({sales.cancelled_bills || 0}):</span>
                  <span>₹{(sales.cancelled_amount || 0).toFixed(2)}</span>
                </Box>
              </Box>
            </Paper>

            {/* Payment Reconciliations */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Payment Mode Settlements & Variances
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {modes.map(m => (
                  <Box
                    key={m.id || m.payment_mode}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.85rem',
                      p: 0.75,
                      borderRadius: 1,
                      bgcolor: 'action.hover'
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.85rem' }}>
                        {m.payment_mode}
                      </Typography>
                      {m.account_name && (
                        <Typography variant="caption" color="text.secondary">
                          Account: {m.account_name}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 800 }}>
                        Expected: ₹{(parseFloat(m.expected_amount) || 0).toFixed(2)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: parseFloat(m.variance || 0) < 0 ? 'error.main' : (parseFloat(m.variance || 0) > 0 ? 'success.main' : 'text.secondary')
                        }}
                      >
                        Actual: ₹{(parseFloat(m.actual_amount) || 0).toFixed(2)} (Var: ₹{(parseFloat(m.variance) || 0).toFixed(2)})
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Cash Drawer Closing Breakdown */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Cash Reconciliation
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.85rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opening Float:</span>
                  <b>+ ₹{(cash.opening_float || 0).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Sales:</span>
                  <b>+ ₹{(cash.cash_sales || 0).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Expenses:</span>
                  <span style={{ color: '#ef4444' }}>- ₹{(cash.cash_expenses || 0).toFixed(2)}</span>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Expected Cash:</span>
                  <b>₹{(cash.expected_cash || 0).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Actual Cash Counted:</span>
                  <span style={{ color: '#10b981' }}>₹{(cash.actual_cash || 0).toFixed(2)}</span>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    p: 0.75,
                    borderRadius: 1,
                    bgcolor: parseFloat(cash.cash_variance || 0) < 0 ? 'error.light' : (parseFloat(cash.cash_variance || 0) > 0 ? 'success.light' : 'action.hover'),
                    color: parseFloat(cash.cash_variance || 0) < 0 ? 'error.contrastText' : (parseFloat(cash.cash_variance || 0) > 0 ? 'success.contrastText' : 'text.primary')
                  }}
                >
                  <span>Cash Variance:</span>
                  <span>{parseFloat(cash.cash_variance || 0) < 0 ? `-₹${Math.abs(cash.cash_variance).toFixed(2)} (SHORTAGE)` : (parseFloat(cash.cash_variance || 0) > 0 ? `+₹${cash.cash_variance.toFixed(2)} (EXCESS)` : '₹0.00 (BALANCED)')}</span>
                </Box>
                {cash.cash_variance_reason && (
                  <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 0.5 }}>
                    Variance Reason: {cash.cash_variance_reason}
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Expenses Summary */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Expenses Summary
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Cash Expenses: ₹{(expense.cash_expenses || 0).toFixed(2)}</span>
                <span>Bank Expenses: ₹{(expense.bank_expenses || 0).toFixed(2)}</span>
                <b>Total: ₹{(expense.total_expenses || 0).toFixed(2)}</b>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Official Audit Record
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit">Close</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<Printer size={18} />}
            onClick={handleBrowserPrint}
            disabled={loading || !reportData || printing}
            sx={{ fontWeight: 800 }}
          >
            Print Z Report
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
