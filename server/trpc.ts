import { initTRPC } from '@trpc/server'
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
