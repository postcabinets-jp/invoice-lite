import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import InvoiceForm from '@/components/invoices/InvoiceForm'
import type { Client, TaxRate } from '@/types/database'

type ClientOption = Pick<Client, 'id' | 'name' | 'company' | 'currency'>
type OrgData = { currency: string; invoice_prefix: string; next_invoice_number: number }

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ estimate?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/register')
  const orgId = (member as unknown as { organization_id: string }).organization_id

  const params = await searchParams
  const isEstimate = params.estimate === 'true'

  const [orgResult, clientsResult, taxRatesResult] = await Promise.all([
    supabase
      .from('organizations')
      .select('currency, invoice_prefix, next_invoice_number')
      .eq('id', orgId)
      .single(),
    supabase
      .from('clients')
      .select('id, name, company, currency')
      .eq('organization_id', orgId)
      .eq('is_archived', false)
      .order('name', { ascending: true }),
    supabase
      .from('tax_rates')
      .select('*')
      .eq('organization_id', orgId)
      .order('rate', { ascending: true }),
  ])

  const org = orgResult.data as unknown as OrgData | null
  const clients = (clientsResult.data as unknown as ClientOption[]) ?? []
  const taxRates = (taxRatesResult.data as unknown as TaxRate[]) ?? []

  const nextNumber = org
    ? `${org.invoice_prefix}${String(org.next_invoice_number).padStart(4, '0')}`
    : 'INV-0001'

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">
          {isEstimate ? '新規見積書' : '新規請求書'}
        </h1>
      </div>

      <InvoiceForm
        clients={clients}
        taxRates={taxRates}
        orgCurrency={org?.currency ?? 'JPY'}
        nextInvoiceNumber={nextNumber}
      />
    </div>
  )
}
