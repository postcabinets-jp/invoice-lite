import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const PaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['stripe', 'bank_transfer', 'cash', 'other']),
  notes: z.string().optional(),
  paid_at: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: invoiceId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = PaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力値が不正です' }, { status: 400 })
  }

  const { amount, method, notes, paid_at } = parsed.data

  // Verify invoice belongs to user's org
  const { data: member } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, total, amount_paid, currency, organization_id')
    .eq('id', invoiceId)
    .eq('organization_id', member.organization_id)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
  }

  // Insert payment
  const { error: paymentError } = await supabase.from('payments').insert({
    organization_id: member.organization_id,
    invoice_id: invoiceId,
    amount,
    currency: invoice.currency,
    method,
    notes: notes ?? null,
    paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString(),
  })

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 })
  }

  // Update invoice amount_paid and status
  const newAmountPaid = Number(invoice.amount_paid) + amount
  const newStatus =
    newAmountPaid >= Number(invoice.total)
      ? 'paid'
      : newAmountPaid > 0
        ? 'partial'
        : 'sent'

  await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId)

  return NextResponse.json({ success: true })
}
