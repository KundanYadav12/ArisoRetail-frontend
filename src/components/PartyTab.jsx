import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, InputAdornment, FormControl,
  InputLabel, Select, MenuItem, CircularProgress, Tooltip,
  Tabs, Tab
} from '@mui/material';
import {
  Users, Plus, Search, Edit2, History, ShoppingCart,
  Phone, Mail, MapPin, Building, CreditCard, RefreshCw,
  X, CheckCircle, Clock, XCircle, FileText, Truck, Receipt,
  ArrowDownRight, ArrowUpRight, DollarSign
} from 'lucide-react';
import {
  apiFetch,
  fetchCustomerUnpaidInvoices,
  recordCustomerPayment,
  fetchReceivablesSummary,
  fetchCustomerAgeingReport,
  fetchCustomerStatement
} from '../utils/api';
import { useNotify } from '../context/NotificationContext';

const INDIAN_STATES = [
  '01-Jammu & Kashmir', '02-Himachal Pradesh', '03-Punjab', '04-Chandigarh',
  '05-Uttarakhand', '06-Haryana', '07-Delhi', '08-Rajasthan', '09-Uttar Pradesh',
  '10-Bihar', '11-Sikkim', '12-Arunachal Pradesh', '13-Nagaland', '14-Manipur',
  '15-Mizoram', '16-Tripura', '17-Meghalaya', '18-Assam', '19-West Bengal',
  '20-Jharkhand', '21-Odisha', '22-Chhattisgarh', '23-Madhya Pradesh', '24-Gujarat',
  '27-Maharashtra', '29-Karnataka', '30-Goa', '32-Kerala', '33-Tamil Nadu',
  '36-Telangana', '37-Andhra Pradesh'
];

export default function PartyTab({
  onCreateSalesOrder,
  onViewOrderVoucher
}) {
  const { notify } = useNotify();

  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Party Modal
  const [partyModalOpen, setPartyModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [partySaving, setPartySaving] = useState(false);

  // Party Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('27-Maharashtra');
  const [creditLimit, setCreditLimit] = useState(0);
  const [creditDays, setCreditDays] = useState(30);
  const [allowCredit, setAllowCredit] = useState(true);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Order & Ledger History Drawer / Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedPartyForHistory, setSelectedPartyForHistory] = useState(null);
  const [historyTab, setHistoryTab] = useState(0); // 0: Orders, 1: Challans, 2: Invoices, 3: Ledger
  const [partyOrders, setPartyOrders] = useState([]);
  const [partyChallans, setPartyChallans] = useState([]);
  const [partyLedger, setPartyLedger] = useState([]);
  const [partyLedgerSummary, setPartyLedgerSummary] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Payment Recording Modal & Invoice Allocations
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [partyUnpaidInvoices, setPartyUnpaidInvoices] = useState([]);
  const [invoiceAllocations, setInvoiceAllocations] = useState({});
  const [loadingUnpaidInvoices, setLoadingUnpaidInvoices] = useState(false);

  // Top Receivables KPIs & Sub-tabs
  const [mainSubTab, setMainSubTab] = useState(0); // 0: Parties, 1: Receivables Invoices, 2: Ageing
  const [receivablesSummary, setReceivablesSummary] = useState(null);
  const [ageingReport, setAgeingReport] = useState([]);
  const [loadingReceivables, setLoadingReceivables] = useState(false);

  useEffect(() => {
    loadParties();
  }, []);

  const loadParties = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setParties(Array.isArray(data) ? data : (data.customers || []));
      }
    } catch (err) {
      console.error('Failed to load parties:', err);
      notify.error('Failed to load party records.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingParty(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setGstNumber('');
    setPanNumber('');
    setBillingAddress('');
    setShippingAddress('');
    setPlaceOfSupply('27-Maharashtra');
    setCreditLimit(0);
    setCreditDays(30);
    setAllowCredit(true);
    setOpeningBalance(0);
    setPartyModalOpen(true);
  };

  const handleOpenEditModal = (party) => {
    setEditingParty(party);
    setName(party.name || '');
    setContactPerson(party.contact_person || '');
    setPhone(party.phone || '');
    setEmail(party.email || '');
    setGstNumber(party.gst_number || '');
    setPanNumber(party.pan_number || '');
    setBillingAddress(party.address || party.billing_address || '');
    setShippingAddress(party.shipping_address || party.address || '');
    setPlaceOfSupply(party.place_of_supply || '27-Maharashtra');
    setCreditLimit(parseFloat(party.credit_limit || 0));
    setCreditDays(parseInt(party.credit_days !== undefined ? party.credit_days : 30));
    setAllowCredit(party.allow_credit !== undefined ? Boolean(party.allow_credit) : true);
    setOpeningBalance(parseFloat(party.opening_balance || 0));
    setPartyModalOpen(true);
  };

  const handleSaveParty = async () => {
    if (!name.trim()) {
      notify.error('Party / Company Name is required.', 'Validation');
      return;
    }

    setPartySaving(true);
    try {
      const payload = {
        name: name.trim(),
        contact_person: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        gst_number: gstNumber.trim() || null,
        pan_number: panNumber.trim() || null,
        address: billingAddress.trim() || null,
        billing_address: billingAddress.trim() || null,
        shipping_address: shippingAddress.trim() || billingAddress.trim() || null,
        place_of_supply: placeOfSupply,
        credit_limit: parseFloat(creditLimit) || 0,
        credit_days: parseInt(creditDays) || 0,
        allow_credit: allowCredit ? 1 : 0,
        opening_balance: parseFloat(openingBalance) || 0
      };

      let res;
      if (editingParty) {
        res = await apiFetch(`/api/customers/${editingParty.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        notify.success(
          editingParty ? `Party "${name}" updated successfully.` : `Party "${name}" created successfully.`,
          'Success'
        );
        setPartyModalOpen(false);
        loadParties();
      } else {
        const errData = await res.json();
        notify.error(errData.error || 'Failed to save party.', 'Error');
      }
    } catch (err) {
      notify.error(err.message || 'Failed to save party.', 'Error');
    } finally {
      setPartySaving(false);
    }
  };

  // Open History with selectable tab
  const handleOpenHistory = (party, initialTab = 0) => {
    setSelectedPartyForHistory(party);
    setHistoryTab(initialTab);
    setHistoryModalOpen(true);
    loadPartyHistoryData(party.id);
  };

  const loadPartyHistoryData = async (partyId) => {
    setLoadingHistory(true);
    try {
      const [ordRes, chalRes, ledgRes] = await Promise.all([
        apiFetch(`/api/customers/${partyId}/orders`),
        apiFetch(`/api/delivery-challans?party_id=${partyId}`).catch(() => ({ ok: false })),
        apiFetch(`/api/customers/${partyId}/ledger`).catch(() => ({ ok: false }))
      ]);

      if (ordRes.ok) {
        const d = await ordRes.json();
        setPartyOrders(Array.isArray(d) ? d : (d.orders || []));
      } else {
        setPartyOrders([]);
      }

      if (chalRes && chalRes.ok) {
        const d = await chalRes.json();
        setPartyChallans(Array.isArray(d) ? d : (d.delivery_challans || []));
      } else {
        setPartyChallans([]);
      }

      if (ledgRes && ledgRes.ok) {
        const d = await ledgRes.json();
        setPartyLedger(d.ledger || []);
        setPartyLedgerSummary(d.customer || null);
      } else {
        setPartyLedger([]);
        setPartyLedgerSummary(null);
      }
    } catch (err) {
      console.error('Failed to load party history data:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load Receivables Summary and Ageing Report
  const loadReceivablesData = async () => {
    setLoadingReceivables(true);
    try {
      const [sumRes, ageRes] = await Promise.allSettled([
        fetchReceivablesSummary(),
        fetchCustomerAgeingReport()
      ]);
      if (sumRes.status === 'fulfilled' && sumRes.value) {
        setReceivablesSummary(sumRes.value);
      }
      if (ageRes.status === 'fulfilled' && ageRes.value) {
        setAgeingReport(Array.isArray(ageRes.value) ? ageRes.value : (ageRes.value?.report || []));
      }
    } catch (e) {
      console.warn('Receivables load notice:', e);
    } finally {
      setLoadingReceivables(false);
    }
  };

  useEffect(() => {
    loadReceivablesData();
  }, []);

  // Open Payment Recording Dialog with customer unpaid invoices
  const handleOpenPaymentModal = async (party = null) => {
    const targetParty = party || selectedPartyForHistory;
    if (!targetParty) return;
    setSelectedPartyForHistory(targetParty);
    setPaymentAmount('');
    setPaymentRef('');
    setPaymentNotes('');
    setInvoiceAllocations({});
    setPaymentModalOpen(true);
    setLoadingUnpaidInvoices(true);
    try {
      const data = await fetchCustomerUnpaidInvoices(targetParty.id);
      const invs = Array.isArray(data) ? data : (data.invoices || []);
      setPartyUnpaidInvoices(invs);
    } catch (e) {
      console.warn('Could not load unpaid invoices:', e);
      setPartyUnpaidInvoices([]);
    } finally {
      setLoadingUnpaidInvoices(false);
    }
  };

  // Auto-allocate payment amount FIFO across open invoices
  const handleAutoAllocate = (amountStr) => {
    let rem = parseFloat(amountStr) || 0;
    const allocMap = {};
    for (const inv of partyUnpaidInvoices) {
      if (rem <= 0) break;
      const due = parseFloat(inv.remaining_due || 0);
      const toAlloc = Math.min(rem, due);
      allocMap[inv.id] = parseFloat(toAlloc.toFixed(2));
      rem -= toAlloc;
    }
    setInvoiceAllocations(allocMap);
  };

  // Record Payment
  const handleRecordPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      notify.error('Please enter a valid payment amount > 0', 'Validation');
      return;
    }

    setRecordingPayment(true);
    try {
      const allocList = Object.entries(invoiceAllocations)
        .filter(([_, allocAmt]) => parseFloat(allocAmt) > 0)
        .map(([orderId, allocAmt]) => ({
          order_id: parseInt(orderId),
          allocated_amount: parseFloat(allocAmt)
        }));

      await recordCustomerPayment({
        customer_id: selectedPartyForHistory.id,
        amount: amt,
        payment_mode: paymentMode,
        reference_number: paymentRef.trim() || null,
        notes: paymentNotes.trim() || null,
        allocations: allocList.length > 0 ? allocList : null
      });

      notify.success(`Payment of ₹${amt.toFixed(2)} recorded successfully!`, 'Payment Success');
      setPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      setInvoiceAllocations({});
      if (selectedPartyForHistory?.id) {
        loadPartyHistoryData(selectedPartyForHistory.id);
      }
      loadParties();
      loadReceivablesData();
    } catch (err) {
      notify.error(err.message || 'Failed to record payment.', 'Error');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Filtered Parties
  const filteredParties = useMemo(() => {
    if (!searchTerm.trim()) return parties;
    const term = searchTerm.toLowerCase().trim();
    return parties.filter(p =>
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.contact_person && p.contact_person.toLowerCase().includes(term)) ||
      (p.phone && p.phone.toLowerCase().includes(term)) ||
      (p.gst_number && p.gst_number.toLowerCase().includes(term)) ||
      (p.address && p.address.toLowerCase().includes(term))
    );
  }, [parties, searchTerm]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2.5 }, width: '100%' }}>
      {/* Header Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, width: '100%' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: 'clamp(1.1rem, 4vw, 1.4rem)', sm: '1.5rem' }, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Users size={24} color="#0284c7" /> Party Management
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Manage B2B customers, dealers, shipping addresses, GSTIN, and create custom Sales Orders.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshCw size={14} className={loading ? 'spin' : ''} />}
            onClick={loadParties}
            sx={{ fontWeight: 700 }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={handleOpenAddModal}
            sx={{ fontWeight: 800, bgcolor: 'primary.main', px: 2 }}
          >
            + Add New Party
          </Button>
        </Box>
      </Box>

      {/* Sub-Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={mainSubTab}
          onChange={(_, v) => {
            setMainSubTab(v);
            if (v === 1 || v === 2) loadReceivablesData();
          }}
          textColor="primary"
          indicatorColor="primary"
          sx={{ minHeight: 42 }}
        >
          <Tab
            label="Parties Directory"
            icon={<Users size={16} />}
            iconPosition="start"
            sx={{ fontWeight: 800, minHeight: 42, textTransform: 'none', fontSize: '0.85rem' }}
          />
          <Tab
            label="Customer Receivables / Udhar"
            icon={<DollarSign size={16} />}
            iconPosition="start"
            sx={{ fontWeight: 800, minHeight: 42, textTransform: 'none', fontSize: '0.85rem' }}
          />
          <Tab
            label="Ageing Analysis"
            icon={<Clock size={16} />}
            iconPosition="start"
            sx={{ fontWeight: 800, minHeight: 42, textTransform: 'none', fontSize: '0.85rem' }}
          />
        </Tabs>
      </Box>

      {/* TAB 0: PARTIES DIRECTORY */}
      {mainSubTab === 0 && (
        <>
          {/* Metrics Cards */}
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: 'background.paper' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Registered Parties
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: 'primary.main' }}>
                  {parties.length}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, textTransform: 'uppercase' }}>
                  GST Registered Parties
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#16a34a' }}>
                  {parties.filter(p => Boolean(p.gst_number)).length}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Outstanding Due
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#dc2626' }}>
                  ₹{parties.reduce((sum, p) => sum + (parseFloat(p.current_balance || 0) > 0 ? parseFloat(p.current_balance) : 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                <Typography variant="caption" sx={{ color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>
                  Parties with Credit Limit
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#2563eb' }}>
                  {parties.filter(p => parseFloat(p.credit_limit || 0) > 0).length}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Search Bar */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search party by name, contact person, phone, GSTIN, or city..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <X size={14} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
            />
          </Paper>

          {/* Parties Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 920 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Party / Business Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Contact Info</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>GSTIN / PAN</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Billing / Supply State</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Outstanding Due</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Credit Limit</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredParties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary', fontWeight: 600 }}>
                      {loading ? 'Loading party records...' : 'No parties found matching your search.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParties.map((party) => (
                    <TableRow key={party.id} hover>
                      {/* Party Name */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ bgcolor: 'primary.light', color: 'primary.dark', p: 0.75, borderRadius: 1.5 }}>
                            <Building size={16} />
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                              {party.name}
                            </Typography>
                            {party.contact_person && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Attn: {party.contact_person}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell>
                        {party.phone && (
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Phone size={12} color="#64748b" /> {party.phone}
                          </Typography>
                        )}
                        {party.email && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Mail size={12} /> {party.email}
                          </Typography>
                        )}
                      </TableCell>

                      {/* GSTIN / PAN */}
                      <TableCell>
                        {party.gst_number ? (
                          <Chip
                            size="small"
                            label={`GST: ${party.gst_number}`}
                            sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">Unregistered</Typography>
                        )}
                        {party.pan_number && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                            PAN: {party.pan_number}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Address & Place of Supply */}
                      <TableCell>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0369a1', display: 'block' }}>
                          {party.place_of_supply || '27-Maharashtra'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 220, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {party.address || party.billing_address || 'No address specified'}
                        </Typography>
                      </TableCell>

                      {/* Outstanding Due */}
                      <TableCell align="right">
                        {parseFloat(party.current_balance || 0) > 0 ? (
                          <Chip
                            size="small"
                            label={`₹${parseFloat(party.current_balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Due`}
                            sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 800, border: '1px solid #fca5a5', cursor: 'pointer' }}
                            onClick={() => handleOpenHistory(party, 3)}
                            title="Click to view Customer Ledger"
                          />
                        ) : parseFloat(party.current_balance || 0) < 0 ? (
                          <Chip
                            size="small"
                            label={`₹${Math.abs(parseFloat(party.current_balance)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`}
                            sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 800, cursor: 'pointer' }}
                            onClick={() => handleOpenHistory(party, 3)}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>₹0.00 (Settled)</Typography>
                        )}
                      </TableCell>

                      {/* Credit Limit */}
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {parseFloat(party.credit_limit || 0) > 0 ? (
                          <Chip
                            size="small"
                            label={`₹${parseFloat(party.credit_limit).toLocaleString('en-IN')}`}
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 800, fontSize: '0.725rem' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">-</Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Receive Payment Button */}
                          {parseFloat(party.current_balance || 0) > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              startIcon={<DollarSign size={13} />}
                              onClick={() => handleOpenPaymentModal(party)}
                              sx={{ fontWeight: 800, fontSize: '0.725rem', px: 1, py: 0.3 }}
                            >
                              Receive
                            </Button>
                          )}

                          {/* Create Order Button */}
                          <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            startIcon={<ShoppingCart size={13} />}
                            onClick={() => onCreateSalesOrder && onCreateSalesOrder(party)}
                            sx={{ fontWeight: 800, fontSize: '0.725rem', px: 1.25, py: 0.3 }}
                          >
                            Create Order
                          </Button>

                          {/* Order History Button */}
                          <Tooltip title="View History & Ledger">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => handleOpenHistory(party, 0)}
                            >
                              <History size={16} />
                            </IconButton>
                          </Tooltip>

                          {/* Edit Button */}
                          <Tooltip title="Edit Party">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditModal(party)}
                            >
                              <Edit2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* TAB 1: CUSTOMER RECEIVABLES / UDHAR */}
      {mainSubTab === 1 && (
        <>
          {/* Receivables KPIs */}
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase' }}>
                  Total Receivables / Udhar
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#dc2626' }}>
                  ₹{(receivablesSummary?.summary?.total_receivables || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {receivablesSummary?.summary?.total_debtors || 0} customer(s)
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#fff7ed', borderColor: '#fed7aa' }}>
                <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 800, textTransform: 'uppercase' }}>
                  Overdue Amount
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#ea580c' }}>
                  ₹{(receivablesSummary?.summary?.total_overdue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Past credit due date
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase' }}>
                  Due Today
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#2563eb' }}>
                  ₹{(receivablesSummary?.summary?.total_due_today || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Maturing today
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 6, sm: 3 }}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2.5, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, textTransform: 'uppercase' }}>
                  Customer Advances
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, mt: 0.5, color: '#16a34a' }}>
                  ₹{(receivablesSummary?.summary?.total_advance_balances || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pre-paid / unallocated credits
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Search Bar for Receivables */}
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'background.paper', display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search customer receivables by name, phone, or GST..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <X size={14} />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={loadReceivablesData}
              startIcon={<RefreshCw size={14} className={loadingReceivables ? 'spin' : ''} />}
              sx={{ fontWeight: 700, flexShrink: 0 }}
            >
              Reload
            </Button>
          </Paper>

          {/* Receivables Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 920 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Contact Info</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Total Invoiced</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Total Paid</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Outstanding Udhar</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Overdue Amount</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Credit Limit / Avail.</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const customers = receivablesSummary?.customers || [];
                  const filtered = customers.filter(c => {
                    if (!searchTerm.trim()) return true;
                    const s = searchTerm.toLowerCase();
                    return (
                      (c.name && c.name.toLowerCase().includes(s)) ||
                      (c.phone && c.phone.toLowerCase().includes(s)) ||
                      (c.gst_number && c.gst_number.toLowerCase().includes(s))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary', fontWeight: 600 }}>
                          {loadingReceivables ? 'Loading customer receivables...' : 'No customer receivables matching the criteria.'}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return filtered.map(c => {
                    const due = parseFloat(c.current_balance || 0);
                    const overdue = parseFloat(c.overdue_amount || 0);
                    const limit = parseFloat(c.credit_limit || 0);
                    const availableCredit = Math.max(0, limit - due);

                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {c.name}
                          </Typography>
                          {c.advance_balance > 0 && (
                            <Chip
                              size="small"
                              label={`Advance: ₹${parseFloat(c.advance_balance).toFixed(2)}`}
                              sx={{ bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 800, fontSize: '0.65rem', height: 18, mt: 0.25 }}
                            />
                          )}
                        </TableCell>

                        <TableCell>
                          {c.phone && (
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Phone size={12} color="#64748b" /> {c.phone}
                            </Typography>
                          )}
                          {c.gst_number && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                              {c.gst_number}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{parseFloat(c.total_invoiced_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell align="right" sx={{ fontWeight: 700, color: '#16a34a' }}>
                          ₹{parseFloat(c.total_invoice_paid_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>

                        <TableCell align="right">
                          <Chip
                            size="small"
                            label={`₹${due.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            sx={{
                              bgcolor: due > 0 ? '#fef2f2' : '#f0fdf4',
                              color: due > 0 ? '#dc2626' : '#16a34a',
                              fontWeight: 800,
                              border: due > 0 ? '1px solid #fca5a5' : 'none',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleOpenHistory(c, 3)}
                          />
                        </TableCell>

                        <TableCell align="right">
                          {overdue > 0 ? (
                            <Chip
                              size="small"
                              label={`₹${overdue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                              sx={{ bgcolor: '#fff7ed', color: '#ea580c', fontWeight: 800, border: '1px solid #fdba74' }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">-</Typography>
                          )}
                        </TableCell>

                        <TableCell align="right">
                          {limit > 0 ? (
                            <Box>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e40af' }}>
                                Limit: ₹{limit.toLocaleString('en-IN')}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', color: availableCredit <= 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                Avail: ₹{availableCredit.toLocaleString('en-IN')}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">No Limit</Typography>
                          )}
                        </TableCell>

                        <TableCell align="right">
                          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<DollarSign size={13} />}
                              onClick={() => handleOpenPaymentModal(c)}
                              sx={{ fontWeight: 800, fontSize: '0.725rem', px: 1.25, py: 0.3 }}
                            >
                              Receive Payment
                            </Button>
                            <Tooltip title="View Ledger">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleOpenHistory(c, 3)}
                              >
                                <History size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* TAB 2: AGEING ANALYSIS */}
      {mainSubTab === 2 && (
        <>
          {/* Ageing Summary Cards */}
          {(() => {
            const summary = ageingReport?.length > 0 ? {
              b0_30: ageingReport.reduce((s, r) => s + parseFloat(r.bucket_0_30 || 0), 0),
              b31_60: ageingReport.reduce((s, r) => s + parseFloat(r.bucket_31_60 || 0), 0),
              b61_90: ageingReport.reduce((s, r) => s + parseFloat(r.bucket_61_90 || 0), 0),
              b91_120: ageingReport.reduce((s, r) => s + parseFloat(r.bucket_91_120 || 0), 0),
              b120_plus: ageingReport.reduce((s, r) => s + parseFloat(r.bucket_120_plus || 0), 0),
              total: ageingReport.reduce((s, r) => s + parseFloat(r.total_due || 0), 0)
            } : { b0_30: 0, b31_60: 0, b61_90: 0, b91_120: 0, b120_plus: 0, total: 0 };

            return (
              <Grid container spacing={{ xs: 1, sm: 1.5 }}>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2.5, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                    <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      0 - 30 Days (Current)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#16a34a' }}>
                      ₹{summary.b0_30.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2.5, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                    <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      31 - 60 Days
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#2563eb' }}>
                      ₹{summary.b31_60.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2.5, bgcolor: '#fefce8', borderColor: '#fef08a' }}>
                    <Typography variant="caption" sx={{ color: '#a16207', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      61 - 90 Days
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#ca8a04' }}>
                      ₹{summary.b61_90.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2.5, bgcolor: '#fff7ed', borderColor: '#fed7aa' }}>
                    <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      91 - 120 Days
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#ea580c' }}>
                      ₹{summary.b91_120.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 6, sm: 2.4 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2.5, bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                    <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                      120+ Days (High Risk)
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5, color: '#dc2626' }}>
                      ₹{summary.b120_plus.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            );
          })()}

          {/* Ageing Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 920 }}>
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Total Outstanding</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#16a34a' }}>0 - 30 Days</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#2563eb' }}>31 - 60 Days</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#ca8a04' }}>61 - 90 Days</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#ea580c' }}>91 - 120 Days</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#dc2626' }}>120+ Days</TableCell>
                  <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ageingReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary', fontWeight: 600 }}>
                      {loadingReceivables ? 'Loading customer ageing report...' : 'No outstanding receivables found for ageing analysis.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  ageingReport.map(r => (
                    <TableRow key={r.customer_id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {r.customer_name}
                        </Typography>
                        {r.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {r.phone}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900, color: '#dc2626', fontSize: '0.85rem' }}>
                        ₹{parseFloat(r.total_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(r.bucket_0_30 || 0) > 0 ? '#16a34a' : 'text.secondary' }}>
                        {parseFloat(r.bucket_0_30 || 0) > 0 ? `₹${parseFloat(r.bucket_0_30).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(r.bucket_31_60 || 0) > 0 ? '#2563eb' : 'text.secondary' }}>
                        {parseFloat(r.bucket_31_60 || 0) > 0 ? `₹${parseFloat(r.bucket_31_60).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(r.bucket_61_90 || 0) > 0 ? '#ca8a04' : 'text.secondary' }}>
                        {parseFloat(r.bucket_61_90 || 0) > 0 ? `₹${parseFloat(r.bucket_61_90).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(r.bucket_91_120 || 0) > 0 ? '#ea580c' : 'text.secondary' }}>
                        {parseFloat(r.bucket_91_120 || 0) > 0 ? `₹${parseFloat(r.bucket_91_120).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 800, color: parseFloat(r.bucket_120_plus || 0) > 0 ? '#dc2626' : 'text.secondary' }}>
                        {parseFloat(r.bucket_120_plus || 0) > 0 ? `₹${parseFloat(r.bucket_120_plus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>

                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<DollarSign size={13} />}
                            onClick={() => {
                              const foundParty = parties.find(p => p.id === r.customer_id) || { id: r.customer_id, name: r.customer_name };
                              handleOpenPaymentModal(foundParty);
                            }}
                            sx={{ fontWeight: 800, fontSize: '0.725rem', px: 1, py: 0.3 }}
                          >
                            Receive
                          </Button>
                          <Tooltip title="View Ledger">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => {
                                const foundParty = parties.find(p => p.id === r.customer_id) || { id: r.customer_id, name: r.customer_name };
                                handleOpenHistory(foundParty, 3);
                              }}
                            >
                              <History size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Add / Edit Party Modal */}
      <Dialog
        open={partyModalOpen}
        onClose={() => setPartyModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {editingParty ? `Edit Party: ${editingParty.name}` : 'Add New Party / Dealer'}
        </DialogTitle>

        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Grid container spacing={2}>
            {/* Party Name */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Party / Business Name *"
                placeholder="e.g. Metro Distributors Pvt Ltd"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </Grid>

            {/* Contact Person */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Contact Person"
                placeholder="e.g. Rajesh Kumar"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
              />
            </Grid>

            {/* Phone */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Phone Number"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </Grid>

            {/* Email */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="email"
                label="Email Address"
                placeholder="orders@party.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </Grid>

            {/* GSTIN */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="GSTIN / Tax ID"
                placeholder="15-digit GSTIN (e.g. 27AABCU9603R1ZM)"
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value.toUpperCase())}
              />
            </Grid>

            {/* PAN */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="PAN Number"
                placeholder="10-character PAN"
                value={panNumber}
                onChange={e => setPanNumber(e.target.value.toUpperCase())}
              />
            </Grid>

            {/* Billing Address */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Billing Address"
                placeholder="Registered business address..."
                value={billingAddress}
                onChange={e => setBillingAddress(e.target.value)}
              />
            </Grid>

            {/* Shipping Address */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Shipping Address"
                placeholder="Warehouse or delivery address..."
                value={shippingAddress}
                onChange={e => setShippingAddress(e.target.value)}
              />
            </Grid>

            {/* Place of Supply */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Place of Supply</InputLabel>
                <Select
                  value={placeOfSupply}
                  label="Place of Supply"
                  onChange={e => setPlaceOfSupply(e.target.value)}
                >
                  {INDIAN_STATES.map(st => (
                    <MenuItem key={st} value={st}>{st}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Credit Limit */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Credit Limit (₹)"
                placeholder="0.00"
                value={creditLimit}
                onChange={e => setCreditLimit(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }
                }}
              />
            </Grid>

            {/* Credit Terms (Days) */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Credit Terms (Days)"
                placeholder="30"
                value={creditDays}
                onChange={e => setCreditDays(e.target.value)}
                helperText="Default due period"
              />
            </Grid>

            {/* Allow Credit Sale */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Credit Permission</InputLabel>
                <Select
                  value={allowCredit ? 'yes' : 'no'}
                  label="Credit Permission"
                  onChange={e => setAllowCredit(e.target.value === 'yes')}
                >
                  <MenuItem value="yes">Allow Credit Sales</MenuItem>
                  <MenuItem value="no">Block Credit Sales</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Opening Balance */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Opening Balance (₹)"
                placeholder="0.00"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  }
                }}
                helperText="Receivable opening balance"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setPartyModalOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveParty}
            variant="contained"
            disabled={partySaving}
            sx={{ fontWeight: 800, px: 3 }}
          >
            {partySaving ? 'Saving...' : (editingParty ? 'Update Party' : 'Save Party')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Party Order History & Multi-Tab Lifecycle Modal */}
      <Dialog
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, maxHeight: '92vh' } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ bgcolor: 'primary.light', p: 1, borderRadius: 2, display: 'flex', color: 'primary.dark' }}>
              <Building size={22} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {selectedPartyForHistory?.name}
                </Typography>
                {parseFloat(selectedPartyForHistory?.current_balance || 0) > 0 ? (
                  <Chip
                    size="small"
                    label={`₹${parseFloat(selectedPartyForHistory.current_balance).toFixed(2)} Due`}
                    sx={{ bgcolor: '#fef2f2', color: '#dc2626', fontWeight: 800 }}
                  />
                ) : (
                  <Chip size="small" label="Settled (₹0.00)" color="success" sx={{ fontWeight: 800 }} />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {selectedPartyForHistory?.phone ? `📞 ${selectedPartyForHistory.phone} • ` : ''}
                GST: {selectedPartyForHistory?.gst_number || 'Unregistered'} •
                State: {selectedPartyForHistory?.place_of_supply || 'Maharashtra'}
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setHistoryModalOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        {/* Navigation Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f8fafc' }}>
          <Tabs value={historyTab} onChange={(e, val) => setHistoryTab(val)} sx={{ minHeight: 44 }}>
            <Tab icon={<ShoppingCart size={15} />} iconPosition="start" label={`Sales Orders (${partyOrders.filter(o => !o.parent_order_id && o.is_sales_order).length})`} sx={{ fontWeight: 700, minHeight: 44, textTransform: 'none' }} />
            <Tab icon={<Truck size={15} />} iconPosition="start" label={`Delivery Challans (${partyChallans.length})`} sx={{ fontWeight: 700, minHeight: 44, textTransform: 'none' }} />
            <Tab icon={<Receipt size={15} />} iconPosition="start" label={`Invoices (${partyOrders.filter(o => o.order_status === 'completed' || o.parent_order_id).length})`} sx={{ fontWeight: 700, minHeight: 44, textTransform: 'none' }} />
            <Tab icon={<CreditCard size={15} />} iconPosition="start" label="Ledger / Statement" sx={{ fontWeight: 800, minHeight: 44, textTransform: 'none', color: '#7c3aed' }} />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 2.5 }}>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : (
            <>
              {/* TAB 0: Sales Orders */}
              {historyTab === 0 && (
                <Box>
                  {partyOrders.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                      No sales orders or estimates found for this party.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Order #</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Delivery Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Total (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {partyOrders.map(ord => (
                            <TableRow key={ord.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: 'primary.main' }}>
                                {ord.unique_order_number || ord.order_number || `#${ord.id}`}
                              </TableCell>
                              <TableCell>
                                {ord.is_estimate === 1 ? (
                                  <Chip size="small" label="Estimate" sx={{ bgcolor: '#ede9fe', color: '#7c3aed', fontWeight: 700 }} />
                                ) : (
                                  <Chip size="small" label="Sales Order" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                                )}
                              </TableCell>
                              <TableCell>
                                {new Date(ord.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell>
                                {ord.delivery_date ? new Date(ord.delivery_date).toLocaleDateString('en-IN') : '-'}
                              </TableCell>
                              <TableCell>
                                {ord.order_status === 'pending' ? (
                                  <Chip size="small" icon={<Clock size={12} />} label="Pending" sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700 }} />
                                ) : ord.order_status === 'completed' ? (
                                  <Chip size="small" icon={<CheckCircle size={12} />} label="Completed" color="success" sx={{ fontWeight: 700 }} />
                                ) : (
                                  <Chip size="small" label={ord.order_status} color="error" sx={{ fontWeight: 700 }} />
                                )}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 800 }}>
                                ₹{parseFloat(ord.total_amount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setHistoryModalOpen(false);
                                    onViewOrderVoucher && onViewOrderVoucher(ord);
                                  }}
                                  sx={{ fontWeight: 700, fontSize: '0.725rem' }}
                                >
                                  View Voucher
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* TAB 1: Delivery Challans */}
              {historyTab === 1 && (
                <Box>
                  {partyChallans.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                      No delivery challans recorded for this party yet.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Challan #</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Ref Sales Order</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Vehicle / Transporter</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Driver / Phone</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {partyChallans.map(ch => (
                            <TableRow key={ch.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#d97706' }}>
                                {ch.challan_number}
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                {ch.sales_order_number || `#${ch.sales_order_id}`}
                              </TableCell>
                              <TableCell>
                                {new Date(ch.challan_date || ch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell>
                                {ch.vehicle_number || ch.transport_mode || '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={ch.status?.toUpperCase()}
                                  color={ch.status === 'delivered' ? 'success' : 'warning'}
                                  sx={{ fontWeight: 800 }}
                                />
                              </TableCell>
                              <TableCell>
                                {ch.driver_name ? `${ch.driver_name} ${ch.driver_phone ? `(${ch.driver_phone})` : ''}` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* TAB 2: Invoices */}
              {historyTab === 2 && (
                <Box>
                  {partyOrders.filter(o => o.order_status === 'completed' || o.parent_order_id).length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                      No completed invoices found for this party.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Invoice #</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Payment Mode</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Tax (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Grand Total (₹)</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {partyOrders.filter(o => o.order_status === 'completed' || o.parent_order_id).map(inv => (
                            <TableRow key={inv.id} hover>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#16a34a' }}>
                                {inv.unique_order_number || inv.order_number || `#${inv.id}`}
                              </TableCell>
                              <TableCell>
                                {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                                {inv.payment_mode || 'Cash'}
                              </TableCell>
                              <TableCell align="right">
                                ₹{parseFloat(inv.tax_amount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 900, color: '#15803d' }}>
                                ₹{parseFloat(inv.total_amount || 0).toFixed(2)}
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setHistoryModalOpen(false);
                                    onViewOrderVoucher && onViewOrderVoucher(inv);
                                  }}
                                  sx={{ fontWeight: 700, fontSize: '0.725rem' }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}

              {/* TAB 3: Customer Ledger / Statement */}
              {historyTab === 3 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Ledger Summary Cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1.5 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#f8fafc' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>
                        Opening Balance
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        ₹{parseFloat(selectedPartyForHistory?.opening_balance || 0).toFixed(2)}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Debits (Sales)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e40af' }}>
                        ₹{partyLedger.reduce((sum, l) => sum + parseFloat(l.debit || 0), 0).toFixed(2)}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                        Total Credits (Paid)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a' }}>
                        ₹{partyLedger.reduce((sum, l) => sum + parseFloat(l.credit || 0), 0).toFixed(2)}
                      </Typography>
                    </Paper>

                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', borderRadius: 2, bgcolor: '#fef2f2', borderColor: '#fecaca' }}>
                      <Typography variant="caption" sx={{ color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase' }}>
                        Current Due Balance
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: '#dc2626' }}>
                        ₹{parseFloat(selectedPartyForHistory?.current_balance || 0).toFixed(2)}
                      </Typography>
                    </Paper>
                  </Box>

                  {/* Actions bar for ledger */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155' }}>
                      Statement of Accounts & Running Balance
                    </Typography>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<Plus size={15} />}
                      onClick={() => {
                        setPaymentAmount('');
                        setPaymentRef('');
                        setPaymentNotes('');
                        setPaymentModalOpen(true);
                      }}
                      sx={{ fontWeight: 800 }}
                    >
                      + Record Payment
                    </Button>
                  </Box>

                  {/* Ledger Table */}
                  {partyLedger.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 5, color: 'text.secondary', fontWeight: 600 }}>
                      No ledger transactions recorded yet.
                    </Typography>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Voucher / Ref #</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Debit (Dr) ₹</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Credit (Cr) ₹</TableCell>
                            <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Running Balance ₹</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>Notes / Mode</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {partyLedger.map(tx => (
                            <TableRow key={tx.id} hover>
                              <TableCell>
                                {new Date(tx.entry_date || tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={tx.entry_type}
                                  color={tx.entry_type === 'PAYMENT' ? 'success' : tx.entry_type === 'INVOICE' ? 'primary' : 'default'}
                                  sx={{ fontWeight: 800, fontSize: '0.7rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                                {tx.reference_type ? `${tx.reference_type}: ` : ''}{tx.reference_id || '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(tx.debit) > 0 ? '#b91c1c' : 'inherit' }}>
                                {parseFloat(tx.debit || 0) > 0 ? `₹${parseFloat(tx.debit).toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: parseFloat(tx.credit) > 0 ? '#15803d' : 'inherit' }}>
                                {parseFloat(tx.credit || 0) > 0 ? `₹${parseFloat(tx.credit).toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 900 }}>
                                ₹{parseFloat(tx.running_balance || 0).toFixed(2)}
                              </TableCell>
                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                {tx.payment_mode ? `[${tx.payment_mode.toUpperCase()}] ` : ''}{tx.notes || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setHistoryModalOpen(false)} color="inherit">Close</Button>
        </DialogActions>
      </Dialog>

      {/* Record Payment Dialog with Invoice Allocation */}
      <Dialog
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Receive Payment — {selectedPartyForHistory?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <div>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Current Outstanding</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#dc2626' }}>
                  ₹{parseFloat(selectedPartyForHistory?.current_balance || 0).toFixed(2)}
                </Typography>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase' }}>Advance Balance</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a' }}>
                  ₹{parseFloat(selectedPartyForHistory?.advance_balance || 0).toFixed(2)}
                </Typography>
              </div>
            </Box>

            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Amount Received (₹) *"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => {
                    const val = e.target.value;
                    setPaymentAmount(val);
                    if (parseFloat(val) > 0 && partyUnpaidInvoices.length > 0) {
                      handleAutoAllocate(val);
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>
                    }
                  }}
                  autoFocus
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    value={paymentMode}
                    label="Payment Mode"
                    onChange={e => setPaymentMode(e.target.value)}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="upi">UPI / QR Code</MenuItem>
                    <MenuItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                    <MenuItem value="cheque">Cheque</MenuItem>
                    <MenuItem value="card">Card / POS</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reference / Cheque / UTR #"
                  placeholder="Transaction ref..."
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Notes / Remarks"
                  placeholder="Optional payment notes..."
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                />
              </Grid>
            </Grid>

            {/* Invoice Allocation Section */}
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                  Allocate Against Invoices ({partyUnpaidInvoices.length} Open)
                </Typography>
                {partyUnpaidInvoices.length > 0 && parseFloat(paymentAmount) > 0 && (
                  <Button
                    size="small"
                    onClick={() => handleAutoAllocate(paymentAmount)}
                    sx={{ fontSize: '0.72rem', py: 0, fontWeight: 700 }}
                  >
                    Auto-Allocate FIFO
                  </Button>
                )}
              </Box>

              {loadingUnpaidInvoices ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : partyUnpaidInvoices.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f8fafc', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    No open invoices found. Payment will offset general ledger balance or credit advance balance.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200, borderRadius: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Invoice #</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'right' }}>Due ₹</TableCell>
                        <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textAlign: 'right' }}>Allocate ₹</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {partyUnpaidInvoices.map(inv => {
                        const due = parseFloat(inv.remaining_due || 0);
                        const alloc = invoiceAllocations[inv.id] !== undefined ? invoiceAllocations[inv.id] : '';
                        return (
                          <TableRow key={inv.id} hover>
                            <TableCell sx={{ fontSize: '0.75rem' }}>
                              <Box sx={{ fontWeight: 700, fontFamily: 'monospace' }}>#{inv.unique_order_number || inv.id}</Box>
                              <Box sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                                {new Date(inv.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                {inv.is_overdue ? <span style={{ color: '#dc2626', fontWeight: 700, marginLeft: 4 }}>• Overdue</span> : ''}
                              </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: '#dc2626', fontSize: '0.8rem' }}>
                              ₹{due.toFixed(2)}
                            </TableCell>
                            <TableCell align="right" sx={{ width: 110 }}>
                              <TextField
                                size="small"
                                type="number"
                                placeholder="0.00"
                                value={alloc}
                                onChange={e => {
                                  const val = e.target.value;
                                  const num = Math.max(0, Math.min(due, parseFloat(val) || 0));
                                  setInvoiceAllocations(prev => ({
                                    ...prev,
                                    [inv.id]: val === '' ? '' : num
                                  }));
                                }}
                                slotProps={{
                                  htmlInput: { min: 0, max: due, style: { textAlign: 'right', padding: '4px 6px', fontSize: '0.8rem', fontWeight: 700 } }
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Excess calculation notice */}
              {(() => {
                const pmt = parseFloat(paymentAmount) || 0;
                const totAlloc = Object.values(invoiceAllocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                const excess = Math.max(0, pmt - totAlloc);
                if (pmt > 0) {
                  return (
                    <Box sx={{ mt: 1, p: 1, bgcolor: '#f1f5f9', borderRadius: 1.5, fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                      <span>Allocated: ₹{totAlloc.toFixed(2)}</span>
                      <span style={{ color: excess > 0 ? '#15803d' : 'inherit' }}>
                        {excess > 0 ? `+₹${excess.toFixed(2)} Advance Credit Balance` : `Remaining: ₹${(pmt - totAlloc).toFixed(2)}`}
                      </span>
                    </Box>
                  );
                }
                return null;
              })()}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPaymentModalOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color="success"
            disabled={recordingPayment}
            onClick={handleRecordPayment}
            sx={{ fontWeight: 800 }}
          >
            {recordingPayment ? 'Recording...' : 'Save Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
