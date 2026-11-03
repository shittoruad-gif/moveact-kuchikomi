/**
 * 月次レポートの自動送信
 *
 * なぜ必要か:
 *   月額をいただく以上、毎月なにかお届けする必要がある。それがこのレポート。
 *   ただし人が毎月コマンドを叩いて送るのでは人件費が乗ってしまうので、
 *   毎月1日の朝に自動で公式LINEへ送る。人の手は入らない。
 *
 * 送り先:
 *   しっとる通知ハブ（shittoru-notify-hub）経由で、お客様の公式LINEへ届く。
 *   このアプリはLINEのトークンを持たない。持つとお客様が増えるたびに
 *   アプリごとの設定が必要になるため、宛先の管理はハブに寄せている。
 *   お店ごとに tenants.notify_code（ハブのご契約コード）を持ち、
 *   NOTIFY_HUB_URL / NOTIFY_HUB_KEY と notify_code が揃ったお店だけ送る。
 *   Moveact は 2026-10-01 三上様指示で止めている（notify_code が空）。
 *
 * 二重送信の防止:
 *   report_deliveries に (tenant_id, month) を UNIQUE で入れてから送る。
 *   サーバーが再起動しても、同じお店の同じ月を二度送らない。
 */
import { db } from './db'
import { sql, type SQL } from 'drizzle-orm'
import { listTenants, type Tenant } from './tenant'
import { getGenerationCount } from './generationCount'

const TZ_OFFSET_MS = 9 * 60 * 60 * 1000 // JST

function jstNow(now = new Date()) {
  return new Date(now.getTime() + TZ_OFFSET_MS)
}

/** 送信対象の月（前月）を YYYY-MM で返す */
export function targetMonth(now = new Date()): string {
  const j = jstNow(now)
  const y = j.getUTCFullYear()
  const m = j.getUTCMonth() // 0-11。前月にするので、そのまま使うと1つ前になる
  const d = new Date(Date.UTC(y, m - 1, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01 00:00:00`
  const next = new Date(Date.UTC(y, m, 1))
  const to = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01 00:00:00`
  return { from, to }
}

export type Report = {
  month: string
  drafts: number
  /** AIで案を作った回数（Googleの投稿画面へ進まなかった分も含む） */
  generations: number
  people: number
  prevDrafts: number
  byStore: { name: string; n: number }[]
  byMenu: { name: string; n: number }[]
  consent: { checked: number; realExperience: number; notRelated: number }
}

export async function buildReport(tenantId: number, month: string): Promise<Report> {
  const { from, to } = monthRange(month)
  type Row = Record<string, unknown>
  // mysql2 は [rows, fields] を返す。rows だけ取り出す
  const one = async (q: SQL): Promise<Row[]> => {
    const r = (await db.execute(q)) as unknown
    return Array.isArray(r) ? (Array.isArray(r[0]) ? (r[0] as Row[]) : (r as Row[])) : []
  }

  const total = await one(sql`SELECT COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS people
    FROM review_history WHERE tenant_id = ${tenantId} AND created_at >= ${from} AND created_at < ${to}`)
  const prev = await one(sql`SELECT COUNT(*) AS n FROM review_history
    WHERE tenant_id = ${tenantId} AND created_at >= DATE_SUB(${from}, INTERVAL 1 MONTH) AND created_at < ${from}`)
  const byStore = await one(sql`SELECT store_name AS name, COUNT(*) AS n
    FROM review_history WHERE tenant_id = ${tenantId} AND created_at >= ${from} AND created_at < ${to}
    GROUP BY store_name ORDER BY n DESC`)
  const byMenu = await one(sql`SELECT menu_names AS name, COUNT(*) AS n
    FROM review_history WHERE tenant_id = ${tenantId} AND created_at >= ${from} AND created_at < ${to}
    GROUP BY menu_names ORDER BY n DESC LIMIT 5`)
  const consent = await one(sql`SELECT COUNT(*) AS n,
      SUM(confirmed_real_experience) AS real_exp, SUM(is_not_related) AS not_related
    FROM review_history WHERE tenant_id = ${tenantId} AND created_at >= ${from} AND created_at < ${to}`)

  const t = total[0] ?? { n: 0, people: 0 }
  const p = prev[0] ?? { n: 0 }
  const c = consent[0] ?? { n: 0, real_exp: 0, not_related: 0 }

  return {
    month,
    drafts: Number(t.n ?? 0),
    generations: await getGenerationCount(tenantId, month),
    people: Number(t.people ?? 0),
    prevDrafts: Number(p.n ?? 0),
    byStore: byStore.map((r) => ({ name: String(r.name), n: Number(r.n) })),
    byMenu: byMenu.map((r) => ({ name: String(r.name), n: Number(r.n) })),
    consent: {
      checked: Number(c.n ?? 0),
      realExperience: Number(c.real_exp ?? 0),
      notRelated: Number(c.not_related ?? 0),
    },
  }
}

/** LINEのトークに流す文面。長くしすぎない（スマホで読める量に収める） */
export function formatForLine(r: Report): string {
  const [y, m] = r.month.split('-')
  const diff = r.drafts - r.prevDrafts
  const sign = diff > 0 ? '＋' : diff < 0 ? '−' : '±'
  const jp = (n: number) => n.toLocaleString()

  const lines: string[] = []
  lines.push(`${y}年${Number(m)}月のご利用状況`)
  lines.push('')
  lines.push(`口コミの下書きが ${jp(r.drafts)}件 つくられました`)
  lines.push(`（AIで案を作った回数は ${jp(r.generations)}回）`)
  lines.push(`ご利用いただいた方 ${jp(r.people)}人`)
  lines.push(`前月（${jp(r.prevDrafts)}件）から ${sign}${jp(Math.abs(diff))}件`)

  if (r.byStore.length > 1) {
    lines.push('')
    lines.push('【店舗別】')
    for (const s of r.byStore) lines.push(`・${s.name}\u3000${jp(s.n)}件`)
  }
  if (r.byMenu.length) {
    lines.push('')
    lines.push('【よく選ばれたメニュー】')
    for (const s of r.byMenu.slice(0, 3)) lines.push(`・${s.name}\u3000${jp(s.n)}件`)
  }
  if (r.consent.checked > 0) {
    lines.push('')
    lines.push('【確認チェックの通過状況】')
    lines.push(`実体験の確認 ${jp(r.consent.realExperience)}/${jp(r.consent.checked)}`)
    lines.push(`関係者でないことの確認 ${jp(r.consent.notRelated)}/${jp(r.consent.checked)}`)
  }
  lines.push('')
  lines.push('※ この数字は「下書きがつくられた回数」です。実際にGoogleマップへ投稿されたかどうかは、こちらでは分かりません。投稿数はGoogleビジネスプロフィールでご確認ください。')

  return lines.join('\n')
}

/**
 * しっとる通知ハブ経由で送る。
 *
 * 各アプリが直接LINEのトークンを持つと、お客様が増えるたびに
 * アプリごと・お客様ごとの設定が必要になり、工数が積み上がる。
 * ハブに「どのご契約（code）へ」だけ伝えれば、宛先はハブが知っている。
 */
async function pushLine(code: string, text: string, dedupeKey: string): Promise<boolean> {
  const url = process.env.NOTIFY_HUB_URL
  const key = process.env.NOTIFY_HUB_KEY
  if (!url || !key) {
    console.log('[MonthlyReport] 通知ハブの設定が無いため送信をスキップ（NOTIFY_HUB_URL / NOTIFY_HUB_KEY）')
    return false
  }
  const res = await fetch(`${url.replace(/\/$/, '')}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ code, service: 'kuchikomi', text, dedupeKey }),
  })
  const body = await res.text().catch(() => '')
  if (!res.ok) {
    console.error('[MonthlyReport] 通知ハブへの送信に失敗', res.status, body.slice(0, 200))
    return false
  }
  return true
}

/** 同じ月を二度送らないための記録。先に入れてから送る。 */
async function claimMonth(tenantId: number, month: string): Promise<boolean> {
  try {
    await db.execute(
      sql`INSERT INTO report_deliveries (tenant_id, month, sent_at) VALUES (${tenantId}, ${month}, NOW())`,
    )
    return true
  } catch {
    return false // UNIQUE制約に当たった＝送信済み
  }
}

/**
 * 送れなかった月の記録は消す。
 *
 * 記録を残したまま失敗扱いにすると、次のティックで「送信済み」と判断されて
 * その月は永久に届かなくなる。実際に2026年9月1日、通知ハブの設定が入る前に
 * スケジューラが動いて、8月分がこの状態になった。
 * 記録は「二重送信を防ぐための一時的な予約」であって、成功の証ではない。
 */
async function releaseMonth(tenantId: number, month: string) {
  await db.execute(sql`DELETE FROM report_deliveries WHERE tenant_id = ${tenantId} AND month = ${month}`)
}

async function markSent(tenantId: number, month: string) {
  await db.execute(
    sql`UPDATE report_deliveries SET status = 'sent' WHERE tenant_id = ${tenantId} AND month = ${month}`,
  )
}

/** 1つのお店の月次レポートを送る */
async function runForTenant(tenant: Tenant, month: string, force: boolean) {
  const label = `${tenant.slug} ${month}`
  // 送り先が無いお店は予約も入れない（あとで notify_code を入れたら、その月から送れるように）
  if (!tenant.notifyCode) return { tenant: tenant.slug, skipped: true, month }
  if (!force) {
    const claimed = await claimMonth(tenant.id, month)
    if (!claimed) {
      console.log(`[MonthlyReport] ${label} は送信済みのためスキップ`)
      return { tenant: tenant.slug, skipped: true, month }
    }
  }
  const report = await buildReport(tenant.id, month)
  const text = formatForLine(report)
  const ok = await pushLine(tenant.notifyCode, text, `kuchikomi:${tenant.slug}:${month}`)
  if (!force) {
    if (ok) await markSent(tenant.id, month)
    else await releaseMonth(tenant.id, month) // 次のティックでやり直す
  }
  console.log(`[MonthlyReport] ${label} 下書き${report.drafts}件 送信=${ok ? '成功' : '未送信'}`)
  return { tenant: tenant.slug, skipped: false, month, sent: ok, drafts: report.drafts }
}

/**
 * 月次レポートを、送り先（notify_code）のあるお店すべてに送る。毎月1日の朝に呼ばれる。
 * 1つのお店で失敗しても、ほかのお店は送る。
 * @param opts.month 明示指定（省略時は前月）
 * @param opts.force 送信済みでも送る（手動の再送用）
 */
export async function runMonthlyReport(opts: { month?: string; force?: boolean } = {}) {
  const month = opts.month ?? targetMonth()
  const results = []
  for (const tenant of await listTenants()) {
    try {
      results.push(await runForTenant(tenant, month, !!opts.force))
    } catch (e) {
      console.error(`[MonthlyReport] ${tenant.slug} ${month} 実行エラー`, e)
    }
  }
  return results
}

/**
 * スケジューラ。毎月1日の朝9時以降に送る。
 * 1時間ごとに時刻を見るだけの素朴な方式（node-cronを足さずに済ませる）。
 * 起動直後にも1回見るので、1日にサーバーが再起動しても取りこぼさない。
 *
 * 送信の窓を「1日の9時ちょうど」ではなく「1〜3日の9時以降」にしてある。
 * 1時間だけの窓だと、その瞬間に設定が欠けていたりネットワークが不調だと
 * その月は二度と試されない。実際に2026年9月1日の9時にそれが起きた。
 * 送信済みかどうかは report_deliveries で見ているので、窓を広げても二重には送らない。
 */
export function initMonthlyReportScheduler() {
  const tick = async () => {
    const j = jstNow()
    if (j.getUTCDate() > 3 || j.getUTCHours() < 9) return
    try {
      await runMonthlyReport()
    } catch (e) {
      console.error('[MonthlyReport] 実行エラー', e)
    }
  }
  // 起動時に1回＋以後1時間ごと
  setTimeout(tick, 20_000)
  const timer = setInterval(tick, 60 * 60 * 1000)
  if (timer.unref) timer.unref()
  console.log('[MonthlyReport] スケジューラを開始（毎月1日 9:00 JST）')
}
