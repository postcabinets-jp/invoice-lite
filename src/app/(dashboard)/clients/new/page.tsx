import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ClientForm from '@/components/clients/ClientForm'

export default async function NewClientPage() {
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

  const orgResult = await supabase
    .from('organizations')
    .select('currency')
    .eq('id', orgId)
    .single()
  const orgCurrency = (orgResult.data as unknown as { currency: string } | null)?.currency ?? 'JPY'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="text-zinc-400 hover:text-zinc-600 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">新規クライアント</h1>
      </div>

      <ClientForm orgCurrency={orgCurrency} />
    </div>
  )
}
