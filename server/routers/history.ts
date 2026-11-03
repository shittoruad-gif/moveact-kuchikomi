import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { reviewHistory, stores } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export const historyRouter = router({
  save: publicProcedure
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
      return db.insert(reviewHistory).values({ ...input, storeName: store.name, tenantId: ctx.tenant.id })
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
