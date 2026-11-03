/**
 * アクセスされたドメインから、どのお店（tenant）かを決める。
 *
 * 決め方:
 *   1. tenants.hosts に一致するドメインがあればそのお店
 *   2. 開発中（NODE_ENV が production 以外）だけ、<slug>.localhost で切り替えられる
 *      （例：http://moveact.localhost:5174）
 *   3. どれにも当たらなければ DEFAULT_TENANT（未設定なら id=1 = Moveact）
 *      Coolify の sslip.io のアドレスで開いたときもここに来る
 *
 * tenants は滅多に変わらないので、1分だけメモリに持つ。
 */
import { db } from './db'
import { tenants } from './db/schema'
import { parseTenantConfig, type TenantConfig } from '../shared/tenantConfig'

export type Tenant = {
  id: number
  slug: string
  hosts: string[]
  config: TenantConfig
  notifyCode: string | null
}

const CACHE_MS = 60_000
let cache: { at: number; list: Tenant[] } | null = null

export async function listTenants(): Promise<Tenant[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.list
  const rows = await db.select().from(tenants)
  const list = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    hosts: r.hosts.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean),
    config: parseTenantConfig(r.config),
    notifyCode: r.notifyCode?.trim() || null,
  }))
  cache = { at: Date.now(), list }
  return list
}

export async function resolveTenant(host: string | undefined): Promise<Tenant> {
  const list = await listTenants()
  if (list.length === 0) throw new Error('tenants が空です。npm run migrate を実行してください')
  const h = (host ?? '').toLowerCase().replace(/:\d+$/, '')

  const byHost = list.find((t) => t.hosts.includes(h))
  if (byHost) return byHost

  if (process.env.NODE_ENV !== 'production') {
    const slug = h.endsWith('.localhost') ? h.slice(0, -'.localhost'.length) : ''
    const bySlug = list.find((t) => t.slug === slug)
    if (bySlug) return bySlug
  }

  const fallback = process.env.DEFAULT_TENANT
  return list.find((t) => t.slug === fallback) ?? list.find((t) => t.id === 1) ?? list[0]
}
