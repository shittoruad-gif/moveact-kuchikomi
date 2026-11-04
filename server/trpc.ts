import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { resolveTenant } from './tenant'

export async function createContext({ req }: CreateExpressContextOptions) {
  return {
    // Traefik 経由なので trust proxy 前提で req.ip が実クライアントIPになる
    ip: req.ip ?? 'unknown',
    // どのお店の画面から来たか。データは必ずこの tenant.id で絞る
    tenant: await resolveTenant(req.hostname),
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure

/** 提供中のお店だけが使える操作（解約したお店では、作成・記録をさせない） */
export const activeProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.tenant.ended) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'このお店の口コミ作成アプリは、ご利用を終了しました。' })
  }
  return next()
})
