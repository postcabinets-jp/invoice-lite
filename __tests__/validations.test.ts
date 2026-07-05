import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import {
  ClientSchema,
  InvoiceItemSchema,
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  PaymentSchema,
  ExpenseSchema,
  OrgUpdateSchema,
  TaxRateSchema,
  ProjectSchema,
  PeriodSchema,
  TimeEntrySchema,
  CSVRowSchema,
} from '@/lib/validations'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = () => 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

function expectZodError(fn: () => unknown) {
  expect(fn).toThrow(ZodError)
}

// ===========================================================================
// ClientSchema
// ===========================================================================

describe('ClientSchema', () => {
  it('accepts a minimal valid client (name only)', () => {
    const result = ClientSchema.parse({ name: 'Acme Corp' })
    expect(result.name).toBe('Acme Corp')
    expect(result.country).toBe('US') // default
  })

  it('accepts a fully populated client', () => {
    const result = ClientSchema.parse({
      name: 'Acme Corp',
      email: 'billing@acme.com',
      phone: '+1-555-0100',
      company: 'Acme Inc.',
      address: '123 Main St',
      city: 'New York',
      country: 'CA',
      tax_number: 'CA123456',
      currency: 'CAD',
      notes: 'VIP client',
    })
    expect(result.country).toBe('CA')
    expect(result.email).toBe('billing@acme.com')
  })

  it('accepts null for optional nullable fields', () => {
    const result = ClientSchema.parse({
      name: 'Test',
      email: null,
      phone: null,
      company: null,
    })
    expect(result.email).toBeNull()
    expect(result.phone).toBeNull()
  })

  it('rejects empty name', () => {
    expectZodError(() => ClientSchema.parse({ name: '' }))
  })

  it('rejects invalid email', () => {
    expectZodError(() =>
      ClientSchema.parse({ name: 'Test', email: 'not-an-email' }),
    )
  })

  it('rejects missing name', () => {
    expectZodError(() => ClientSchema.parse({}))
  })
})

// ===========================================================================
// InvoiceItemSchema
// ===========================================================================

describe('InvoiceItemSchema', () => {
  it('accepts a valid invoice item', () => {
    const result = InvoiceItemSchema.parse({
      description: 'Web Development',
      quantity: 10,
      unit_price: 150,
      total: 1500,
    })
    expect(result.description).toBe('Web Development')
    expect(result.quantity).toBe(10)
    expect(result.tax_amount).toBe(0) // default
    expect(result.position).toBe(0) // default
  })

  it('coerces string numbers', () => {
    const result = InvoiceItemSchema.parse({
      description: 'Design',
      quantity: '5',
      unit_price: '200',
      total: '1000',
    })
    expect(result.quantity).toBe(5)
    expect(result.unit_price).toBe(200)
    expect(result.total).toBe(1000)
  })

  it('accepts optional uuid fields', () => {
    const result = InvoiceItemSchema.parse({
      description: 'Item',
      quantity: 1,
      unit_price: 100,
      total: 100,
      tax_rate_id: uuid(),
      time_entry_id: uuid(),
    })
    expect(result.tax_rate_id).toBe(uuid())
    expect(result.time_entry_id).toBe(uuid())
  })

  it('accepts null for tax_rate_id and time_entry_id', () => {
    const result = InvoiceItemSchema.parse({
      description: 'Item',
      quantity: 1,
      unit_price: 100,
      total: 100,
      tax_rate_id: null,
      time_entry_id: null,
    })
    expect(result.tax_rate_id).toBeNull()
  })

  it('rejects empty description', () => {
    expectZodError(() =>
      InvoiceItemSchema.parse({
        description: '',
        quantity: 1,
        unit_price: 100,
        total: 100,
      }),
    )
  })

  it('rejects zero quantity', () => {
    expectZodError(() =>
      InvoiceItemSchema.parse({
        description: 'Item',
        quantity: 0,
        unit_price: 100,
        total: 0,
      }),
    )
  })

  it('rejects negative quantity', () => {
    expectZodError(() =>
      InvoiceItemSchema.parse({
        description: 'Item',
        quantity: -1,
        unit_price: 100,
        total: -100,
      }),
    )
  })

  it('rejects negative unit_price', () => {
    expectZodError(() =>
      InvoiceItemSchema.parse({
        description: 'Item',
        quantity: 1,
        unit_price: -50,
        total: 100,
      }),
    )
  })

  it('rejects invalid uuid for tax_rate_id', () => {
    expectZodError(() =>
      InvoiceItemSchema.parse({
        description: 'Item',
        quantity: 1,
        unit_price: 100,
        total: 100,
        tax_rate_id: 'not-a-uuid',
      }),
    )
  })
})

// ===========================================================================
// CreateInvoiceSchema
// ===========================================================================

describe('CreateInvoiceSchema', () => {
  const validInvoice = {
    client_id: uuid(),
    issue_date: '2025-01-15',
  }

  it('accepts minimal valid invoice', () => {
    const result = CreateInvoiceSchema.parse(validInvoice)
    expect(result.client_id).toBe(uuid())
    expect(result.status).toBe('draft') // default
    expect(result.currency).toBe('USD') // default
    expect(result.items).toEqual([]) // default
    expect(result.is_estimate).toBe(false) // default
  })

  it('accepts all valid statuses', () => {
    const statuses = ['draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled'] as const
    for (const status of statuses) {
      const result = CreateInvoiceSchema.parse({ ...validInvoice, status })
      expect(result.status).toBe(status)
    }
  })

  it('rejects invalid status', () => {
    expectZodError(() =>
      CreateInvoiceSchema.parse({ ...validInvoice, status: 'pending' }),
    )
  })

  it('accepts invoice with items', () => {
    const result = CreateInvoiceSchema.parse({
      ...validInvoice,
      items: [
        { description: 'Service A', quantity: 2, unit_price: 100, total: 200 },
        { description: 'Service B', quantity: 1, unit_price: 50, total: 50 },
      ],
    })
    expect(result.items).toHaveLength(2)
    expect(result.items[0].description).toBe('Service A')
  })

  it('rejects non-uuid client_id', () => {
    expectZodError(() =>
      CreateInvoiceSchema.parse({
        client_id: 'abc',
        issue_date: '2025-01-15',
      }),
    )
  })

  it('rejects empty issue_date', () => {
    expectZodError(() =>
      CreateInvoiceSchema.parse({
        client_id: uuid(),
        issue_date: '',
      }),
    )
  })

  it('coerces numeric string fields', () => {
    const result = CreateInvoiceSchema.parse({
      ...validInvoice,
      subtotal: '500',
      tax_total: '50',
      discount_amount: '25',
      total: '525',
    })
    expect(result.subtotal).toBe(500)
    expect(result.tax_total).toBe(50)
    expect(result.discount_amount).toBe(25)
    expect(result.total).toBe(525)
  })

  it('accepts null for due_date and notes', () => {
    const result = CreateInvoiceSchema.parse({
      ...validInvoice,
      due_date: null,
      notes: null,
      footer: null,
    })
    expect(result.due_date).toBeNull()
    expect(result.notes).toBeNull()
  })
})

// ===========================================================================
// UpdateInvoiceSchema
// ===========================================================================

describe('UpdateInvoiceSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = UpdateInvoiceSchema.parse({})
    expect(result).toBeDefined()
  })

  it('accepts partial update with only status', () => {
    const result = UpdateInvoiceSchema.parse({ status: 'sent' })
    expect(result.status).toBe('sent')
    expect(result.client_id).toBeUndefined()
  })

  it('accepts partial update with items', () => {
    const result = UpdateInvoiceSchema.parse({
      items: [{ description: 'Updated', quantity: 3, unit_price: 75, total: 225 }],
    })
    expect(result.items).toHaveLength(1)
  })
})

// ===========================================================================
// PaymentSchema
// ===========================================================================

describe('PaymentSchema', () => {
  it('accepts valid payment', () => {
    const result = PaymentSchema.parse({
      amount: 500,
      method: 'stripe',
    })
    expect(result.amount).toBe(500)
    expect(result.method).toBe('stripe')
  })

  it('accepts all valid payment methods', () => {
    const methods = ['stripe', 'bank_transfer', 'cash', 'other'] as const
    for (const method of methods) {
      const result = PaymentSchema.parse({ amount: 100, method })
      expect(result.method).toBe(method)
    }
  })

  it('accepts optional notes', () => {
    const result = PaymentSchema.parse({
      amount: 100,
      method: 'cash',
      notes: 'Paid in full',
    })
    expect(result.notes).toBe('Paid in full')
  })

  it('rejects zero amount', () => {
    expectZodError(() =>
      PaymentSchema.parse({ amount: 0, method: 'cash' }),
    )
  })

  it('rejects negative amount', () => {
    expectZodError(() =>
      PaymentSchema.parse({ amount: -100, method: 'cash' }),
    )
  })

  it('rejects invalid payment method', () => {
    expectZodError(() =>
      PaymentSchema.parse({ amount: 100, method: 'bitcoin' }),
    )
  })

  it('rejects missing amount', () => {
    expectZodError(() =>
      PaymentSchema.parse({ method: 'cash' }),
    )
  })

  it('rejects missing method', () => {
    expectZodError(() =>
      PaymentSchema.parse({ amount: 100 }),
    )
  })
})

// ===========================================================================
// ExpenseSchema
// ===========================================================================

describe('ExpenseSchema', () => {
  const validExpense = {
    category: 'Software',
    amount: 49.99,
    expense_date: '2025-03-10',
  }

  it('accepts minimal valid expense', () => {
    const result = ExpenseSchema.parse(validExpense)
    expect(result.category).toBe('Software')
    expect(result.amount).toBe(49.99)
    expect(result.currency).toBe('USD') // default
    expect(result.is_billable).toBe(false) // default
  })

  it('accepts fully populated expense', () => {
    const result = ExpenseSchema.parse({
      ...validExpense,
      client_id: uuid(),
      project_id: uuid(),
      vendor: 'Adobe',
      description: 'Creative Cloud subscription',
      currency: 'EUR',
      receipt_url: 'https://example.com/receipt.pdf',
      is_billable: true,
    })
    expect(result.vendor).toBe('Adobe')
    expect(result.receipt_url).toBe('https://example.com/receipt.pdf')
    expect(result.is_billable).toBe(true)
  })

  it('coerces string amount', () => {
    const result = ExpenseSchema.parse({ ...validExpense, amount: '99.50' })
    expect(result.amount).toBe(99.5)
  })

  it('rejects empty category', () => {
    expectZodError(() =>
      ExpenseSchema.parse({ ...validExpense, category: '' }),
    )
  })

  it('rejects zero amount', () => {
    expectZodError(() =>
      ExpenseSchema.parse({ ...validExpense, amount: 0 }),
    )
  })

  it('rejects negative amount', () => {
    expectZodError(() =>
      ExpenseSchema.parse({ ...validExpense, amount: -10 }),
    )
  })

  it('rejects empty expense_date', () => {
    expectZodError(() =>
      ExpenseSchema.parse({ category: 'Office', amount: 100, expense_date: '' }),
    )
  })

  it('rejects invalid receipt_url', () => {
    expectZodError(() =>
      ExpenseSchema.parse({ ...validExpense, receipt_url: 'not-a-url' }),
    )
  })

  it('accepts null for optional nullable fields', () => {
    const result = ExpenseSchema.parse({
      ...validExpense,
      client_id: null,
      project_id: null,
      vendor: null,
      description: null,
      receipt_url: null,
    })
    expect(result.client_id).toBeNull()
    expect(result.vendor).toBeNull()
  })
})

// ===========================================================================
// OrgUpdateSchema
// ===========================================================================

describe('OrgUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = OrgUpdateSchema.parse({})
    expect(result).toBeDefined()
  })

  it('accepts partial update', () => {
    const result = OrgUpdateSchema.parse({
      name: 'My Company',
      currency: 'EUR',
    })
    expect(result.name).toBe('My Company')
    expect(result.currency).toBe('EUR')
  })

  it('accepts valid logo_url', () => {
    const result = OrgUpdateSchema.parse({
      logo_url: 'https://example.com/logo.png',
    })
    expect(result.logo_url).toBe('https://example.com/logo.png')
  })

  it('accepts null for logo_url', () => {
    const result = OrgUpdateSchema.parse({ logo_url: null })
    expect(result.logo_url).toBeNull()
  })

  it('rejects invalid logo_url', () => {
    expectZodError(() =>
      OrgUpdateSchema.parse({ logo_url: 'not-a-url' }),
    )
  })

  it('rejects empty name', () => {
    expectZodError(() => OrgUpdateSchema.parse({ name: '' }))
  })

  it('rejects empty slug', () => {
    expectZodError(() => OrgUpdateSchema.parse({ slug: '' }))
  })

  it('rejects empty currency', () => {
    expectZodError(() => OrgUpdateSchema.parse({ currency: '' }))
  })

  it('rejects empty invoice_prefix', () => {
    expectZodError(() => OrgUpdateSchema.parse({ invoice_prefix: '' }))
  })
})

// ===========================================================================
// TaxRateSchema
// ===========================================================================

describe('TaxRateSchema', () => {
  it('accepts valid tax rate', () => {
    const result = TaxRateSchema.parse({ name: 'VAT', rate: 20 })
    expect(result.name).toBe('VAT')
    expect(result.rate).toBe(20)
  })

  it('accepts zero rate', () => {
    const result = TaxRateSchema.parse({ name: 'Exempt', rate: 0 })
    expect(result.rate).toBe(0)
  })

  it('accepts max rate of 100', () => {
    const result = TaxRateSchema.parse({ name: 'Full', rate: 100 })
    expect(result.rate).toBe(100)
  })

  it('accepts optional is_default', () => {
    const result = TaxRateSchema.parse({
      name: 'GST',
      rate: 10,
      is_default: true,
    })
    expect(result.is_default).toBe(true)
  })

  it('rejects empty name', () => {
    expectZodError(() => TaxRateSchema.parse({ name: '', rate: 10 }))
  })

  it('rejects negative rate', () => {
    expectZodError(() => TaxRateSchema.parse({ name: 'Bad', rate: -1 }))
  })

  it('rejects rate above 100', () => {
    expectZodError(() => TaxRateSchema.parse({ name: 'Bad', rate: 101 }))
  })

  it('rejects missing name', () => {
    expectZodError(() => TaxRateSchema.parse({ rate: 10 }))
  })

  it('rejects missing rate', () => {
    expectZodError(() => TaxRateSchema.parse({ name: 'VAT' }))
  })
})

// ===========================================================================
// ProjectSchema
// ===========================================================================

describe('ProjectSchema', () => {
  it('accepts minimal valid project', () => {
    const result = ProjectSchema.parse({ name: 'Website Redesign' })
    expect(result.name).toBe('Website Redesign')
    expect(result.status).toBe('active') // default
  })

  it('accepts fully populated project', () => {
    const result = ProjectSchema.parse({
      client_id: uuid(),
      name: 'Mobile App',
      description: 'iOS and Android app',
      status: 'completed',
      hourly_rate: 150,
      budget_hours: 200,
      budget_amount: 30000,
      due_date: '2025-12-31',
    })
    expect(result.status).toBe('completed')
    expect(result.hourly_rate).toBe(150)
    expect(result.budget_amount).toBe(30000)
  })

  it('accepts all valid statuses', () => {
    const statuses = ['active', 'completed', 'archived'] as const
    for (const status of statuses) {
      const result = ProjectSchema.parse({ name: 'Test', status })
      expect(result.status).toBe(status)
    }
  })

  it('coerces string budget values', () => {
    const result = ProjectSchema.parse({
      name: 'Test',
      hourly_rate: '100',
      budget_hours: '80',
      budget_amount: '8000',
    })
    expect(result.hourly_rate).toBe(100)
    expect(result.budget_hours).toBe(80)
    expect(result.budget_amount).toBe(8000)
  })

  it('accepts null for optional nullable fields', () => {
    const result = ProjectSchema.parse({
      name: 'Test',
      client_id: null,
      description: null,
      hourly_rate: null,
      budget_hours: null,
      budget_amount: null,
      due_date: null,
    })
    expect(result.client_id).toBeNull()
    expect(result.due_date).toBeNull()
  })

  it('rejects empty name', () => {
    expectZodError(() => ProjectSchema.parse({ name: '' }))
  })

  it('rejects invalid status', () => {
    expectZodError(() =>
      ProjectSchema.parse({ name: 'Test', status: 'paused' }),
    )
  })

  it('rejects negative hourly_rate', () => {
    expectZodError(() =>
      ProjectSchema.parse({ name: 'Test', hourly_rate: -50 }),
    )
  })

  it('rejects negative budget_hours', () => {
    expectZodError(() =>
      ProjectSchema.parse({ name: 'Test', budget_hours: -10 }),
    )
  })

  it('rejects invalid client_id uuid', () => {
    expectZodError(() =>
      ProjectSchema.parse({ name: 'Test', client_id: 'xyz' }),
    )
  })
})

// ===========================================================================
// PeriodSchema
// ===========================================================================

describe('PeriodSchema', () => {
  it('accepts valid period', () => {
    const result = PeriodSchema.parse({
      from: '2025-01-01',
      to: '2025-12-31',
    })
    expect(result.from).toBe('2025-01-01')
    expect(result.to).toBe('2025-12-31')
  })

  it('rejects empty from', () => {
    expectZodError(() => PeriodSchema.parse({ from: '', to: '2025-12-31' }))
  })

  it('rejects empty to', () => {
    expectZodError(() => PeriodSchema.parse({ from: '2025-01-01', to: '' }))
  })

  it('rejects missing from', () => {
    expectZodError(() => PeriodSchema.parse({ to: '2025-12-31' }))
  })

  it('rejects missing to', () => {
    expectZodError(() => PeriodSchema.parse({ from: '2025-01-01' }))
  })
})

// ===========================================================================
// TimeEntrySchema
// ===========================================================================

describe('TimeEntrySchema', () => {
  it('accepts minimal valid time entry', () => {
    const result = TimeEntrySchema.parse({
      started_at: '2025-03-10T09:00:00Z',
    })
    expect(result.started_at).toBe('2025-03-10T09:00:00Z')
    expect(result.is_billable).toBe(true) // default
  })

  it('accepts fully populated time entry', () => {
    const result = TimeEntrySchema.parse({
      project_id: uuid(),
      client_id: uuid(),
      description: 'Feature development',
      started_at: '2025-03-10T09:00:00Z',
      ended_at: '2025-03-10T17:00:00Z',
      hourly_rate: 120,
      is_billable: false,
    })
    expect(result.description).toBe('Feature development')
    expect(result.hourly_rate).toBe(120)
    expect(result.is_billable).toBe(false)
  })

  it('coerces hourly_rate from string', () => {
    const result = TimeEntrySchema.parse({
      started_at: '2025-03-10T09:00:00Z',
      hourly_rate: '75',
    })
    expect(result.hourly_rate).toBe(75)
  })

  it('accepts null for optional nullable fields', () => {
    const result = TimeEntrySchema.parse({
      started_at: '2025-03-10T09:00:00Z',
      project_id: null,
      client_id: null,
      description: null,
      ended_at: null,
      hourly_rate: null,
    })
    expect(result.project_id).toBeNull()
    expect(result.ended_at).toBeNull()
  })

  it('rejects empty started_at', () => {
    expectZodError(() => TimeEntrySchema.parse({ started_at: '' }))
  })

  it('rejects negative hourly_rate', () => {
    expectZodError(() =>
      TimeEntrySchema.parse({ started_at: '2025-03-10T09:00:00Z', hourly_rate: -10 }),
    )
  })

  it('rejects invalid project_id uuid', () => {
    expectZodError(() =>
      TimeEntrySchema.parse({
        started_at: '2025-03-10T09:00:00Z',
        project_id: 'bad',
      }),
    )
  })
})

// ===========================================================================
// CSVRowSchema
// ===========================================================================

describe('CSVRowSchema', () => {
  it('accepts valid CSV row', () => {
    const result = CSVRowSchema.parse({
      description: 'Meeting with client',
      started_at: '2025-03-10T09:00:00Z',
      ended_at: '2025-03-10T10:30:00Z',
    })
    expect(result.description).toBe('Meeting with client')
  })

  it('rejects empty description', () => {
    expectZodError(() =>
      CSVRowSchema.parse({
        description: '',
        started_at: '2025-03-10T09:00:00Z',
        ended_at: '2025-03-10T10:30:00Z',
      }),
    )
  })

  it('rejects non-datetime started_at', () => {
    expectZodError(() =>
      CSVRowSchema.parse({
        description: 'Task',
        started_at: 'not-a-date',
        ended_at: '2025-03-10T10:30:00Z',
      }),
    )
  })

  it('rejects non-datetime ended_at', () => {
    expectZodError(() =>
      CSVRowSchema.parse({
        description: 'Task',
        started_at: '2025-03-10T09:00:00Z',
        ended_at: 'tomorrow',
      }),
    )
  })

  it('rejects missing fields', () => {
    expectZodError(() => CSVRowSchema.parse({}))
    expectZodError(() => CSVRowSchema.parse({ description: 'X' }))
    expectZodError(() =>
      CSVRowSchema.parse({ description: 'X', started_at: '2025-03-10T09:00:00Z' }),
    )
  })
})
