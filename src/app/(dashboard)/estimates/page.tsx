import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import EstimatesClientPage from './EstimatesClientPage'
import type { InvoiceStatus } from '@/types/database'

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/register')
  const orgId = (member as { organization_id: string }).organization_id

  const params = await searchParams
  const activeStatus = (params.status as InvoiceStatus | 'all') ?? 'all'

  const { data: estimatesData } = await supabase
    .from('invoices')
    .select(
      'id, number, status, total, amount_due, currency, issue_date, due_date, is_estimate, clients(id, name, company, email)',
    )
    .eq('organization_id', orgId)
    .eq('is_estimate', true)
    .order('created_at', { ascending: false })

  const estimates = estimatesData ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">見積書</h1>
          <p className="text-sm text-zinc-500 mt-0.5">クライアントへの見積もりの管理</p>
        </div>
        <Link href="/invoices/new?estimate=true">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            新規見積書
          </Button>
        </Link>
      </div>

      <EstimatesClientPage estimates={estimates} initialStatus={activeStatus} />
    </div>
  )
}
