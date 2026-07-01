-- =============================================
-- SEED DATA — Realistic sample for invoice-lite demo
-- =============================================
-- NOTE: This seed assumes a test user is created first.
-- In production, use the Supabase dashboard to create a user,
-- then run this SQL replacing the UUIDs accordingly.

-- For local dev, create a test user via Supabase dashboard:
-- email: demo@invoice-lite.dev / password: Demo1234!
-- Then replace USER_ID below with the actual user UUID.

DO $$
DECLARE
  v_org_id UUID := gen_random_uuid();
  v_user_id UUID; -- Will be fetched from auth.users
  v_client1 UUID := gen_random_uuid();
  v_client2 UUID := gen_random_uuid();
  v_client3 UUID := gen_random_uuid();
  v_client4 UUID := gen_random_uuid();
  v_tax_standard UUID := gen_random_uuid();
  v_tax_reduced UUID := gen_random_uuid();
  v_project1 UUID := gen_random_uuid();
  v_project2 UUID := gen_random_uuid();
  v_inv1 UUID := gen_random_uuid();
  v_inv2 UUID := gen_random_uuid();
  v_inv3 UUID := gen_random_uuid();
  v_inv4 UUID := gen_random_uuid();
  v_inv5 UUID := gen_random_uuid();
BEGIN
  -- Get demo user (skip if not exists)
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'demo@invoice-lite.dev' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Demo user not found. Create user demo@invoice-lite.dev first.';
    RETURN;
  END IF;

  -- Organization
  INSERT INTO organizations (id, name, slug, currency, timezone, invoice_prefix, next_invoice_number, settings)
  VALUES (
    v_org_id,
    '田中デザイン事務所',
    'tanaka-design',
    'JPY',
    'Asia/Tokyo',
    'INV',
    6,
    '{"invoice_footer": "お支払いは請求書受領後30日以内にお願いします。\n振込先：三菱UFJ銀行 渋谷支店 普通 1234567 タナカデザインジムショ", "default_payment_terms": 30}'
  );

  -- Org member (owner)
  INSERT INTO org_members (organization_id, user_id, role, joined_at)
  VALUES (v_org_id, v_user_id, 'owner', now());

  -- Tax rates
  INSERT INTO tax_rates (id, organization_id, name, rate, is_default)
  VALUES
    (v_tax_standard, v_org_id, '消費税 10%', 10.00, true),
    (v_tax_reduced, v_org_id, '軽減税率 8%', 8.00, false);

  -- Clients
  INSERT INTO clients (id, organization_id, name, email, phone, company, address, city, country, currency)
  VALUES
    (v_client1, v_org_id, '鈴木健太', 'kenta.suzuki@techbridge.co.jp', '03-5678-9012', 'TechBridge株式会社', '東京都渋谷区道玄坂1-2-3', '渋谷区', 'JP', 'JPY'),
    (v_client2, v_org_id, '佐藤美咲', 'm.sato@verde-foods.jp', '06-3456-7890', '株式会社Verde Foods', '大阪府大阪市北区梅田2-3-4', '大阪市', 'JP', 'JPY'),
    (v_client3, v_org_id, 'Michael Chen', 'michael@nexus-global.io', '+1-415-234-5678', 'Nexus Global Ltd.', '275 Market Street, San Francisco, CA 94105', 'San Francisco', 'US', 'USD'),
    (v_client4, v_org_id, '山田雄一', 'y.yamada@concept-arch.jp', '052-678-9012', 'コンセプト建築設計事務所', '愛知県名古屋市中区錦3-4-5', '名古屋市', 'JP', 'JPY');

  -- Projects
  INSERT INTO projects (id, organization_id, client_id, name, description, status, hourly_rate, budget_hours, budget_amount)
  VALUES
    (v_project1, v_org_id, v_client1, 'TechBridge コーポレートサイトリニューアル', 'Webサイト全面リニューアル。UI/UXデザイン + フロントエンド実装。Next.js 15使用。', 'active', 8000, 60, 480000),
    (v_project2, v_org_id, v_client2, 'Verde Foods ブランドアイデンティティ', 'ロゴ・カラーパレット・タイポグラフィ・各種販促物のデザインシステム構築。', 'completed', 10000, 40, 400000);

  -- Invoices
  INSERT INTO invoices (id, organization_id, client_id, number, status, issue_date, due_date, currency, subtotal, tax_total, total, amount_paid, notes, footer, sent_at, paid_at)
  VALUES
    -- 支払い済み
    (v_inv1, v_org_id, v_client2, 'INV-0001', 'paid', '2026-04-01', '2026-04-30', 'JPY',
     363636, 36364, 400000, 400000,
     'Verde Foods ブランドアイデンティティ制作費（第1回）',
     'お振込いただきありがとうございます。', '2026-04-01', '2026-04-28'),
    -- 支払い済み
    (v_inv2, v_org_id, v_client1, 'INV-0002', 'paid', '2026-05-01', '2026-05-31', 'JPY',
     181818, 18182, 200000, 200000,
     'TechBridgeコーポレートサイト デザインカンプ制作費',
     NULL, '2026-05-01', '2026-05-29'),
    -- 送信済み・未払い（期限切れ）
    (v_inv3, v_org_id, v_client4, 'INV-0003', 'overdue', '2026-05-15', '2026-06-14', 'JPY',
     136364, 13636, 150000, 0,
     'コンセプト建築設計事務所 パンフレット制作費',
     NULL, '2026-05-15', NULL),
    -- 送信済み・部分払い
    (v_inv4, v_org_id, v_client3, 'INV-0004', 'partial', '2026-06-01', '2026-06-30', 'USD',
     2000, 0, 2000, 1000,
     'Nexus Global — UX Research Report Design (Phase 1)',
     'Payment terms: Net 30. Wire transfer accepted.', '2026-06-01', NULL),
    -- 下書き
    (v_inv5, v_org_id, v_client1, 'INV-0005', 'draft', '2026-07-01', '2026-07-31', 'JPY',
     272727, 27273, 300000, 0,
     'TechBridgeコーポレートサイト フロントエンド実装費（第1回）',
     NULL, NULL, NULL);

  -- Invoice items for INV-0001
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate_id, tax_amount, total, position)
  VALUES
    (v_inv1, 'ロゴデザイン・バリエーション5点', 1, 120000, v_tax_standard, 12000, 132000, 0),
    (v_inv1, 'カラーパレット・タイポグラフィシステム策定', 1, 80000, v_tax_standard, 8000, 88000, 1),
    (v_inv1, 'ブランドガイドライン制作（PDF納品）', 1, 163636, v_tax_standard, 16364, 180000, 2);

  -- Invoice items for INV-0002
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate_id, tax_amount, total, position)
  VALUES
    (v_inv2, 'トップページ デザインカンプ（PC/SP）', 1, 100000, v_tax_standard, 10000, 110000, 0),
    (v_inv2, '下層ページ デザインカンプ×3点', 3, 27273, v_tax_standard, 2727, 90000, 1);

  -- Invoice items for INV-0003
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate_id, tax_amount, total, position)
  VALUES
    (v_inv3, '会社案内パンフレット A4 8ページ デザイン・印刷データ制作', 1, 136364, v_tax_standard, 13636, 150000, 0);

  -- Invoice items for INV-0004
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate_id, tax_amount, total, position)
  VALUES
    (v_inv4, 'UX Research Report Layout & Design (40 pages)', 1, 1500, NULL, 0, 1500, 0),
    (v_inv4, 'Executive Summary Infographics (5 charts)', 5, 100, NULL, 0, 500, 1);

  -- Invoice items for INV-0005
  INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate_id, tax_amount, total, position)
  VALUES
    (v_inv5, 'Next.js フロントエンド実装 — トップページ・LP', 1, 150000, v_tax_standard, 15000, 165000, 0),
    (v_inv5, 'Next.js フロントエンド実装 — 共通コンポーネント', 1, 122727, v_tax_standard, 12273, 135000, 1);

  -- Payments for INV-0001 (paid in full)
  INSERT INTO payments (organization_id, invoice_id, amount, currency, method, paid_at, notes)
  VALUES (v_org_id, v_inv1, 400000, 'JPY', 'bank_transfer', '2026-04-28 15:00:00+09', '三菱UFJより着金確認');

  -- Payments for INV-0002 (paid in full)
  INSERT INTO payments (organization_id, invoice_id, amount, currency, method, paid_at)
  VALUES (v_org_id, v_inv2, 200000, 'JPY', 'bank_transfer', '2026-05-29 10:30:00+09');

  -- Partial payment for INV-0004
  INSERT INTO payments (organization_id, invoice_id, amount, currency, method, stripe_payment_id, paid_at)
  VALUES (v_org_id, v_inv4, 1000, 'USD', 'stripe', 'pi_test_1234567890', '2026-06-15 09:00:00+09');

  -- Time entries for project 1
  INSERT INTO time_entries (organization_id, project_id, client_id, user_id, description, started_at, ended_at, hourly_rate, is_billable, is_invoiced)
  VALUES
    (v_org_id, v_project1, v_client1, v_user_id, 'ワイヤーフレーム作成 — トップページ・サービス紹介ページ', '2026-06-20 10:00:00+09', '2026-06-20 14:00:00+09', 8000, true, false),
    (v_org_id, v_project1, v_client1, v_user_id, 'デザインレビュー MTG 参加・修正対応', '2026-06-22 13:00:00+09', '2026-06-22 15:30:00+09', 8000, true, false),
    (v_org_id, v_project1, v_client1, v_user_id, 'Next.js 実装 — ヘッダー・フッター・ナビゲーション', '2026-06-25 09:00:00+09', '2026-06-25 17:00:00+09', 8000, true, false),
    (v_org_id, v_project1, v_client1, v_user_id, 'Next.js 実装 — ヒーローセクション・アニメーション', '2026-06-26 10:00:00+09', '2026-06-26 16:00:00+09', 8000, true, false),
    (v_org_id, v_project1, v_client1, v_user_id, 'レスポンシブ対応・ブラウザテスト', '2026-06-30 09:00:00+09', '2026-06-30 12:00:00+09', 8000, true, false);

  -- Expenses
  INSERT INTO expenses (organization_id, client_id, project_id, category, vendor, description, amount, currency, is_billable, expense_date)
  VALUES
    (v_org_id, v_client1, v_project1, 'ソフトウェア・ツール', 'Adobe', 'Adobe Creative Cloud 月額プラン（6月分）', 7780, 'JPY', false, '2026-06-01'),
    (v_org_id, v_client2, v_project2, '印刷・出力', '大日本印刷', 'ブランドガイドライン サンプル印刷代', 23000, 'JPY', true, '2026-04-15'),
    (v_org_id, NULL, NULL, '交通費', 'JR東日本', 'クライアント先訪問 新幹線代（東京〜大阪）', 28000, 'JPY', false, '2026-05-20'),
    (v_org_id, NULL, NULL, 'サブスクリプション', 'Figma', 'Figma Professional 月額（6月分）', 4200, 'JPY', false, '2026-06-01');

  -- Recurring invoice
  INSERT INTO recurring_invoices (organization_id, client_id, template, frequency, next_send_date, is_active, auto_send)
  VALUES (
    v_org_id,
    v_client1,
    jsonb_build_object(
      'currency', 'JPY',
      'notes', 'TechBridge コーポレートサイト 保守費用（月次）',
      'footer', 'お振込いただきありがとうございます。',
      'items', jsonb_build_array(
        jsonb_build_object(
          'description', 'Webサイト月次保守・セキュリティアップデート',
          'quantity', 1,
          'unit_price', 30000,
          'tax_rate_name', '消費税 10%'
        )
      )
    ),
    'monthly',
    '2026-08-01',
    true,
    false
  );

  RAISE NOTICE 'Seed data inserted successfully for org: %', v_org_id;
END $$;
