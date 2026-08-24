import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button,
  Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Select, MenuItem, Chip, CircularProgress, IconButton, Alert, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import { FileSpreadsheet, Sparkles, UploadCloud, Download, Plus, Trash2, CheckCircle, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { apiFetch, getApiUrl, downloadFile } from '../utils/api';
import { useNotify } from '../context/NotificationContext';

export default function MenuBulkImportModal({ open, onClose, onSuccess, token }) {
  const { notify } = useNotify();
  const [activeTab, setActiveTab] = useState(0); // 0 = Excel Import, 1 = AI Image OCR Import

  // Excel State
  const [excelFile, setExcelFile] = useState(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelSummary, setExcelSummary] = useState(null);

  // AI Image / Document State
  const [aiFile, setAiFile] = useState(null);
  const [extractingAi, setExtractingAi] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [savingBulk, setSavingBulk] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      await downloadFile('/api/menu/import-sample-template', 'menu_import_sample_template.xlsx');
      notify.success('Sample Excel import template downloaded.', 'Template Downloaded');
    } catch (err) {
      notify.error(err.message || 'Failed to download sample template.', 'Download Error');
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      notify.error('Please select an Excel file to upload.', 'File Required');
      return;
    }

    setUploadingExcel(true);
    setExcelSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', excelFile);

      const url = getApiUrl('/api/menu/import-excel');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process Excel import.');
      }

      setExcelSummary(data.summary);
      notify.success(`Menu imported: ${data.summary.added} Added, ${data.summary.updated} Updated, ${data.summary.categoriesCreated} Categories Created!`, 'Import Successful');
      if (onSuccess) onSuccess();
    } catch (err) {
      notify.error(err.message || 'Failed to import Excel file.', 'Import Error');
    } finally {
      setUploadingExcel(false);
    }
  };

  const handleAiExtract = async () => {
    if (!aiFile) {
      notify.error('Please select a menu image or document file.', 'File Required');
      return;
    }

    setExtractingAi(true);
    try {
      const formData = new FormData();
      formData.append('file', aiFile);

      const url = getApiUrl('/api/menu/import-ai-ocr');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'AI Extraction failed.');
      }

      setPreviewItems(data.extractedItems || []);
      notify.success(`AI extracted ${data.extractedItems?.length || 0} menu items for preview.`, 'Extraction Complete');
    } catch (err) {
      notify.error(err.message || 'Failed to extract menu data with AI.', 'AI Error');
    } finally {
      setExtractingAi(false);
    }
  };

  const handleConfirmBulkSave = async () => {
    if (previewItems.length === 0) {
      notify.error('No items to save. Extract or add items first.', 'Empty Preview');
      return;
    }

    setSavingBulk(true);
    try {
      const res = await apiFetch('/api/menu/bulk-save', {
        method: 'POST',
        body: { items: previewItems }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk save failed.');

      notify.success(`Bulk Save Complete: ${data.summary.added} Added, ${data.summary.updated} Updated, ${data.summary.categoriesCreated} Categories Created!`, 'Save Successful');
      setPreviewItems([]);
      setAiFile(null);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      notify.error(err.message || 'Failed to save bulk menu items.', 'Save Error');
    } finally {
      setSavingBulk(false);
    }
  };

  const handlePreviewItemChange = (index, field, value) => {
    setPreviewItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeletePreviewItem = (index) => {
    setPreviewItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddPreviewRow = () => {
    setPreviewItems(prev => [
      ...prev,
      { category: 'General', name: 'New Item', price: 100, description: '', is_veg: 1, spicy_level: 0, gst_rate: 5, is_available: 1 }
    ]);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 800, borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
        ⚡ Bulk Menu & Category Importer (Admin)
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab icon={<FileSpreadsheet size={18} />} iconPosition="start" label="Import via Excel (.xlsx / .csv)" sx={{ fontWeight: 800, textTransform: 'none' }} />
          <Tab icon={<Sparkles size={18} />} iconPosition="start" label="Import from Menu Image (AI)" sx={{ fontWeight: 800, textTransform: 'none' }} />
        </Tabs>

        {/* TAB 0: EXCEL IMPORT */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Need the standard Excel format?</Typography>
                <Typography variant="caption" color="text.secondary">Download the sample template with pre-filled columns and sample rows.</Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Download size={16} />}
                onClick={handleDownloadTemplate}
                sx={{ fontWeight: 800, textTransform: 'none' }}
              >
                Download Sample Template
              </Button>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: excelFile ? 'primary.main' : 'divider' }}>
              <UploadCloud size={36} style={{ color: '#64748b', marginBottom: 8 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {excelFile ? excelFile.name : 'Select or Drag Excel (.xlsx, .csv) File'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Supports Categories, Item Names, Prices, GST %, Veg/Non-Veg, Descriptions, and SKUs.
              </Typography>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                id="excel-file-input"
                style={{ display: 'none' }}
                onChange={e => setExcelFile(e.target.files[0] || null)}
              />
              <label htmlFor="excel-file-input">
                <Button variant="contained" component="span" sx={{ fontWeight: 800, textTransform: 'none', px: 3 }}>
                  Browse File
                </Button>
              </label>
            </Paper>

            {excelFile && (
              <Button
                variant="contained"
                color="success"
                size="large"
                disabled={uploadingExcel}
                onClick={handleExcelUpload}
                startIcon={uploadingExcel ? <CircularProgress size={20} color="inherit" /> : <CheckCircle size={20} />}
                sx={{ fontWeight: 800, py: 1.2, textTransform: 'none' }}
              >
                {uploadingExcel ? 'Importing Menu Items...' : 'Upload & Import Excel File'}
              </Button>
            )}

            {excelSummary && (
              <Alert severity="success" icon={<CheckCircle size={20} />} sx={{ borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Import Summary Results:</Typography>
                <Typography variant="body2">
                  • <b>{excelSummary.added}</b> New Items Added<br />
                  • <b>{excelSummary.updated}</b> Existing Items Updated<br />
                  • <b>{excelSummary.categoriesCreated}</b> New Categories Auto-Created<br />
                  • <b>{excelSummary.skipped}</b> Rows Skipped
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* TAB 1: AI OCR IMAGE IMPORT */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, bgcolor: 'rgba(249, 115, 22, 0.04)', borderColor: 'primary.light' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Sparkles size={18} /> AI Physical Menu Reader
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Upload a picture of your physical menu card (JPG, PNG) or PDF document. AI will extract categories, dishes, prices, and descriptions into an editable preview!
              </Typography>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2.5, textAlign: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: aiFile ? 'primary.main' : 'divider' }}>
              <UploadCloud size={36} style={{ color: '#f97316', marginBottom: 8 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                {aiFile ? aiFile.name : 'Upload Menu Card Photo or Document'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Supports JPG, PNG, WEBP, or PDF
              </Typography>

              <input
                type="file"
                accept="image/*,.pdf"
                id="ai-file-input"
                style={{ display: 'none' }}
                onChange={e => setAiFile(e.target.files[0] || null)}
              />
              <label htmlFor="ai-file-input">
                <Button variant="contained" color="primary" component="span" sx={{ fontWeight: 800, textTransform: 'none', px: 3 }}>
                  Select Menu Photo / File
                </Button>
              </label>
            </Paper>

            {aiFile && (
              <Button
                variant="contained"
                color="secondary"
                size="large"
                disabled={extractingAi}
                onClick={handleAiExtract}
                startIcon={extractingAi ? <CircularProgress size={20} color="inherit" /> : <Sparkles size={20} />}
                sx={{ fontWeight: 800, py: 1.2, textTransform: 'none' }}
              >
                {extractingAi ? 'AI Extracting Menu Items...' : 'Extract Menu with AI'}
              </Button>
            )}

            {/* PREVIEW EDITABLE TABLE */}
            {previewItems.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                    Preview & Edit Extracted Menu ({previewItems.length} items)
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={handleAddPreviewRow} sx={{ fontWeight: 800 }}>
                    Add Row
                  </Button>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350, borderRadius: 2 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>Category</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Price (₹)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Description</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewItems.map((item, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.category || ''}
                              onChange={e => handlePreviewItemChange(idx, 'category', e.target.value)}
                              variant="standard"
                              sx={{ minWidth: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.name || ''}
                              onChange={e => handlePreviewItemChange(idx, 'name', e.target.value)}
                              variant="standard"
                              sx={{ minWidth: 140, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={item.price || 0}
                              onChange={e => handlePreviewItemChange(idx, 'price', e.target.value)}
                              variant="standard"
                              sx={{ width: 70 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              size="small"
                              value={item.is_veg}
                              onChange={e => handlePreviewItemChange(idx, 'is_veg', e.target.value)}
                              variant="standard"
                              sx={{ fontSize: '12px', minWidth: 80 }}
                            >
                              <MenuItem value={1}>🟢 Veg</MenuItem>
                              <MenuItem value={0}>🔴 Non-Veg</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              value={item.description || ''}
                              onChange={e => handlePreviewItemChange(idx, 'description', e.target.value)}
                              variant="standard"
                              sx={{ minWidth: 140 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => handleDeletePreviewItem(idx)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  disabled={savingBulk}
                  onClick={handleConfirmBulkSave}
                  startIcon={savingBulk ? <CircularProgress size={20} color="inherit" /> : <CheckCircle size={20} />}
                  sx={{ fontWeight: 800, py: 1.4, mt: 1, textTransform: 'none' }}
                >
                  {savingBulk ? 'Saving Confirmed Menu...' : 'Confirm & Save Menu to Database'}
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 'bold' }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
