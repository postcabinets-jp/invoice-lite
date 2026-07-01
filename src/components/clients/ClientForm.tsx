'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import type { Client } from '@/types/database'

const COUNTRIES = [
  { code: 'JP', name: '日本' },
  { code: 'US', name: 'アメリカ合衆国' },
  { code: 'GB', name: 'イギリス' },
  { code: 'DE', name: 'ドイツ' },
  { code: 'FR', name: 'フランス' },
  { code: 'CN', name: '中国' },
  { code: 'KR', name: '韓国' },
  { code: 'AU', name: 'オーストラリア' },
  { code: 'CA', name: 'カナダ' },
  { code: 'SG', name: 'シンガポール' },
  { code: 'TW', name: '台湾' },
  { code: 'HK', name: '香港' },
  { code: 'IN', name: 'インド' },
  { code: 'TH', name: 'タイ' },
  { code: 'VN', name: 'ベトナム' },
  { code: 'ID', name: 'インドネシア' },
  { code: 'MY', name: 'マレーシア' },
  { code: 'PH', name: 'フィリピン' },
  { code: 'NL', name: 'オランダ' },
  { code: 'SE', name: 'スウェーデン' },
  { code: 'NO', name: 'ノルウェー' },
  { code: 'DK', name: 'デンマーク' },
  { code: 'FI', name: 'フィンランド' },
  { code: 'CH', name: 'スイス' },
  { code: 'NZ', name: 'ニュージーランド' },
  { code: 'BR', name: 'ブラジル' },
  { code: 'MX', name: 'メキシコ' },
] as const

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'HKD', 'CNY', 'KRW', 'TWD', 'THB', 'VND', 'INR', 'MYR', 'IDR', 'PHP', 'CHF', 'SEK', 'NOK', 'DKK', 'NZD', 'BRL', 'MXN']

type Props = {
  client?: Client
  orgCurrency?: string
}

export default function ClientForm({ client, orgCurrency = 'JPY' }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(client?.name ?? '')
  const [company, setCompany] = useState(client?.company ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [phone, setPhone] = useState(client?.phone ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [city, setCity] = useState(client?.city ?? '')
  const [country, setCountry] = useState(client?.country ?? 'JP')
  const [currency, setCurrency] = useState(client?.currency ?? orgCurrency)
  const [taxNumber, setTaxNumber] = useState(client?.tax_number ?? '')
  const [notes, setNotes] = useState(client?.notes ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('名前は必須です'); return }
    setError(null)

    const payload = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      country,
      currency: currency || null,
      tax_number: taxNumber.trim() || null,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      try {
        const url = client ? `/api/clients/${client.id}` : '/api/clients'
        const res = await fetch(url, {
          method: client ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const data = await res.json() as { error?: string }
          setError(data.error ?? '保存に失敗しました')
          return
        }
        const saved = await res.json() as { id: string }
        router.push(`/clients/${saved.id}`)
        router.refresh()
      } catch {
        setError('通信エラーが発生しました')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">基本情報</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-zinc-600">
              担当者名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-sm"
              placeholder="山田 太郎"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs text-zinc-600">会社名</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="h-9 text-sm"
              placeholder="株式会社〇〇"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-zinc-600">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-sm"
              placeholder="taro@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs text-zinc-600">電話番号</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-9 text-sm"
              placeholder="03-0000-0000"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">住所</h2>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs text-zinc-600">番地・建物名</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-9 text-sm"
            placeholder="渋谷区渋谷1-1-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-xs text-zinc-600">市区町村</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 text-sm"
              placeholder="東京都"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country" className="text-xs text-zinc-600">国</Label>
            <Select value={country} onValueChange={(v) => v && setCountry(v)}>
              <SelectTrigger id="country" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code} className="text-sm">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Billing */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">請求設定</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="currency" className="text-xs text-zinc-600">通貨</Label>
            <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
              <SelectTrigger id="currency" className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {CURRENCIES.map((cur) => (
                  <SelectItem key={cur} value={cur} className="text-sm font-mono">
                    {cur}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tax-number" className="text-xs text-zinc-600">インボイス登録番号</Label>
            <Input
              id="tax-number"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              className="h-9 text-sm font-mono"
              placeholder="T0000000000000"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-900">メモ</h2>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="text-sm resize-none"
          placeholder="内部メモ（クライアントには表示されません）"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          キャンセル
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? '保存中...' : client ? '更新する' : '作成する'}
        </Button>
      </div>
    </form>
  )
}
