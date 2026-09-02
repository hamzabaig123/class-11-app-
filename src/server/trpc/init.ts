import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const createTRPCContext = async () => {
  const session = await getServerSession(authOptions)
  return {
    session,
    user: session?.user,
    prisma,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router

export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action',
    })
  }

  // The JWT session cookie can outlive the actual row in the database
  // (e.g. after `prisma migrate reset`, a reseed, or a DB switch). Trusting
  // the cookie's id blindly causes foreign-key violations deep inside
  // mutations. Verify the user still exists before letting the request through.
  const dbUser = await ctx.prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { id: true },
  })

  if (!dbUser) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Your session is no longer valid. Please sign in again.',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  })
})