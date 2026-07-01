import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InvoiceStatus } from '@/types/database'
import DateRangePicker from './DateRangePicker'

function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

function getPresetRange(preset: string): { from: string; to: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (preset) {
    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      return { from, to: today }
    }
    case 'last_month': {
      const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const from = new Date(firstOfThisMonth.getFullYear(), firstOfThisMonth.getMonth() - 1, 1)
        .toISOString()
        .split('T')[0]
      const to = new Date(firstOfThisMonth.getTime() - 86400000).toISOString().split('T')[0]
      return { from, to }
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      const from = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0]
      return { from, to: today }
    }
    case 'this_year': {
      const from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      return { from, to: today }
    }
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0], to: today }
  }
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/register')
  const orgId = (member as { organization_id: string }).organization_id

  const params = await searchParams
  const preset = params.preset ?? 'this_month'
  const defaults = getPresetRange(preset)
  const from = params.from ?? defaults.from
  const to = params.to ?? defaults.to

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: invoicesData },
    { data: expensesData },
    { data: paymentsData },
    { data: overdueData },
    { data: taxRatesData },
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, number, status, total, amount_due, currency, issue_date, due_date, tax_total, clients(name, company)')
      .eq('organization_id', orgId)
      .eq('is_estimate', false)
      .gte('issue_date', from)
      .lte('issue_date', to)
      .order('issue_date', { ascending: true }),
    supabase
      .from('expenses')
      .select('id, amount, currency, expense_date, category')
      .eq('organization_id', orgId)
      .gte('expense_date', from)
      .lte('expense_date', to),
    supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('organization_id', orgId)
      .gte('paid_at', `${from}T00:00:00`)
      .lte('paid_at', `${to}T23:59:59`),
    supabase
      .from('invoices')
      .select('id, number, amount_due, currency, due_date, clients(name, company)')
      .eq('organization_id', orgId)
      .eq('is_estimate', false)
      .in('status', ['sent', 'viewed', 'partial', 'overdue'])
      .lt('due_date', today),
    supabase
      .from('tax_rates')
      .select('id, name, rate')
      .eq('organization_id', orgId),
  ])

  type InvRow = { id: string; number: string; status: string; total: number | null; amount_due: number | null; currency: string; issue_date: string; due_date: string | null; tax_total: number | null; clients: { name: string; company: string | null } | null }
  type ExpRow = { id: string; amount: number; currency: string; expense_date: string; category: string }
  type PayRow = { amount: number; paid_at: string }
  type OvRow = { id: string; number: string; amount_due: number | null; currency: string; due_date: string | null; clients: { name: string; company: string | null } | null }
  type TaxRow = { id: string; name: string; rate: number }

  const invoices = (invoicesData ?? []) as InvRow[]
  const expenses = (expensesData ?? []) as ExpRow[]
  const payments = (paymentsData ?? []) as PayRow[]
  const overdueInvoices = (overdueData ?? []) as OvRow[]
  const taxRates = (taxRatesData ?? []) as TaxRow[]

  const totalIncome = invoices
    .filter((inv) => !['draft', 'cancelled'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)
  const netProfit = totalIncome - totalExpenses
  const outstanding = invoices
    .filter((inv) => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount_due ?? 0), 0)

  // Monthly income data for bar chart
  const monthlyMap: Record<string, number> = {}
  for (const inv of invoices) {
    if (['draft', 'cancelled'].includes(inv.status)) continue
    const month = inv.issue_date.slice(0, 7)
    monthlyMap[month] = (monthlyMap[month] ?? 0) + (inv.total ?? 0)
  }
  const monthlyData = Object.entries(monthlyMap).sort(([a], [b]) => a.localeCompare(b))
  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1)

  // Top clients by invoice total
  const clientMap: Record<string, { name: string; total: number; count: number }> = {}
  for (const inv of invoices) {
    if (['draft', 'cancelled'].includes(inv.status)) continue
    const client = inv.clients
    const clientName = client?.company ?? client?.name ?? '不明'
    if (!clientMap[clientName]) {
      clientMap[clientName] = { name: clientName, total: 0, count: 0 }
    }
    clientMap[clientName].total += inv.total ?? 0
    clientMap[clientName].count += 1
  }
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // Tax collected by rate (from invoice tax_total — simplified: sum tax_total)
  const totalTaxCollected = invoices
    .filter((inv) => ['sent', 'viewed', 'partial', 'paid'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.tax_total ?? 0), 0)

  const PRESETS = [
    { key: 'this_month', label: '今月' },
    { key: 'last_month', label: '先月' },
    { key: 'this_quarter', label: '今四半期' },
    { key: 'this_year', label: '今年' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">レポート</h1>
          <p className="text-sm text-zinc-500 mt-0.5">売上・経費の分析</p>
        </div>
      </div>

      {/* Date range + presets */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {PRESETS.map((p) => (
            <a
              key={p.key}
              href={`/reports?preset=${p.key}`}
              className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                preset === p.key && !params.from
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {p.label}
            </a>
          ))}
        </div>
        <DateRangePicker from={from} to={to} />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: '総収入', value: formatCurrency(totalIncome), accent: false },
          { label: '総経費', value: formatCurrency(totalExpenses), accent: false },
          { label: '純利益', value: formatCurrency(netProfit), accent: netProfit < 0 },
          { label: '未収金', value: formatCurrency(outstanding), accent: outstanding > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-500 font-medium">{kpi.label}</p>
            <p
              className={`mt-1.5 text-2xl font-semibold tabular-nums leading-none ${
                kpi.accent ? 'text-red-600' : 'text-zinc-900'
              }`}
            >
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by month bar chart */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-zinc-900">月別収入</h2>
            <a
              href={`/api/reports/income-csv?from=${from}&to=${to}`}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
            >
              <Download className="h-3 w-3" />
              CSV
            </a>
          </div>
          {monthlyData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-zinc-400">
              データなし
            </div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {monthlyData.map(([month, amount]) => {
                const heightPct = (amount / maxMonthly) * 100
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-500 tabular-nums">
                      {formatCurrency(amount)}
                    </span>
                    <div
                      className="w-full bg-zinc-900 rounded-t-sm min-h-[2px] transition-all"
                      style={{ height: `${Math.max(2, heightPct)}%` }}
                    />
                    <span className="text-[10px] text-zinc-400">
                      {month.slice(5)}月
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top clients */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">上位クライアント</h2>
          {topClients.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">データなし</div>
          ) : (
            <div className="space-y-2">
              {topClients.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-zinc-400 w-4">{i + 1}</span>
                    <span className="text-sm text-zinc-800">{c.name}</span>
                    <span className="text-xs text-zinc-400">{c.count}件</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-zinc-900">
                    {formatCurrency(c.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overdue invoices */}
      {overdueInvoices.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-white overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 bg-red-50/50">
            <h2 className="text-sm font-medium text-red-800">
              期限超過の請求書 ({overdueInvoices.length}件)
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/40">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">番号</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">クライアント</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">支払期限</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">未収金</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {overdueInvoices.map((inv) => {
                const client = inv.clients
                return (
                  <tr key={inv.id} className="hover:bg-red-50/30">
                    <td className="px-5 py-3 font-mono text-xs text-zinc-700">{inv.number}</td>
                    <td className="px-5 py-3 text-zinc-800">
                      {client?.company ?? client?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-red-600 tabular-nums text-xs">
                      {formatDate(inv.due_date)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-red-700">
                      {formatCurrency(inv.amount_due ?? 0, inv.currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tax summary */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-900">税務サマリー</h2>
          <a
            href={`/api/reports/expense-csv?from=${from}&to=${to}`}
            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
          >
            <Download className="h-3 w-3" />
            経費CSV
          </a>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-zinc-500 mb-1">徴収消費税合計</p>
            <p className="text-xl font-semibold tabular-nums text-zinc-900">
              {formatCurrency(totalTaxCollected)}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {taxRates.map((t) => `${t.name} ${t.rate}%`).join(' / ') || '税率未設定'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">経費合計 (控除対象)</p>
            <p className="text-xl font-semibold tabular-nums text-zinc-900">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="text-xs text-zinc-400 mt-1">{expenses.length}件の経費</p>
          </div>
        </div>
      </div>
    </div>
  )
}
