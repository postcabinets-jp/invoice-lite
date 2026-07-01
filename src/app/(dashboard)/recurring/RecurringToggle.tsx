'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'

interface RecurringToggleProps {
  id: string
  isActive: boolean
  onToggle: (id: string, isActive: boolean) => Promise<void>
}

export default function RecurringToggle({ id, isActive, onToggle }: RecurringToggleProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      await onToggle(id, !isActive)
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2.5 text-xs"
      onClick={handleClick}
      disabled={isPending}
    >
      {isActive ? '停止' : '有効化'}
    </Button>
  )
}
