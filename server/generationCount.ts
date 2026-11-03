/**
 * AIで下書きを作った回数を、お店・月（日本時間）ごとに数える。
 *
 * review_history は「Googleの投稿画面へ進んだとき」にしか残らないので、
 * AIを何回呼んだか（＝AI利用料がいくらかかったか）はそちらでは分からない。
 * そのため生成に成功するたびに1つ足す。上限（monthlyLimit）の判定にも使う。
 */
import { sql } from 'drizzle-orm'
import { db } from './db'

/** 日本時間の今月を YYYY-MM で返す */
export function currentMonthJst(now = new Date()): string {
  const j = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return `${j.getUTCFullYear()}-${String(j.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function getGenerationCount(tenantId: number, month: string): Promise<number> {
  const res = (await db.execute(
    sql`SELECT count FROM generation_counts WHERE tenant_id = ${tenantId} AND month = ${month}`,
  )) as unknown as [{ count: number }[]]
  return Number(res[0]?.[0]?.count ?? 0)
}

export async function addGeneration(tenantId: number, month: string) {
  await db.execute(sql`INSERT INTO generation_counts (tenant_id, month, count) VALUES (${tenantId}, ${month}, 1)
    ON DUPLICATE KEY UPDATE count = count + 1`)
}
