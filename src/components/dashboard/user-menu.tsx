'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDownIcon, LogOutIcon, SettingsIcon, UserIcon } from 'lucide-react'

interface UserMenuProps {
  email: string
  organizationName: string
}

export function UserMenu({ email, organizationName }: UserMenuProps) {
  const router = useRouter()
  const supabase = createClient()

  const initials = email
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors outline-none">
        <Avatar size="sm">
          <AvatarFallback className="text-xs font-medium bg-zinc-200 text-zinc-700">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[140px] truncate font-medium">{organizationName}</span>
        <ChevronDownIcon className="size-3.5 text-zinc-400 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-zinc-900">{organizationName}</span>
            <span className="text-xs text-zinc-400 truncate">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/settings/profile')}
          className="cursor-pointer"
        >
          <UserIcon />
          プロフィール
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="cursor-pointer"
        >
          <SettingsIcon />
          設定
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          variant="destructive"
          className="cursor-pointer"
        >
          <LogOutIcon />
          サインアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
