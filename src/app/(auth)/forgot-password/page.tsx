import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeftIcon } from 'lucide-react'

async function forgotPasswordAction(formData: FormData) {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const { headers } = await import('next/headers')

  const email = formData.get('email') as string
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/settings/password`,
  })

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/forgot-password?success=true')
}

interface ForgotPasswordPageProps {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, success } = await searchParams

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">パスワードをリセット</h1>
        <p className="text-sm text-zinc-500 mt-1">
          登録済みのメールアドレスを入力してください
        </p>
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-700">
          リセットメールを送信しました。メールをご確認ください。
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {decodeURIComponent(error)}
        </div>
      )}

      {!success && (
        <form action={forgotPasswordAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-zinc-700">
              メールアドレス
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="h-9 border-zinc-200 text-sm placeholder:text-zinc-400 focus-visible:ring-zinc-900/20 focus-visible:border-zinc-400"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
          >
            リセットメールを送信
          </Button>
        </form>
      )}

      <div className="mt-5 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeftIcon className="size-3.5" />
          サインインに戻る
        </Link>
      </div>
    </div>
  )
}
