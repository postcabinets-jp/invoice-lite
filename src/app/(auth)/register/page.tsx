import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

async function registerAction(formData: FormData) {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')

  const organizationName = formData.get('organization_name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        organization_name: organizationName,
      },
    },
  })

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

interface RegisterPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">アカウント作成</h1>
        <p className="text-sm text-zinc-500 mt-1">
          無料で始めましょう。クレジットカード不要
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={registerAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="organization_name"
            className="text-sm font-medium text-zinc-700"
          >
            組織名 / 屋号
          </Label>
          <Input
            id="organization_name"
            name="organization_name"
            type="text"
            autoComplete="organization"
            required
            placeholder="株式会社〇〇 / フリーランス太郎"
            className="h-9 border-zinc-200 text-sm placeholder:text-zinc-400 focus-visible:ring-zinc-900/20 focus-visible:border-zinc-400"
          />
        </div>

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
          <Label htmlFor="password" className="text-sm font-medium text-zinc-700">
            パスワード
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="8文字以上"
            className="h-9 border-zinc-200 text-sm placeholder:text-zinc-400 focus-visible:ring-zinc-900/20 focus-visible:border-zinc-400"
          />
          <p className="text-xs text-zinc-400">8文字以上で設定してください</p>
        </div>

        <Button
          type="submit"
          className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
        >
          アカウントを作成
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-zinc-400">
        登録することで
        <a href="/terms" className="underline underline-offset-2 hover:text-zinc-600">
          利用規約
        </a>
        および
        <a href="/privacy" className="underline underline-offset-2 hover:text-zinc-600">
          プライバシーポリシー
        </a>
        に同意したことになります
      </p>

      <p className="mt-4 text-center text-sm text-zinc-500">
        既にアカウントをお持ちの方は{' '}
        <Link
          href="/login"
          className="font-medium text-zinc-900 hover:underline underline-offset-2"
        >
          サインイン
        </Link>
      </p>
    </div>
  )
}
