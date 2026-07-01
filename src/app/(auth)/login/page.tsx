import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

async function signInAction(formData: FormData) {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

async function signInWithGoogleAction() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const { headers } = await import('next/headers')

  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  })

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? 'OAuth error')}`)
  }

  redirect(data.url)
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">サインイン</h1>
        <p className="text-sm text-zinc-500 mt-1">
          アカウントにサインインしてください
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Google OAuth */}
      <form action={signInWithGoogleAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full h-9 text-sm font-medium border-zinc-200 text-zinc-700 hover:bg-zinc-50"
        >
          <svg className="size-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google でサインイン
        </Button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <Separator className="flex-1" />
        <span className="text-xs text-zinc-400 shrink-0">または</span>
        <Separator className="flex-1" />
      </div>

      {/* Email/Password form */}
      <form action={signInAction} className="space-y-4">
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
              パスワード
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
            >
              パスワードを忘れた？
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-9 border-zinc-200 text-sm placeholder:text-zinc-400 focus-visible:ring-zinc-900/20 focus-visible:border-zinc-400"
          />
        </div>

        <Button
          type="submit"
          className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
        >
          サインイン
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-500">
        アカウントをお持ちでない方は{' '}
        <Link
          href="/register"
          className="font-medium text-zinc-900 hover:underline underline-offset-2"
        >
          新規登録
        </Link>
      </p>
    </div>
  )
}
