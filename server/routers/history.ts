import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, activeProcedure } from '../trpc'
import { db } from '../db'
import { reviewHistory, stores } from '../db/schema'
import { SOURCES } from '../../shared/source'
import { normalizeReviewRef } from '../../shared/reviewRef'

/**
 * Moveact の予約システムへ「この目印の方が下書きを作ってGoogleマップへ進んだ」と知らせる先。
 * 知らせるのは目印と、Googleマップへ持っていった口コミの文章（2026-11-23 三上様：Googleに実際に
 * 投稿されたかを、Googleの口コミの文章と見比べて確かめるため。画面にもその旨を出している）。
 * お名前・連絡先は送らない。Moveact（お店の id=1）のときだけ使う。
 * 知らせに失敗しても、お客様の操作は止めない。
 */
const MOVEACT_REVIEW_WEBHOOK =
  process.env.MOVEACT_REVIEW_WEBHOOK_URL ?? 'https://khsriogicdjdyivshplc.supabase.co/functions/v1/review-written'

function notifyReviewWritten(ref: string, text: string): void {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  fetch(MOVEACT_REVIEW_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, text: text.slice(0, 4000) }),
    signal: ctrl.signal,
  })
    .then((r) => { if (!r.ok) console.warn('[review-ref] 知らせに失敗', r.status) })
    .catch((e) => console.warn('[review-ref] 知らせに失敗', e instanceof Error ? e.message : String(e)))
    .finally(() => clearTimeout(timer))
}
import { eq, and, desc } from 'drizzle-orm'

export const historyRouter = router({
  save: activeProcedure
    .input(
      z.object({
        visitorId: z.string(),
        storeId: z.number(),
        storeName: z.string(),
        menuNames: z.string(),
        reviewText: z.string(),
        visitDate: z.string(),
        agreedToTerms: z.number(),
        confirmedRealExperience: z.number(),
        isNotRelated: z.number(),
        // 古い画面（キャッシュ）からは来ないので省略可
        source: z.enum(SOURCES).optional(),
        // お店からのご案内リンクの目印（shared/reviewRef.ts）。DBには入れず、予約システムへ文章と一緒に知らせるだけ
        ref: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 別のお店の店舗IDで記録されないよう、このお店の店舗かを確かめる
      const [store] = await db
        .select({ id: stores.id, name: stores.name })
        .from(stores)
        .where(and(eq(stores.id, input.storeId), eq(stores.tenantId, ctx.tenant.id)))
      if (!store) throw new TRPCError({ code: 'BAD_REQUEST', message: '店舗が見つかりません' })
      // 店名は月次レポートの集計に使うので、画面からの値ではなくDBの値を入れる
      const { ref: rawRef, ...row } = input
      const ref = normalizeReviewRef(rawRef)
      if (ref && ctx.tenant.id === 1) notifyReviewWritten(ref, input.reviewText)
      return db.insert(reviewHistory).values({
        ...row,
        source: input.source ?? 'direct',
        storeName: store.name,
        tenantId: ctx.tenant.id,
      })
    }),

  list: publicProcedure
    .input(z.object({ visitorId: z.string() }))
    .query(async ({ input, ctx }) => {
      return db
        .select()
        .from(reviewHistory)
        .where(
          and(
            eq(reviewHistory.visitorId, input.visitorId),
            eq(reviewHistory.tenantId, ctx.tenant.id),
          )
        )
        .orderBy(desc(reviewHistory.createdAt))
        .limit(5)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number(), visitorId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // visitorId も一致条件に含め、他人の履歴を ID 指定で消せないようにする
      return db
        .delete(reviewHistory)
        .where(
          and(
            eq(reviewHistory.id, input.id),
            eq(reviewHistory.visitorId, input.visitorId),
            eq(reviewHistory.tenantId, ctx.tenant.id),
          )
        )
    }),
})
