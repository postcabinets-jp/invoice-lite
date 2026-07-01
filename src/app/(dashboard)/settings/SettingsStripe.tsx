'use client'

import { ExternalLink } from 'lucide-react'

export default function SettingsStripe() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Stripe 連携</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Stripe を連携すると、請求書にオンライン決済リンクを追加できます。
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800 font-medium">環境変数で設定してください</p>
          <p className="text-xs text-amber-700 mt-1">
            APIキーはコードに直接入力せず、サーバー側の環境変数として設定してください。
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-xs font-semibold flex items-center justify-center">
              1
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Stripe アカウントを作成</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                まだアカウントをお持ちでない場合は Stripe.com で無料登録してください。
              </p>
              <a
                href="https://dashboard.stripe.com/register"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                stripe.com/register <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-xs font-semibold flex items-center justify-center">
              2
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">APIキーを取得</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Stripe ダッシュボード → 開発者 → APIキー からキーを取得します。
              </p>
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
              >
                dashboard.stripe.com/apikeys <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-xs font-semibold flex items-center justify-center">
              3
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">環境変数を設定</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                <code className="bg-zinc-200 px-1 py-0.5 rounded font-mono text-zinc-700">.env.local</code>{' '}
                に以下を追加してください:
              </p>
              <pre className="mt-2 rounded-md bg-zinc-900 text-zinc-100 text-xs p-3 overflow-x-auto">
                {`STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# テストモードの場合:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`}
              </pre>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-200">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-xs font-semibold flex items-center justify-center">
              4
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">動作確認</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                テストモードでは <code className="bg-zinc-200 px-1 py-0.5 rounded font-mono text-zinc-700">4242 4242 4242 4242</code> カード番号でテスト決済ができます。
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'bg-emerald-500' : 'bg-zinc-300'
              }`}
            />
            <span className="text-xs text-zinc-600">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
                ? 'Stripe 公開キーが設定されています'
                : 'Stripe 公開キーが未設定です'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
