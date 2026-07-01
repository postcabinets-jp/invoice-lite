import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { NavSidebar } from '@/components/dashboard/nav-sidebar'
import { UserMenu } from '@/components/dashboard/user-menu'

// Supabase DB type has `Views: Record<string, never>` which causes .from()
// inference to return `never` project-wide. Cast to concrete types as workaround.

interface OrgRow {
  id: string
  name: string
}

interface MemberRow {
  organization_id: string
}

async function getOrCreateOrganization(
  userId: string,
  orgName: string,
): Promise<OrgRow | null> {
  const { createClient: getClient } = await import('@/lib/supabase/server')
  const supabase = await getClient()

  // Check existing org membership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberResult = await (supabase as any)
    .from('org_members')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle() as { data: MemberRow | null; error: unknown }

  const membership = memberResult.data

  if (membership?.organization_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orgResult = await (supabase as any)
      .from('organizations')
      .select('id, name')
      .eq('id', membership.organization_id)
      .single() as { data: OrgRow | null; error: unknown }
    if (orgResult.data) return orgResult.data
  }

  // Build URL-safe slug
  const slug =
    orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || `org-${userId.slice(0, 8)}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const insertOrgResult = await (supabase as any)
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id, name')
    .single() as { data: OrgRow | null; error: { message: string } | null }

  if (insertOrgResult.error || !insertOrgResult.data) {
    return null
  }

  const newOrg = insertOrgResult.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('org_members')
    .insert({
      organization_id: newOrg.id,
      user_id: userId,
      role: 'owner',
      joined_at: new Date().toISOString(),
    })

  return newOrg
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const defaultOrgName =
    (user.user_metadata?.organization_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'My Organization'

  const org = await getOrCreateOrganization(user.id, defaultOrgName)
  const organizationName = org?.name ?? defaultOrgName

  return (
    <SidebarProvider defaultOpen>
      <NavSidebar organizationName={organizationName} />
      <SidebarInset className="flex flex-col min-h-screen bg-zinc-50">
        {/* Top header */}
        <header className="h-14 shrink-0 flex items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="size-7 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md" />
            <Separator orientation="vertical" className="h-4" />
          </div>
          <div className="flex items-center gap-2">
            <UserMenu
              email={user.email ?? ''}
              organizationName={organizationName}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
