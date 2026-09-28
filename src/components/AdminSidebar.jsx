import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Collapse
} from '@mui/material';
import {
  List,
  Layers,
  Printer,
  TrendingUp,
  Package,
  Boxes,
  ShieldCheck,
  Settings,
  Store,
  Users,
  History,
  ClipboardList,
  UserCheck,
  Landmark,
  Receipt,
  Clock,
  ArrowRightLeft,
  BadgeIndianRupee,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  X,
  Building2,
  MapPin,
  Barcode,
  Truck,
  Sliders,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    groupTitle: 'Catalog & Store',
    items: [
      {
        tabId: 0,
        label: 'Menu Items',
        icon: List,
        description: 'Food & retail menu catalog, prices and tax slabs'
      },
      {
        tabId: 1,
        label: 'Categories',
        icon: Layers,
        description: 'Menu categories and item groupings'
      },
      {
        tabId: 2,
        label: 'Printers',
        icon: Printer,
        description: 'LAN thermal ESC/POS and kitchen routing'
      }
    ]
  },
  {
    groupTitle: 'Operations & Stock',
    items: [
      {
        tabId: 5,
        label: 'Inventory & Warehouses',
        icon: Boxes,
        description: 'Executive overview, stock levels, transfers, GRN, suppliers',
        hasSubTabs: true,
        subTabs: [
          { id: 'overview', label: 'Executive Overview', icon: Boxes },
          { id: 'catalog', label: 'Stock Catalog & Levels', icon: FileSpreadsheet },
          { id: 'warehouses', label: 'Warehouses & Godowns', icon: Building2 },
          { id: 'racks', label: 'Racks & Locations', icon: MapPin },
          { id: 'stock_counting', label: 'Stock Counting Suite', icon: Barcode },
          { id: 'requests', label: 'Stock Requests', icon: ClipboardList },
          { id: 'transfers', label: 'Transfers & Receiving', icon: Truck },
          { id: 'suppliers', label: 'Suppliers / Vendors', icon: Users },
          { id: 'purchases', label: 'Purchases & Bills', icon: Receipt },
          { id: 'adjustments', label: 'Stock Adjustments', icon: Sliders },
          { id: 'ledger', label: 'Stock Ledger Audit', icon: FileText }
        ]
      },
      {
        tabId: 18,
        label: 'Serial Numbers',
        icon: Tag,
        description: '8-digit serial numbers tracking & barcode generation'
      }
    ]
  },
  {
    groupTitle: 'Sales & Orders',
    items: [
      {
        tabId: 11,
        label: 'Sales Orders',
        icon: ClipboardList,
        description: 'B2B orders, quotations and estimates'
      },
      {
        tabId: 10,
        label: 'Order History',
        icon: History,
        description: 'Past retail sales receipts, reprints and refunds'
      },
      {
        tabId: 12,
        label: 'Parties',
        icon: UserCheck,
        description: 'Customer directory, credit balances and ledgers'
      }
    ]
  },
  {
    groupTitle: 'Finance & Accounts',
    items: [
      {
        tabId: 13,
        label: 'Bank Accounts',
        icon: Landmark,
        description: 'Bank ledgers, cash registers and fund transfers'
      },
      {
        tabId: 14,
        label: 'Expenses',
        icon: Receipt,
        description: 'Petty cash and operational expense vouchers'
      },
      {
        tabId: 15,
        label: 'Day End & Cash',
        icon: Clock,
        description: 'Shift register closing and physical cash count'
      },
      {
        tabId: 16,
        label: 'Reconciliation',
        icon: ArrowRightLeft,
        description: 'UPI, Card and payment gateway audit'
      },
      {
        tabId: 17,
        label: 'Supplier Payables',
        icon: BadgeIndianRupee,
        description: 'Vendor ledger, aging and payment vouchers'
      }
    ]
  },
  {
    groupTitle: 'Compliance & Reports',
    items: [
      {
        tabId: 6,
        label: 'GST & Compliance',
        icon: ShieldCheck,
        description: 'GSTR-1, GSTR-2, GSTR-3B monthly return and HSN',
        hasSubTabs: true,
        subTabs: [
          { id: 0, label: 'Net GST Liability', icon: TrendingUp },
          { id: 1, label: 'GSTR-1 (Sales)', icon: FileText },
          { id: 2, label: 'GSTR-2 (Purchases/ITC)', icon: FileSpreadsheet },
          { id: 3, label: 'GSTR-3B (Monthly Summary)', icon: ShieldCheck },
          { id: 4, label: 'HSN / SAC Summary', icon: HelpCircle },
          { id: 5, label: 'E-Invoice & E-Way Bill', icon: Truck },
          { id: 6, label: 'Credit Notes Register', icon: RotateCcw },
          { id: 7, label: 'GST Profile Settings', icon: Settings }
        ]
      },
      {
        tabId: 3,
        label: 'Reports & BI',
        icon: TrendingUp,
        description: 'Business intelligence and revenue trends'
      },
      {
        tabId: 4,
        label: 'Item Sales Report',
        icon: Package,
        description: 'Product velocity and category breakdown'
      }
    ]
  },
  {
    groupTitle: 'Settings & Admin',
    items: [
      {
        tabId: 7,
        label: 'Receipt & Settings',
        icon: Settings,
        description: 'Receipt headers, footers and numbering sequences'
      },
      {
        tabId: 8,
        label: 'Retail Profile',
        icon: Store,
        description: 'Store business address, GSTIN and phone'
      },
      {
        tabId: 9,
        label: 'Staff & Cashiers',
        icon: Users,
        description: 'Staff user accounts, roles and permissions'
      }
    ]
  }
];

export default function AdminSidebar({
  activeTab = 0,
  onSelectTab,
  validTabValues = [],
  inventorySubTab = 'overview',
  onSelectInventorySubTab,
  gstSubTab = 0,
  onSelectGstSubTab,
  isCollapsed = false,
  onToggleCollapse
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    inventory: activeTab === 5,
    gst: activeTab === 6
  });

  // Auto-expand active multi-level section
  useEffect(() => {
    if (activeTab === 5) {
      setExpandedSections(prev => ({ ...prev, inventory: true }));
    } else if (activeTab === 6) {
      setExpandedSections(prev => ({ ...prev, gst: true }));
    }
  }, [activeTab]);

  const toggleSection = (sectionKey, e) => {
    if (e) e.stopPropagation();
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // Filter groups and items based on permissions and search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ADMIN_NAV_GROUPS.map(group => {
      const allowedItems = group.items.filter(item => validTabValues.includes(item.tabId));

      if (!q) {
        return {
          ...group,
          items: allowedItems
        };
      }

      const matchingItems = allowedItems.filter(item => {
        const titleMatch = item.label.toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const subTabMatch = item.subTabs && item.subTabs.some(sub => sub.label.toLowerCase().includes(q));
        return titleMatch || descMatch || subTabMatch;
      });

      return {
        ...group,
        items: matchingItems
      };
    }).filter(group => group.items.length > 0);
  }, [validTabValues, searchQuery]);

  return (
    <Box
      component="aside"
      sx={{
        width: isCollapsed ? 68 : 260,
        minWidth: isCollapsed ? 68 : 260,
        maxWidth: isCollapsed ? 68 : 260,
        height: '100%',
        bgcolor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        userSelect: 'none',
        zIndex: 50,
        boxShadow: isCollapsed ? '2px 0 8px rgba(0,0,0,0.03)' : '4px 0 16px rgba(0,0,0,0.03)'
      }}
    >
      {/* 1. Header & Collapse Toggle */}
      <Box
        sx={{
          height: 56,
          px: isCollapsed ? 1 : 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #F1F5F9',
          bgcolor: '#FAFAFA',
          flexShrink: 0
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '0.85rem',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(249, 115, 22, 0.35)'
              }}
            >
              A
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  color: '#0F172A',
                  lineHeight: 1.1,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Admin Panel
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.68rem',
                  color: '#64748B',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Store & Suite
              </Typography>
            </Box>
          </Box>
        )}

        <Tooltip title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'} placement="right" arrow>
          <IconButton
            size="small"
            onClick={onToggleCollapse}
            sx={{
              color: '#64748B',
              p: 1,
              borderRadius: '8px',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: 'rgba(249, 115, 22, 0.1)',
                color: 'primary.main'
              }
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* 2. Quick Search Filter (when expanded) */}
      {!isCollapsed && (
        <Box sx={{ p: 1.5, pb: 1, borderBottom: '1px solid #F1F5F9' }}>
          <TextField
            size="small"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={14} color="#94A3B8" />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                      <X size={13} color="#94A3B8" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  fontSize: '0.8rem',
                  height: 32,
                  bgcolor: '#F8FAFC',
                  borderRadius: '6px',
                  '& fieldset': { borderColor: '#E2E8F0' },
                  '&:hover fieldset': { borderColor: '#CBD5E1' },
                  '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                }
              }
            }}
          />
        </Box>
      )}

      {/* 3. Navigation List */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1.25,
          px: isCollapsed ? 0.75 : 1.25,
          display: 'flex',
          flexDirection: 'column',
          gap: isCollapsed ? 0.75 : 1.25,
          '&::-webkit-scrollbar': {
            width: 4
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: '#CBD5E1',
            borderRadius: 2
          }
        }}
      >
        {filteredGroups.map((group, groupIdx) => (
          <Box key={group.groupTitle || groupIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Group Header (Expanded Only) */}
            {!isCollapsed && (
              <Typography
                variant="caption"
                sx={{
                  px: 1.25,
                  pt: groupIdx === 0 ? 0.5 : 1.25,
                  pb: 0.25,
                  fontSize: '0.67rem',
                  fontWeight: 800,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}
              >
                {group.groupTitle}
              </Typography>
            )}

            {/* Group Items */}
            {group.items.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.tabId;
              const isInventory = item.tabId === 5;
              const isGst = item.tabId === 6;
              const hasSubTabs = Boolean(item.hasSubTabs);
              const isSubExpanded = isInventory ? expandedSections.inventory : isGst ? expandedSections.gst : false;

              // Action when clicking the main entry
              const handleItemClick = () => {
                onSelectTab(item.tabId);
                if (hasSubTabs && !isCollapsed) {
                  // Toggle expand if already active, or expand if newly activated
                  if (isActive) {
                    if (isInventory) toggleSection('inventory');
                    if (isGst) toggleSection('gst');
                  } else {
                    if (isInventory) setExpandedSections(prev => ({ ...prev, inventory: true }));
                    if (isGst) setExpandedSections(prev => ({ ...prev, gst: true }));
                  }
                }
              };

              const navButtonContent = (
                <Box
                  onClick={handleItemClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(); }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    gap: 1.5,
                    px: isCollapsed ? 1 : 1.25,
                    py: 0.9,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    bgcolor: isActive ? 'rgba(249, 115, 22, 0.08)' : 'transparent',
                    color: isActive ? '#EA580C' : '#475569',
                    borderLeft: isCollapsed
                      ? (isActive ? '3px solid #F97316' : '3px solid transparent')
                      : (isActive ? '3px solid #F97316' : '3px solid transparent'),
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(249, 115, 22, 0.12)' : '#F8FAFC',
                      color: isActive ? '#EA580C' : '#0F172A'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        color: isActive ? '#EA580C' : '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <IconComp size={18} strokeWidth={isActive ? 2.5 : 2} />
                    </Box>

                    {!isCollapsed && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.84rem',
                          lineHeight: 1.2,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.label}
                      </Typography>
                    )}
                  </Box>

                  {/* Sub-tab collapse indicator arrow */}
                  {!isCollapsed && hasSubTabs && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isInventory) toggleSection('inventory', e);
                        if (isGst) toggleSection('gst', e);
                      }}
                      sx={{
                        p: 0.25,
                        color: isActive ? '#EA580C' : '#94A3B8',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                      }}
                    >
                      <ChevronDown
                        size={15}
                        style={{
                          transform: isSubExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </IconButton>
                  )}
                </Box>
              );

              return (
                <Box key={item.tabId} sx={{ display: 'flex', flexDirection: 'column' }}>
                  {isCollapsed ? (
                    <Tooltip title={item.label} placement="right" arrow enterDelay={100}>
                      {navButtonContent}
                    </Tooltip>
                  ) : (
                    navButtonContent
                  )}

                  {/* Expandable Nested Sub-Items for Inventory & Warehouses (when expanded) */}
                  {!isCollapsed && isInventory && hasSubTabs && (
                    <Collapse in={isSubExpanded} timeout="auto" unmountOnExit>
                      <Box
                        sx={{
                          pl: 3.5,
                          pr: 0.5,
                          py: 0.5,
                          ml: 1.75,
                          my: 0.5,
                          borderLeft: '1.5px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.25
                        }}
                      >
                        {item.subTabs.map((sub) => {
                          const isSubActive = isActive && inventorySubTab === sub.id;
                          const SubIcon = sub.icon;

                          return (
                            <Box
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectInventorySubTab(sub.id);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  onSelectInventorySubTab(sub.id);
                                }
                              }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                                px: 1,
                                py: 0.65,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                bgcolor: isSubActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                color: isSubActive ? '#EA580C' : '#64748B',
                                transition: 'all 0.12s ease',
                                '&:hover': {
                                  bgcolor: isSubActive ? 'rgba(249, 115, 22, 0.14)' : '#F1F5F9',
                                  color: isSubActive ? '#EA580C' : '#1E293B'
                                }
                              }}
                            >
                              <SubIcon size={14} strokeWidth={isSubActive ? 2.5 : 1.75} />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: isSubActive ? 700 : 500,
                                  fontSize: '0.78rem',
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {sub.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  )}

                  {/* Expandable Nested Sub-Items for GST & Compliance Suite (when expanded) */}
                  {!isCollapsed && isGst && hasSubTabs && (
                    <Collapse in={isSubExpanded} timeout="auto" unmountOnExit>
                      <Box
                        sx={{
                          pl: 3.5,
                          pr: 0.5,
                          py: 0.5,
                          ml: 1.75,
                          my: 0.5,
                          borderLeft: '1.5px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.25
                        }}
                      >
                        {item.subTabs.map((sub) => {
                          const isSubActive = isActive && gstSubTab === sub.id;
                          const SubIcon = sub.icon;

                          return (
                            <Box
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectGstSubTab(sub.id);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  onSelectGstSubTab(sub.id);
                                }
                              }}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.25,
                                px: 1,
                                py: 0.65,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                bgcolor: isSubActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                color: isSubActive ? '#EA580C' : '#64748B',
                                transition: 'all 0.12s ease',
                                '&:hover': {
                                  bgcolor: isSubActive ? 'rgba(249, 115, 22, 0.14)' : '#F1F5F9',
                                  color: isSubActive ? '#EA580C' : '#1E293B'
                                }
                              }}
                            >
                              <SubIcon size={14} strokeWidth={isSubActive ? 2.5 : 1.75} />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: isSubActive ? 700 : 500,
                                  fontSize: '0.78rem',
                                  lineHeight: 1.2,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {sub.label}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}

        {filteredGroups.length === 0 && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              No matching modules found.
            </Typography>
          </Box>
        )}
      </Box>

      {/* 4. Footer info */}
      <Box
        sx={{
          p: isCollapsed ? 1 : 1.5,
          borderTop: '1px solid #F1F5F9',
          bgcolor: '#FAFAFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          flexShrink: 0
        }}
      >
        {!isCollapsed ? (
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
              ARISO RETAIL
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.64rem', color: '#94A3B8' }}>
              v2.4 Enterprise Edition
            </Typography>
          </Box>
        ) : (
          <Tooltip title="ARISO Enterprise v2.4" placement="right" arrow>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
