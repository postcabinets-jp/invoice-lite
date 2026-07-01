import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RecurringToggle from './RecurringToggle'
import type { RecurringInvoice, Client, RecurringFrequency } from '@/types/database'

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

const FREQUENCY_LABEL: Record<RecurringFrequency, string> = {
  weekly: '毎週',
  monthly: '毎月',
  quarterly: '四半期',
  yearly: '毎年',
}

type RecurringRow = RecurringInvoice & {
  clients: Pick<Client, 'name' | 'company'> | null
}

export default async function RecurringPage() {
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

  const { data: recurringData } = await supabase
    .from('recurring_invoices')
    .select('*, clients(name, company)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const recurring = (recurringData ?? []) as RecurringRow[]

  const activeCount = recurring.filter((r) => r.is_active).length
  const pausedCount = recurring.filter((r) => !r.is_active).length

  async function toggleActive(id: string, isActive: boolean) {
    'use server'
    const supabase2 = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase2.from('recurring_invoices') as any).update({ is_active: isActive }).eq('id', id)
    revalidatePath('/recurring')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">定期請求書</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            定期的に発行される請求書の管理
          </p>
        </div>
        <Link href="/recurring/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            新規定期請求
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 font-medium">合計</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 tabular-nums">
            {recurring.length}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 font-medium">有効</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500 font-medium">停止中</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-400 tabular-nums">
            {pausedCount}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {recurring.length === 0 ? (
          <div className="py-20 text-center">
            <RefreshCw className="h-7 w-7 text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">定期請求書がありません</p>
            <Link href="/recurring/new">
              <Button size="sm" variant="outline" className="mt-4 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                作成する
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">クライアント</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">頻度</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">次回送信日</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">終了日</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">自動送信</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {recurring.map((rec) => {
                  const client = rec.clients as { name: string; company: string | null } | null
                  const isPast =
                    rec.is_active && new Date(rec.next_send_date) < new Date()

                  return (
                    <tr key={rec.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-zinc-800">
                        {client?.company ?? client?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-zinc-600">
                        {FREQUENCY_LABEL[rec.frequency]}
                      </td>
                      <td className="px-5 py-3 tabular-nums">
                        <span className={isPast ? 'text-red-600 font-medium' : 'text-zinc-600'}>
                          {formatDate(rec.next_send_date)}
                          {isPast && (
                            <span className="ml-1.5 text-xs text-red-500">(期限超過)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 tabular-nums">
                        {rec.end_date ? formatDate(rec.end_date) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {rec.auto_send ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                            自動
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400">手動</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {rec.is_active ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                            有効
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-500">
                            停止中
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end">
                          <RecurringToggle
                            id={rec.id}
                            isActive={rec.is_active}
                            onToggle={toggleActive}
                          />
                        </div>
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
