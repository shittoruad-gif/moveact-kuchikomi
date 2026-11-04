/**
 * 解約したお店の提供を終える。契約書第10条第3項・第11条第3項のため。
 *
 *   npm run end-tenant -- <slug>                         … 今の状態と件数を見るだけ（何も変えない）
 *   npm run end-tenant -- <slug> --apply                 … 提供を終える（ended_at を入れるだけ。データは消さない）
 *   npm run end-tenant -- <slug> --delete-data --apply   … 終えたお店のお客様のデータを消す
 *
 * 提供を終えると、そのお店のアドレスを開いても「ご利用を終了しました」と出て、作成も記録もできなくなる。
 * データの削除は取り消せないので、三上様の承諾を得てから、承諾された範囲だけ行う（CLAUDE.md 守ること 8）。
 * 消すのは来店客のデータ（review_history）と作成回数（generation_counts）だけ。
 * お店の設定（tenants・stores・menus）と月次レポートの送信記録は、請求・記録のために残す。
 */
import mysql, { type ResultSetHeader, type RowDataPacket } from 'mysql2/promise'

async function main() {
  const [slug] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const apply = process.argv.includes('--apply')
  const deleteData = process.argv.includes('--delete-data')
  if (!slug) throw new Error('お店の slug を指定してください（例：npm run end-tenant -- sample）')
  if (slug === 'moveact') throw new Error('Moveact（自社）はこの手順の対象外です')
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL が設定されていません')

  const conn = await mysql.createConnection(process.env.DATABASE_URL)
  try {
    const [rows] = await conn.query<RowDataPacket[]>('SELECT id, ended_at FROM tenants WHERE slug = ?', [slug])
    if (!rows.length) throw new Error(`お店「${slug}」はありません`)
    const { id, ended_at: endedAt } = rows[0]
    const [[h]] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM review_history WHERE tenant_id = ?', [id])
    const [[g]] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) AS n FROM generation_counts WHERE tenant_id = ?', [id])
    console.log(`お店: ${slug}（tenant_id=${id}）`)
    console.log(`状態: ${endedAt ? `提供を終えています（${endedAt}）` : '提供中'}`)
    console.log(`来店客のデータ: ${h.n}件 ／ 作成回数の記録: ${g.n}件`)

    if (!apply) {
      console.log('\n確認だけしました。提供を終えるときは --apply、データを消すときは --delete-data --apply を付けてください。')
      return
    }

    if (!deleteData) {
      if (endedAt) {
        console.log('\nもう提供を終えています。何も変えていません。')
        return
      }
      await conn.query('UPDATE tenants SET ended_at = NOW() WHERE id = ? AND ended_at IS NULL', [id])
      console.log('\n提供を終えました（データは残っています）。アプリは1分以内に「ご利用を終了しました」に変わります。')
      console.log('Coolify の Domains からこのお店のドメインを外すのは、夜間の反映と一緒に行ってください。')
      return
    }

    // データの削除は、提供を終えたお店だけ
    if (!endedAt) throw new Error('まだ提供中です。先に --apply だけで提供を終えてください')
    await conn.beginTransaction()
    const [r1] = await conn.query<ResultSetHeader>('DELETE FROM review_history WHERE tenant_id = ?', [id])
    const [r2] = await conn.query<ResultSetHeader>('DELETE FROM generation_counts WHERE tenant_id = ?', [id])
    await conn.commit()
    console.log(`\n削除しました：来店客のデータ ${r1.affectedRows}件 ／ 作成回数の記録 ${r2.affectedRows}件`)
  } catch (e) {
    await conn.rollback().catch(() => {})
    throw e
  } finally {
    await conn.end()
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  },
)
