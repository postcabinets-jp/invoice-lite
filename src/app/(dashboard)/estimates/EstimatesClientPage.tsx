'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Eye, ArrowRight, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { InvoiceStatus } from '@/types/database'

type EstimateRow = {
  id: string
  number: string
  status: string
  total: number | null
  amount_due: number | null
  currency: string
  issue_date: string
  due_date: string | null
  is_estimate: boolean
  clients: { id: string; name: string; company: string | null; email: string | null } | null
}

const TABS: { key: InvoiceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'draft', label: '下書き' },
  { key: 'sent', label: '送信済' },
  { key: 'paid', label: '承認済' },
  { key: 'cancelled', label: 'キャンセル' },
]

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  sent: '送信済',
  viewed: '閲覧済',
  partial: '一部承認',
  paid: '承認済',
  overdue: '期限超過',
  cancelled: 'キャンセル',
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-zinc-100 text-zinc-400',
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
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

const PAGE_SIZE = 20

export default function EstimatesClientPage({
  estimates,
  initialStatus,
}: {
  estimates: EstimateRow[]
  initialStatus: InvoiceStatus | 'all'
}) {
  const router = useRouter()
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | 'all'>(initialStatus)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [converting, setConverting] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = estimates
    if (activeStatus !== 'all') {
      list = list.filter((est) => est.status === activeStatus)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (est) =>
          est.number.toLowerCase().includes(q) ||
          (est.clients?.name ?? '').toLowerCase().includes(q) ||
          (est.clients?.company ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [estimates, activeStatus, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleTabChange = (status: InvoiceStatus | 'all') => {
    setActiveStatus(status)
    setPage(1)
  }

  const handleConvertToInvoice = async (id: string) => {
    if (!confirm('この見積書を請求書に変換しますか？')) return
    setConverting(id)
    try {
      const { convertEstimateToInvoice } = await import('@/app/actions/invoices')
      const invoice = await convertEstimateToInvoice(id)
      router.push(`/invoices/${invoice.id}`)
    } catch (e) {
      console.error(e)
      setConverting(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この見積書を削除しますか？')) return
    const supabase = createClient()
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeStatus === tab.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="番号 / クライアント名で検索"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {paginated.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            {search ? '検索結果がありません。' : '見積書がありません。'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">番号</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">クライアント</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">発行日</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">有効期限</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {paginated.map((est) => (
                  <tr key={est.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/invoices/${est.id}`}
                        className="font-mono text-xs text-zinc-700 hover:text-zinc-900"
                      >
                        {est.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-800">
                      {est.clients?.company ?? est.clients?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 tabular-nums text-xs">
                      {formatDate(est.issue_date)}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 tabular-nums text-xs">
                      {formatDate(est.due_date)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums text-zinc-900">
                      {formatCurrency(est.total ?? 0, est.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[est.status] ?? 'bg-zinc-100 text-zinc-500'}`}
                      >
                        {STATUS_LABEL[est.status] ?? est.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/invoices/${est.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => handleConvertToInvoice(est.id)}
                          disabled={converting === est.id}
                          title="請求書に変換"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                        <button
                          onClick={() => handleDelete(est.id)}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {filtered.length}件中 {(page - 1) * PAGE_SIZE + 1}〜
            {Math.min(page * PAGE_SIZE, filtered.length)}件を表示
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-zinc-600 px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
