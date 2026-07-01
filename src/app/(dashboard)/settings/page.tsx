import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import SettingsOrgForm from './SettingsOrgForm'
import SettingsTaxRates from './SettingsTaxRates'
import SettingsStripe from './SettingsStripe'
import type { Organization, TaxRate } from '@/types/database'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('org_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()
  if (!member) redirect('/register')
  const orgId = (member as { organization_id: string; role: string }).organization_id

  const params = await searchParams
  const activeTab = params.tab ?? 'organization'

  const [{ data: orgData }, { data: taxRatesData }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase.from('tax_rates').select('*').eq('organization_id', orgId).order('rate'),
  ])

  const org = orgData as unknown as Organization
  const taxRates = (taxRatesData ?? []) as TaxRate[]

  async function updateOrg(formData: FormData) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    const { data: m } = await supabase2
      .from('org_members')
      .select('organization_id')
      .eq('user_id', u.id)
      .single()
    if (!m) return
    const mTyped = m as unknown as { organization_id: string }

    const updates: Record<string, unknown> = {
      name: formData.get('name'),
      slug: formData.get('slug'),
      currency: formData.get('currency'),
      timezone: formData.get('timezone'),
      invoice_prefix: formData.get('invoice_prefix'),
      updated_at: new Date().toISOString(),
    }

    // Handle settings JSON (default_footer, default_notes, payment_terms_days)
    const settings: Record<string, unknown> = {}
    const footer = formData.get('default_footer')
    const notes = formData.get('default_notes')
    const terms = formData.get('payment_terms_days')
    if (footer !== null) settings.default_footer = footer
    if (notes !== null) settings.default_notes = notes
    if (terms !== null) settings.payment_terms_days = Number(terms)
    updates.settings = settings

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase2.from('organizations') as any).update(updates).eq('id', mTyped.organization_id)
    revalidatePath('/settings')
  }

  async function addTaxRate(formData: FormData) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    const { data: m } = await supabase2
      .from('org_members')
      .select('organization_id')
      .eq('user_id', u.id)
      .single()
    if (!m) return
    const mTyped = m as unknown as { organization_id: string }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase2.from('tax_rates') as any).insert({
      organization_id: mTyped.organization_id,
      name: formData.get('name') as string,
      rate: parseFloat(formData.get('rate') as string),
      is_default: formData.get('is_default') === 'on',
    })
    revalidatePath('/settings')
  }

  async function deleteTaxRate(id: string) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    await supabase2.from('tax_rates').delete().eq('id', id)
    revalidatePath('/settings')
  }

  const TABS = [
    { key: 'organization', label: '組織' },
    { key: 'invoice', label: '請求書テンプレート' },
    { key: 'tax', label: '税率' },
    { key: 'stripe', label: 'Stripe' },
  ]

  const settings = (org.settings ?? {}) as Record<string, unknown>

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">設定</h1>
        <p className="text-sm text-zinc-500 mt-0.5">組織の設定と請求書のカスタマイズ</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-200">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/settings?tab=${tab.key}`}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Organization tab */}
      {activeTab === 'organization' && (
        <SettingsOrgForm org={org} onUpdate={updateOrg} />
      )}

      {/* Invoice template tab */}
      {activeTab === 'invoice' && (
        <SettingsOrgForm
          org={org}
          onUpdate={updateOrg}
          mode="invoice"
          defaultFooter={(settings.default_footer as string | undefined) ?? ''}
          defaultNotes={(settings.default_notes as string | undefined) ?? ''}
          paymentTermsDays={(settings.payment_terms_days as number | undefined) ?? 30}
        />
      )}

      {/* Tax rates tab */}
      {activeTab === 'tax' && (
        <SettingsTaxRates
          taxRates={taxRates}
          onAdd={addTaxRate}
          onDelete={deleteTaxRate}
        />
      )}

      {/* Stripe tab */}
      {activeTab === 'stripe' && <SettingsStripe />}
    </div>
  )
}
