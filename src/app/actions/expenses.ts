'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Expense, Database } from '@/types/database'

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

const ExpenseSchema = z.object({
  client_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  category: z.string().min(1),
  vendor: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().default('USD'),
  receipt_url: z.string().url().nullable().optional(),
  is_billable: z.coerce.boolean().default(false),
  expense_date: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExpenseWithRelations extends Expense {
  projects: { name: string } | null
  clients: { name: string } | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getExpenses(filters?: {
  projectId?: string
  clientId?: string
  unbilledOnly?: boolean
}): Promise<ExpenseWithRelations[]> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  let query = supabase
    .from('expenses')
    .select('*, projects(name), clients(name)')
    .eq('organization_id', orgId)
    .order('expense_date', { ascending: false })

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId)
  }

  if (filters?.unbilledOnly) {
    query = query.eq('is_invoiced', false).eq('is_billable', true)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as ExpenseWithRelations[]
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createExpense(formData: FormData): Promise<Expense> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = ExpenseSchema.parse({
    client_id: formData.get('client_id') || null,
    project_id: formData.get('project_id') || null,
    category: formData.get('category'),
    vendor: formData.get('vendor') || null,
    description: formData.get('description') || null,
    amount: formData.get('amount'),
    currency: formData.get('currency') ?? 'USD',
    receipt_url: formData.get('receipt_url') || null,
    is_billable: formData.get('is_billable') === 'true',
    expense_date: formData.get('expense_date'),
  })

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      organization_id: orgId,
      client_id: parsed.client_id ?? null,
      project_id: parsed.project_id ?? null,
      category: parsed.category,
      vendor: parsed.vendor ?? null,
      description: parsed.description ?? null,
      amount: parsed.amount,
      currency: parsed.currency,
      receipt_url: parsed.receipt_url ?? null,
      is_billable: parsed.is_billable,
      is_invoiced: false,
      expense_date: parsed.expense_date,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to create expense')

  revalidatePath('/expenses')
  return data as Expense
}

export async function updateExpense(id: string, formData: FormData): Promise<Expense> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const parsed = ExpenseSchema.partial().parse({
    client_id: formData.has('client_id') ? formData.get('client_id') || null : undefined,
    project_id: formData.has('project_id') ? formData.get('project_id') || null : undefined,
    category: formData.get('category') ?? undefined,
    vendor: formData.has('vendor') ? formData.get('vendor') || null : undefined,
    description: formData.has('description') ? formData.get('description') || null : undefined,
    amount: formData.get('amount') ?? undefined,
    currency: formData.get('currency') ?? undefined,
    receipt_url: formData.has('receipt_url') ? formData.get('receipt_url') || null : undefined,
    is_billable: formData.has('is_billable')
      ? formData.get('is_billable') === 'true'
      : undefined,
    expense_date: formData.get('expense_date') ?? undefined,
  })

  const updatePayload = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined),
  ) as Database['public']['Tables']['expenses']['Update']

  const { data, error } = await supabase
    .from('expenses')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to update expense')

  revalidatePath('/expenses')
  revalidatePath(`/expenses/${id}`)
  return data as Expense
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/expenses')
}
