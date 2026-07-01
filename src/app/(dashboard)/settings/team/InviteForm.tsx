'use client'

import { useState, useTransition } from 'react'
import { UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OrgRole } from '@/types/database'

const ROLES: { value: OrgRole; label: string }[] = [
  { value: 'admin', label: '管理者' },
  { value: 'member', label: 'メンバー' },
  { value: 'accountant', label: '経理担当' },
]

interface InviteFormProps {
  onInvite: (formData: FormData) => Promise<void>
}

export default function InviteForm({ onInvite }: InviteFormProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await onInvite(formData)
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <UserPlus className="h-3.5 w-3.5" />
        メンバーを招待
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-900">メンバーを招待</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">
              メールアドレス <span className="text-red-400">*</span>
            </Label>
            <Input
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-600">ロール</Label>
            <select
              name="role"
              defaultValue="member"
              className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? '送信中...' : '招待を送信'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
