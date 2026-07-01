'use client'

import { useState } from 'react'
import Link from 'next/link'

type InvoiceRow = {
  id: string
  number: string
  status: string
  total: number | null
  amount_due: number | null
  is_estimate: boolean
  statusLabel: string
  statusClass: string
  formattedTotal: string
  formattedAmountDue: string
  formattedIssueDate: string
  formattedDueDate: string
}

type ExpenseRow = {
  id: string
  description: string | null
  category: string
  amount: number
  is_billable: boolean
  is_invoiced: boolean
  formattedAmount: string
  formattedDate: string
}

type Tab = 'invoices' | 'expenses'

export default function ClientTabs({
  invoices,
  expenses,
}: {
  invoices: InvoiceRow[]
  expenses: ExpenseRow[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('invoices')

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-zinc-100 px-1">
        {([
          { key: 'invoices', label: `請求書 (${invoices.length})` },
          { key: 'expenses', label: `経費 (${expenses.length})` },
        ] as { key: Tab; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices tab */}
      {activeTab === 'invoices' && (
        <>
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">請求書がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">番号</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">発行日</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">期限</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">残額</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/invoices/${inv.id}`} className="font-mono text-xs text-zinc-700 hover:text-zinc-900">
                          {inv.number}
                          {inv.is_estimate && (
                            <span className="ml-1 text-[10px] text-zinc-400 font-sans">[見積]</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-zinc-500 tabular-nums">{inv.formattedIssueDate}</td>
                      <td className="px-5 py-3 text-zinc-500 tabular-nums">{inv.formattedDueDate}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-zinc-900">{inv.formattedTotal}</td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className={(inv.amount_due ?? 0) > 0 ? 'text-red-600' : 'text-zinc-400'}>
                          {(inv.amount_due ?? 0) > 0 ? inv.formattedAmountDue : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${inv.statusClass}`}>
                          {inv.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Expenses tab */}
      {activeTab === 'expenses' && (
        <>
          {expenses.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">経費がありません</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">日付</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">カテゴリ</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">内容</th>
                    <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">金額</th>
                    <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">請求可否</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-5 py-3 text-zinc-500 tabular-nums">{exp.formattedDate}</td>
                      <td className="px-5 py-3 text-zinc-600">{exp.category}</td>
                      <td className="px-5 py-3 text-zinc-800">{exp.description ?? '—'}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-medium text-zinc-900">{exp.formattedAmount}</td>
                      <td className="px-5 py-3">
                        {exp.is_billable ? (
                          exp.is_invoiced ? (
                            <span className="text-xs text-zinc-400">請求済</span>
                          ) : (
                            <span className="text-xs text-blue-600">請求可</span>
                          )
                        ) : (
                          <span className="text-xs text-zinc-300">対象外</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
