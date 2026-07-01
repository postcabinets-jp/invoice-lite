'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DateRangePickerProps {
  from: string
  to: string
}

export default function DateRangePicker({ from, to }: DateRangePickerProps) {
  const [fromVal, setFromVal] = useState(from)
  const [toVal, setToVal] = useState(to)
  const router = useRouter()

  const handleApply = () => {
    if (!fromVal || !toVal) return
    router.push(`/reports?from=${fromVal}&to=${toVal}`)
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarRange className="h-3.5 w-3.5 text-zinc-400" />
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={fromVal}
          onChange={(e) => setFromVal(e.target.value)}
          className="h-7 w-34 text-xs"
        />
        <span className="text-xs text-zinc-400">〜</span>
        <Input
          type="date"
          value={toVal}
          onChange={(e) => setToVal(e.target.value)}
          className="h-7 w-34 text-xs"
        />
      </div>
      <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={handleApply}>
        適用
      </Button>
    </div>
  )
}
