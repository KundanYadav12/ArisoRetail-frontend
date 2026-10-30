import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Truck,
  Store,
  Clock,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Check,
  Package,
  Printer
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useNotify } from '../../context/NotificationContext';
import { printHtmlSilentlyViaIframe } from '../../utils/localReceiptGenerator';

export default function OnlineOrdersTab({ token, restaurantId }) {
  const { notify, confirmDialog } = useNotify();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [orderToReject, setOrderToReject] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const q = new URLSearchParams();
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (searchQuery.trim()) q.set('search', searchQuery.trim());

      const res = await apiFetch(`/api/merchant/store/orders?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      notify.error(err.message, 'Failed to load online orders');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(true), 20000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  const handleOpenDetail = async (orderId) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    try {
      const res = await apiFetch(`/api/merchant/store/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedOrder(data.order);
      }
    } catch (err) {
      notify.error(err.message, 'Failed to fetch order details');
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, newStatus, reason = null) => {
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/merchant/store/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status: newStatus, reason }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update status.');
      }

      notify.success(data.message || `Order updated to ${newStatus.toUpperCase()}`, 'Order Updated');

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({
          ...prev,
          online_order_status: newStatus,
          rejection_reason: reason || prev.rejection_reason
        }));
      }

      fetchOrders(true);
      setRejectModalOpen(false);
      setOrderToReject(null);
      setRejectReason('');
    } catch (err) {
      notify.error(err.message, 'Status Update Failed');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const pendingCount = orders.filter(o => o.online_order_status === 'pending').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#b45309', label: 'Pending Confirmation' };
      case 'confirmed': return { bg: '#e0f2fe', text: '#0369a1', label: 'Confirmed' };
      case 'preparing': return { bg: '#f3e8ff', text: '#7e22ce', label: 'Preparing' };
      case 'ready':
      case 'dispatched': return { bg: '#e0e7ff', text: '#3730a3', label: 'Out for Delivery / Ready' };
      case 'completed': return { bg: '#dcfce7', text: '#16a34a', label: 'Delivered / Completed' };
      case 'rejected': return { bg: '#fee2e2', text: '#b91c1c', label: 'Rejected' };
      case 'cancelled': return { bg: '#f1f5f9', text: '#64748b', label: 'Cancelled' };
      default: return { bg: '#f1f5f9', text: '#64748b', label: status };
    }
  };

  return (
    <Box>
      {/* 1. Header Toolbar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
            Online Orders Received
            {pendingCount > 0 && (
              <Chip
                label={`${pendingCount} NEW`}
                color="warning"
                size="small"
                sx={{ fontWeight: 900, height: 22 }}
              />
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Review, confirm, pack, and dispatch orders received from your online storefront
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search Order #, Customer, Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={16} color="#94A3B8" />
                  </InputAdornment>
                ),
                sx: { width: { xs: 200, sm: 260 }, height: 38, borderRadius: '8px', bgcolor: '#ffffff' }
              }
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => fetchOrders()}
            startIcon={<RefreshCw size={14} />}
            sx={{ height: 38, borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* 2. Status Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={(e, val) => setStatusFilter(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.82rem',
              textTransform: 'none',
              minHeight: 44
            }
          }}
        >
          <Tab value="all" label="All Orders" />
          <Tab
            value="pending"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <span>Pending</span>
                {pendingCount > 0 && (
                  <Box sx={{ bgcolor: '#f59e0b', color: '#fff', px: 0.8, py: 0.1, borderRadius: 10, fontSize: '0.7rem' }}>
                    {pendingCount}
                  </Box>
                )}
              </Box>
            }
          />
          <Tab value="confirmed" label="Confirmed" />
          <Tab value="preparing" label="Preparing" />
          <Tab value="dispatched" label="Out for Delivery" />
          <Tab value="completed" label="Completed" />
          <Tab value="rejected" label="Rejected / Cancelled" />
        </Tabs>
      </Box>

      {/* 3. Orders List */}
      {loading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress size={32} />
          <Typography variant="body2" sx={{ mt: 1, color: '#64748B' }}>Loading online orders...</Typography>
        </Box>
      ) : orders.length === 0 ? (
        <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '1px dashed #CBD5E1' }}>
          <Store size={48} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#334155' }}>
            No online orders found
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 360, mx: 'auto', mt: 0.5 }}>
            {statusFilter === 'pending'
              ? 'Great job! There are no pending orders awaiting confirmation.'
              : 'Orders placed on your public storefront will appear here instantly.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {orders.map((ord) => {
            const sc = getStatusColor(ord.online_order_status);
            const isPending = ord.online_order_status === 'pending';

            return (
              <Grid item xs={12} md={6} lg={4} key={ord.id}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.2,
                    borderRadius: '16px',
                    border: '1.5px solid',
                    borderColor: isPending ? '#f59e0b' : '#E2E8F0',
                    bgcolor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isPending ? '0 4px 16px rgba(245, 158, 11, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                    transition: 'all 0.18s ease',
                    '&:hover': { borderColor: '#CBD5E1', boxShadow: '0 6px 20px rgba(0,0,0,0.06)' }
                  }}
                >
                  <Box>
                    {/* Top Row: Order # and Status badge */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0F172A' }}>
                        #{ord.unique_order_number}
                      </Typography>
                      <Chip
                        label={sc.label}
                        size="small"
                        sx={{
                          bgcolor: sc.bg,
                          color: sc.text,
                          fontWeight: 800,
                          fontSize: '0.68rem',
                          height: 22
                        }}
                      />
                    </Box>

                    {/* Customer & Delivery Mode */}
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#1E293B', mb: 0.25 }}>
                      {ord.customer_name || 'Online Customer'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#64748B', mb: 1.25 }}>
                      <Phone size={13} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {ord.customer_phone || 'No phone'}
                      </Typography>
                      <span>•</span>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {ord.delivery_preference === 'pickup' ? 'Store Pickup' : 'Delivery'}
                      </Typography>
                    </Box>

                    {/* Amount & Payment Info */}
                    <Box sx={{ p: 1.2, borderRadius: '8px', bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>
                          Payable Amount
                        </Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#0F172A' }}>
                          ₹{parseFloat(ord.total_amount).toFixed(2)}
                        </Typography>
                      </Box>
                      <Chip
                        label={ord.payment_status === 'paid' ? 'PAID ONLINE' : 'CASH ON DELIVERY'}
                        size="small"
                        sx={{
                          bgcolor: ord.payment_status === 'paid' ? '#dcfce7' : '#fef3c7',
                          color: ord.payment_status === 'paid' ? '#16a34a' : '#b45309',
                          fontWeight: 800,
                          fontSize: '0.66rem',
                          height: 20
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Actions Bar */}
                  <Box sx={{ pt: 1.5, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleOpenDetail(ord.id)}
                      startIcon={<Eye size={14} />}
                      sx={{ fontWeight: 700, color: '#475569', textTransform: 'none' }}
                    >
                      View Details
                    </Button>

                    {/* Quick Confirm / Reject for pending */}
                    {isPending ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => {
                            setOrderToReject(ord);
                            setRejectModalOpen(true);
                          }}
                          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
                        >
                          Reject
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleUpdateStatus(ord.id, 'confirmed')}
                          sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
                        >
                          Accept
                        </Button>
                      </Box>
                    ) : ord.online_order_status === 'confirmed' ? (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleUpdateStatus(ord.id, 'preparing')}
                        sx={{ bgcolor: '#7e22ce', color: '#fff', fontWeight: 800, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#6b21a8' } }}
                      >
                        Start Preparing
                      </Button>
                    ) : ord.online_order_status === 'preparing' ? (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleUpdateStatus(ord.id, 'dispatched')}
                        sx={{ bgcolor: '#0284c7', color: '#fff', fontWeight: 800, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#0369a1' } }}
                      >
                        Dispatch Order
                      </Button>
                    ) : (ord.online_order_status === 'ready' || ord.online_order_status === 'dispatched') ? (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        onClick={() => handleUpdateStatus(ord.id, 'completed')}
                        sx={{ fontWeight: 800, textTransform: 'none', borderRadius: '8px' }}
                      >
                        Mark Completed
                      </Button>
                    ) : null}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 4. Order Detail Dialog */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Order #{selectedOrder?.unique_order_number}</span>
          <Chip
            label={selectedOrder ? getStatusColor(selectedOrder.online_order_status).label : ''}
            size="small"
            sx={{ fontWeight: 800 }}
          />
        </DialogTitle>

        <DialogContent dividers>
          {detailLoading || !selectedOrder ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Customer Contact & Address */}
              <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
                  Customer Information
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {selectedOrder.customer_name} ({selectedOrder.customer_phone})
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                  Preference: <strong>{selectedOrder.delivery_preference === 'pickup' ? 'Store Pickup' : 'Home Delivery'}</strong>
                </Typography>
                {selectedOrder.shipping_address && (
                  <Typography variant="body2" sx={{ color: '#334155', mt: 1 }}>
                    <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    {selectedOrder.shipping_address}
                    {selectedOrder.delivery_city ? `, ${selectedOrder.delivery_city}` : ''}
                    {selectedOrder.delivery_pincode ? ` - ${selectedOrder.delivery_pincode}` : ''}
                  </Typography>
                )}
                {selectedOrder.delivery_instructions && (
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                    Note: {selectedOrder.delivery_instructions}
                  </Typography>
                )}
              </Box>

              {/* Items List */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Ordered Items ({selectedOrder.items?.length || 0})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {selectedOrder.items?.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderBottom: '1px dashed #E2E8F0' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.quantity}x {item.item_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          ₹{parseFloat(item.unit_price).toFixed(2)} / {item.unit || 'pcs'}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        ₹{parseFloat(item.total_price).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Bill Totals */}
              <Box sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>Subtotal</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{parseFloat(selectedOrder.subtotal).toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>Delivery Fee</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {parseFloat(selectedOrder.delivery_fee) > 0 ? `₹${parseFloat(selectedOrder.delivery_fee).toFixed(2)}` : 'FREE'}
                  </Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Total Amount</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#ea580c' }}>
                    ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button onClick={() => setDetailModalOpen(false)} sx={{ fontWeight: 700, color: '#64748B' }}>
            Close
          </Button>

          {selectedOrder && selectedOrder.online_order_status === 'pending' && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setOrderToReject(selectedOrder);
                  setRejectModalOpen(true);
                }}
                sx={{ fontWeight: 800, borderRadius: '8px' }}
              >
                Reject Order
              </Button>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleUpdateStatus(selectedOrder.id, 'confirmed')}
                sx={{ fontWeight: 800, borderRadius: '8px' }}
              >
                Confirm Order
              </Button>
            </Box>
          )}
        </DialogActions>
      </Dialog>

      {/* 5. Reject Order Confirmation Modal */}
      <Dialog
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '16px' } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#b91c1c' }}>
          Reject Order #{orderToReject?.unique_order_number}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            Please specify the reason for rejecting this online order. This reason will be visible to the customer and any reserved stock will be automatically returned to your inventory.
          </Typography>
          <TextField
            fullWidth
            required
            autoFocus
            label="Rejection Reason"
            placeholder="e.g. Out of stock, Store closed, Unable to deliver to address"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectModalOpen(false)} sx={{ fontWeight: 700, color: '#64748B' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectReason.trim() || updatingStatus}
            onClick={() => handleUpdateStatus(orderToReject.id, 'rejected', rejectReason.trim())}
            sx={{ fontWeight: 800, borderRadius: '8px' }}
          >
            {updatingStatus ? 'Rejecting...' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
