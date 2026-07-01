'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { TimeEntry, Database } from '@/types/database'

type TimeEntryInsert = Database['public']['Tables']['time_entries']['Insert']

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getOrgIdAndUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ orgId: string; userId: string }> {
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
  return { orgId: data.organization_id, userId: user.id }
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const TimeEntrySchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  started_at: z.string().min(1),
  ended_at: z.string().nullable().optional(),
  hourly_rate: z.coerce.number().min(0).nullable().optional(),
  is_billable: z.coerce.boolean().default(true),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeEntryWithRelations extends TimeEntry {
  projects: { name: string } | null
  clients: { name: string } | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getTimeEntries(filters?: {
  projectId?: string
  unbilledOnly?: boolean
}): Promise<TimeEntryWithRelations[]> {
  const supabase = await createClient()
  const { orgId } = await getOrgIdAndUser(supabase)

  let query = supabase
    .from('time_entries')
    .select('*, projects(name), clients(name)')
    .eq('organization_id', orgId)
    .order('started_at', { ascending: false })

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.unbilledOnly) {
    query = query.eq('is_invoiced', false).eq('is_billable', true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as TimeEntryWithRelations[]
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createTimeEntry(formData: FormData): Promise<TimeEntry> {
  const supabase = await createClient()
  const { orgId, userId } = await getOrgIdAndUser(supabase)

  const parsed = TimeEntrySchema.parse({
    project_id: formData.get('project_id') || null,
    client_id: formData.get('client_id') || null,
    description: formData.get('description') || null,
    started_at: formData.get('started_at'),
    ended_at: formData.get('ended_at') || null,
    hourly_rate: formData.get('hourly_rate') || null,
    is_billable: formData.get('is_billable') ?? true,
  })

  // Compute duration if both timestamps present
  let duration_minutes: number | null = null
  if (parsed.started_at && parsed.ended_at) {
    const ms = new Date(parsed.ended_at).getTime() - new Date(parsed.started_at).getTime()
    duration_minutes = Math.max(0, Math.round(ms / 60000))
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      organization_id: orgId,
      user_id: userId,
      project_id: parsed.project_id ?? null,
      client_id: parsed.client_id ?? null,
      description: parsed.description ?? null,
      started_at: parsed.started_at,
      ended_at: parsed.ended_at ?? null,
      duration_minutes,
      hourly_rate: parsed.hourly_rate ?? null,
      is_billable: parsed.is_billable,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create time entry')

  revalidatePath('/time')
  return data as TimeEntry
}

export async function updateTimeEntry(id: string, formData: FormData): Promise<TimeEntry> {
  const supabase = await createClient()
  const { orgId } = await getOrgIdAndUser(supabase)

  const parsed = TimeEntrySchema.partial().parse({
    project_id: formData.has('project_id') ? formData.get('project_id') || null : undefined,
    client_id: formData.has('client_id') ? formData.get('client_id') || null : undefined,
    description: formData.has('description') ? formData.get('description') || null : undefined,
    started_at: formData.get('started_at') ?? undefined,
    ended_at: formData.has('ended_at') ? formData.get('ended_at') || null : undefined,
    hourly_rate: formData.has('hourly_rate') ? formData.get('hourly_rate') || null : undefined,
    is_billable: formData.has('is_billable')
      ? formData.get('is_billable') === 'true'
      : undefined,
  })

  // Recalculate duration if timestamps changed
  const updatePayload: Database['public']['Tables']['time_entries']['Update'] = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Database['public']['Tables']['time_entries']['Update']

  if (parsed.started_at !== undefined || parsed.ended_at !== undefined) {
    // Fetch current entry to fill in the missing timestamp
    const { data: current } = await supabase
      .from('time_entries')
      .select('started_at, ended_at')
      .eq('id', id)
      .single()

    const start = parsed.started_at ?? current?.started_at
    const end = parsed.ended_at ?? current?.ended_at

    if (start && end) {
      const ms = new Date(end).getTime() - new Date(start).getTime()
      updatePayload.duration_minutes = Math.max(0, Math.round(ms / 60000))
    } else {
      updatePayload.duration_minutes = null
    }
  }

  const { data, error } = await supabase
    .from('time_entries')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update time entry')

  revalidatePath('/time')
  return data as TimeEntry
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const supabase = await createClient()
  const { orgId } = await getOrgIdAndUser(supabase)

  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/time')
}

export async function startTimer(timerData: {
  projectId?: string
  clientId?: string
  description?: string
}): Promise<TimeEntry> {
  const supabase = await createClient()
  const { orgId, userId } = await getOrgIdAndUser(supabase)

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      organization_id: orgId,
      user_id: userId,
      project_id: timerData.projectId ?? null,
      client_id: timerData.clientId ?? null,
      description: timerData.description ?? null,
      started_at: new Date().toISOString(),
      ended_at: null,
      is_billable: true,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to start timer')

  revalidatePath('/time')
  return data as TimeEntry
}

export async function stopTimer(id: string): Promise<TimeEntry> {
  const supabase = await createClient()
  const { orgId } = await getOrgIdAndUser(supabase)

  // Fetch current entry to compute duration
  const { data: current, error: fetchError } = await supabase
    .from('time_entries')
    .select('started_at')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (fetchError || !current) throw new Error('Time entry not found')

  const endedAt = new Date().toISOString()
  const ms = new Date(endedAt).getTime() - new Date(current.started_at).getTime()
  const duration_minutes = Math.max(0, Math.round(ms / 60000))

  const { data, error } = await supabase
    .from('time_entries')
    .update({ ended_at: endedAt, duration_minutes })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to stop timer')

  revalidatePath('/time')
  return data as TimeEntry
}

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

interface CSVRow {
  description: string
  started_at: string
  ended_at: string
  projectName?: string
  clientName?: string
  hourlyRate?: number
}

export async function importTimeEntriesFromCSV(
  orgId: string,
  rows: CSVRow[],
): Promise<{ inserted: number; skipped: number }> {
  const supabase = await createClient()
  const { orgId: currentOrgId, userId } = await getOrgIdAndUser(supabase)

  // Ensure the caller can only import into their own org
  if (orgId !== currentOrgId) {
    throw new Error('Unauthorized: cannot import into a different organization')
  }

  if (rows.length === 0) return { inserted: 0, skipped: 0 }

  // Resolve project names to IDs (batch fetch)
  const projectNames = [...new Set(rows.map((r) => r.projectName).filter(Boolean))] as string[]
  const clientNames = [...new Set(rows.map((r) => r.clientName).filter(Boolean))] as string[]

  const projectMap = new Map<string, string>()
  const clientMap = new Map<string, string>()

  if (projectNames.length > 0) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('organization_id', orgId)
      .in('name', projectNames)

    projects?.forEach((p) => projectMap.set(p.name, p.id))
  }

  if (clientNames.length > 0) {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('organization_id', orgId)
      .in('name', clientNames)

    clients?.forEach((c) => clientMap.set(c.name, c.id))
  }

  const RowSchema = z.object({
    description: z.string().min(1),
    started_at: z.string().datetime(),
    ended_at: z.string().datetime(),
  })

  let inserted = 0
  let skipped = 0

  const inserts: TimeEntryInsert[] = []

  for (const row of rows) {
    const result = RowSchema.safeParse(row)
    if (!result.success) {
      skipped++
      continue
    }

    const ms = new Date(row.ended_at).getTime() - new Date(row.started_at).getTime()
    if (ms <= 0) {
      skipped++
      continue
    }

    const duration_minutes = Math.round(ms / 60000)
    const project_id = row.projectName ? (projectMap.get(row.projectName) ?? null) : null
    const client_id = row.clientName ? (clientMap.get(row.clientName) ?? null) : null

    inserts.push({
      organization_id: orgId,
      user_id: userId,
      project_id,
      client_id,
      description: row.description,
      started_at: row.started_at,
      ended_at: row.ended_at,
      duration_minutes,
      hourly_rate: row.hourlyRate ?? null,
      is_billable: true,
      is_invoiced: false,
    })
    inserted++
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from('time_entries').insert(inserts)
    if (error) throw new Error(error.message)
  }

  revalidatePath('/time')
  return { inserted, skipped }
}
