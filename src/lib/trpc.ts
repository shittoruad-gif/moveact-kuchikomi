import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import type { AppRouter } from '../../server/index'

export const trpc = createTRPCReact<AppRouter>()

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/trpc',
    }),
  ],
})
