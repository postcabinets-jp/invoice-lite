import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ token: string }>
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === 'JPY' ? 'ja-JP' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()
  const { data: client } = await supabase
    .from('clients')
    .select('name, invoices(number)')
    .eq('portal_token', token)
    .single()

  if (!client) return { title: 'Invoice Not Found' }
  return { title: `Invoice — ${client.name}` }
}

export default async function PaymentPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // Find client by portal_token
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, company, organization_id')
    .eq('portal_token', token)
    .single()

  if (!client) notFound()

  // Get the most recent unpaid invoice for this client
  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items (
        id, description, quantity, unit_price, tax_amount, total, position
      ),
      organizations (
        name, logo_url, settings
      )
    `)
    .eq('client_id', client.id)
    .in('status', ['sent', 'viewed', 'partial', 'overdue'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!invoice) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center max-w-sm">
          <p className="text-zinc-500 text-sm">支払い待ちの請求書はありません。</p>
        </div>
      </div>
    )
  }

  // Mark as viewed if sent
  if (invoice.status === 'sent') {
    await supabase
      .from('invoices')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', invoice.id)
  }

  const sortedItems = [...(invoice.invoice_items ?? [])].sort(
    (a, b) => a.position - b.position,
  )

  const isOverdue =
    invoice.due_date && new Date(invoice.due_date) < new Date()
  const isPaid = invoice.amount_due <= 0

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {(invoice.organizations as { name: string }).name}
            </p>
            <p className="text-xs text-zinc-400">請求書</p>
          </div>
          {isPaid ? (
            <Badge className="bg-green-50 text-green-700 border-green-200">支払済み</Badge>
          ) : isOverdue ? (
            <Badge className="bg-red-50 text-red-700 border-red-200">期限超過</Badge>
          ) : (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200">支払い待ち</Badge>
          )}
        </div>
      </div>

      {/* Invoice body */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {/* Invoice header */}
          <div className="p-6 border-b border-zinc-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-2xl font-bold text-zinc-900">{invoice.number}</p>
                <p className="text-sm text-zinc-500 mt-1">
                  {client.name}
                  {client.company && ` · ${client.company}`}
                </p>
              </div>
              <div className="text-right text-sm text-zinc-500">
                <p>発行日: {formatDate(invoice.issue_date)}</p>
                {invoice.due_date && (
                  <p className={isOverdue ? 'text-red-600 font-medium' : ''}>
                    支払期限: {formatDate(invoice.due_date)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left pb-3 text-zinc-500 font-medium">内容</th>
                  <th className="text-right pb-3 text-zinc-500 font-medium w-16">数量</th>
                  <th className="text-right pb-3 text-zinc-500 font-medium w-28">単価</th>
                  <th className="text-right pb-3 text-zinc-500 font-medium w-28">金額</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-50">
                    <td className="py-3 text-zinc-700">{item.description}</td>
                    <td className="py-3 text-right text-zinc-600">
                      {Number(item.quantity).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-zinc-600">
                      {formatCurrency(item.unit_price, invoice.currency)}
                    </td>
                    <td className="py-3 text-right font-medium text-zinc-900">
                      {formatCurrency(item.total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex justify-between text-sm text-zinc-600">
                <span>小計</span>
                <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              </div>
              {invoice.tax_total > 0 && (
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>消費税</span>
                  <span>{formatCurrency(invoice.tax_total, invoice.currency)}</span>
                </div>
              )}
              {invoice.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-zinc-600">
                  <span>割引</span>
                  <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-zinc-900">
                <span>合計</span>
                <span>{formatCurrency(invoice.total, invoice.currency)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>支払済み</span>
                  <span>-{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
                </div>
              )}
              {!isPaid && (
                <div className="flex justify-between text-lg font-bold text-zinc-900 pt-1">
                  <span>お支払い金額</span>
                  <span className="text-red-600">
                    {formatCurrency(invoice.amount_due, invoice.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 pb-4 text-sm text-zinc-500 border-t border-zinc-50 pt-4">
              <p className="font-medium text-zinc-700 mb-1">備考</p>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          {invoice.footer && (
            <div className="px-6 pb-6 text-xs text-zinc-400 border-t border-zinc-100 pt-4 whitespace-pre-wrap">
              {invoice.footer}
            </div>
          )}
        </div>

        {/* Payment CTA */}
        {!isPaid && invoice.stripe_payment_link && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-1">オンライン決済</h2>
            <p className="text-xs text-zinc-500 mb-4">
              クレジットカード・銀行振込・Apple Payでお支払いいただけます。
            </p>
            <a href={invoice.stripe_payment_link} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-zinc-900 hover:bg-zinc-700 text-white">
                {formatCurrency(invoice.amount_due, invoice.currency)} を支払う
              </Button>
            </a>
            <p className="text-xs text-zinc-400 mt-2 text-center">
              Stripe の安全な決済ページへ移動します
            </p>
          </div>
        )}

        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-green-700 font-medium">お支払いが完了しています。</p>
            <p className="text-green-600 text-sm mt-1">ありがとうございました。</p>
          </div>
        )}
      </div>
    </div>
  )
}
