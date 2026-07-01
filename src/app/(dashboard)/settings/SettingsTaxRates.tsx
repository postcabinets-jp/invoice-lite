'use client'

import { useTransition, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TaxRate } from '@/types/database'

interface SettingsTaxRatesProps {
  taxRates: TaxRate[]
  onAdd: (formData: FormData) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function SettingsTaxRates({ taxRates, onAdd, onDelete }: SettingsTaxRatesProps) {
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await onAdd(formData)
      ;(e.target as HTMLFormElement).reset()
      setShowForm(false)
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('この税率を削除しますか？')) return
    setDeletingId(id)
    startTransition(async () => {
      await onDelete(id)
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">税率</h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 px-2.5 text-xs"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="h-3 w-3" />
            追加
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-600">名前</Label>
                <Input
                  name="name"
                  required
                  placeholder="消費税"
                  className="h-8 w-36 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-600">税率 (%)</Label>
                <Input
                  name="rate"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="10"
                  className="h-8 w-24 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  name="is_default"
                  className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">デフォルト</span>
              </label>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="h-8" disabled={isPending}>
                  {isPending ? '追加中...' : '追加'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setShowForm(false)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          </form>
        )}

        {taxRates.length === 0 ? (
          <div className="py-10 text-center text-sm text-zinc-400">
            税率が設定されていません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/40">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">名前</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">税率</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">デフォルト</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {taxRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3 font-medium text-zinc-800">{rate.name}</td>
                  <td className="px-5 py-3 text-zinc-600 tabular-nums">{rate.rate}%</td>
                  <td className="px-5 py-3">
                    {rate.is_default && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
                        デフォルト
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(rate.id)}
                      disabled={deletingId === rate.id}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
