'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PaymentMethod } from '@/types/database'

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: '銀行振込' },
  { value: 'cash', label: '現金' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'other', label: 'その他' },
]

interface Props {
  invoiceId: string
  amountDue: number
  currency: string
  variant?: 'default' | 'secondary'
}

export default function RecordPaymentDialog({
  invoiceId,
  amountDue,
  currency,
  variant = 'default',
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [amount, setAmount] = useState(amountDue.toString())
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer')
  const [notes, setNotes] = useState('')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('有効な金額を入力してください')
      return
    }
    setError(null)

    startTransition(async () => {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsedAmount, method, notes, paid_at: paidAt }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? '入金記録に失敗しました')
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant={variant === 'secondary' ? 'outline' : 'default'}
        size="sm"
        className="gap-1.5 w-full"
        onClick={() => setOpen(true)}
      >
        <CreditCard className="h-3.5 w-3.5" />
        入金を記録
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">入金を記録</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs text-zinc-600">
                  金額 ({currency})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="1"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="method" className="text-xs text-zinc-600">
                  支払方法
                </Label>
                <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                  <SelectTrigger id="method" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-sm">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paid-at" className="text-xs text-zinc-600">
                  入金日
                </Label>
                <Input
                  id="paid-at"
                  type="date"
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs text-zinc-600">
                  メモ（任意）
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="振込番号、備考など"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" size="sm" className="flex-1" disabled={isPending}>
                  {isPending ? '保存中...' : '記録する'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
