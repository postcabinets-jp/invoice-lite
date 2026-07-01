import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ClientsClientPage from './ClientsClientPage'

type ClientRow = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  is_archived: boolean
  created_at: string
}

type InvoiceSummaryRow = {
  client_id: string
  amount_due: number | null
}

type InvoiceCountRow = {
  client_id: string
}

export default async function ClientsPage() {
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

  const [clientsResult, summaryResult, countResult] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company, email, phone, is_archived, created_at')
      .eq('organization_id', orgId)
      .order('name', { ascending: true }),
    supabase
      .from('invoices')
      .select('client_id, amount_due')
      .eq('organization_id', orgId)
      .neq('status', 'cancelled'),
    supabase
      .from('invoices')
      .select('client_id')
      .eq('organization_id', orgId)
      .neq('status', 'cancelled'),
  ])

  const clients = (clientsResult.data as unknown as ClientRow[]) ?? []
  const invoiceSummaries = (summaryResult.data as unknown as InvoiceSummaryRow[]) ?? []
  const invoiceCounts = (countResult.data as unknown as InvoiceCountRow[]) ?? []

  const balanceMap = new Map<string, number>()
  const countMap = new Map<string, number>()

  for (const inv of invoiceSummaries) {
    balanceMap.set(inv.client_id, (balanceMap.get(inv.client_id) ?? 0) + (inv.amount_due ?? 0))
  }
  for (const inv of invoiceCounts) {
    countMap.set(inv.client_id, (countMap.get(inv.client_id) ?? 0) + 1)
  }

  const enriched = clients.map((c) => ({
    ...c,
    invoiceCount: countMap.get(c.id) ?? 0,
    outstandingBalance: balanceMap.get(c.id) ?? 0,
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">クライアント</h1>
        <Link href="/clients/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            新規クライアント
          </Button>
        </Link>
      </div>

      <ClientsClientPage clients={enriched} />
    </div>
  )
}
