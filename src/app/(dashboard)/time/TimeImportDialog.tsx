'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TimeImportDialogProps {
  orgId: string
  userId: string
}

// Expected CSV format: date,description,project_id,duration_minutes,hourly_rate,is_billable
// date: YYYY-MM-DD, is_billable: true/false

export default function TimeImportDialog({ orgId, userId }: TimeImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText((ev.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  const handleImport = () => {
    startTransition(async () => {
      setError(null)
      const lines = csvText.trim().split('\n').filter(Boolean)
      if (lines.length === 0) {
        setError('CSVデータがありません')
        return
      }

      // Skip header if present
      const dataLines = lines[0].toLowerCase().startsWith('date') ? lines.slice(1) : lines

      const entries: {
        organization_id: string
        user_id: string
        description: string | null
        started_at: string
        ended_at: string
        duration_minutes: number
        hourly_rate: number | null
        is_billable: boolean
      }[] = []

      for (const line of dataLines) {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
        if (cols.length < 4) continue
        const [date, description, , durationStr, rateStr, billableStr] = cols
        const duration = parseInt(durationStr ?? '0', 10)
        if (!date || isNaN(duration)) continue
        const startedAt = new Date(`${date}T09:00:00`).toISOString()
        const endedAt = new Date(
          new Date(`${date}T09:00:00`).getTime() + duration * 60 * 1000,
        ).toISOString()
        entries.push({
          organization_id: orgId,
          user_id: userId,
          description: description || null,
          started_at: startedAt,
          ended_at: endedAt,
          duration_minutes: duration,
          hourly_rate: rateStr ? parseFloat(rateStr) : null,
          is_billable: billableStr?.toLowerCase() === 'true',
        })
      }

      if (entries.length === 0) {
        setError('有効なデータが見つかりません')
        return
      }

      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase.from('time_entries') as any).insert(entries)

      if (insertError) {
        setError(insertError.message)
        return
      }

      setOpen(false)
      setCsvText('')
      router.refresh()
    })
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Upload className="h-3.5 w-3.5" />
        CSVインポート
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-xl p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-900">時間エントリをインポート</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4">
          CSV形式:{' '}
          <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700 font-mono">
            date, description, project_id, duration_minutes, hourly_rate, is_billable
          </code>
        </p>

        <div className="space-y-3">
          <div>
            <Label className="text-xs text-zinc-500">ファイルを選択</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 cursor-pointer"
            />
          </div>

          <div>
            <Label className="text-xs text-zinc-500">またはCSVを貼り付け</Label>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'2024-01-15, Webデザイン作業, , 90, 5000, true\n2024-01-16, ミーティング, , 60, 5000, false'}
              className="mt-1 h-36 font-mono text-xs"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button size="sm" onClick={handleImport} disabled={!csvText.trim() || isPending}>
            {isPending ? 'インポート中...' : 'インポート'}
          </Button>
        </div>
      </div>
    </div>
  )
}
