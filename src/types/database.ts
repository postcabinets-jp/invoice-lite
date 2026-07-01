export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          currency: string
          timezone: string
          invoice_prefix: string
          next_invoice_number: number
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          currency?: string
          timezone?: string
          invoice_prefix?: string
          next_invoice_number?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
        Relationships: []
      }
      org_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'accountant'
          invited_email: string | null
          joined_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member' | 'accountant'
          invited_email?: string | null
          joined_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['org_members']['Insert']>
        Relationships: [
          {
            foreignKeyName: "org_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          address: string | null
          city: string | null
          country: string
          tax_number: string | null
          currency: string | null
          notes: string | null
          is_archived: boolean
          portal_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          email?: string | null
          phone?: string | null
          company?: string | null
          address?: string | null
          city?: string | null
          country?: string
          tax_number?: string | null
          currency?: string | null
          notes?: string | null
          is_archived?: boolean
          portal_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      tax_rates: {
        Row: {
          id: string
          organization_id: string
          name: string
          rate: number
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          rate: number
          is_default?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['tax_rates']['Insert']>
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          number: string
          status: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          issue_date: string
          due_date: string | null
          currency: string
          subtotal: number
          tax_total: number
          discount_amount: number
          total: number
          amount_paid: number
          amount_due: number
          notes: string | null
          footer: string | null
          stripe_payment_link: string | null
          sent_at: string | null
          viewed_at: string | null
          paid_at: string | null
          recurring_id: string | null
          is_estimate: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          number: string
          status?: 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled'
          issue_date?: string
          due_date?: string | null
          currency?: string
          subtotal?: number
          tax_total?: number
          discount_amount?: number
          total?: number
          amount_paid?: number
          notes?: string | null
          footer?: string | null
          stripe_payment_link?: string | null
          sent_at?: string | null
          viewed_at?: string | null
          paid_at?: string | null
          recurring_id?: string | null
          is_estimate?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          tax_rate_id: string | null
          tax_amount: number
          total: number
          position: number
          time_entry_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          tax_rate_id?: string | null
          tax_amount?: number
          total?: number
          position?: number
          time_entry_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          organization_id: string
          invoice_id: string
          amount: number
          currency: string
          method: 'stripe' | 'bank_transfer' | 'cash' | 'other'
          stripe_payment_id: string | null
          notes: string | null
          paid_at: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          invoice_id: string
          amount: number
          currency?: string
          method: 'stripe' | 'bank_transfer' | 'cash' | 'other'
          stripe_payment_id?: string | null
          notes?: string | null
          paid_at?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          name: string
          description: string | null
          status: 'active' | 'completed' | 'archived'
          hourly_rate: number | null
          budget_hours: number | null
          budget_amount: number | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          name: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          hourly_rate?: number | null
          budget_hours?: number | null
          budget_amount?: number | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      time_entries: {
        Row: {
          id: string
          organization_id: string
          project_id: string | null
          client_id: string | null
          user_id: string
          description: string | null
          started_at: string
          ended_at: string | null
          duration_minutes: number | null
          hourly_rate: number | null
          is_billable: boolean
          is_invoiced: boolean
          invoice_item_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          project_id?: string | null
          client_id?: string | null
          user_id: string
          description?: string | null
          started_at: string
          ended_at?: string | null
          duration_minutes?: number | null
          hourly_rate?: number | null
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_item_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['time_entries']['Insert']>
        Relationships: [
          {
            foreignKeyName: "time_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      expenses: {
        Row: {
          id: string
          organization_id: string
          client_id: string | null
          project_id: string | null
          category: string
          vendor: string | null
          description: string | null
          amount: number
          currency: string
          receipt_url: string | null
          is_billable: boolean
          is_invoiced: boolean
          invoice_item_id: string | null
          expense_date: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id?: string | null
          project_id?: string | null
          category: string
          vendor?: string | null
          description?: string | null
          amount: number
          currency?: string
          receipt_url?: string | null
          is_billable?: boolean
          is_invoiced?: boolean
          invoice_item_id?: string | null
          expense_date?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      recurring_invoices: {
        Row: {
          id: string
          organization_id: string
          client_id: string
          template: Json
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          next_send_date: string
          end_date: string | null
          is_active: boolean
          auto_send: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          client_id: string
          template: Json
          frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
          next_send_date: string
          end_date?: string | null
          is_active?: boolean
          auto_send?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['recurring_invoices']['Insert']>
        Relationships: [
          {
            foreignKeyName: "recurring_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrgMember = Database['public']['Tables']['org_members']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type TaxRate = Database['public']['Tables']['tax_rates']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']
export type RecurringInvoice = Database['public']['Tables']['recurring_invoices']['Row']

export type InvoiceStatus = Invoice['status']
export type OrgRole = OrgMember['role']
export type PaymentMethod = Payment['method']
export type ProjectStatus = Project['status']
export type RecurringFrequency = RecurringInvoice['frequency']

export type InvoiceWithClient = Invoice & { clients: Pick<Client, 'name' | 'email' | 'company'> }
export type InvoiceWithItems = Invoice & { invoice_items: InvoiceItem[]; clients: Client }
