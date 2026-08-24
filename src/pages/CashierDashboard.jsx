import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Box, Button, Divider, Paper, CircularProgress, Chip, Tabs, Tab, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment } from '@mui/material';
import LogOutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import PaymentIcon from '@mui/icons-material/Payment';
import SearchIcon from '@mui/icons-material/Search';
import { apiFetch } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function CashierDashboard({ user, token, onLogout }) {
  const { notify, confirmDialog } = useNotify();
  
  // Dashboard & Shift state
  const [shiftData, setShiftData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0 = shift metrics, 1 = order history & held tickets

  // Cashier Order History states
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyTotalRecords, setHistoryTotalRecords] = useState(0);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Pay/Collect payment states
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [receiptSettings, setReceiptSettings] = useState(null);
  const [showStage2Dialog, setShowStage2Dialog] = useState(false);
  const [pendingPaymentMode, setPendingPaymentMode] = useState('cash');

  useEffect(() => {
    fetchShiftSummary();
    fetchReceiptSettings();
  }, []);

  const fetchReceiptSettings = async () => {
    try {
      const response = await apiFetch('/api/settings/receipt');
      if (response.ok) {
        setReceiptSettings(await response.json());
      }
    } catch (err) {
      console.error('Error loading receipt settings on dashboard:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 1) {
      fetchHistory();
    }
  }, [activeTab, historyPage, historyLimit, historySearch]);

  const fetchShiftSummary = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/orders/shift-summary');
      if (response.ok) {
        setShiftData(await response.json());
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to load shift summary.', 'Sync Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      let url = `/api/orders/history/list?page=${historyPage + 1}&limit=${historyLimit}&offset=${historyPage * historyLimit}`;
      if (historySearch) {
        url += `&search=${encodeURIComponent(historySearch)}`;
      }
      const response = await apiFetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.orders)) {
          setHistoryOrders(data.orders);
          setHistoryTotalRecords(data.pagination?.totalRecords ?? data.orders.length);
        } else if (Array.isArray(data)) {
          setHistoryOrders(data);
          setHistoryTotalRecords(data.length);
        } else {
          setHistoryOrders([]);
          setHistoryTotalRecords(0);
        }
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to load order history.', 'Sync Error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEndShift = async () => {
    const isConfirmed = await confirmDialog({
      title: 'Close Shift & Logout',
      message: 'Are you sure you want to end your shift and logout? Shift collections will be committed to audit reports.',
      confirmText: 'Close Shift & Logout',
      isDestructive: false
    });

    if (isConfirmed) {
      notify.info('Shift closed successfully.', 'Shift Complete', 1000);
      onLogout();
    }
  };

  const handleReprintOrder = async (orderId) => {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/reprint`, {
        method: 'POST'
      });
      if (res.ok) {
        notify.success('Receipt reprint duplicate enqueued.', 'Reprint Done', 1000);
      } else {
        const err = await res.json();
        notify.error(err.message || 'Reprint failed.', 'Reprint Error');
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to reprint receipt.', 'Printer Error');
    }
  };

  const handleOpenPayDialog = (order) => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectedOrder(order);
    setPaymentMode('cash');
    setPayDialogOpen(true);
  };

  const handleCollectPaymentClick = () => {
    if (!selectedOrder) return;
    
    const stage2Mode = receiptSettings?.print_stage2_mode || 'print_receipt_only';
    if (stage2Mode === 'show_popup') {
      setPendingPaymentMode(paymentMode);
      setShowStage2Dialog(true);
    } else {
      executeStage2Collect(paymentMode, stage2Mode);
    }
  };

  const executeStage2Collect = async (mode, action) => {
    if (!selectedOrder) return;
    
    let printActions = [];
    if (action === 'print_receipt_only') {
      printActions = ['RECEIPT'];
    } else if (action === 'print_kot_receipt') {
      printActions = ['KOT', 'RECEIPT'];
    } else if (action === 'print_kot_only') {
      printActions = ['KOT'];
    } else {
      // save_only
      printActions = [];
    }

    try {
      const res = await apiFetch(`/api/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        body: {
          status: 'completed',
          payment_mode: mode,
          print_actions: printActions
        }
      });
      if (res.ok) {
        notify.success(`Payment collected for order #${selectedOrder.unique_order_number}.`, 'Payment Success', 1000);
        setPayDialogOpen(false);
        setShowStage2Dialog(false);
        fetchHistory();
        fetchShiftSummary();
      } else {
        const data = await res.json();
        notify.error(data.error || 'Failed to collect payment.', 'Payment Error');
      }
    } catch (err) {
      console.error(err);
      notify.error('Failed to collect payment.', 'Network Error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
        <CircularProgress color="primary" />
        <Typography variant="body2" color="text.secondary">Fetching shift summary...</Typography>
      </Box>
    );
  }

  const storeName = user?.branch_name || user?.restaurant_name || receiptSettings?.branch_name || receiptSettings?.restaurant_name || shiftData?.branch_name || shiftData?.restaurant_name;

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Container maxWidth="lg" sx={{ py: { xs: 1.5, sm: 3, md: 4 }, px: { xs: 1.25, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2.5, md: 3 } }}>
        
        {/* Active shift header */}
        <Card variant="outlined" sx={{ p: 0.5, border: 1, borderColor: 'divider', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 1.25, sm: 2, md: 2.5 }, '&:last-child': { pb: { xs: 1.25, sm: 2, md: 2.5 } }, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: { xs: 1, sm: 2 } }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.25rem)', sm: '1.35rem', md: '1.45rem' }, lineHeight: 1.2 }}>
                Cashier Shift Active
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: { xs: '0.75rem', sm: '0.825rem' } }}>
                Cashier: <b>{user.name}</b>{storeName ? <> | Store: <b>{storeName}</b></> : null}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', flexShrink: 0 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
                onClick={() => { fetchShiftSummary(); if (activeTab === 1) fetchHistory(); }}
                sx={{
                  fontWeight: 800,
                  px: { xs: 1.25, sm: 2 },
                  py: { xs: 0.5, sm: 0.8 },
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  minHeight: { xs: 40, sm: 44 },
                  whiteSpace: 'nowrap'
                }}
              >
                Sync Dashboard
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<LogOutIcon sx={{ fontSize: 18 }} />}
                onClick={handleEndShift}
                sx={{
                  fontWeight: 800,
                  px: { xs: 1.25, sm: 2 },
                  py: { xs: 0.5, sm: 0.8 },
                  fontSize: { xs: '0.75rem', sm: '0.85rem' },
                  minHeight: { xs: 40, sm: 44 },
                  whiteSpace: 'nowrap'
                }}
              >
                End Shift & Logout
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Tab Selector - Scrollable Horizontal Strip */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%', mb: 0.5, overflowX: 'auto', WebkitOverflowScrolling: 'touch', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            <Tab label="📊 Shift Metrics" sx={{ fontWeight: 800, textTransform: 'none', fontSize: { xs: '0.8rem', sm: '0.9rem' }, minHeight: 42, px: { xs: 1.5, sm: 2.5 } }} />
            <Tab label="⏳ Last 12h History & Held Tickets" sx={{ fontWeight: 800, textTransform: 'none', fontSize: { xs: '0.8rem', sm: '0.9rem' }, minHeight: 42, px: { xs: 1.5, sm: 2.5 } }} />
          </Tabs>
        </Box>

        {/* Tab 0: Shift Metrics Summary */}
        {activeTab === 0 && shiftData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2.5, md: 3 } }}>
            {/* Breakdown Cards - Equal 1fr CSS Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                gap: { xs: '0.75rem', sm: '1rem', md: '1.25rem' },
                width: '100%'
              }}
            >
              <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2, md: 2.5 }, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3, borderLeft: '4px solid #3b82f6', height: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.68rem', sm: '0.75rem', md: '0.8rem' } }}>
                  STARTING FLOAT
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.35rem)', sm: '1.4rem', md: '1.5rem' } }}>
                  Rs. {parseFloat(shiftData.starting_cash || 0).toFixed(2)}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2, md: 2.5 }, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 3, borderLeft: '4px solid #f97316', height: '100%' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.68rem', sm: '0.75rem', md: '0.8rem' } }}>
                  SHIFT SALES ({shiftData.total_orders || 0})
                </Typography>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.35rem)', sm: '1.4rem', md: '1.5rem' } }}>
                  Rs. {parseFloat(shiftData.total_sales || 0).toFixed(2)}
                </Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 1.25, sm: 2, md: 2.5 },
                  textAlign: 'center',
                  bgcolor: 'background.paper',
                  borderRadius: 3,
                  borderLeft: '4px solid #10b981',
                  height: '100%',
                  gridColumn: { xs: 'span 2', sm: 'span 1' }
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: { xs: '0.68rem', sm: '0.75rem', md: '0.8rem' } }}>
                  EXPECTED CASH IN DRAWER
                </Typography>
                <Typography variant="h5" color="success.main" sx={{ fontWeight: 800, mt: 0.5, fontSize: { xs: 'clamp(1.05rem, 4vw, 1.35rem)', sm: '1.4rem', md: '1.5rem' } }}>
                  Rs. {(parseFloat(shiftData.starting_cash || 0) + parseFloat(shiftData.cash_sales || 0)).toFixed(2)}
                </Typography>
              </Paper>
            </Box>

            {/* Payment Method Collections Breakdown Grid */}
            <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2, md: 2.5 }, borderRadius: 3, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: { xs: 1, sm: 1.5 }, fontSize: { xs: '0.9rem', sm: '1rem', md: '1.05rem' } }}>
                💳 Payment Method Collections
              </Typography>
              <Divider sx={{ mb: { xs: 1, sm: 1.5 } }} />
              
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
                  gap: { xs: '0.65rem', sm: '0.875rem', md: '1rem' },
                  width: '100%'
                }}
              >
                {[
                  { id: 'cash', label: 'Cash Collections', icon: '💵', value: shiftData.cash_sales },
                  { id: 'upi', label: 'UPI / Digital', icon: '📱', value: shiftData.upi_sales },
                  { id: 'card', label: 'Card Collections', icon: '💳', value: shiftData.card_sales },
                  { id: 'wallet', label: 'Digital Wallet', icon: '👛', value: shiftData.wallet_sales },
                  { id: 'other', label: 'Other Payment', icon: '⚙️', value: shiftData.other_sales }
                ].map((mode, idx) => (
                  <Paper
                    key={mode.id}
                    variant="outlined"
                    sx={{
                      p: { xs: 1, sm: 1.5, md: 2 },
                      textAlign: 'center',
                      bgcolor: 'action.hover',
                      borderRadius: 2.5,
                      gridColumn: idx === 4 ? { xs: 'span 2', sm: 'span 1', md: 'span 1' } : 'auto'
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{mode.icon}</span>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, mt: 0.25, fontSize: { xs: '0.68rem', sm: '0.75rem' } }}>
                      {mode.label}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 0.25, fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      Rs. {parseFloat(mode.value || 0).toFixed(2)}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Tab 1: Cashier Order History & Held Tickets */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.25, sm: 2 } }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search history by Order #, customer name, mobile..."
                value={historySearch}
                onChange={e => { setHistorySearch(e.target.value); setHistoryPage(0); }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: '#64748b', fontSize: 18 }} />
                      </InputAdornment>
                    )
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    minHeight: 40,
                    fontSize: '0.85rem'
                  }
                }}
              />
            </Box>

            {/* Desktop / Tablet Table View */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, width: '100%', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
              {historyLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Order #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Customer Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Mobile</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Net Paid</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Mode</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 4, fontWeight: 700, color: 'text.secondary' }}>
                          No orders placed in your current shift window (last 12 hours).
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyOrders.map(order => (
                        <TableRow key={order.id} hover>
                          <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{order.unique_order_number}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                          <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{order.customer_name || '-'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{order.customer_phone || '-'}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: 'primary.main', whiteSpace: 'nowrap' }}>Rs. {parseFloat(order.total_amount).toFixed(2)}</TableCell>
                          <TableCell sx={{ fontSize: '11px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{order.payment_mode}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Chip
                              label={order.order_status.toUpperCase()}
                              color={order.order_status === 'completed' ? 'success' : order.order_status === 'pending' ? 'warning' : 'default'}
                              size="small"
                              sx={{ fontWeight: 800, fontSize: '10px', height: 22 }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              {order.order_status === 'pending' && (
                                <Tooltip title="Collect Checkout Payment">
                                  <IconButton size="small" color="primary" onClick={() => handleOpenPayDialog(order)}>
                                    <PaymentIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Print Receipt Duplicate">
                                <IconButton size="small" color="warning" onClick={() => handleReprintOrder(order.id)}>
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </TableContainer>

            {/* Mobile Stacked Card View */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.25 }}>
              {historyLoading ? (
                <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress size={24} />
                </Box>
              ) : historyOrders.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}>
                  No orders placed in your current shift window (last 12 hours).
                </Paper>
              ) : (
                historyOrders.map(order => (
                  <Card key={order.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                          #{order.unique_order_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          🕒 {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 800 }}>
                          Rs. {parseFloat(order.total_amount).toFixed(2)}
                        </Typography>
                        <Chip
                          label={order.order_status.toUpperCase()}
                          color={order.order_status === 'completed' ? 'success' : order.order_status === 'pending' ? 'warning' : 'default'}
                          size="small"
                          sx={{ fontWeight: 800, fontSize: '10px', height: 20 }}
                        />
                      </Box>
                    </Box>

                    {order.customer_name && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        👤 {order.customer_name} {order.customer_phone ? `(${order.customer_phone})` : ''}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: 1, borderColor: 'divider', fontSize: '0.75rem' }}>
                      <Box sx={{ color: 'text.secondary' }}>
                        Mode: <b style={{ textTransform: 'uppercase' }}>{order.payment_mode}</b>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {order.order_status === 'pending' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<PaymentIcon style={{ fontSize: 14 }} />}
                            onClick={() => handleOpenPayDialog(order)}
                            sx={{ fontWeight: 800, fontSize: '0.7rem', px: 1.25, py: 0.25 }}
                          >
                            Pay
                          </Button>
                        )}
                        <IconButton size="small" color="warning" onClick={() => handleReprintOrder(order.id)} title="Reprint">
                          <PrintIcon style={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  </Card>
                ))
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <TablePagination
                component="div"
                count={historyTotalRecords}
                page={historyPage}
                onPageChange={(e, newPage) => setHistoryPage(newPage)}
                rowsPerPage={historyLimit}
                onRowsPerPageChange={e => {
                  setHistoryLimit(parseInt(e.target.value, 10));
                  setHistoryPage(0);
                }}
                rowsPerPageOptions={[10, 15, 30]}
              />
            </Box>
          </Box>
        )}

      </Box>

      {/* COLLECT PAYMENT POPUP */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} disableRestoreFocus maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Collect Bill Payment
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {selectedOrder && (
            <>
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" color="text.secondary">Order Payable Amount</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.5 }}>
                  Rs. {parseFloat(selectedOrder.total_amount).toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Order Number: <b>{selectedOrder.unique_order_number}</b>
                </Typography>
              </Box>

              <TextField
                select
                fullWidth
                size="small"
                label="Payment Mode"
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                slotProps={{ select: { native: true } }}
              >
                <option value="cash">💵 Cash Payment</option>
                <option value="upi">📱 UPI QR Scan</option>
                <option value="card">💳 Credit/Debit Card</option>
                <option value="wallet">👛 Digital Wallet</option>
                <option value="other">⚙️ Other Payment Mode</option>
              </TextField>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCollectPaymentClick} sx={{ fontWeight: 'bold' }}>
            Complete Checkout & Print
          </Button>
        </DialogActions>
      </Dialog>

      {/* STAGE 2 PRINT CHOICE DIALOG */}
      <Dialog
        open={showStage2Dialog}
        onClose={() => setShowStage2Dialog(false)}
        disableRestoreFocus
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '16px', p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
          🖨️ Select Stage 2 Action
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Select a print/save workflow action to complete payment and close checkout:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              { id: 'save_only',         label: 'Save Only',          action: 'save_only',         flag: 'stage2_popup_save_only' },
              { id: 'print_receipt_only',label: 'Print Receipt Only',  action: 'print_receipt_only',flag: 'stage2_popup_receipt_only' },
              { id: 'print_kot_only',    label: 'Print KOT Only',      action: 'print_kot_only',    flag: 'stage2_popup_kot_only' },
              { id: 'print_kot_receipt', label: 'Print Receipt + KOT', action: 'print_kot_receipt', flag: 'stage2_popup_kot_receipt' }
            ].filter(opt => Number(receiptSettings?.[opt.flag]) !== 0).map(opt => (
              <Button
                key={opt.id}
                variant="outlined"
                fullWidth
                size="large"
                onClick={() => executeStage2Collect(pendingPaymentMode, opt.action)}
                sx={{
                  fontWeight: 800,
                  py: 1.5,
                  borderRadius: '10px',
                  justifyContent: 'center',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderColor: 'primary.main'
                  }
                }}
              >
                {opt.label}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStage2Dialog(false)} color="inherit" sx={{ fontWeight: 'bold' }}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  </Box>
  );
}
