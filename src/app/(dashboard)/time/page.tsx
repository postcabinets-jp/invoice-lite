import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Play, Upload, FileDown, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ActiveTimer from '@/components/time/ActiveTimer'
import TimeImportDialog from './TimeImportDialog'
import StartTimerForm from './StartTimerForm'
import type { Project, Client, TimeEntry } from '@/types/database'

function formatDuration(minutes: number | null): string {
  if (!minutes) return '0:00'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}:${String(m).padStart(2, '0')}`
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

type TimeEntryRow = TimeEntry & {
  projects: Pick<Project, 'name'> | null
  clients: Pick<Client, 'name'> | null
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; unbilled?: string }>
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

  const [
    { data: activeEntryData },
    { data: entriesData },
    { data: projectsData },
    { data: clientsData },
  ] = await Promise.all([
    supabase
      .from('time_entries')
      .select('id, started_at, description, projects(name), clients(name)')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1),
    supabase
      .from('time_entries')
      .select('*, projects(name), clients(name)')
      .eq('organization_id', orgId)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(200),
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

  type ActiveEntryType = { id: string; started_at: string; description: string | null; projects: { name: string } | null; clients: { name: string } | null }
  const activeEntry = (activeEntryData as ActiveEntryType[] | null)?.[0] ?? null
  const allEntries = (entriesData ?? []) as TimeEntryRow[]
  const projects = (projectsData ?? []) as { id: string; name: string }[]
  const clients = (clientsData ?? []) as { id: string; name: string }[]

  // Filter entries
  let entries = allEntries
  if (params.project) {
    entries = entries.filter((e) => e.project_id === params.project)
  }
  if (params.unbilled === '1') {
    entries = entries.filter((e) => e.is_billable && !e.is_invoiced)
  }

  const unbilledEntries = allEntries.filter((e) => e.is_billable && !e.is_invoiced)
  const unbilledMinutes = unbilledEntries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const unbilledAmount = unbilledEntries.reduce((sum, e) => {
    const rate = e.hourly_rate ?? 0
    const hours = (e.duration_minutes ?? 0) / 60
    return sum + rate * hours
  }, 0)

  async function startTimer(formData: FormData) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    const { data: m } = await supabase2
      .from('org_members')
      .select('organization_id')
      .eq('user_id', u.id)
      .single()
    if (!m) return
    const mm = m as { organization_id: string }

    const projectId = formData.get('project_id') as string | null
    const clientId = formData.get('client_id') as string | null
    const description = formData.get('description') as string | null
    const hourlyRate = formData.get('hourly_rate') ? Number(formData.get('hourly_rate')) : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase2.from('time_entries') as any).insert({
      organization_id: mm.organization_id,
      user_id: u.id,
      project_id: projectId || null,
      client_id: clientId || null,
      description: description || null,
      started_at: new Date().toISOString(),
      hourly_rate: hourlyRate,
      is_billable: formData.get('is_billable') === 'on',
    })

    revalidatePath('/time')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">時間管理</h1>
          <p className="text-sm text-zinc-500 mt-0.5">作業時間の記録と管理</p>
        </div>
        <div className="flex gap-2">
          <TimeImportDialog orgId={orgId} userId={user.id} />
        </div>
      </div>

      {/* Active timer */}
      {activeEntry && (
        <ActiveTimer
          entryId={activeEntry.id}
          startedAt={activeEntry.started_at}
          projectName={(activeEntry.projects as { name: string } | null)?.name ?? null}
          description={activeEntry.description}
        />
      )}

      {/* Unbilled summary */}
      {unbilledEntries.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Clock className="h-4 w-4 text-zinc-400" />
            <div className="text-sm text-zinc-700">
              未請求:{' '}
              <span className="font-medium">{formatDuration(unbilledMinutes)}</span>
              <span className="text-zinc-400 mx-2">·</span>
              <span className="font-medium">{formatCurrency(unbilledAmount)}</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileDown className="h-3.5 w-3.5" />
            請求書に追加
          </Button>
        </div>
      )}

      {/* Start timer */}
      {!activeEntry && (
        <StartTimerForm
          projects={projects}
          clients={clients}
          onStart={startTimer}
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-500 font-medium">プロジェクト:</span>
          <form>
            <input type="hidden" name="unbilled" value={params.unbilled ?? ''} />
            <select
              name="project"
              defaultValue={params.project ?? ''}
              className="h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              onChange={(e) => {
                const url = new URL(window.location.href)
                if (e.target.value) {
                  url.searchParams.set('project', e.target.value)
                } else {
                  url.searchParams.delete('project')
                }
                window.location.href = url.toString()
              }}
            >
              <option value="">すべて</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </form>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`/time?${params.project ? `project=${params.project}&` : ''}${params.unbilled === '1' ? '' : 'unbilled=1'}`}
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              params.unbilled === '1'
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            未請求のみ
          </a>
        </div>
      </div>

      {/* Entries table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            時間エントリがありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">日付</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">説明</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">プロジェクト</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">時間</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {entries.map((entry) => {
                  const hours = (entry.duration_minutes ?? 0) / 60
                  const amount = (entry.hourly_rate ?? 0) * hours
                  const project = entry.projects as { name: string } | null
                  return (
                    <tr key={entry.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 text-zinc-500 tabular-nums text-xs">
                        {formatDate(entry.started_at)}
                      </td>
                      <td className="px-5 py-3 text-zinc-800">
                        {entry.description ?? (
                          <span className="text-zinc-400 italic">説明なし</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {project?.name ?? (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-zinc-700 tabular-nums">
                        {formatDuration(entry.duration_minutes)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                        {entry.is_billable && entry.hourly_rate
                          ? formatCurrency(amount)
                          : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {!entry.is_billable ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500">
                            非請求
                          </span>
                        ) : entry.is_invoiced ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                            請求済
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                            未請求
                          </span>
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
