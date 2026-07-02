import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { reviewHistory } from '../db/schema'
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
    .mutation(async ({ input }) => {
      return db.insert(reviewHistory).values(input)
    }),

  list: publicProcedure
    .input(z.object({ visitorId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(reviewHistory)
        .where(eq(reviewHistory.visitorId, input.visitorId))
        .orderBy(desc(reviewHistory.createdAt))
        .limit(5)
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number(), visitorId: z.string() }))
    .mutation(async ({ input }) => {
      // visitorId も一致条件に含め、他人の履歴を ID 指定で消せないようにする
      return db
        .delete(reviewHistory)
        .where(
          and(
            eq(reviewHistory.id, input.id),
            eq(reviewHistory.visitorId, input.visitorId),
          )
        )
    }),
})
