'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Client, TaxRate, Invoice, InvoiceItem } from '@/types/database'

type LineItem = {
  id?: string
  description: string
  quantity: number
  unit_price: number
  tax_rate_id: string | null
  tax_amount: number
  total: number
  position: number
}

type Props = {
  clients: Pick<Client, 'id' | 'name' | 'company' | 'currency'>[]
  taxRates: TaxRate[]
  invoice?: Invoice & { invoice_items: InvoiceItem[] }
  orgCurrency: string
  nextInvoiceNumber: string
}

function calcItem(item: Omit<LineItem, 'tax_amount' | 'total'>, taxRates: TaxRate[]): LineItem {
  const subtotal = item.quantity * item.unit_price
  const rate = item.tax_rate_id ? taxRates.find((t) => t.id === item.tax_rate_id) : null
  const tax_amount = rate ? Math.round(subtotal * (rate.rate / 100)) : 0
  return { ...item, tax_amount, total: subtotal + tax_amount }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function InvoiceForm({ clients, taxRates, invoice, orgCurrency, nextInvoiceNumber }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultTaxRate = taxRates.find((t) => t.is_default)

  const [clientId, setClientId] = useState(invoice?.client_id ?? '')
  const [number, setNumber] = useState(invoice?.number ?? nextInvoiceNumber)
  const [issueDate, setIssueDate] = useState(
    invoice?.issue_date ?? new Date().toISOString().split('T')[0]
  )
  const [dueDate, setDueDate] = useState(invoice?.due_date ?? '')
  const [currency, setCurrency] = useState(invoice?.currency ?? orgCurrency)
  const [notes, setNotes] = useState(invoice?.notes ?? '')
  const [footer, setFooter] = useState(invoice?.footer ?? '')
  const [discountAmount, setDiscountAmount] = useState(invoice?.discount_amount ?? 0)

  const [items, setItems] = useState<LineItem[]>(() => {
    if (invoice?.invoice_items?.length) {
      return invoice.invoice_items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate_id: item.tax_rate_id,
        tax_amount: item.tax_amount,
        total: item.total,
        position: item.position,
      }))
    }
    return [calcItem({
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate_id: defaultTaxRate?.id ?? null,
      position: 0,
    }, taxRates)]
  })

  const updateItem = useCallback((index: number, patch: Partial<Omit<LineItem, 'tax_amount' | 'total'>>) => {
    setItems((prev) => {
      const next = [...prev]
      const merged = { ...next[index], ...patch }
      next[index] = calcItem(merged, taxRates)
      return next
    })
  }, [taxRates])

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      calcItem({
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate_id: defaultTaxRate?.id ?? null,
        position: prev.length,
      }, taxRates),
    ])
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, position: i })))
  }

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const taxTotal = items.reduce((sum, item) => sum + item.tax_amount, 0)
  const total = subtotal + taxTotal - discountAmount

  // Update currency when client changes
  const handleClientChange = (id: string) => {
    setClientId(id)
    const client = clients.find((c) => c.id === id)
    if (client?.currency) setCurrency(client.currency)
  }

  const handleSubmit = async (e: React.FormEvent, asDraft = true) => {
    e.preventDefault()
    if (!clientId) { setError('クライアントを選択してください'); return }
    if (!number.trim()) { setError('請求書番号を入力してください'); return }
    if (items.some((item) => !item.description.trim())) {
      setError('すべての明細に内容を入力してください')
      return
    }
    setError(null)

    const payload = {
      client_id: clientId,
      number: number.trim(),
      issue_date: issueDate,
      due_date: dueDate || null,
      currency,
      notes: notes || null,
      footer: footer || null,
      discount_amount: discountAmount,
      status: asDraft ? 'draft' : 'sent',
      items: items.map((item, i) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate_id: item.tax_rate_id,
        position: i,
      })),
    }

    startTransition(async () => {
      try {
        const url = invoice ? `/api/invoices/${invoice.id}` : '/api/invoices'
        const res = await fetch(url, {
          method: invoice ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          setError(data.error ?? '保存に失敗しました')
          return
        }
        const saved = await res.json() as { id: string }
        router.push(`/invoices/${saved.id}`)
        router.refresh()
      } catch {
        setError('通信エラーが発生しました')
      }
    })
  }

  return (
    <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
      {/* Client + meta */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">基本情報</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="client" className="text-xs text-zinc-600">クライアント <span className="text-red-500">*</span></Label>
            <Select value={clientId} onValueChange={(v) => v && handleClientChange(v)}>
              <SelectTrigger id="client" className="h-9 text-sm">
                <SelectValue placeholder="クライアントを選択..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.company ?? c.name}
                    {c.company && <span className="text-zinc-400 ml-1">({c.name})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="number" className="text-xs text-zinc-600">請求書番号 <span className="text-red-500">*</span></Label>
            <Input
              id="number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="h-9 text-sm font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-xs text-zinc-600">通貨</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="h-9 text-sm"
              maxLength={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-date" className="text-xs text-zinc-600">発行日</Label>
            <Input
              id="issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due-date" className="text-xs text-zinc-600">支払期限</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">明細</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/60">
                <th className="w-6 px-2" />
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400">内容</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-zinc-400 w-20">数量</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-zinc-400 w-28">単価</th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 w-32">税率</th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-zinc-400 w-28">小計</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="px-2 py-2.5 text-zinc-300">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      className="h-8 text-sm border-zinc-200"
                      placeholder="サービス名・作業内容"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm text-right border-zinc-200"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                      className="h-8 text-sm text-right border-zinc-200"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={item.tax_rate_id ?? 'none'}
                      onValueChange={(v) => updateItem(index, { tax_rate_id: v === 'none' ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs border-zinc-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">非課税</SelectItem>
                        {taxRates.map((rate) => (
                          <SelectItem key={rate.id} value={rate.id} className="text-xs">
                            {rate.name} ({rate.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700 font-medium">
                    {formatCurrency(item.total, currency)}
                  </td>
                  <td className="px-2">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-zinc-300 hover:text-red-400 transition-colors"
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-zinc-100">
          <Button type="button" variant="ghost" size="sm" onClick={addItem} className="gap-1.5 text-zinc-500 hover:text-zinc-900 h-8">
            <Plus className="h-3.5 w-3.5" />
            行を追加
          </Button>
        </div>

        {/* Totals */}
        <div className="border-t border-zinc-100 px-5 py-4 space-y-2 bg-zinc-50/40">
          <div className="flex justify-between text-sm text-zinc-600">
            <span>小計</span>
            <span className="tabular-nums">{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-600">
            <span>消費税</span>
            <span className="tabular-nums">{formatCurrency(taxTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>割引</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs">−</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                className="h-7 text-xs text-right w-24 border-zinc-200"
              />
            </div>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-zinc-200 pt-2">
            <span className="text-zinc-900">合計</span>
            <span className="tabular-nums text-zinc-900">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes & footer */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">備考・フッター</h2>
        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs text-zinc-600">備考</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-sm resize-none"
            placeholder="支払条件、振込先情報など"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="footer" className="text-xs text-zinc-600">フッター</Label>
          <Textarea
            id="footer"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            rows={2}
            className="text-sm resize-none"
            placeholder="ありがとうございました。"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
        >
          下書き保存
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={(e) => handleSubmit(e as unknown as React.FormEvent, false)}
        >
          {isPending ? '保存中...' : invoice ? '更新する' : '作成する'}
        </Button>
      </div>
    </form>
  )
}
