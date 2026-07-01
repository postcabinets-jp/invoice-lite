import Link from 'next/link'
import {
  Check,
  FileText,
  Users,
  Clock,
  BarChart3,
  RefreshCw,
  Shield,
  ArrowRight,
  GitBranch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  {
    icon: Users,
    title: 'クライアント無制限',
    description:
      'FreshBooks Liteの5社制限を廃止。アーカイブしてもカウントしない。スタートアップも100社規模のエージェンシーも同じプランで。',
  },
  {
    icon: FileText,
    title: '請求書・見積書',
    description:
      'カスタムロゴ・色・フッター対応。PDF自動生成。メール送信。Stripeの支払いリンクを自動埋め込み。ワンクリックで見積→請求書変換。',
  },
  {
    icon: Clock,
    title: '時間トラッキング',
    description:
      'プロジェクト別タイマー計測。Toggl/Clockify形式CSVインポート対応（FreshBooksが何年も実装しない機能）。時間→請求書ワンクリック変換。',
  },
  {
    icon: BarChart3,
    title: '会計士に渡せるレポート',
    description:
      '収入サマリー・支出サマリー・税務サマリーをCSV/PDFで出力。「Excelで加工し直し」不要。期間フィルタ・消費税別集計対応。',
  },
  {
    icon: RefreshCw,
    title: '繰り返し請求',
    description:
      '週次・月次・年次のサブスクリプション請求を自動化。停止・再開・クローン対応。自動送信または確認後送信を選択可能。',
  },
  {
    icon: Shield,
    title: '手数料ゼロ上乗せ',
    description:
      'Stripe実費（2.9%+¥40）のみ。FreshBooksのような自社マージン上乗せなし。年間数万円の差になる。',
  },
]

const pricing = [
  {
    name: 'Free',
    badge: 'セルフホスト',
    price: '$0',
    period: '/ 永久',
    description: 'GitHubからクローンしてVercelにデプロイ',
    features: [
      'クライアント無制限',
      '全機能使用可能',
      'チームメンバー無制限',
      '自己管理・自己責任',
    ],
    cta: 'GitHubを見る',
    ctaHref: 'https://github.com/postcabinets-jp/invoice-lite',
    highlighted: false,
  },
  {
    name: 'Starter',
    badge: 'クラウド',
    price: '$9',
    period: '/ 月',
    description: 'フリーランサー・個人事業主向け',
    features: [
      'クライアント無制限',
      'チーム3名まで',
      'Stripe決済統合',
      'メールサポート',
    ],
    cta: '無料で始める',
    ctaHref: '/register',
    highlighted: true,
  },
  {
    name: 'Pro',
    badge: 'クラウド',
    price: '$19',
    period: '/ 月',
    description: '複数通貨・高度レポートが必要な方',
    features: [
      'Starterの全機能',
      '複数通貨対応',
      'レポートPDF出力',
      '優先サポート',
    ],
    cta: '14日間無料トライアル',
    ctaHref: '/register?plan=pro',
    highlighted: false,
  },
]

const comparison = [
  { feature: 'クライアント数', freshbooks: '5社（Lite）', invoicelite: '無制限' },
  { feature: '決済手数料', freshbooks: '2.9%+自社マージン', invoicelite: 'Stripe実費のみ' },
  { feature: 'チームメンバー', freshbooks: '$11/人/月', invoicelite: '3名まで無料' },
  { feature: 'CSVタイムインポート', freshbooks: '非対応', invoicelite: 'Toggl/Clockify対応' },
  { feature: 'セルフホスト', freshbooks: '不可', invoicelite: 'MIT License' },
  { feature: '税務サマリーPDF', freshbooks: 'Premium($65/mo)のみ', invoicelite: '全プラン対応' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Nav */}
      <nav className="border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-900 font-semibold text-sm tracking-tight">invoice-lite</span>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-zinc-500">
            <a href="#features" className="hover:text-zinc-900 transition-colors">機能</a>
            <a href="#pricing" className="hover:text-zinc-900 transition-colors">料金</a>
            <a
              href="https://github.com/postcabinets-jp/invoice-lite"
              className="hover:text-zinc-900 transition-colors flex items-center gap-1"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitBranch className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-zinc-600 text-sm">ログイン</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-sm bg-zinc-900 hover:bg-zinc-700">無料で始める</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-full px-3 py-1 text-xs text-zinc-600 mb-6">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          オープンソース · MIT License · Vercelに1クリックでデプロイ
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 leading-tight mb-4 tracking-tight">
          FreshBooksの5社制限に<br className="hidden sm:block" />
          もう縛られない。
        </h1>
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          クライアント無制限・手数料ゼロ上乗せのフリーランス向け請求書SaaS。<br className="hidden sm:block" />
          セルフホストなら永久無料。クラウドは月$9から。
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg" className="bg-zinc-900 hover:bg-zinc-700 text-white gap-2 w-full sm:w-auto">
              無料で始める <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a
            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpostcabinets-jp%2Finvoice-lite"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto border-zinc-200 text-zinc-700">
              <svg height="16" viewBox="0 0 76 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="currentColor"/>
              </svg>
              Vercelにデプロイ
            </Button>
          </a>
        </div>
        <p className="text-xs text-zinc-400 mt-4">クレジットカード不要 · 14日間無料トライアル</p>
      </section>

      {/* App preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden shadow-sm">
          <div className="border-b border-zinc-200 bg-white px-4 py-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="w-3 h-3 rounded-full bg-zinc-200" />
            <span className="text-xs text-zinc-400 ml-2">invoice-lite · ダッシュボード</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: '未払い合計', value: '¥450,000', color: 'text-red-600' },
              { label: '今月収入', value: '¥600,000', color: 'text-zinc-900' },
              { label: '受取済み(30日)', value: '¥600,000', color: 'text-green-600' },
              { label: '送信済み', value: '8件', color: 'text-zinc-900' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-lg border border-zinc-200 p-4">
                <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
                <p className={`text-xl font-semibold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-700">最近の請求書</span>
                <span className="text-xs text-zinc-400">全て見る</span>
              </div>
              {[
                { num: 'INV-0005', client: 'TechBridge株式会社', amount: '¥300,000', status: 'draft', label: '下書き' },
                { num: 'INV-0004', client: 'Nexus Global Ltd.', amount: '$2,000', status: 'partial', label: '一部払い' },
                { num: 'INV-0003', client: 'コンセプト建築設計事務所', amount: '¥150,000', status: 'overdue', label: '期限超過' },
              ].map((inv) => (
                <div key={inv.num} className="px-4 py-3 flex items-center justify-between text-sm border-b border-zinc-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-400 font-mono text-xs w-20">{inv.num}</span>
                    <span className="text-zinc-700">{inv.client}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900">{inv.amount}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      inv.status === 'overdue' ? 'bg-red-50 text-red-700' :
                      inv.status === 'partial' ? 'bg-orange-50 text-orange-700' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>{inv.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-zinc-100 py-20 bg-zinc-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">FreshBooksより機能的、価格は1/3</h2>
            <p className="text-zinc-500">毎月$33払う前に、$9（またはセルフホストで$0）を試してください。</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-lg border border-zinc-200 p-6">
                <f.icon className="h-5 w-5 text-zinc-700 mb-3" />
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">FreshBooks vs invoice-lite</h2>
          <p className="text-zinc-500 text-sm">Liteプラン($19/mo)との比較</p>
        </div>
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-3 bg-zinc-50 border-b border-zinc-200 text-sm font-medium text-zinc-700">
            <div className="px-4 py-3">機能</div>
            <div className="px-4 py-3 text-center">FreshBooks Lite</div>
            <div className="px-4 py-3 text-center text-zinc-900">invoice-lite</div>
          </div>
          {comparison.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 text-sm border-b border-zinc-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}
            >
              <div className="px-4 py-3 text-zinc-600">{row.feature}</div>
              <div className="px-4 py-3 text-center text-red-600">{row.freshbooks}</div>
              <div className="px-4 py-3 text-center text-green-700 font-medium">{row.invoicelite}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-100 py-20 bg-zinc-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-zinc-900 mb-3">シンプルな料金設定</h2>
            <p className="text-zinc-500">決済手数料の上乗せなし。隠れコストなし。</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-6 ${
                  plan.highlighted
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-white border-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.highlighted ? 'bg-white/10 text-white/70' : 'bg-zinc-100 text-zinc-600'}`}>
                    {plan.badge}
                  </span>
                  <span className={`text-sm font-medium ${plan.highlighted ? 'text-white' : 'text-zinc-900'}`}>{plan.name}</span>
                </div>
                <div className="mb-1">
                  <span className={`text-3xl font-bold ${plan.highlighted ? 'text-white' : 'text-zinc-900'}`}>{plan.price}</span>
                  <span className={`text-sm ml-1 ${plan.highlighted ? 'text-white/60' : 'text-zinc-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-xs mb-6 ${plan.highlighted ? 'text-white/60' : 'text-zinc-500'}`}>{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={`h-3.5 w-3.5 shrink-0 ${plan.highlighted ? 'text-white/70' : 'text-green-600'}`} />
                      <span className={plan.highlighted ? 'text-white/80' : 'text-zinc-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.ctaHref}
                  target={plan.ctaHref.startsWith('http') ? '_blank' : undefined}
                  rel={plan.ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  <Button
                    className={`w-full text-sm ${
                      plan.highlighted
                        ? 'bg-white text-zinc-900 hover:bg-zinc-100'
                        : 'bg-zinc-900 text-white hover:bg-zinc-700'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-zinc-400 mt-6">
            決済手数料：Stripe実費のみ（2.9%+¥40）。invoice-liteの上乗せはゼロ。
          </p>
        </div>
      </section>

      {/* Deploy section */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">セルフホストする</h2>
        <p className="text-zinc-500 mb-6 text-sm">
          Vercel + Supabaseで5分でデプロイ。MITライセンスなので商用利用・改変も自由。
        </p>
        <a
          href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpostcabinets-jp%2Finvoice-lite&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Supabase%20project%20credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://vercel.com/button" alt="Deploy with Vercel" />
        </a>
        <div className="mt-4">
          <a
            href="https://github.com/postcabinets-jp/invoice-lite"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            postcabinets-jp/invoice-lite
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="font-medium text-zinc-600">invoice-lite</span>
            <span>MIT License</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com/postcabinets-jp/invoice-lite" className="hover:text-zinc-600" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span>
              Built by{' '}
              <a href="https://postcabinets.co.jp" className="hover:text-zinc-600" target="_blank" rel="noopener noreferrer">
                POST CABINETS
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
