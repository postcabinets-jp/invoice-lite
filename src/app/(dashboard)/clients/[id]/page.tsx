import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Client, InvoiceStatus } from '@/types/database'
import ClientTabs from './ClientTabs'

type ClientData = Pick<
  Client,
  | 'id'
  | 'name'
  | 'company'
  | 'email'
  | 'phone'
  | 'address'
  | 'city'
  | 'country'
  | 'currency'
  | 'tax_number'
  | 'notes'
  | 'is_archived'
  | 'created_at'
>

type InvoiceRow = {
  id: string
  number: string
  status: string
  total: number | null
  amount_due: number | null
  amount_paid: number | null
  currency: string
  issue_date: string
  due_date: string | null
  is_estimate: boolean
}

type ExpenseRow = {
  id: string
  description: string | null
  amount: number
  currency: string
  expense_date: string
  category: string
  is_billable: boolean
  is_invoiced: boolean
}

function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(dateStr))
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: '下書き',
  sent: '送信済',
  viewed: '閲覧済',
  partial: '一部入金',
  paid: '入金済',
  overdue: '期限超過',
  cancelled: 'キャンセル',
}

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  partial: 'bg-orange-100 text-orange-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-zinc-100 text-zinc-400',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
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

  const { id } = await params

  const [clientResult, invoicesResult, expensesResult] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company, email, phone, address, city, country, currency, tax_number, notes, is_archived, created_at')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('invoices')
      .select('id, number, status, total, amount_due, amount_paid, currency, issue_date, due_date, is_estimate')
      .eq('client_id', id)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('id, description, amount, currency, expense_date, category, is_billable, is_invoiced')
      .eq('client_id', id)
      .eq('organization_id', orgId)
      .order('expense_date', { ascending: false }),
  ])

  const clientRaw = clientResult.data as unknown as ClientData | null
  if (!clientRaw) notFound()
  const client = clientRaw
  const invoiceList = (invoicesResult.data as unknown as InvoiceRow[] ?? [])
  const expenseList = (expensesResult.data as unknown as ExpenseRow[] ?? [])

  const totalBilled = invoiceList
    .filter((inv) => !inv.is_estimate && inv.status !== 'cancelled' && inv.status !== 'draft')
    .reduce((sum, inv) => sum + (inv.total ?? 0), 0)
  const totalPaid = invoiceList
    .filter((inv) => !inv.is_estimate)
    .reduce((sum, inv) => sum + (inv.amount_paid ?? 0), 0)
  const balanceDue = invoiceList
    .filter((inv) => !inv.is_estimate && ['sent', 'viewed', 'partial', 'overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + (inv.amount_due ?? 0), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">{client.company ?? client.name}</h1>
            {client.company && <p className="text-sm text-zinc-500 mt-0.5">{client.name}</p>}
            {client.is_archived && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-zinc-100 text-zinc-500 mt-1">
                アーカイブ済み
              </span>
            )}
          </div>
        </div>
        <Link href={`/clients/${id}/edit`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Account statement */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-400">総請求額</p>
              <p className="text-xl font-semibold tabular-nums text-zinc-900 mt-1">
                {formatCurrency(totalBilled, client.currency ?? 'JPY')}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-400">入金済</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-600 mt-1">
                {formatCurrency(totalPaid, client.currency ?? 'JPY')}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-400">未払い残高</p>
              <p className={`text-xl font-semibold tabular-nums mt-1 ${balanceDue > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                {formatCurrency(balanceDue, client.currency ?? 'JPY')}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <ClientTabs
            invoices={invoiceList.map((inv) => ({
              ...inv,
              statusLabel: STATUS_LABEL[inv.status as InvoiceStatus] ?? inv.status,
              statusClass: STATUS_CLASS[inv.status as InvoiceStatus] ?? 'bg-zinc-100 text-zinc-500',
              formattedTotal: formatCurrency(inv.total ?? 0, inv.currency),
              formattedAmountDue: formatCurrency(inv.amount_due ?? 0, inv.currency),
              formattedIssueDate: formatDate(inv.issue_date),
              formattedDueDate: formatDate(inv.due_date),
            }))}
            expenses={expenseList.map((exp) => ({
              ...exp,
              formattedAmount: formatCurrency(exp.amount, exp.currency),
              formattedDate: formatDate(exp.expense_date),
            }))}
          />
        </div>

        {/* Sidebar: contact info */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 space-y-3">
            <h2 className="text-sm font-medium text-zinc-900">連絡先</h2>
            {client.email && (
              <div className="flex items-start gap-2.5">
                <Mail className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <a href={`mailto:${client.email}`} className="text-sm text-zinc-700 hover:text-zinc-900 break-all">
                  {client.email}
                </a>
              </div>
            )}
            {client.phone && (
              <div className="flex items-start gap-2.5">
                <Phone className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-700">{client.phone}</span>
              </div>
            )}
            {client.company && (
              <div className="flex items-start gap-2.5">
                <Building2 className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <span className="text-sm text-zinc-700">{client.company}</span>
              </div>
            )}
            {(client.address ?? client.city ?? client.country) && (
              <div className="flex items-start gap-2.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <div className="text-sm text-zinc-700 space-y-0.5">
                  {client.address && <p>{client.address}</p>}
                  {client.city && <p>{client.city}</p>}
                  {client.country && <p>{client.country}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4 space-y-2.5">
            <h2 className="text-sm font-medium text-zinc-900">その他</h2>
            {client.tax_number && (
              <div>
                <p className="text-xs text-zinc-400">インボイス登録番号</p>
                <p className="text-sm text-zinc-700 mt-0.5">{client.tax_number}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-400">通貨</p>
              <p className="text-sm text-zinc-700 mt-0.5">{client.currency ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">登録日</p>
              <p className="text-sm text-zinc-700 mt-0.5">{formatDate(client.created_at)}</p>
            </div>
          </div>

          {client.notes && (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-4">
              <h2 className="text-sm font-medium text-zinc-900 mb-2">メモ</h2>
              <p className="text-sm text-zinc-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/invoices/new?client=${id}`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full text-xs">
                請求書を作成
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
