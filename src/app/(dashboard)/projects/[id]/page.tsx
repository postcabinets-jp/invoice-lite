import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Project, Client, TimeEntry, Expense, Invoice, ProjectStatus } from '@/types/database'

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

function formatDuration(minutes: number | null): string {
  if (!minutes) return '0:00'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '進行中',
  completed: '完了',
  archived: 'アーカイブ',
}

const STATUS_CLASS: Record<ProjectStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-zinc-100 text-zinc-500',
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
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

  const { id } = await params
  const sp = await searchParams
  const activeTab = sp.tab ?? 'time'

  const { data: projectData } = await supabase
    .from('projects')
    .select('*, clients(name, company, email)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!projectData) notFound()

  const project = projectData as Project & {
    clients: Pick<Client, 'name' | 'company' | 'email'> | null
  }

  const [{ data: timeData }, { data: expenseData }, { data: invoiceData }] = await Promise.all([
    supabase
      .from('time_entries')
      .select('*')
      .eq('project_id', id)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .eq('project_id', id)
      .order('expense_date', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, number, status, total, currency, issue_date, due_date, clients(name)')
      .eq('organization_id', orgId)
      .eq('is_estimate', false)
      .order('created_at', { ascending: false }),
  ])

  const timeEntries = (timeData ?? []) as TimeEntry[]
  const expenses = (expenseData ?? []) as Expense[]
  type InvoiceRow = { id: string; number: string; status: string; total: number | null; currency: string; issue_date: string; due_date: string | null; clients: { name: string } | null }
  const invoices = (invoiceData ?? []) as InvoiceRow[]

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const totalHours = totalMinutes / 60
  const budgetHours = project.budget_hours ?? 0
  const hoursProgress = budgetHours > 0 ? Math.min(100, (totalHours / budgetHours) * 100) : 0

  const billedAmount = expenses
    .filter((e) => e.is_invoiced)
    .reduce((sum, e) => sum + e.amount, 0)
  const budgetAmount = project.budget_amount ?? 0
  const amountProgress = budgetAmount > 0 ? Math.min(100, (billedAmount / budgetAmount) * 100) : 0

  const client = project.clients as { name: string; company: string | null; email: string | null } | null

  const TABS = [
    { key: 'time', label: '時間エントリ' },
    { key: 'expenses', label: '経費' },
    { key: 'invoices', label: '請求書' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        プロジェクト一覧
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold text-zinc-900">{project.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[project.status]}`}
              >
                {STATUS_LABEL[project.status]}
              </span>
            </div>
            {client && (
              <p className="text-sm text-zinc-500">
                {client.company ?? client.name}
                {client.email && (
                  <span className="ml-2 text-zinc-400">· {client.email}</span>
                )}
              </p>
            )}
            {project.description && (
              <p className="text-sm text-zinc-600 mt-2">{project.description}</p>
            )}
          </div>
          <div className="text-right text-sm text-zinc-500">
            {project.hourly_rate && (
              <p>時給 <span className="font-medium text-zinc-700">{formatCurrency(project.hourly_rate)}</span></p>
            )}
            {project.due_date && (
              <p className="mt-1">期限 <span className="font-medium text-zinc-700">{formatDate(project.due_date)}</span></p>
            )}
          </div>
        </div>

        {/* Progress bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 border-t border-zinc-100">
          {budgetHours > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-600">時間の進捗</span>
                <span className="text-xs text-zinc-700 tabular-nums">
                  {totalHours.toFixed(1)}h / {budgetHours}h
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    hoursProgress >= 90 ? 'bg-red-500' : hoursProgress >= 70 ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${hoursProgress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1">{hoursProgress.toFixed(0)}% 使用</p>
            </div>
          )}

          {budgetAmount > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-600">予算の進捗</span>
                <span className="text-xs text-zinc-700 tabular-nums">
                  {formatCurrency(billedAmount)} / {formatCurrency(budgetAmount)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${amountProgress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1">{amountProgress.toFixed(0)}% 請求済</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex items-center gap-1 border-b border-zinc-200 mb-4">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/projects/${id}?tab=${tab.key}`}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-zinc-900 text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Time entries tab */}
        {activeTab === 'time' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {timeEntries.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400">
                時間エントリがありません
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">日付</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">説明</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">時間</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {timeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3 text-xs text-zinc-500 tabular-nums">
                        {formatDate(entry.started_at)}
                      </td>
                      <td className="px-5 py-3 text-zinc-700">
                        {entry.description ?? <span className="text-zinc-300 italic">説明なし</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs tabular-nums text-zinc-700">
                        {formatDuration(entry.duration_minutes)}
                      </td>
                      <td className="px-5 py-3">
                        {entry.is_invoiced ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">請求済</span>
                        ) : entry.is_billable ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">未請求</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500">非請求</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Expenses tab */}
        {activeTab === 'expenses' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400">
                経費がありません
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">日付</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">業者</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">説明</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3 text-xs text-zinc-500 tabular-nums">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="px-5 py-3 text-zinc-700">{expense.vendor ?? '—'}</td>
                      <td className="px-5 py-3 text-zinc-600">{expense.description ?? '—'}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="px-5 py-3">
                        {expense.is_invoiced ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">請求済</span>
                        ) : expense.is_billable ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">未請求</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500">非請求</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Invoices tab */}
        {activeTab === 'invoices' && (
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            {invoices.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400">
                関連する請求書がありません
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">番号</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">発行日</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-xs text-zinc-700 hover:text-zinc-900">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-500">{formatDate(inv.issue_date)}</td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {formatCurrency(inv.total ?? 0, inv.currency)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
