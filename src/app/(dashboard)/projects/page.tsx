import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Project, Client, ProjectStatus } from '@/types/database'

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

type ProjectRow = Project & {
  clients: Pick<Client, 'name' | 'company'> | null
  hours_used: number
  amount_billed: number
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
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
  const filterStatus = (params.status as ProjectStatus | undefined) ?? undefined

  let query = supabase
    .from('projects')
    .select('*, clients(name, company)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (filterStatus) {
    query = query.eq('status', filterStatus)
  }

  const { data: projectsData } = await query
  const projects = (projectsData ?? []) as ProjectRow[]

  // Fetch aggregate data for each project: hours used from time_entries and amount billed from invoice_items via invoices
  const projectIds = projects.map((p) => p.id)
  let hoursMap: Record<string, number> = {}
  let amountMap: Record<string, number> = {}

  if (projectIds.length > 0) {
    const { data: timeData } = await supabase
      .from('time_entries')
      .select('project_id, duration_minutes')
      .eq('organization_id', orgId)
      .in('project_id', projectIds)
      .not('ended_at', 'is', null)

    for (const entry of (timeData ?? []) as { project_id: string | null; duration_minutes: number | null }[]) {
      if (entry.project_id) {
        hoursMap[entry.project_id] =
          (hoursMap[entry.project_id] ?? 0) + (entry.duration_minutes ?? 0) / 60
      }
    }

    // Sum expenses per project (billed ones)
    const { data: expData } = await supabase
      .from('expenses')
      .select('project_id, amount')
      .eq('organization_id', orgId)
      .eq('is_invoiced', true)
      .in('project_id', projectIds)

    for (const exp of (expData ?? []) as { project_id: string | null; amount: number }[]) {
      if (exp.project_id) {
        amountMap[exp.project_id] = (amountMap[exp.project_id] ?? 0) + (exp.amount ?? 0)
      }
    }
  }

  const STATUS_FILTERS: { key: ProjectStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'すべて' },
    { key: 'active', label: '進行中' },
    { key: 'completed', label: '完了' },
    { key: 'archived', label: 'アーカイブ' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">プロジェクト</h1>
          <p className="text-sm text-zinc-500 mt-0.5">プロジェクトの管理と進捗確認</p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            新規プロジェクト
          </Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === 'all' ? '/projects' : `/projects?status=${f.key}`}
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              (f.key === 'all' && !filterStatus) || filterStatus === f.key
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center">
          <FolderOpen className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">プロジェクトがありません</p>
          <Link href="/projects/new">
            <Button size="sm" variant="outline" className="mt-4 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              プロジェクトを作成
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const client = project.clients as { name: string; company: string | null } | null
            const hoursUsed = hoursMap[project.id] ?? 0
            const budgetHours = project.budget_hours ?? 0
            const hoursProgress = budgetHours > 0 ? Math.min(100, (hoursUsed / budgetHours) * 100) : 0
            const amountBilled = amountMap[project.id] ?? 0
            const budgetAmount = project.budget_amount ?? 0
            const amountProgress =
              budgetAmount > 0 ? Math.min(100, (amountBilled / budgetAmount) * 100) : 0

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-900 truncate">{project.name}</h3>
                      {client && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {client.company ?? client.name}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-2 shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[project.status]}`}
                    >
                      {STATUS_LABEL[project.status]}
                    </span>
                  </div>

                  {project.hourly_rate && (
                    <p className="text-xs text-zinc-500 mb-3">
                      時給 {formatCurrency(project.hourly_rate)}
                    </p>
                  )}

                  {budgetHours > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-500">時間</span>
                        <span className="text-xs text-zinc-700 tabular-nums">
                          {hoursUsed.toFixed(1)}h / {budgetHours}h
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${hoursProgress >= 90 ? 'bg-red-500' : hoursProgress >= 70 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${hoursProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {budgetAmount > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-500">予算</span>
                        <span className="text-xs text-zinc-700 tabular-nums">
                          {formatCurrency(amountBilled)} / {formatCurrency(budgetAmount)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${amountProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {project.due_date && (
                    <p className="text-xs text-zinc-400 mt-2">
                      期限: {formatDate(project.due_date)}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
