import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Box, Button, CircularProgress, IconButton, Paper, Divider
} from '@mui/material';
import { Printer, X, FileText } from 'lucide-react';
import { generateDayEndHtmlReport } from '../../utils/dayEndReceiptGenerator';

export default function XReportModal({ open, onClose, reportData, loading = false }) {
  const [printing, setPrinting] = useState(false);

  const handleBrowserPrint = () => {
    if (!reportData) return;
    setPrinting(true);
    try {
      const htmlContent = generateDayEndHtmlReport(reportData, false);
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
  const modes = reportData?.payment_modes || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileText size={24} style={{ color: '#ed6c02' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>X Report (Mid-Day Snapshot)</Typography>
            <Typography variant="caption" color="text.secondary">View-only • Live Running Business Day Audit</Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small"><X size={20} /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        {loading || !reportData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 250 }}>
            <CircularProgress color="warning" />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header Card */}
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{store.name || 'Ariso Retail Store'}</Typography>
              <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 800 }}>
                *** X REPORT — LIVE SNAPSHOT ***
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Business Date: <b>{bDay.business_date}</b> • Generated: {new Date().toLocaleTimeString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Status: <b>{bDay.status}</b> (Non-destructive • Day Remains Open)
              </Typography>
            </Paper>

            {/* Sales Summary */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Sales Performance
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.85rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Sales:</span>
                  <b>₹{(sales.gross_sales || 0).toFixed(2)}</b>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Discounts:</span>
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
                  <span>Credit / Outstanding:</span>
                  <span>₹{(sales.credit_amount || 0).toFixed(2)}</span>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'text.secondary' }}>
                  <span>Cancelled Orders ({sales.cancelled_bills || 0}):</span>
                  <span>₹{(sales.cancelled_amount || 0).toFixed(2)}</span>
                </Box>
              </Box>
            </Paper>

            {/* Collections by Payment Mode */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Collections by Mode
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.85rem' }}>
                {modes.map(m => (
                  <Box key={m.payment_mode} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ textTransform: 'uppercase' }}>{m.payment_mode}:</span>
                    <b>₹{(m.expected_amount || 0).toFixed(2)}</b>
                  </Box>
                ))}
              </Box>
            </Paper>

            {/* Cash Drawer Reconciliation */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                Cash Drawer State
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: '0.85rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opening Cash Float:</span>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem' }}>
                  <span>Current Expected Cash:</span>
                  <span style={{ color: '#10b981' }}>₹{(cash.expected_cash || 0).toFixed(2)}</span>
                </Box>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Does not commit or close the day
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} color="inherit">Close</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Printer size={18} />}
            onClick={handleBrowserPrint}
            disabled={loading || !reportData || printing}
            sx={{ fontWeight: 800 }}
          >
            Print X Report
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
