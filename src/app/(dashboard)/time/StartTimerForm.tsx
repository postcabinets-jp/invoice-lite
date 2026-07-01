'use client'

import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Project {
  id: string
  name: string
}

interface Client {
  id: string
  name: string
}

interface StartTimerFormProps {
  projects: Project[]
  clients: Client[]
  onStart: (formData: FormData) => Promise<void>
}

export default function StartTimerForm({ projects, clients, onStart }: StartTimerFormProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium text-zinc-900 mb-4">タイマー開始</h2>
      <form action={onStart} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs text-zinc-500">説明</Label>
          <Input
            name="description"
            placeholder="何をしていますか？"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">プロジェクト</Label>
          <select
            name="project_id"
            className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          >
            <option value="">プロジェクト選択</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">クライアント</Label>
          <select
            name="client_id"
            className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          >
            <option value="">クライアント選択</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">時給 (¥)</Label>
          <Input
            name="hourly_rate"
            type="number"
            placeholder="例: 5000"
            className="h-8 text-sm"
            min="0"
          />
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="is_billable"
              defaultChecked
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm text-zinc-700">請求可能</span>
          </label>
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1 justify-end">
          <Button type="submit" size="sm" className="gap-1.5 w-full sm:w-auto">
            <Play className="h-3.5 w-3.5 fill-current" />
            タイマー開始
          </Button>
        </div>
      </form>
    </div>
  )
}
