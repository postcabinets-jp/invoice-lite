'use client'

import { useState, useEffect, useTransition } from 'react'
import { Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ActiveTimerProps {
  entryId: string
  startedAt: string
  projectName: string | null
  description: string | null
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export default function ActiveTimer({ entryId, startedAt, projectName, description }: ActiveTimerProps) {
  const [elapsed, setElapsed] = useState<number>(() => {
    return Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  })
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startedAt])

  const handleStop = () => {
    startTransition(async () => {
      const supabase = createClient()
      const endedAt = new Date().toISOString()
      const durationMinutes = Math.round(elapsed / 60)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('time_entries') as any)
        .update({ ended_at: endedAt, duration_minutes: durationMinutes })
        .eq('id', entryId)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="text-sm font-medium text-blue-800">計測中</span>
        </div>
        <div className="text-sm text-blue-700">
          {projectName && <span className="font-medium">{projectName}</span>}
          {description && (
            <span className="text-blue-600">
              {projectName ? ' — ' : ''}{description}
            </span>
          )}
          {!projectName && !description && (
            <span className="text-blue-500 italic">説明なし</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xl font-semibold text-blue-900 tabular-nums">
          {formatElapsed(elapsed)}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-blue-300 text-blue-800 hover:bg-blue-100"
          onClick={handleStop}
          disabled={isPending}
        >
          <Square className="h-3.5 w-3.5 fill-current" />
          停止
        </Button>
      </div>
    </div>
  )
}
