'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Client, Database } from '@/types/database'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getOrgId(
  supabase: Awaited<ReturnType<typeof createSupabaseClient>>,
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

const ClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().default('US'),
  tax_number: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientWithStats extends Client {
  invoice_count: number
  total_paid: number
  balance_due: number
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getClients(includeArchived = false): Promise<Client[]> {
  const supabase = await createSupabaseClient()
  const orgId = await getOrgId(supabase)

  let query = supabase
    .from('clients')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })

  if (!includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Client[]
}

export async function getClient(id: string): Promise<ClientWithStats> {
  const supabase = await createSupabaseClient()
  const orgId = await getOrgId(supabase)

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (error || !client) throw new Error(error?.message ?? 'Client not found')

  // Aggregate invoice stats
  const { data: invoices, error: invoiceError } = await supabase
    .from('invoices')
    .select('total, amount_paid, amount_due, status')
    .eq('client_id', id)
    .eq('organization_id', orgId)
    .eq('is_estimate', false)

  if (invoiceError) throw new Error(invoiceError.message)

  const invoice_count = invoices?.length ?? 0
  const total_paid = invoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) ?? 0
  const balance_due =
    invoices
      ?.filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
      .reduce((sum, inv) => sum + inv.amount_due, 0) ?? 0

  return { ...(client as Client), invoice_count, total_paid, balance_due }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createClientRecord(formData: FormData): Promise<Client> {
  const supabase = await createSupabaseClient()
  const orgId = await getOrgId(supabase)

  const parsed = ClientSchema.parse({
    name: formData.get('name'),
    email: formData.get('email') || null,
    phone: formData.get('phone') || null,
    company: formData.get('company') || null,
    address: formData.get('address') || null,
    city: formData.get('city') || null,
    country: formData.get('country') ?? 'US',
    tax_number: formData.get('tax_number') || null,
    currency: formData.get('currency') || null,
    notes: formData.get('notes') || null,
  })

  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: orgId,
      name: parsed.name,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      company: parsed.company ?? null,
      address: parsed.address ?? null,
      city: parsed.city ?? null,
      country: parsed.country,
      tax_number: parsed.tax_number ?? null,
      currency: parsed.currency ?? null,
      notes: parsed.notes ?? null,
      is_archived: false,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create client')

  revalidatePath('/clients')
  return data as Client
}

export async function updateClient(id: string, formData: FormData): Promise<Client> {
  const supabase = await createSupabaseClient()
  const orgId = await getOrgId(supabase)

  const parsed = ClientSchema.partial().parse({
    name: formData.get('name') ?? undefined,
    email: formData.has('email') ? formData.get('email') || null : undefined,
    phone: formData.has('phone') ? formData.get('phone') || null : undefined,
    company: formData.has('company') ? formData.get('company') || null : undefined,
    address: formData.has('address') ? formData.get('address') || null : undefined,
    city: formData.has('city') ? formData.get('city') || null : undefined,
    country: formData.get('country') ?? undefined,
    tax_number: formData.has('tax_number') ? formData.get('tax_number') || null : undefined,
    currency: formData.has('currency') ? formData.get('currency') || null : undefined,
    notes: formData.has('notes') ? formData.get('notes') || null : undefined,
  })

  const updatePayload = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Database['public']['Tables']['clients']['Update']

  const { data, error } = await supabase
    .from('clients')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update client')

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return data as Client
}

export async function archiveClient(id: string): Promise<void> {
  const supabase = await createSupabaseClient()
  const orgId = await getOrgId(supabase)

  const { error } = await supabase
    .from('clients')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = await createSupabaseClient()
  const orgId = await getOrgId(supabase)

  // Guard: do not delete if invoices exist
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', id)
    .eq('organization_id', orgId)

  if (countError) throw new Error(countError.message)
  if ((count ?? 0) > 0) {
    throw new Error('Cannot delete a client that has invoices. Archive instead.')
  }

  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/clients')
}
