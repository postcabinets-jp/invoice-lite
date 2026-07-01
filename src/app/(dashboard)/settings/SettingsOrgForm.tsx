'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Organization } from '@/types/database'

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD']
const TIMEZONES = [
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
]

interface SettingsOrgFormProps {
  org: Organization
  onUpdate: (formData: FormData) => Promise<void>
  mode?: 'org' | 'invoice'
  defaultFooter?: string
  defaultNotes?: string
  paymentTermsDays?: number
}

export default function SettingsOrgForm({
  org,
  onUpdate,
  mode = 'org',
  defaultFooter = '',
  defaultNotes = '',
  paymentTermsDays = 30,
}: SettingsOrgFormProps) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await onUpdate(formData)
    })
  }

  if (mode === 'invoice') {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-medium text-zinc-900">請求書テンプレート</h2>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">デフォルト注記</Label>
            <Textarea
              name="default_notes"
              defaultValue={defaultNotes}
              placeholder="お客様へのメモ、支払い方法の説明など"
              className="h-24 text-sm resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">デフォルトフッター</Label>
            <Textarea
              name="default_footer"
              defaultValue={defaultFooter}
              placeholder="会社情報、銀行口座情報など"
              className="h-24 text-sm resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">支払い期限 (日数)</Label>
            <Input
              name="payment_terms_days"
              type="number"
              defaultValue={paymentTermsDays}
              min={0}
              max={365}
              className="h-8 w-24 text-sm"
            />
          </div>

          {/* Hidden fields to carry existing org values */}
          <input type="hidden" name="name" value={org.name} />
          <input type="hidden" name="slug" value={org.slug} />
          <input type="hidden" name="currency" value={org.currency} />
          <input type="hidden" name="timezone" value={org.timezone} />
          <input type="hidden" name="invoice_prefix" value={org.invoice_prefix} />
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">組織情報</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">組織名 *</Label>
            <Input
              name="name"
              required
              defaultValue={org.name}
              placeholder="株式会社 Example"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">スラッグ</Label>
            <Input
              name="slug"
              defaultValue={org.slug}
              placeholder="example-inc"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">通貨</Label>
            <select
              name="currency"
              defaultValue={org.currency}
              className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">タイムゾーン</Label>
            <select
              name="timezone"
              defaultValue={org.timezone}
              className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">請求書プレフィックス</Label>
            <Input
              name="invoice_prefix"
              defaultValue={org.invoice_prefix}
              placeholder="INV"
              className="h-8 text-sm w-32"
            />
            <p className="text-xs text-zinc-400">例: INV → INV-0001</p>
          </div>
        </div>

        {/* Logo upload placeholder */}
        <div className="space-y-1.5 pt-2 border-t border-zinc-100">
          <Label className="text-xs font-medium text-zinc-600">ロゴ</Label>
          {org.logo_url && (
            <div className="mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={org.logo_url}
                alt="組織ロゴ"
                className="h-12 w-auto object-contain rounded border border-zinc-200"
              />
            </div>
          )}
          <input
            type="file"
            name="logo"
            accept="image/*"
            className="block text-sm text-zinc-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
          />
          <p className="text-xs text-zinc-400">PNG, SVG, JPG — 最大 2MB</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? '保存中...' : '保存'}
        </Button>
      </div>
    </form>
  )
}
