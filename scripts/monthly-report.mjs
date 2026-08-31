/**
 * 口コミ作成アプリ 月次レポート
 *
 * サブスクでいただく月額の「お返し」として、毎月お客様にお送りする数字を出す。
 * 月額をいただく以上、毎月なにか届く必要があるため、これが最低限の成果物になる。
 *
 * 使い方:
 *   node scripts/monthly-report.mjs                 … 先月分
 *   node scripts/monthly-report.mjs 2026-08         … 指定月
 *   node scripts/monthly-report.mjs 2026-08 --json  … JSON出力
 *
 * 接続は DATABASE_URL（MySQL）。VPS上のコンテナ内で実行する想定。
 *
 * ※ 正直に書くこと: このアプリで分かるのは「下書きが何件つくられたか」まで。
 *   実際にGoogleマップへ投稿されたかは、こちらからは分かりません（Google側の仕様）。
 *   レポートにもその旨を必ず書くこと。
 */
import mysql from 'mysql2/promise'

const arg = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const asJson = process.argv.includes('--json')

function targetMonth() {
  if (arg[0] && /^\d{4}-\d{2}$/.test(arg[0])) return arg[0]
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const month = targetMonth()
const from = `${month}-01 00:00:00`
const to = (() => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 1) // 翌月1日
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01 00:00:00`
})()

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL が設定されていません')
  process.exit(1)
}

const conn = await mysql.createConnection(url)

const [total] = await conn.query(
  `SELECT COUNT(*) AS n, COUNT(DISTINCT visitor_id) AS people
     FROM review_history WHERE created_at >= ? AND created_at < ?`,
  [from, to]
)
const [byStore] = await conn.query(
  `SELECT store_name, COUNT(*) AS n
     FROM review_history WHERE created_at >= ? AND created_at < ?
    GROUP BY store_name ORDER BY n DESC`,
  [from, to]
)
const [byMenu] = await conn.query(
  `SELECT menu_names, COUNT(*) AS n
     FROM review_history WHERE created_at >= ? AND created_at < ?
    GROUP BY menu_names ORDER BY n DESC LIMIT 10`,
  [from, to]
)
const [prev] = await conn.query(
  `SELECT COUNT(*) AS n FROM review_history
    WHERE created_at >= DATE_SUB(?, INTERVAL 1 MONTH) AND created_at < ?`,
  [from, from]
)
// 同意チェックが正しく機能しているか（ステマ規制対応の証跡）
const [consent] = await conn.query(
  `SELECT
      SUM(confirmed_real_experience) AS real_exp,
      SUM(is_not_related) AS not_related,
      SUM(agreed_to_terms) AS agreed,
      COUNT(*) AS n
     FROM review_history WHERE created_at >= ? AND created_at < ?`,
  [from, to]
)

await conn.end()

const t = total[0]
const p = prev[0]
const c = consent[0]
const diff = t.n - p.n
const report = {
  month,
  drafts: t.n,
  people: t.people,
  prevMonthDrafts: p.n,
  diff,
  byStore,
  byMenu,
  consent: {
    checked: c.n,
    realExperience: Number(c.real_exp || 0),
    notRelated: Number(c.not_related || 0),
    agreedToTerms: Number(c.agreed || 0),
  },
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
  process.exit(0)
}

const jp = (n) => Number(n).toLocaleString()
console.log(`\n口コミ作成アプリ ${month} のご利用状況\n${'─'.repeat(44)}`)
console.log(`下書きが作られた回数        ${jp(t.n)} 件`)
console.log(`ご利用いただいた人数        ${jp(t.people)} 人`)
console.log(`前月（${jp(p.n)}件）との差   ${diff >= 0 ? '＋' : ''}${jp(diff)} 件`)

if (byStore.length) {
  console.log(`\n店舗別`)
  for (const r of byStore) console.log(`  ${r.store_name}　${jp(r.n)} 件`)
}
if (byMenu.length) {
  console.log(`\nよく選ばれたメニュー（上位10）`)
  for (const r of byMenu) console.log(`  ${r.menu_names}　${jp(r.n)} 件`)
}
console.log(`\n確認チェックの通過状況（ステマ規制対応の証跡）`)
console.log(`  実体験であることの確認      ${jp(c.real_exp || 0)} / ${jp(c.n)}`)
console.log(`  店舗関係者でないことの確認  ${jp(c.not_related || 0)} / ${jp(c.n)}`)
console.log(`  利用規約への同意            ${jp(c.agreed || 0)} / ${jp(c.n)}`)

console.log(`\n${'─'.repeat(44)}`)
console.log(`※ この数字は「下書きが作られた回数」です。`)
console.log(`   実際にGoogleマップへ投稿されたかどうかは、こちらからは分かりません。`)
console.log(`   Googleマップの口コミ件数は、店舗さまのGoogleビジネスプロフィールでご確認ください。\n`)
