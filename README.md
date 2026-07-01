# invoice-lite

**クライアント制限なし・手数料ゼロ上乗せのフリーランス向け請求書SaaS**

FreshBooksのオープンソース代替。Liteプランの5社制限なし、決済手数料の自社マージン上乗せなし、CSVタイムインポート対応。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpostcabinets-jp%2Finvoice-lite&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,NEXT_PUBLIC_APP_URL&envDescription=Supabase%20project%20credentials%20and%20app%20URL&project-name=invoice-lite&repository-name=invoice-lite)

## 機能

- **請求書・見積書** — カスタムロゴ/色/フッター、PDF生成、メール送信、Stripe支払いリンク自動埋め込み
- **クライアント無制限** — アーカイブしてもカウントしない、アカウントステートメント、ポータルリンク
- **時間トラッキング** — プロジェクト別タイマー、Toggl/Clockify CSVインポート、時間→請求書変換
- **経費トラッキング** — 領収書アップロード、カテゴリ管理、請求可能経費の請求書連携
- **プロジェクト管理** — 予算vs実績、時間コスト追跡、収益性サマリー
- **繰り返し請求** — 週次/月次/年次、自動送信or確認後送信
- **レポート** — 収入・支出・税務サマリー CSV/PDF出力、会計士に渡せる品質
- **チームメンバー** — owner/admin/member/accountantの4ロール、3名まで無料
- **Stripe決済** — クレジットカード・ACH・Apple Pay対応、手数料はStripe実費のみ（上乗せゼロ）

## スタック

| レイヤー | 技術 |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript strict + Tailwind CSS v4 |
| UI | shadcn/ui |
| Backend | Next.js Server Actions + Route Handlers |
| DB | Supabase (PostgreSQL + RLS) |
| 認証 | Supabase Auth (Email/Password + Google OAuth) |
| 決済 | Stripe Checkout Sessions |
| メール | Resend |
| ストレージ | Supabase Storage |
| Deploy | Vercel |

## クイックスタート（セルフホスト）

### 1. Supabaseプロジェクト作成

1. [supabase.com](https://supabase.com) でプロジェクトを作成
2. SQL Editorで `supabase/migrations/20260701000001_initial_schema.sql` を実行
3. デモデータは `supabase/seed.sql` を実行（オプション）

### 2. 環境変数の設定

```bash
cp .env.example .env.local
```

`.env.local` を編集:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe (オプション)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (オプション)
RESEND_API_KEY=re_...
```

### 3. 起動

```bash
npm install
npm run dev
```

`http://localhost:3000` でアクセス。

### Vercelへのデプロイ

上の「Deploy with Vercel」ボタンをクリック → 環境変数を入力 → デプロイ完了。

## 画面一覧

| パス | 内容 |
|---|---|
| `/` | ランディングページ |
| `/login` | ログイン（Email + Google OAuth） |
| `/register` | 新規登録 |
| `/dashboard` | ダッシュボード（KPI + 最近の請求書） |
| `/invoices` | 請求書一覧 |
| `/invoices/new` | 請求書作成 |
| `/invoices/[id]` | 請求書詳細・編集・送信・入金記録 |
| `/estimates` | 見積書 |
| `/clients` | クライアント一覧 |
| `/clients/[id]` | クライアント詳細 |
| `/time` | 時間トラッキング |
| `/expenses` | 経費 |
| `/projects` | プロジェクト |
| `/recurring` | 繰り返し請求 |
| `/reports` | レポート（期間フィルタ・CSV出力） |
| `/settings` | 組織設定・税率・Stripe連携 |
| `/settings/team` | チームメンバー管理 |
| `/pay/[token]` | 公開支払いページ（認証不要） |

## 料金設計（クラウド版）

| プラン | 月額 | 制限 |
|---|---|---|
| Free（セルフホスト） | $0 | 無制限・機能フル・自己運用 |
| Starter | $9/mo | クライアント無制限・チーム3名・Stripe決済 |
| Pro | $19/mo | +複数通貨・レポートPDF・優先サポート |
| Team | $39/mo | +チーム10名・ホワイトラベル・API |

*決済手数料：Stripe実費のみ（上乗せゼロ）*

## ライセンス

MIT License — 商用利用・改変・配布自由。

---

Built by [POST CABINETS](https://postcabinets.co.jp)
