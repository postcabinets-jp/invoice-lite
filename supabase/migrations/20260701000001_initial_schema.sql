-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- =============================================
-- ORGANIZATIONS（マルチテナント基盤）
-- =============================================
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  logo_url      TEXT,
  currency      TEXT NOT NULL DEFAULT 'JPY',
  timezone      TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV',
  next_invoice_number INT NOT NULL DEFAULT 1,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ORG_MEMBERS（ユーザー × 組織 × ロール）
-- =============================================
CREATE TABLE org_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'accountant')),
  invited_email   TEXT,
  joined_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "org_member_select" ON organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "org_member_update" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "org_insert" ON organizations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for org_members
CREATE POLICY "members_can_read_own_org" ON org_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "owners_manage_members" ON org_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "insert_own_membership" ON org_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =============================================
-- CLIENTS
-- =============================================
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT NOT NULL DEFAULT 'JP',
  tax_number      TEXT,
  currency        TEXT,
  notes           TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  portal_token    TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_clients_rls" ON clients
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_clients_org ON clients(organization_id);

-- =============================================
-- TAX_RATES
-- =============================================
CREATE TABLE tax_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  rate            NUMERIC(5,2) NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_tax_rates_rls" ON tax_rates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- INVOICES
-- =============================================
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id),
  number          TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','sent','viewed','partial','paid','overdue','cancelled')),
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  currency        TEXT NOT NULL DEFAULT 'JPY',
  subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_due      NUMERIC(14,2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  notes           TEXT,
  footer          TEXT,
  stripe_payment_link TEXT,
  sent_at         TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  recurring_id    UUID,
  is_estimate     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_invoices_rls" ON invoices
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date) WHERE status NOT IN ('paid','cancelled');
CREATE INDEX idx_invoices_client ON invoices(client_id);

-- =============================================
-- INVOICE_ITEMS
-- =============================================
CREATE TABLE invoice_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate_id     UUID REFERENCES tax_rates(id),
  tax_amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL DEFAULT 0,
  position        INT NOT NULL DEFAULT 0,
  time_entry_id   UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items_via_invoice" ON invoice_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (
        SELECT organization_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id        UUID NOT NULL REFERENCES invoices(id),
  amount            NUMERIC(14,2) NOT NULL,
  currency          TEXT NOT NULL DEFAULT 'JPY',
  method            TEXT NOT NULL CHECK (method IN ('stripe','bank_transfer','cash','other')),
  stripe_payment_id TEXT UNIQUE,
  notes             TEXT,
  paid_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_payments_rls" ON payments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- PROJECTS
-- =============================================
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','completed','archived')),
  hourly_rate     NUMERIC(10,2),
  budget_hours    NUMERIC(10,2),
  budget_amount   NUMERIC(14,2),
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_projects_rls" ON projects
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- TIME_ENTRIES
-- =============================================
CREATE TABLE time_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES projects(id),
  client_id       UUID REFERENCES clients(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  description     TEXT,
  started_at      TIMESTAMPTZ NOT NULL,
  ended_at        TIMESTAMPTZ,
  duration_minutes INT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
  ) STORED,
  hourly_rate     NUMERIC(10,2),
  is_billable     BOOLEAN NOT NULL DEFAULT true,
  is_invoiced     BOOLEAN NOT NULL DEFAULT false,
  invoice_item_id UUID REFERENCES invoice_items(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_time_entries_rls" ON time_entries
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_uninvoiced ON time_entries(organization_id, is_invoiced)
  WHERE is_billable = true AND is_invoiced = false;

-- =============================================
-- EXPENSES
-- =============================================
CREATE TABLE expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  project_id      UUID REFERENCES projects(id),
  category        TEXT NOT NULL,
  vendor          TEXT,
  description     TEXT,
  amount          NUMERIC(14,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'JPY',
  receipt_url     TEXT,
  is_billable     BOOLEAN NOT NULL DEFAULT false,
  is_invoiced     BOOLEAN NOT NULL DEFAULT false,
  invoice_item_id UUID REFERENCES invoice_items(id),
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_expenses_rls" ON expenses
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- RECURRING_INVOICES
-- =============================================
CREATE TABLE recurring_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id),
  template          JSONB NOT NULL,
  frequency         TEXT NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  next_send_date    DATE NOT NULL,
  end_date          DATE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  auto_send         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_recurring_rls" ON recurring_invoices
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_updated_at BEFORE UPDATE ON recurring_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
