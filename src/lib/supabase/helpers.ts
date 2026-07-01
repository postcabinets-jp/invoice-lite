import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Get the current user and their organization ID.
 * Redirects to /login if unauthenticated, /register if no org.
 */
export async function getOrgId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const row = data as { organization_id: string } | null
  if (!row?.organization_id) redirect('/register')
  return row.organization_id
}

/**
 * Get the current authenticated user. Redirects to /login if unauthenticated.
 */
export async function getUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}
