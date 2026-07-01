'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'ソフトウェア' },
  { value: 'travel', label: '出張・交通費' },
  { value: 'equipment', label: '機器・備品' },
  { value: 'office', label: 'オフィス' },
  { value: 'printing', label: '印刷' },
  { value: 'other', label: 'その他' },
] as const

interface Project {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
}

interface ExpenseDialogProps {
  orgId: string
  projects: Project[]
  clients: Client[]
}

export default function ExpenseDialog({ orgId, projects, clients }: ExpenseDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const supabase = createClient()

      let receiptUrl: string | null = null

      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop()
        const fileName = `${orgId}/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile, { upsert: false })

        if (uploadError) {
          setError(`領収書のアップロードに失敗: ${uploadError.message}`)
          return
        }

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(uploadData.path)
        receiptUrl = urlData.publicUrl
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from('expenses') as any).insert({
        organization_id: orgId,
        vendor: (data.get('vendor') as string) || null,
        category: data.get('category') as string,
        description: (data.get('description') as string) || null,
        amount: parseFloat(data.get('amount') as string),
        currency: 'JPY',
        expense_date: data.get('expense_date') as string,
        project_id: (data.get('project_id') as string) || null,
        client_id: (data.get('client_id') as string) || null,
        is_billable: data.get('is_billable') === 'on',
        receipt_url: receiptUrl,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      form.reset()
      setReceiptFile(null)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        経費を追加
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-zinc-900">経費を追加</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600">業者名</Label>
              <Input name="vendor" placeholder="Amazon, JR東日本, etc." className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600">
                カテゴリ <span className="text-red-400">*</span>
              </Label>
              <select
                name="category"
                required
                className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">選択してください</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">説明</Label>
            <Textarea name="description" placeholder="経費の詳細" className="h-20 text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600">
                金額 (¥) <span className="text-red-400">*</span>
              </Label>
              <Input
                name="amount"
                type="number"
                min="0"
                step="1"
                required
                placeholder="5000"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600">
                日付 <span className="text-red-400">*</span>
              </Label>
              <Input
                name="expense_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600">プロジェクト</Label>
              <select
                name="project_id"
                className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">選択 (任意)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-600">クライアント</Label>
              <select
                name="client_id"
                className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
              >
                <option value="">選択 (任意)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">領収書</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors w-full">
                <Upload className="h-3.5 w-3.5" />
                {receiptFile ? receiptFile.name : 'ファイルを選択 (PDF, PNG, JPG)'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="sr-only"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {receiptFile && (
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_billable"
              defaultChecked
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm text-zinc-700">クライアントへ請求する</span>
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
