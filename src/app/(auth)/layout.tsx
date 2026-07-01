import type { Metadata } from 'next'
import { ZapIcon } from 'lucide-react'

export const metadata: Metadata = {
  title: 'invoice-lite — サインイン',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex items-center justify-center size-8 rounded-lg bg-zinc-900">
            <ZapIcon className="size-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-zinc-900 tracking-tight">
            invoice-lite
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-400 mt-6">
          &copy; {new Date().getFullYear()} invoice-lite. All rights reserved.
        </p>
      </div>
    </div>
  )
}
