'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Project, Client, Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!data) redirect('/register')
  return data.organization_id
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const ProjectSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  hourly_rate: z.coerce.number().min(0).nullable().optional(),
  budget_hours: z.coerce.number().min(0).nullable().optional(),
  budget_amount: z.coerce.number().min(0).nullable().optional(),
  due_date: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectWithClient extends Project {
  clients: Pick<Client, 'name' | 'email' | 'company'> | null
}

export interface ProjectWithStats extends ProjectWithClient {
  total_hours: number
  billable_amount: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getProjects(status?: string): Promise<ProjectWithClient[]> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  let query = supabase
    .from('projects')
    .select('*, clients(name, email, company)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status as Database['public']['Tables']['projects']['Row']['status'])
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as ProjectWithClient[]
}

export async function getProject(id: string): Promise<ProjectWithStats> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { data: project, error } = await supabase
    .from('projects')
    .select('*, clients(name, email, company)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (error || !project) throw new Error(error?.message ?? 'Project not found')

  // Aggregate time entry stats
  const { data: timeEntries, error: timeError } = await supabase
    .from('time_entries')
    .select('duration_minutes, hourly_rate, is_billable')
    .eq('project_id', id)
    .eq('organization_id', orgId)
    .not('ended_at', 'is', null)

  if (timeError) throw new Error(timeError.message)

  const total_hours =
    (timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes ?? 0), 0) ?? 0) / 60

  const billable_amount =
    timeEntries
      ?.filter((e) => e.is_billable)
      .reduce((sum, entry) => {
        const hours = (entry.duration_minutes ?? 0) / 60
        const rate = entry.hourly_rate ?? (project as ProjectWithClient).hourly_rate ?? 0
        return sum + hours * rate
      }, 0) ?? 0

  return { ...(project as ProjectWithClient), total_hours, billable_amount }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData): Promise<Project> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = ProjectSchema.parse({
    client_id: formData.get('client_id') || null,
    name: formData.get('name'),
    description: formData.get('description') || null,
    status: formData.get('status') ?? 'active',
    hourly_rate: formData.get('hourly_rate') || null,
    budget_hours: formData.get('budget_hours') || null,
    budget_amount: formData.get('budget_amount') || null,
    due_date: formData.get('due_date') || null,
  })

  const { data, error } = await supabase
    .from('projects')
    .insert({
      organization_id: orgId,
      client_id: parsed.client_id ?? null,
      name: parsed.name,
      description: parsed.description ?? null,
      status: parsed.status,
      hourly_rate: parsed.hourly_rate ?? null,
      budget_hours: parsed.budget_hours ?? null,
      budget_amount: parsed.budget_amount ?? null,
      due_date: parsed.due_date ?? null,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create project')

  revalidatePath('/projects')
  return data as Project
}

export async function updateProject(id: string, formData: FormData): Promise<Project> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = ProjectSchema.partial().parse({
    client_id: formData.has('client_id') ? formData.get('client_id') || null : undefined,
    name: formData.get('name') ?? undefined,
    description: formData.has('description') ? formData.get('description') || null : undefined,
    status: formData.get('status') ?? undefined,
    hourly_rate: formData.has('hourly_rate') ? formData.get('hourly_rate') || null : undefined,
    budget_hours: formData.has('budget_hours') ? formData.get('budget_hours') || null : undefined,
    budget_amount: formData.has('budget_amount')
      ? formData.get('budget_amount') || null
      : undefined,
    due_date: formData.has('due_date') ? formData.get('due_date') || null : undefined,
  })

  const updatePayload = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Database['public']['Tables']['projects']['Update']

  const { data, error } = await supabase
    .from('projects')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update project')

  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  return data as Project
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/projects')
}
