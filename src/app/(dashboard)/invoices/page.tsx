import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InvoiceStatus } from '@/types/database'
import InvoicesClientPage from './InvoicesClientPage'

type InvoiceRow = {
  id: string
  number: string
  status: string
  total: number | null
  amount_due: number | null
  currency: string
  issue_date: string
  due_date: string | null
  is_estimate: boolean
  clients: { id: string; name: string; company: string | null; email: string | null } | null
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
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
  const activeStatus = (params.status as InvoiceStatus | 'all') ?? 'all'

  const invoicesResult = await supabase
    .from('invoices')
    .select('id, number, status, total, amount_due, currency, issue_date, due_date, is_estimate, clients(id, name, company, email)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const allInvoices = (invoicesResult.data as unknown as InvoiceRow[]) ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">請求書</h1>
        <div className="flex gap-2">
          <Link href="/invoices/new?estimate=true">
            <Button variant="outline" size="sm" className="gap-1.5">
              <FileText className="h-4 w-4" />
              見積書を作成
            </Button>
          </Link>
          <Link href="/invoices/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              新規請求書
            </Button>
          </Link>
        </div>
      </div>

      <InvoicesClientPage invoices={allInvoices} initialStatus={activeStatus} />
    </div>
  )
}
