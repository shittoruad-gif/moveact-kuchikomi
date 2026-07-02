import { initTRPC } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'

export function createContext({ req }: CreateExpressContextOptions) {
  // Traefik 経由なので trust proxy 前提で req.ip が実クライアントIPになる
  return { ip: req.ip ?? 'unknown' }
}

export type Context = Awaited<ReturnType<typeof createContext>>

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
