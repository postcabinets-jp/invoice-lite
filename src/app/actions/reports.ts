'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { Invoice } from '@/types/database'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!data) redirect('/register')
  return data.organization_id
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const PeriodSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportSummary {
  totalIncome: number
  totalExpenses: number
  unpaidAmount: number
  invoiceCount: number
  paidInvoiceCount: number
  overdueCount: number
  topClients: Array<{ name: string; total: number }>
  incomeByMonth: Array<{ month: string; amount: number }>
}

export interface TaxSummaryEntry {
  tax_rate_name: string
  rate: number
  total_tax: number
}

export interface InvoiceWithClient extends Invoice {
  clients: { name: string } | null
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function getReportSummary(
  period: { from: string; to: string },
): Promise<ReportSummary> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = PeriodSchema.parse(period)

  // Total income: sum of payments within period
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount, paid_at')
    .eq('organization_id', orgId)
    .gte('paid_at', parsed.from)
    .lte('paid_at', parsed.to)

  if (paymentsError) throw new Error(paymentsError.message)

  const totalIncome = payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  // Total expenses in period
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('amount, expense_date')
    .eq('organization_id', orgId)
    .gte('expense_date', parsed.from)
    .lte('expense_date', parsed.to)

  if (expensesError) throw new Error(expensesError.message)

  const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0

  // Invoice counts and unpaid amount (non-estimate invoices issued in period)
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, status, amount_due, due_date, client_id, total, amount_paid')
    .eq('organization_id', orgId)
    .eq('is_estimate', false)
    .gte('issue_date', parsed.from)
    .lte('issue_date', parsed.to)

  if (invoicesError) throw new Error(invoicesError.message)

  const invoiceCount = invoices?.length ?? 0
  const paidInvoiceCount = invoices?.filter((inv) => inv.status === 'paid').length ?? 0
  const today = new Date().toISOString().split('T')[0]
  const overdueCount =
    invoices?.filter(
      (inv) =>
        inv.status !== 'paid' &&
        inv.status !== 'cancelled' &&
        inv.due_date !== null &&
        inv.due_date < today,
    ).length ?? 0

  const unpaidAmount =
    invoices
      ?.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.amount_due, 0) ?? 0

  // Top clients by total invoiced in period
  const clientTotals = new Map<string, number>()
  for (const inv of invoices ?? []) {
    if (!inv.client_id) continue
    clientTotals.set(inv.client_id, (clientTotals.get(inv.client_id) ?? 0) + inv.total)
  }

  const topClientIds = [...clientTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  let topClients: Array<{ name: string; total: number }> = []
  if (topClientIds.length > 0) {
    const { data: clientRows } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', topClientIds)
      .eq('organization_id', orgId)

    topClients = topClientIds
      .map((id) => {
        const client = clientRows?.find((c) => c.id === id)
        return { name: client?.name ?? 'Unknown', total: clientTotals.get(id) ?? 0 }
      })
      .filter((c) => c.name !== 'Unknown')
  }

  // Income by month: group payments by month
  const monthlyMap = new Map<string, number>()
  for (const payment of payments ?? []) {
    const month = payment.paid_at.slice(0, 7) // YYYY-MM
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + payment.amount)
  }

  const incomeByMonth = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount }))

  return {
    totalIncome,
    totalExpenses,
    unpaidAmount,
    invoiceCount,
    paidInvoiceCount,
    overdueCount,
    topClients,
    incomeByMonth,
  }
}

export async function getUnpaidInvoices(): Promise<InvoiceWithClient[]> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(name)')
    .eq('organization_id', orgId)
    .eq('is_estimate', false)
    .in('status', ['sent', 'viewed', 'partial', 'overdue'])
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as InvoiceWithClient[]
}

export async function getTaxSummary(
  period: { from: string; to: string },
): Promise<TaxSummaryEntry[]> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = PeriodSchema.parse(period)

  // Fetch all invoice items with tax_rate_id, filtered to paid/partial invoices in period
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, issue_date')
    .eq('organization_id', orgId)
    .eq('is_estimate', false)
    .in('status', ['paid', 'partial', 'sent', 'viewed'])
    .gte('issue_date', parsed.from)
    .lte('issue_date', parsed.to)

  if (invoicesError) throw new Error(invoicesError.message)

  const invoiceIds = (invoices ?? []).map((inv) => inv.id)
  if (invoiceIds.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('tax_rate_id, tax_amount')
    .in('invoice_id', invoiceIds)
    .not('tax_rate_id', 'is', null)

  if (itemsError) throw new Error(itemsError.message)

  // Aggregate tax by rate
  const taxByRateId = new Map<string, number>()
  for (const item of items ?? []) {
    if (!item.tax_rate_id) continue
    taxByRateId.set(
      item.tax_rate_id,
      (taxByRateId.get(item.tax_rate_id) ?? 0) + item.tax_amount,
    )
  }

  if (taxByRateId.size === 0) return []

  const taxRateIds = [...taxByRateId.keys()]
  const { data: taxRates, error: ratesError } = await supabase
    .from('tax_rates')
    .select('id, name, rate')
    .in('id', taxRateIds)
    .eq('organization_id', orgId)

  if (ratesError) throw new Error(ratesError.message)

  return taxRateIds
    .map((id) => {
      const taxRate = taxRates?.find((r) => r.id === id)
      return {
        tax_rate_name: taxRate?.name ?? 'Unknown',
        rate: taxRate?.rate ?? 0,
        total_tax: taxByRateId.get(id) ?? 0,
      }
    })
    .sort((a, b) => b.total_tax - a.total_tax)
}
