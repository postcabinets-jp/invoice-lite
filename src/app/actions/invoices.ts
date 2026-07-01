'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  Invoice,
  InvoiceItem,
  InvoiceWithClient,
  InvoiceWithItems,
  Client,
  Organization,
  Database,
} from '@/types/database'

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

const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  tax_rate_id: z.string().uuid().nullable().optional(),
  tax_amount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  position: z.coerce.number().int().min(0).default(0),
  time_entry_id: z.string().uuid().nullable().optional(),
})

const CreateInvoiceSchema = z.object({
  client_id: z.string().uuid(),
  status: z
    .enum(['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled'])
    .default('draft'),
  issue_date: z.string().min(1),
  due_date: z.string().nullable().optional(),
  currency: z.string().min(1).default('USD'),
  subtotal: z.coerce.number().min(0).default(0),
  tax_total: z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0).default(0),
  notes: z.string().nullable().optional(),
  footer: z.string().nullable().optional(),
  is_estimate: z.coerce.boolean().default(false),
  items: z.array(InvoiceItemSchema).default([]),
})

const UpdateInvoiceSchema = CreateInvoiceSchema.partial()

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getInvoices(filters?: {
  status?: string
  search?: string
  is_estimate?: boolean
}): Promise<InvoiceWithClient[]> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  let query = supabase
    .from('invoices')
    .select('*, clients(name, email, company)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status as Database['public']['Tables']['invoices']['Row']['status'])
  }

  if (filters?.is_estimate !== undefined) {
    query = query.eq('is_estimate', filters.is_estimate)
  }

  if (filters?.search) {
    query = query.ilike('number', `%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as InvoiceWithClient[]
}

export async function getInvoice(id: string): Promise<InvoiceWithItems> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), clients(*)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (error) throw new Error(error.message)
  return data as InvoiceWithItems
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createInvoice(formData: FormData): Promise<Invoice> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  // Parse items from JSON string in form data
  const rawItems = formData.get('items')
  const itemsArray = rawItems ? JSON.parse(rawItems as string) : []

  const parsed = CreateInvoiceSchema.parse({
    client_id: formData.get('client_id'),
    status: formData.get('status') ?? 'draft',
    issue_date: formData.get('issue_date'),
    due_date: formData.get('due_date') || null,
    currency: formData.get('currency') ?? 'USD',
    subtotal: formData.get('subtotal'),
    tax_total: formData.get('tax_total'),
    discount_amount: formData.get('discount_amount'),
    total: formData.get('total'),
    notes: formData.get('notes') || null,
    footer: formData.get('footer') || null,
    is_estimate: formData.get('is_estimate') === 'true',
    items: itemsArray,
  })

  // Fetch org to get invoice prefix and next number
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('invoice_prefix, next_invoice_number')
    .eq('id', orgId)
    .single()

  if (orgError || !org) throw new Error('Organization not found')

  const invoiceNumber = `${org.invoice_prefix}-${String(org.next_invoice_number).padStart(4, '0')}`

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      organization_id: orgId,
      client_id: parsed.client_id,
      number: invoiceNumber,
      status: parsed.status,
      issue_date: parsed.issue_date,
      due_date: parsed.due_date ?? null,
      currency: parsed.currency,
      subtotal: parsed.subtotal,
      tax_total: parsed.tax_total,
      discount_amount: parsed.discount_amount,
      total: parsed.total,
      amount_paid: 0,
      notes: parsed.notes ?? null,
      footer: parsed.footer ?? null,
      is_estimate: parsed.is_estimate,
    })
    .select()
    .single()

  if (invoiceError || !invoice) throw new Error(invoiceError?.message ?? 'Failed to create invoice')

  // Insert items
  if (parsed.items.length > 0) {
    const itemInserts = parsed.items.map((item, idx) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate_id: item.tax_rate_id ?? null,
      tax_amount: item.tax_amount,
      total: item.total,
      position: item.position ?? idx,
      time_entry_id: item.time_entry_id ?? null,
    }))

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemInserts)
    if (itemsError) throw new Error(itemsError.message)
  }

  // Increment next_invoice_number
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ next_invoice_number: org.next_invoice_number + 1 })
    .eq('id', orgId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/invoices')
  return invoice as Invoice
}

export async function updateInvoice(id: string, formData: FormData): Promise<Invoice> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const rawItems = formData.get('items')
  const itemsArray = rawItems ? JSON.parse(rawItems as string) : undefined

  const parsed = UpdateInvoiceSchema.parse({
    client_id: formData.get('client_id') ?? undefined,
    status: formData.get('status') ?? undefined,
    issue_date: formData.get('issue_date') ?? undefined,
    due_date: formData.get('due_date') !== null ? formData.get('due_date') || null : undefined,
    currency: formData.get('currency') ?? undefined,
    subtotal: formData.get('subtotal') ?? undefined,
    tax_total: formData.get('tax_total') ?? undefined,
    discount_amount: formData.get('discount_amount') ?? undefined,
    total: formData.get('total') ?? undefined,
    notes: formData.has('notes') ? formData.get('notes') || null : undefined,
    footer: formData.has('footer') ? formData.get('footer') || null : undefined,
    is_estimate: formData.has('is_estimate')
      ? formData.get('is_estimate') === 'true'
      : undefined,
    items: itemsArray,
  })

  const { items, ...invoiceFields } = parsed

  // Remove undefined keys before update
  const updatePayload = Object.fromEntries(
    Object.entries(invoiceFields).filter(([, v]) => v !== undefined),
  ) as Database['public']['Tables']['invoices']['Update']

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update(updatePayload)
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !invoice) throw new Error(error?.message ?? 'Failed to update invoice')

  // Replace items if provided
  if (items !== undefined) {
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id)

    if (deleteError) throw new Error(deleteError.message)

    if (items.length > 0) {
      const itemInserts = items.map((item, idx) => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate_id: item.tax_rate_id ?? null,
        tax_amount: item.tax_amount,
        total: item.total,
        position: item.position ?? idx,
        time_entry_id: item.time_entry_id ?? null,
      }))

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemInserts)
      if (itemsError) throw new Error(itemsError.message)
    }
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return invoice as Invoice
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) throw new Error(error.message)

  revalidatePath('/invoices')
}

export async function sendInvoice(id: string): Promise<Invoice> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', orgId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to send invoice')

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${id}`)
  return data as Invoice
}

export async function recordPayment(
  invoiceId: string,
  paymentData: { amount: number; method: string; notes?: string },
): Promise<void> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  const PaymentSchema = z.object({
    amount: z.number().positive(),
    method: z.enum(['stripe', 'bank_transfer', 'cash', 'other']),
    notes: z.string().optional(),
  })

  const parsed = PaymentSchema.parse(paymentData)

  // Fetch current invoice state
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('total, amount_paid, currency')
    .eq('id', invoiceId)
    .eq('organization_id', orgId)
    .single()

  if (fetchError || !invoice) throw new Error('Invoice not found')

  // Insert payment record
  const { error: paymentError } = await supabase.from('payments').insert({
    organization_id: orgId,
    invoice_id: invoiceId,
    amount: parsed.amount,
    currency: invoice.currency,
    method: parsed.method,
    notes: parsed.notes ?? null,
    paid_at: new Date().toISOString(),
  })

  if (paymentError) throw new Error(paymentError.message)

  const newAmountPaid = invoice.amount_paid + parsed.amount
  const isFullyPaid = newAmountPaid >= invoice.total
  const newStatus = isFullyPaid ? 'paid' : 'partial'
  const paidAt = isFullyPaid ? new Date().toISOString() : null

  const updateFields: Database['public']['Tables']['invoices']['Update'] = {
    amount_paid: newAmountPaid,
    status: newStatus as Database['public']['Tables']['invoices']['Row']['status'],
    paid_at: paidAt,
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update(updateFields)
    .eq('id', invoiceId)
    .eq('organization_id', orgId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
}

export async function convertEstimateToInvoice(id: string): Promise<Invoice> {
  const supabase = await createClient()
  const orgId = await getOrgId(supabase)

  // Fetch the estimate with its items
  const { data: estimate, error: fetchError } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .eq('is_estimate', true)
    .single()

  if (fetchError || !estimate) throw new Error('Estimate not found')

  // Fetch org for next invoice number
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('invoice_prefix, next_invoice_number')
    .eq('id', orgId)
    .single()

  if (orgError || !org) throw new Error('Organization not found')

  const invoiceNumber = `${org.invoice_prefix}-${String(org.next_invoice_number).padStart(4, '0')}`

  const { data: newInvoice, error: createError } = await supabase
    .from('invoices')
    .insert({
      organization_id: orgId,
      client_id: estimate.client_id,
      number: invoiceNumber,
      status: 'draft' as const,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: estimate.due_date,
      currency: estimate.currency,
      subtotal: estimate.subtotal,
      tax_total: estimate.tax_total,
      discount_amount: estimate.discount_amount,
      total: estimate.total,
      amount_paid: 0,
      notes: estimate.notes,
      footer: estimate.footer,
      is_estimate: false,
    })
    .select()
    .single()

  if (createError || !newInvoice) throw new Error(createError?.message ?? 'Failed to create invoice')

  // Clone items
  const items = (estimate as InvoiceWithItems).invoice_items ?? []
  if (items.length > 0) {
    const itemInserts = items.map((item: InvoiceItem) => ({
      invoice_id: newInvoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate_id: item.tax_rate_id,
      tax_amount: item.tax_amount,
      total: item.total,
      position: item.position,
    }))

    const { error: itemsError } = await supabase.from('invoice_items').insert(itemInserts)
    if (itemsError) throw new Error(itemsError.message)
  }

  // Increment next_invoice_number
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ next_invoice_number: org.next_invoice_number + 1 })
    .eq('id', orgId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/invoices')
  return newInvoice as Invoice
}
