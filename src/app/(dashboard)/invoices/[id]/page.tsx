import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Send, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Invoice, InvoiceItem, Payment, Client, InvoiceStatus, PaymentMethod } from '@/types/database'
import RecordPaymentDialog from './RecordPaymentDialog'

type InvoiceWithClient = Invoice & { clients: Pick<Client, 'name' | 'company' | 'email' | 'phone' | 'address' | 'city' | 'country'> | null }

function formatCurrency(amount: number, currency = 'JPY'): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateStr))
}

function formatDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
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

const METHOD_LABEL: Record<PaymentMethod, string> = {
  stripe: 'Stripe',
  bank_transfer: '銀行振込',
  cash: '現金',
  other: 'その他',
}

export default async function InvoiceDetailPage({
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

  const [invoiceResult, itemsResult, paymentsResult] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('payments')
      .select('*')
      .eq('invoice_id', id)
      .order('paid_at', { ascending: false }),
  ])

  const invoiceRaw = invoiceResult.data as unknown as InvoiceWithClient | null
  if (!invoiceRaw) notFound()
  const invoice = invoiceRaw
  const items = (itemsResult.data as unknown as InvoiceItem[] ?? [])
  const payments = (paymentsResult.data as unknown as Payment[] ?? [])

  const client = invoice.clients
  const status = invoice.status as InvoiceStatus
  const canSend = status === 'draft'
  const canPay = ['sent', 'viewed', 'partial', 'overdue'].includes(status)
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-zinc-900 font-mono">{invoice.number}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[status]}`}>
                {STATUS_LABEL[status]}
              </span>
              {invoice.is_estimate && (
                <span className="text-xs text-zinc-400">[見積書]</span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {client?.company ?? client?.name ?? '—'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link href={`/invoices/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              編集
            </Button>
          </Link>
          {canSend && (
            <Link href={`/invoices/${id}/send`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                送信
              </Button>
            </Link>
          )}
          {canPay && (
            <RecordPaymentDialog
              invoiceId={id}
              amountDue={invoice.amount_due}
              currency={invoice.currency}
            />
          )}
          <Link href={`/invoices/${id}/pdf`} target="_blank">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </Link>
          <Link href={`/invoices/${id}/delete`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
              削除
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main invoice */}
        <div className="col-span-2 space-y-6">
          {/* Invoice details */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">請求書詳細</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">クライアント</p>
                <p className="text-zinc-800 font-medium">{client?.company ?? client?.name ?? '—'}</p>
                {client?.company && <p className="text-zinc-500 text-xs">{client.name}</p>}
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">通貨</p>
                <p className="text-zinc-800">{invoice.currency}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">発行日</p>
                <p className="text-zinc-800">{formatDate(invoice.issue_date)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">支払期限</p>
                <p className={`${invoice.due_date && invoice.due_date < today && status !== 'paid' ? 'text-red-600 font-medium' : 'text-zinc-800'}`}>
                  {formatDate(invoice.due_date)}
                </p>
              </div>
              {client?.email && (
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">メール</p>
                  <p className="text-zinc-800">{client.email}</p>
                </div>
              )}
              {invoice.sent_at && (
                <div>
                  <p className="text-xs text-zinc-400 mb-0.5">送信日時</p>
                  <p className="text-zinc-800">{formatDateTime(invoice.sent_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">明細</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">内容</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">数量</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">単価</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">税額</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">小計</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 text-zinc-800">{item.description}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-zinc-600">{item.quantity}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-zinc-600">
                        {formatCurrency(item.unit_price, invoice.currency)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-zinc-600">
                        {formatCurrency(item.tax_amount, invoice.currency)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-zinc-900">
                        {formatCurrency(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-6 text-center text-zinc-400 text-xs">明細がありません</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-zinc-100 px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>小計</span>
                <span className="tabular-nums">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-600">
                <span>消費税</span>
                <span className="tabular-nums">{formatCurrency(invoice.tax_total, invoice.currency)}</span>
              </div>
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>割引</span>
                  <span className="tabular-nums text-emerald-600">−{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold text-zinc-900 border-t border-zinc-100 pt-2">
                <span>合計</span>
                <span className="tabular-nums">{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>入金済</span>
                  <span className="tabular-nums">−{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-zinc-200 pt-2">
                <span className="text-zinc-900">請求残額</span>
                <span className={`tabular-nums ${invoice.amount_due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(invoice.amount_due, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes ?? invoice.footer) && (
            <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 space-y-3">
              {invoice.notes && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">備考</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.footer && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">フッター</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{invoice.footer}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Payment history */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">入金履歴</h2>
            </div>
            {payments.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-400">入金記録がありません</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {payments.map((payment) => (
                  <div key={payment.id} className="px-4 py-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium tabular-nums text-zinc-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {METHOD_LABEL[payment.method as PaymentMethod] ?? payment.method}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-400 tabular-nums">
                        {formatDate(payment.paid_at)}
                      </p>
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-zinc-500 mt-1">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canPay && (
              <div className="px-4 py-3 border-t border-zinc-100">
                <RecordPaymentDialog
                  invoiceId={id}
                  amountDue={invoice.amount_due}
                  currency={invoice.currency}
                  variant="secondary"
                />
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-100">
              <h2 className="text-sm font-medium text-zinc-900">タイムライン</h2>
            </div>
            <div className="px-4 py-3 space-y-2.5 text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>作成</span>
                <span className="tabular-nums">{formatDate(invoice.created_at)}</span>
              </div>
              {invoice.sent_at && (
                <div className="flex justify-between">
                  <span>送信</span>
                  <span className="tabular-nums">{formatDate(invoice.sent_at)}</span>
                </div>
              )}
              {invoice.viewed_at && (
                <div className="flex justify-between">
                  <span>閲覧</span>
                  <span className="tabular-nums">{formatDate(invoice.viewed_at)}</span>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex justify-between text-emerald-600">
                  <span>入金完了</span>
                  <span className="tabular-nums">{formatDate(invoice.paid_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
