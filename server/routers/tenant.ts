import { router, publicProcedure } from '../trpc'

export const tenantRouter = router({
  /** 画面の見た目・質問の選択肢。通知ハブのコードなど内部の値は返さない */
  config: publicProcedure.query(({ ctx }) => ctx.tenant.config),
})
