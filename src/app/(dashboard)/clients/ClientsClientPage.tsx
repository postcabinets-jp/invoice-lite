'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Eye, Archive, ArchiveRestore } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type ClientRow = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  is_archived: boolean
  invoiceCount: number
  outstandingBalance: number
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function ClientsClientPage({ clients }: { clients: ClientRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const filtered = useMemo(() => {
    let list = clients
    if (!showArchived) list = list.filter((c) => !c.is_archived)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [clients, search, showArchived])

  const handleArchive = async (id: string, archive: boolean) => {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: archive }),
    })
    if (res.ok) router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="名前 / 会社 / メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`gap-1.5 h-8 text-xs ${showArchived ? 'bg-zinc-100' : ''}`}
          onClick={() => setShowArchived((v) => !v)}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? 'アーカイブを非表示' : 'アーカイブを表示'}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            {search ? '検索結果がありません。' : 'クライアントがいません。'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">名前</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">会社</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">メール</th>
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">電話</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">請求書数</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">未払い残高</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-zinc-50/60 transition-colors ${client.is_archived ? 'opacity-50' : ''}`}
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900">
                      <Link href={`/clients/${client.id}`} className="hover:text-zinc-600 transition-colors">
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-zinc-600">{client.company ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-500">{client.email ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-500">{client.phone ?? '—'}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-zinc-700">{client.invoiceCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      <span className={client.outstandingBalance > 0 ? 'text-red-600 font-medium' : 'text-zinc-400'}>
                        {client.outstandingBalance > 0 ? formatCurrency(client.outstandingBalance) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/clients/${client.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <button
                          onClick={() => handleArchive(client.id, !client.is_archived)}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                          title={client.is_archived ? 'アーカイブ解除' : 'アーカイブ'}
                        >
                          {client.is_archived
                            ? <ArchiveRestore className="h-3.5 w-3.5" />
                            : <Archive className="h-3.5 w-3.5" />
                          }
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

      <p className="text-xs text-zinc-400">
        {filtered.length}件のクライアント
        {!showArchived && clients.filter((c) => c.is_archived).length > 0 && (
          <> （アーカイブ済み {clients.filter((c) => c.is_archived).length}件を非表示）</>
        )}
      </p>
    </div>
  )
}
