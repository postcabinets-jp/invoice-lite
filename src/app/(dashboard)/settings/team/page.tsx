import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { UserPlus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import TeamMemberActions from './TeamMemberActions'
import InviteForm from './InviteForm'
import type { OrgMember, OrgRole } from '@/types/database'

const ROLE_LABEL: Record<OrgRole, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
  accountant: '経理担当',
}

const ROLE_CLASS: Record<OrgRole, string> = {
  owner: 'bg-zinc-900 text-white',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-zinc-100 text-zinc-600',
  accountant: 'bg-purple-100 text-purple-700',
}

const ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  owner: 'すべての操作が可能。組織の削除も可能',
  admin: '請求書・クライアント・設定の管理が可能',
  member: '請求書・クライアントの閲覧・作成が可能',
  accountant: '請求書・レポートの閲覧のみ可能',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr))
}

type MemberRow = OrgMember & { user_email: string | null }

export default async function TeamPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: selfMember } = await supabase
    .from('org_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()
  if (!selfMember) redirect('/register')
  const selfMemberTyped = selfMember as { organization_id: string; role: string }
  const orgId = selfMemberTyped.organization_id
  const myRole = selfMemberTyped.role as OrgRole

  const { data: membersData } = await supabase
    .from('org_members')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at')

  const members = (membersData ?? []) as MemberRow[]

  async function inviteMember(formData: FormData) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    const { data: m } = await supabase2
      .from('org_members')
      .select('organization_id, role')
      .eq('user_id', u.id)
      .single()
    if (!m) return
    const mTyped = m as unknown as { organization_id: string; role: string }
    if (!['owner', 'admin'].includes(mTyped.role)) return

    const email = formData.get('email') as string
    const role = formData.get('role') as OrgRole

    // In a real app, send invitation email via Resend
    // For now, create a pending member record with invited_email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase2.from('org_members') as any).insert({
      organization_id: mTyped.organization_id,
      user_id: u.id, // placeholder — will be replaced when user accepts invite
      role,
      invited_email: email,
      joined_at: null,
    })

    revalidatePath('/settings/team')
  }

  async function changeRole(memberId: string, newRole: OrgRole) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    const { data: m } = await supabase2
      .from('org_members')
      .select('role')
      .eq('user_id', u.id)
      .single()
    const mRole = (m as unknown as { role: string } | null)?.role ?? ''
    if (!['owner', 'admin'].includes(mRole)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase2.from('org_members') as any).update({ role: newRole }).eq('id', memberId)
    revalidatePath('/settings/team')
  }

  async function removeMember(memberId: string) {
    'use server'
    const supabase2 = await createClient()
    const {
      data: { user: u },
    } = await supabase2.auth.getUser()
    if (!u) return
    const { data: m } = await supabase2
      .from('org_members')
      .select('role')
      .eq('user_id', u.id)
      .single()
    const mRole2 = (m as unknown as { role: string } | null)?.role ?? ''
    if (!['owner', 'admin'].includes(mRole2)) return
    await supabase2.from('org_members').delete().eq('id', memberId)
    revalidatePath('/settings/team')
  }

  const canManage = ['owner', 'admin'].includes(myRole)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          設定
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">チーム管理</h1>
          <p className="text-sm text-zinc-500 mt-0.5">メンバーの招待とロール管理</p>
        </div>
        {canManage && (
          <InviteForm onInvite={inviteMember} />
        )}
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.entries(ROLE_DESCRIPTIONS) as [OrgRole, string][]).map(([role, desc]) => (
          <div key={role} className="rounded-lg border border-zinc-200 p-3">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CLASS[role]}`}>
              {ROLE_LABEL[role]}
            </span>
            <p className="text-xs text-zinc-500 mt-2">{desc}</p>
          </div>
        ))}
      </div>

      {/* Members table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-900">
            メンバー ({members.length}名)
          </h2>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60">
              <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">メール</th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">ロール</th>
              <th className="px-5 py-2.5 text-left text-xs font-medium text-zinc-400">参加日</th>
              {canManage && (
                <th className="px-5 py-2.5 text-right text-xs font-medium text-zinc-400">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {members.map((m) => {
              const isMe = m.user_id === user.id
              const isPending = !m.joined_at && m.invited_email

              return (
                <tr key={m.id} className="hover:bg-zinc-50/60">
                  <td className="px-5 py-3">
                    <div>
                      <p className="text-zinc-800">{m.invited_email ?? m.user_id}</p>
                      {isPending && (
                        <span className="text-xs text-amber-600">招待中</span>
                      )}
                      {isMe && (
                        <span className="text-xs text-zinc-400">（あなた）</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_CLASS[m.role as OrgRole]}`}>
                      {ROLE_LABEL[m.role as OrgRole] ?? m.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-zinc-500 text-xs tabular-nums">
                    {formatDate(m.joined_at ?? m.created_at)}
                  </td>
                  {canManage && (
                    <td className="px-5 py-3">
                      {!isMe && (
                        <TeamMemberActions
                          memberId={m.id}
                          currentRole={m.role as OrgRole}
                          onChangeRole={changeRole}
                          onRemove={removeMember}
                        />
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
