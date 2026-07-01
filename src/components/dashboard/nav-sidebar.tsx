'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3Icon,
  BriefcaseIcon,
  ClockIcon,
  FileCheckIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  RefreshCwIcon,
  SettingsIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboardIcon },
  { label: '請求書', href: '/invoices', icon: FileTextIcon },
  { label: '見積書', href: '/estimates', icon: FileCheckIcon },
  { label: 'クライアント', href: '/clients', icon: UsersIcon },
  { label: 'プロジェクト', href: '/projects', icon: BriefcaseIcon },
  { label: '時間管理', href: '/time', icon: ClockIcon },
  { label: '経費', href: '/expenses', icon: ReceiptIcon },
  { label: '定期請求', href: '/recurring', icon: RefreshCwIcon },
  { label: 'レポート', href: '/reports', icon: BarChart3Icon },
] as const

const bottomItems = [
  { label: '設定', href: '/settings', icon: SettingsIcon },
] as const

interface NavSidebarProps {
  organizationName: string
}

export function NavSidebar({ organizationName }: NavSidebarProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-zinc-200 bg-white">
      <SidebarHeader className="h-14 border-b border-zinc-100 flex items-center px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 shrink-0 group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex items-center justify-center size-7 rounded-md bg-zinc-900 shrink-0">
            <ZapIcon className="size-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm text-zinc-900 tracking-tight group-data-[collapsible=icon]:hidden truncate max-w-[130px]">
            invoice-lite
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-2 w-full h-8 rounded-md px-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-zinc-100 text-zinc-900'
                              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                          )}
                        >
                          <Icon
                            className={cn(
                              'size-4 shrink-0',
                              active ? 'text-zinc-900' : 'text-zinc-400',
                            )}
                          />
                          <span>{item.label}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-zinc-100 py-2">
        <SidebarMenu>
          {bottomItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  render={
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 w-full h-8 rounded-md px-2 text-sm font-medium transition-colors',
                        active
                          ? 'bg-zinc-100 text-zinc-900'
                          : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700',
                      )}
                    >
                      <Icon
                        className={cn(
                          'size-4 shrink-0',
                          active ? 'text-zinc-900' : 'text-zinc-400',
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        <div className="px-2 py-1 group-data-[collapsible=icon]:hidden">
          <p className="text-[11px] text-zinc-400 truncate">{organizationName}</p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
