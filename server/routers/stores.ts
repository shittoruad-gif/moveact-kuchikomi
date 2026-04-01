import { router, publicProcedure } from '../trpc'
import { db } from '../db'
import { stores } from '../db/schema'

export const storesRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(stores).all()
  }),
})
