import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InvoiceStatus } from '@/types/database'

type InvoiceSummary = {
  id: string
  status: string
  amount_due: number | null
  due_date: string | null
  issue_date: string
  total: number | null
  is_estimate: boolean
}

type RecentInvoice = {
  id: string
  number: string
  status: string
  total: number | null
  currency: string
  due_date: string | null
  issue_date: string
  clients: { name: string; company: string | null } | null
}

type PaymentSummary = {
  amount: number
}

function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateStr))
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: '下書き',
  sent: '送信済',
  viewed: '閲覧済',
  partial: '一部入金',
  paid: '入金済',
  overdue: '期限超過',
  cancelled: 'キャンセル',
}

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/register')
  const orgId = (member as unknown as { organization_id: string }).organization_id

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    allInvoicesResult,
    recentInvoicesResult,
    paymentsResult,
  ] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, status, amount_due, due_date, issue_date, total, is_estimate')
      .eq('organization_id', orgId),
    supabase
      .from('invoices')
      .select('id, number, status, total, currency, due_date, issue_date, clients(name, company)')
      .eq('organization_id', orgId)
      .eq('is_estimate', false)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('payments')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('paid_at', firstOfMonth),
  ])

  const allInvoices = (allInvoicesResult.data as unknown as InvoiceSummary[]) ?? []
  const recentInvoices = (recentInvoicesResult.data as unknown as RecentInvoice[]) ?? []
  const paymentsThisMonth = (paymentsResult.data as unknown as PaymentSummary[]) ?? []

  const unpaidTotal = allInvoices
    .filter((inv) => ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount_due ?? 0), 0)

  const thisMonthInvoices = allInvoices.filter(
    (inv) => !inv.is_estimate && inv.issue_date >= firstOfMonth && inv.status !== 'draft' && inv.status !== 'cancelled'
  )
  const thisMonthIncome = thisMonthInvoices.reduce((sum, inv) => sum + (inv.total ?? 0), 0)

  const last30DaysReceived = paymentsThisMonth.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  const draftCount = allInvoices.filter((inv) => inv.status === 'draft').length

  const overdueInvoices = recentInvoices.filter(
    (inv) => inv.status === 'overdue' || (
      ['sent', 'viewed', 'partial'].includes(inv.status) &&
      inv.due_date !== null &&
      inv.due_date < today
    )
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">ダッシュボード</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{formatDate(today)} 時点</p>
        </div>
        <Link href="/invoices/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            新規請求書
          </Button>
        </Link>
      </div>

      {/* Overdue alert */}
      {overdueInvoices.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <div className="text-sm text-red-700">
            <span className="font-medium">{overdueInvoices.length}件の請求書が期限超過</span>です。
            <Link href="/invoices?status=overdue" className="ml-1 underline underline-offset-2 hover:text-red-900">
              確認する
            </Link>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="未払い合計"
          value={formatCurrency(unpaidTotal)}
          accent={unpaidTotal > 0 ? 'red' : 'zinc'}
        />
        <KpiCard
          label="今月の請求額"
          value={formatCurrency(thisMonthIncome)}
          accent="zinc"
        />
        <KpiCard
          label="直近30日間の入金"
          value={formatCurrency(last30DaysReceived)}
          accent="zinc"
        />
        <KpiCard
          label="下書き"
          value={`${draftCount}件`}
          accent="zinc"
        />
      </div>

      {/* Recent invoices */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">最近の請求書</h2>
          <Link href="/invoices" className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors">
            すべて表示 →
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            請求書がまだありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">番号</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">クライアント</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">支払期限</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {recentInvoices.map((inv) => {
                  const client = inv.clients as { name: string; company: string | null } | null
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-xs text-zinc-700 hover:text-zinc-900">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-zinc-800">
                        {client?.company ?? client?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {formatCurrency(inv.total ?? 0, inv.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status as InvoiceStatus]}`}>
                          {STATUS_LABEL[inv.status as InvoiceStatus]}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 tabular-nums">
                        {formatDate(inv.due_date)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'red' | 'zinc'
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold tabular-nums leading-none ${accent === 'red' ? 'text-red-600' : 'text-zinc-900'}`}>
        {value}
      </p>
    </div>
  )
}
