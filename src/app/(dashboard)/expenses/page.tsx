import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import ExpenseDialog from '@/components/expenses/ExpenseDialog'
import type { Expense, Project, Client } from '@/types/database'

const CATEGORY_LABEL: Record<string, string> = {
  software: 'ソフトウェア',
  travel: '出張・交通費',
  equipment: '機器・備品',
  office: 'オフィス',
  printing: '印刷',
  other: 'その他',
}

function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

type ExpenseRow = Expense & {
  projects: Pick<Project, 'name'> | null
  clients: Pick<Client, 'name'> | null
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
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

  const [{ data: expensesData }, { data: projectsData }, { data: clientsData }] =
    await Promise.all([
      supabase
        .from('expenses')
        .select('*, projects(name), clients(name)')
        .eq('organization_id', orgId)
        .order('expense_date', { ascending: false }),
      supabase
        .from('projects')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('name'),
      supabase
        .from('clients')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('is_archived', false)
        .order('name'),
    ])

  const allExpenses = (expensesData ?? []) as ExpenseRow[]
  const projects = projectsData ?? []
  const clients = clientsData ?? []

  const expenses = params.category
    ? allExpenses.filter((e) => e.category === params.category)
    : allExpenses

  const unbilledExpenses = allExpenses.filter((e) => e.is_billable && !e.is_invoiced)
  const unbilledTotal = unbilledExpenses.reduce((sum, e) => sum + e.amount, 0)

  const categories = Array.from(new Set(allExpenses.map((e) => e.category))).sort()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">経費</h1>
          <p className="text-sm text-zinc-500 mt-0.5">経費の記録と管理</p>
        </div>
        <ExpenseDialog orgId={orgId} projects={projects} clients={clients} />
      </div>

      {/* Unbilled summary */}
      {unbilledExpenses.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            未請求の経費:{' '}
            <span className="font-semibold">{unbilledExpenses.length}件</span>
            <span className="mx-2 text-amber-400">·</span>
            <span className="font-semibold">{formatCurrency(unbilledTotal)}</span>
          </p>
        </div>
      )}

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href="/expenses"
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            !params.category
              ? 'bg-zinc-900 text-white'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
        >
          すべて
        </a>
        {categories.map((cat) => (
          <a
            key={cat}
            href={`/expenses?category=${cat}`}
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              params.category === cat
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {CATEGORY_LABEL[cat] ?? cat}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {expenses.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            経費がまだありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">日付</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">業者</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">カテゴリ</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">説明</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">プロジェクト</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  <th className="px-5 py-2.5 text-center text-xs font-medium text-zinc-400">領収書</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {expenses.map((expense) => {
                  const project = expense.projects as { name: string } | null
                  return (
                    <tr key={expense.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 text-zinc-500 tabular-nums text-xs">
                        {formatDate(expense.expense_date)}
                      </td>
                      <td className="px-5 py-3 text-zinc-800 font-medium">
                        {expense.vendor ?? <span className="text-zinc-300 font-normal">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">
                          {CATEGORY_LABEL[expense.category] ?? expense.category}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-600 max-w-[200px] truncate">
                        {expense.description ?? <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {project?.name ?? <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {!expense.is_billable ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500">
                            非請求
                          </span>
                        ) : expense.is_invoiced ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                            請求済
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                            未請求
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        {expense.receipt_url ? (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="text-zinc-300 text-xs">—</span>
                        )}
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
