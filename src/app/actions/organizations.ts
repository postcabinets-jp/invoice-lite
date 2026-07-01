'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Organization, TaxRate, Database } from '@/types/database'

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

const OrgUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  currency: z.string().min(1).optional(),
  timezone: z.string().optional(),
  invoice_prefix: z.string().min(1).optional(),
})

const TaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  is_default: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getOrganization(): Promise<Organization> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Organization not found')
  return data as Organization
}

export async function getTaxRates(): Promise<TaxRate[]> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { data, error } = await supabase
    .from('tax_rates')
    .select('*')
    .eq('organization_id', orgId)
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as TaxRate[]
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function updateOrganization(formData: FormData): Promise<Organization> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = OrgUpdateSchema.parse({
    name: formData.get('name') ?? undefined,
    slug: formData.get('slug') ?? undefined,
    logo_url: formData.has('logo_url') ? formData.get('logo_url') || null : undefined,
    currency: formData.get('currency') ?? undefined,
    timezone: formData.get('timezone') ?? undefined,
    invoice_prefix: formData.get('invoice_prefix') ?? undefined,
  })

  const updatePayload = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Database['public']['Tables']['organizations']['Update']

  const { data, error } = await supabase
    .from('organizations')
    .update(updatePayload)
    .eq('id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update organization')

  revalidatePath('/settings')
  return data as Organization
}

export async function createOrganizationForUser(
  name: string,
  currency = 'USD',
): Promise<Organization> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Generate a URL-safe slug from the org name
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Ensure slug uniqueness by appending random suffix
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      slug,
      currency,
      invoice_prefix: 'INV',
      next_invoice_number: 1,
    })
    .select()
    .single()

  if (orgError || !org) throw new Error(orgError?.message ?? 'Failed to create organization')

  // Add creator as owner
  const { error: memberError } = await supabase.from('org_members').insert({
    organization_id: org.id,
    user_id: user.id,
    role: 'owner' as const,
    joined_at: new Date().toISOString(),
  })

  if (memberError) throw new Error(memberError.message)

  return org as Organization
}

export async function createTaxRate(taxData: {
  name: string
  rate: number
  is_default?: boolean
}): Promise<TaxRate> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = TaxRateSchema.parse(taxData)

  // If this is being set as default, unset existing defaults first
  if (parsed.is_default) {
    const { error: unsetError } = await supabase
      .from('tax_rates')
      .update({ is_default: false })
      .eq('organization_id', orgId)
      .eq('is_default', true)

    if (unsetError) throw new Error(unsetError.message)
  }

  const { data, error } = await supabase
    .from('tax_rates')
    .insert({
      organization_id: orgId,
      name: parsed.name,
      rate: parsed.rate,
      is_default: parsed.is_default ?? false,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create tax rate')

  revalidatePath('/settings')
  return data as TaxRate
}

export async function updateTaxRate(
  id: string,
  taxData: { name: string; rate: number; is_default?: boolean },
): Promise<TaxRate> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = TaxRateSchema.parse(taxData)

  // If this is being set as default, unset existing defaults first
  if (parsed.is_default) {
    const { error: unsetError } = await supabase
      .from('tax_rates')
      .update({ is_default: false })
      .eq('organization_id', orgId)
      .eq('is_default', true)
      .neq('id', id)

    if (unsetError) throw new Error(unsetError.message)
  }

  const { data, error } = await supabase
    .from('tax_rates')
    .update({
      name: parsed.name,
      rate: parsed.rate,
      is_default: parsed.is_default ?? false,
    })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update tax rate')

  revalidatePath('/settings')
  return data as TaxRate
}

export async function deleteTaxRate(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { error } = await supabase
    .from('tax_rates')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}
