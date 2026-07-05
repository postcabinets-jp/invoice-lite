import { z } from 'zod'

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const ClientSchema = z.object({
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
// Invoice
// ---------------------------------------------------------------------------

export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  tax_rate_id: z.string().uuid().nullable().optional(),
  tax_amount: z.coerce.number().min(0).default(0),
  total: z.coerce.number().min(0),
  position: z.coerce.number().int().min(0).default(0),
  time_entry_id: z.string().uuid().nullable().optional(),
})

export const CreateInvoiceSchema = z.object({
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

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial()

export const PaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['stripe', 'bank_transfer', 'cash', 'other']),
  notes: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Expense
// ---------------------------------------------------------------------------

export const ExpenseSchema = z.object({
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
// Organization
// ---------------------------------------------------------------------------

export const OrgUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  logo_url: z.string().url().nullable().optional(),
  currency: z.string().min(1).optional(),
  timezone: z.string().optional(),
  invoice_prefix: z.string().min(1).optional(),
})

export const TaxRateSchema = z.object({
  name: z.string().min(1),
  rate: z.number().min(0).max(100),
  is_default: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------

export const ProjectSchema = z.object({
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
// Report
// ---------------------------------------------------------------------------

export const PeriodSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Time Entry
// ---------------------------------------------------------------------------

export const TimeEntrySchema = z.object({
  project_id: z.string().uuid().nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  started_at: z.string().min(1),
  ended_at: z.string().nullable().optional(),
  hourly_rate: z.coerce.number().min(0).nullable().optional(),
  is_billable: z.coerce.boolean().default(true),
})

export const CSVRowSchema = z.object({
  description: z.string().min(1),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
})
