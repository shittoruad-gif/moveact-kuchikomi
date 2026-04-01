import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { reviewHistory } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

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
      return db.insert(reviewHistory).values(input).run()
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
        .all()
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number(), visitorId: z.string() }))
    .mutation(async ({ input }) => {
      return db
        .delete(reviewHistory)
        .where(eq(reviewHistory.id, input.id))
        .run()
    }),
})
