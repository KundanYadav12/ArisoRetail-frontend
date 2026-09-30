import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Divider,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Landmark,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

const formatCurrency = (val) => {
  if (val === undefined || val === null || val === '') return '₹0.00';
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Diagnostic & Reconciliation Status Alert
 */
export function ReconciliationBanner({ reconciliation }) {
  if (!reconciliation) return null;

  const isReconciled = reconciliation.isReconciled !== false && reconciliation.status !== 'NEEDS CLARIFICATION';

  return (
    <Box sx={{ mb: 2.5 }}>
      {isReconciled ? (
        <Alert
          icon={<CheckCircle2 size={18} />}
          severity="success"
          variant="outlined"
          sx={{
            borderRadius: 2,
            bgcolor: 'rgba(34, 197, 94, 0.05)',
            borderColor: 'rgba(34, 197, 94, 0.3)',
            color: '#15803d',
            fontWeight: 700,
            fontSize: '0.85rem',
            alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <strong>Audited & Mathematically Reconciled (Zero Variance):</strong>{' '}
              {reconciliation.diagnostics?.[0] || 'All component balances match authoritative accounting totals.'}
            </Box>
            <Chip
              label="RECONCILED"
              size="small"
              color="success"
              sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
            />
          </Box>
        </Alert>
      ) : (
        <Alert
          icon={<AlertCircle size={18} />}
          severity="warning"
          variant="filled"
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '0.85rem'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <strong>NEEDS CLARIFICATION:</strong>{' '}
              {reconciliation.diagnostics?.[0] || 'Discrepancy detected between component ledgers.'}
            </Box>
            <Chip
              label="NEEDS CLARIFICATION"
              size="small"
              color="error"
              sx={{ fontWeight: 800, fontSize: '0.7rem', height: 22 }}
            />
          </Box>
        </Alert>
      )}
    </Box>
  );
}

/**
 * REPORT 1: Profit & Loss — T Format
 */
export function ProfitLossTView({ data }) {
  if (!data || !data.left || !data.right) return null;

  const { left, right, reconciliation } = data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ReconciliationBanner reconciliation={reconciliation} />

      <Grid container spacing={2.5}>
        {/* Left Side: Purchase Accounts & Stock Adjustments */}
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              borderTop: '3px solid #ef4444',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 1.75, bgcolor: '#fef2f2', borderBottom: '1px solid #fee2e2' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#b91c1c' }}>
                Debit / Outflows & Purchases
              </Typography>
            </Box>

            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {left.sections.map((sec, idx) => (
                <Box key={idx}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
                    {sec.title}
                  </Typography>
                  <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {sec.items.map((item, itemIdx) => (
                      <Box
                        key={itemIdx}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 0.25,
                          fontSize: '0.875rem'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 0.75 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Total {sec.title}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(sec.total)}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {left.netProfit !== null && (
                <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px dashed #cbd5e1' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: '#f0fdf4', borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                      Net Profit (Transferred to Balance Sheet)
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                      {formatCurrency(left.netProfit)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Balancing Left Total */}
            <Box
              sx={{
                p: 1.75,
                bgcolor: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                Total (Debit)
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  borderBottom: '3px double #0f172a',
                  pb: 0.25
                }}
              >
                {formatCurrency(left.total)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side: Sales Accounts & Inflows */}
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              borderTop: '3px solid #22c55e',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 1.75, bgcolor: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#15803d' }}>
                Credit / Inflows & Revenue
              </Typography>
            </Box>

            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {right.sections.map((sec, idx) => (
                <Box key={idx}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
                    {sec.title}
                  </Typography>
                  <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {sec.items.map((item, itemIdx) => (
                      <Box
                        key={itemIdx}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 0.25,
                          fontSize: '0.875rem'
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {item.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(item.amount)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Divider sx={{ my: 0.75 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                      Total {sec.title}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {formatCurrency(sec.total)}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {right.netLoss !== null && (
                <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px dashed #cbd5e1' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: '#fef2f2', borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#dc2626' }}>
                      Net Loss
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#dc2626' }}>
                      {formatCurrency(right.netLoss)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Balancing Right Total */}
            <Box
              sx={{
                p: 1.75,
                bgcolor: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                Total (Credit)
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  borderBottom: '3px double #0f172a',
                  pb: 0.25
                }}
              >
                {formatCurrency(right.total)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * REPORT 2: Profit & Loss Statement (Trading Account + Income Statement)
 */
export function ProfitLossStatementView({ data }) {
  if (!data || !data.tradingAccount || !data.incomeStatement) return null;

  const { tradingAccount, incomeStatement, reconciliation } = data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <ReconciliationBanner reconciliation={reconciliation} />

      {/* Part 1: Trading Account */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Box sx={{ p: 1.75, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>
            Part I: Trading Account (Gross Margin Determination)
          </Typography>
        </Box>

        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Sales Accounts */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Sales Accounts (Net Sales Revenue)
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {formatCurrency(tradingAccount.salesAccounts)}
            </Typography>
          </Box>

          <Divider />

          {/* Cost of Sales Breakdown */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
              Cost of Sales:
            </Typography>
            <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Opening Stock</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(tradingAccount.costOfSales.openingStock)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Add: Purchase Accounts</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(tradingAccount.costOfSales.purchase)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}>
                <Typography variant="body2">Less: Closing Stock</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  - {formatCurrency(tradingAccount.costOfSales.closingStock)}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: '1px dashed #cbd5e1',
                px: 1
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total Cost of Sales
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatCurrency(tradingAccount.costOfSales.total)}
              </Typography>
            </Box>
          </Box>

          {/* Gross Profit Result */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              bgcolor: tradingAccount.grossProfit >= 0 ? '#f0fdf4' : '#fef2f2',
              borderRadius: 2,
              border: tradingAccount.grossProfit >= 0 ? '1px solid #bbf7d0' : '1px solid #fecaca'
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: tradingAccount.grossProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              Gross Profit
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: tradingAccount.grossProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatCurrency(tradingAccount.grossProfit)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Part 2: Income Statement */}
      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Box sx={{ p: 1.75, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>
            Part II: Income Statement (Net Profit Determination)
          </Typography>
        </Box>

        <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Gross Profit brought forward */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              Gross Profit b/f
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800 }}>
              {formatCurrency(incomeStatement.grossProfitBroughtForward)}
            </Typography>
          </Box>

          {incomeStatement.otherIncome > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, pl: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Other Operating / Non-Operating Income
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatCurrency(incomeStatement.otherIncome)}
              </Typography>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 0.75,
              borderTop: '1px solid #e2e8f0',
              borderBottom: '1px solid #e2e8f0',
              px: 0.5
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Total Income
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {formatCurrency(incomeStatement.totalIncome)}
            </Typography>
          </Box>

          {/* Operating / Indirect Expenses */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>
              Operating / Indirect Expenses:
            </Typography>
            <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {incomeStatement.expenses.items && incomeStatement.expenses.items.length > 0 ? (
                incomeStatement.expenses.items.map((exp, idx) => (
                  <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                    <Typography variant="body2" color="text.secondary">
                      {exp.category}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatCurrency(exp.amount)}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No indirect expenses recorded in this period.
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                pt: 1,
                borderTop: '1px dashed #cbd5e1',
                px: 1
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Total Operating Expenses
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatCurrency(incomeStatement.expenses.total)}
              </Typography>
            </Box>
          </Box>

          {/* Net Profit Result */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 2,
              bgcolor: incomeStatement.netProfit >= 0 ? '#f0fdf4' : '#fef2f2',
              borderRadius: 2,
              border: incomeStatement.netProfit >= 0 ? '2px solid #22c55e' : '2px solid #ef4444'
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: incomeStatement.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
                Net Profit
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Audited bottom line for the selected financial period
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 900, color: incomeStatement.netProfit >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatCurrency(incomeStatement.netProfit)}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

/**
 * REPORT 3: Profit & Loss — Simple (Itemized +/- list)
 */
export function ProfitLossSimpleView({ data }) {
  if (!data || !data.rows) return null;

  const { rows, grossProfit, netProfit, reconciliation } = data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ReconciliationBanner reconciliation={reconciliation} />

      <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
        <Box sx={{ p: 1.75, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Profit & Loss Calculation Ledger (Arithmetic Flow)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Chip
              label={`Gross: ${formatCurrency(grossProfit)}`}
              size="small"
              color={grossProfit >= 0 ? 'success' : 'error'}
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
            <Chip
              label={`Net: ${formatCurrency(netProfit)}`}
              size="small"
              color={netProfit >= 0 ? 'success' : 'error'}
              sx={{ fontWeight: 900 }}
            />
          </Box>
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, width: 60, textAlign: 'center' }}>Op</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Accounting Head / Particulars</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, width: 180 }}>Amount (₹)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => {
                const isSub = r.isSubtotal;
                const isTot = r.isTotal;
                const isAdd = r.symbol === '(+)';
                const isSubtr = r.symbol === '(-)';

                let rowBg = 'transparent';
                if (isTot) rowBg = r.amount >= 0 ? '#f0fdf4' : '#fef2f2';
                else if (isSub) rowBg = '#f8fafc';

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      bgcolor: rowBg,
                      '&:hover': { bgcolor: isTot ? rowBg : 'action.hover' }
                    }}
                  >
                    <TableCell sx={{ textAlign: 'center', py: isTot ? 1.5 : 1 }}>
                      {r.symbol && (
                        <Chip
                          label={r.symbol}
                          size="small"
                          sx={{
                            fontWeight: 900,
                            fontSize: '0.75rem',
                            height: 22,
                            bgcolor: isAdd ? '#dcfce7' : isSubtr ? '#fee2e2' : '#f1f5f9',
                            color: isAdd ? '#15803d' : isSubtr ? '#b91c1c' : '#475569'
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ py: isTot ? 1.5 : 1, pl: (r.indent ? r.indent * 2 : 1) * 1.5 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isTot ? 900 : isSub ? 800 : 500,
                          fontSize: isTot ? '1rem' : '0.875rem',
                          color: isTot ? (r.amount >= 0 ? '#15803d' : '#b91c1c') : 'text.primary'
                        }}
                      >
                        {r.label}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ py: isTot ? 1.5 : 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isTot ? 900 : isSub ? 800 : 600,
                          fontSize: isTot ? '1rem' : '0.875rem',
                          color: isTot ? (r.amount >= 0 ? '#15803d' : '#b91c1c') : 'text.primary',
                          borderBottom: isTot ? '3px double #0f172a' : isSub ? '1px solid #cbd5e1' : 'none',
                          display: 'inline-block',
                          pb: isTot ? 0.25 : 0
                        }}
                      >
                        {formatCurrency(r.amount)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}

/**
 * REPORT 4: Cash Flow Statement
 */
export function CashFlowStatementView({ data }) {
  if (!data || !data.sections) return null;

  const { openingBalance, sections, netCashFlow, closingBalance, reconciliation } = data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <ReconciliationBanner reconciliation={reconciliation} />

      {/* Opening Cash Ribbon */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Landmark size={22} color="#0284c7" />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Opening Cash & Bank Balance
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Authoritative balance at period commencement
            </Typography>
          </Box>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#0284c7' }}>
          {formatCurrency(openingBalance)}
        </Typography>
      </Paper>

      {/* Categorized Cash Flow Sections */}
      {sections.map((sec, idx) => (
        <Paper key={idx} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, bgcolor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
              {sec.title}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: sec.net >= 0 ? '#15803d' : '#b91c1c' }}>
              Net: {formatCurrency(sec.net)}
            </Typography>
          </Box>

          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sec.items.map((item, itemIdx) => (
              <Box
                key={itemIdx}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 0.5,
                  fontSize: '0.875rem'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: item.isDeduction ? '#b91c1c' : '#15803d'
                  }}
                >
                  {item.isDeduction ? `- ${formatCurrency(item.amount)}` : `+ ${formatCurrency(item.amount)}`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      ))}

      {/* Net Summary & Closing Balance */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: netCashFlow >= 0 ? '#f0fdf4' : '#fef2f2',
              borderColor: netCashFlow >= 0 ? '#bbf7d0' : '#fecaca'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
              Net Cash Generated / (Used)
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: netCashFlow >= 0 ? '#15803d' : '#b91c1c', mt: 0.5 }}>
              {formatCurrency(netCashFlow)}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              border: '2px solid #0f172a'
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
              Closing Cash & Bank Balance
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', mt: 0.5 }}>
              {formatCurrency(closingBalance)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * REPORT 5: Balance Sheet — T Format (Liabilities & Equity on Left vs Assets on Right)
 */
export function BalanceSheetTView({ data }) {
  if (!data || !data.liabilitiesEquity || !data.assets) return null;

  const { liabilitiesEquity, assets, reconciliation } = data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ReconciliationBanner reconciliation={reconciliation} />

      <Grid container spacing={2.5}>
        {/* Left Side: Capital & Liabilities */}
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              borderTop: '3px solid #6366f1',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 1.75, bgcolor: '#eef2ff', borderBottom: '1px solid #e0e7ff' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#4338ca' }}>
                Liabilities & Capital Equity
              </Typography>
            </Box>

            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Capital Account */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
                  {liabilitiesEquity.capitalAccount.title}
                </Typography>
                <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {liabilitiesEquity.capitalAccount.items.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Total Capital Account
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(liabilitiesEquity.capitalAccount.total)}
                  </Typography>
                </Box>
              </Box>

              {/* Current Liabilities */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
                  {liabilitiesEquity.currentLiabilities.title}
                </Typography>
                <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {liabilitiesEquity.currentLiabilities.items.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Total Current Liabilities
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(liabilitiesEquity.currentLiabilities.total)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Total Liabilities & Equity */}
            <Box
              sx={{
                p: 1.75,
                bgcolor: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                Total Liabilities & Capital
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  borderBottom: '3px double #0f172a',
                  pb: 0.25
                }}
              >
                {formatCurrency(liabilitiesEquity.totalLiabilities)}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side: Assets */}
        <Grid item xs={12} md={6}>
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              borderTop: '3px solid #0284c7',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 1.75, bgcolor: '#f0f9ff', borderBottom: '1px solid #e0f2fe' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0369a1' }}>
                Assets (Current Assets & Receivables)
              </Typography>
            </Box>

            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Current Assets */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.75 }}>
                  {assets.currentAssets.title}
                </Typography>
                <Box sx={{ pl: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {assets.currentAssets.items.map((item, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.25 }}>
                      <Typography variant="body2" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 0.75 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                    Total Current Assets
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(assets.currentAssets.total)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Total Assets */}
            <Box
              sx={{
                p: 1.75,
                bgcolor: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                Total Assets
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  borderBottom: '3px double #0f172a',
                  pb: 0.25
                }}
              >
                {formatCurrency(assets.totalAssets)}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

/**
 * REPORT 6: Balance Sheet — Single Column
 */
export function BalanceSheetSingleColumnView({ data }) {
  if (!data || !data.sections) return null;

  const { sections, totalAssets, totalLiabilities, reconciliation } = data;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <ReconciliationBanner reconciliation={reconciliation} />

      {sections.map((sec, idx) => (
        <Paper key={idx} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Box
            sx={{
              p: 1.75,
              bgcolor: sec.group === 'Assets' ? '#f0f9ff' : '#eef2ff',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                {sec.group}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'text.primary' }}>
                {sec.subGroup}
              </Typography>
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Subtotal: {formatCurrency(sec.subtotal)}
            </Typography>
          </Box>

          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {sec.items.map((item, itemIdx) => (
              <Box
                key={itemIdx}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  py: 0.5,
                  px: 1,
                  fontSize: '0.875rem'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatCurrency(item.amount)}
                </Typography>
              </Box>
            ))}
          </Box>

          {sec.totalLabel && (
            <Box
              sx={{
                p: 1.75,
                bgcolor: '#f8fafc',
                borderTop: '2px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                {sec.totalLabel}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                  borderBottom: '3px double #0f172a',
                  pb: 0.25
                }}
              >
                {formatCurrency(sec.total)}
              </Typography>
            </Box>
          )}
        </Paper>
      ))}
    </Box>
  );
}

/**
 * Universal Financial Statement Container Router
 */
export default function FinancialStatementView({ reportId, structuredData, rows, summary, reconciliation }) {
  if (!structuredData) return null;

  switch (reportId) {
    case 'financial_pl_t':
      return <ProfitLossTView data={structuredData} />;
    case 'financial_pl_statement':
      return <ProfitLossStatementView data={structuredData} />;
    case 'financial_pl_simple':
      return <ProfitLossSimpleView data={structuredData} />;
    case 'financial_cash_flow':
      return <CashFlowStatementView data={structuredData} />;
    case 'financial_balance_sheet_t':
      return <BalanceSheetTView data={structuredData} />;
    case 'financial_balance_sheet_single':
      return <BalanceSheetSingleColumnView data={structuredData} />;
    default:
      return null;
  }
}
