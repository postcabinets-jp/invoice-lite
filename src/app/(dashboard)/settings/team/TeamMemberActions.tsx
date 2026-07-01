'use client'

import { useState, useTransition } from 'react'
import { Trash2, ChevronDown } from 'lucide-react'
import type { OrgRole } from '@/types/database'

const ROLES: { value: OrgRole; label: string }[] = [
  { value: 'owner', label: 'オーナー' },
  { value: 'admin', label: '管理者' },
  { value: 'member', label: 'メンバー' },
  { value: 'accountant', label: '経理担当' },
]

interface TeamMemberActionsProps {
  memberId: string
  currentRole: OrgRole
  onChangeRole: (memberId: string, newRole: OrgRole) => Promise<void>
  onRemove: (memberId: string) => Promise<void>
}

export default function TeamMemberActions({
  memberId,
  currentRole,
  onChangeRole,
  onRemove,
}: TeamMemberActionsProps) {
  const [isPending, startTransition] = useTransition()

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as OrgRole
    startTransition(async () => {
      await onChangeRole(memberId, newRole)
    })
  }

  const handleRemove = () => {
    if (!confirm('このメンバーを削除しますか？')) return
    startTransition(async () => {
      await onRemove(memberId)
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <div className="relative">
        <select
          value={currentRole}
          onChange={handleRoleChange}
          disabled={isPending}
          className="h-7 rounded-md border border-zinc-200 bg-white pl-2 pr-7 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 appearance-none"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400 pointer-events-none" />
      </div>
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
