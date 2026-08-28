import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createSessionToken, hashPassword, verifyPassword } from "./_core/auth";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getUserByEmail, registerLocalUser, touchLastSignedIn, updateUserProfile } from "./db";
import { logSecurityEvent } from "./institutionalDb";
import { evaluationRouter } from "./routers/evaluation";
import { institutionalRouter } from "./routers/institutional";

const emailSchema = z.string().trim().min(3).max(320).email();
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(200);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().trim().min(2).max(120),
          email: emailSchema,
          password: passwordSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        let user;
        try {
          user = await registerLocalUser({
            name: input.name,
            email: input.email,
            passwordHash: hashPassword(input.password),
          });
        } catch (error) {
          if (error instanceof Error && error.message === "USER_EMAIL_EXISTS") {
            throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
          }
          throw error;
        }
        if (!user) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create account." });
        }

        const sessionToken = await createSessionToken(user.id, { expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        void logSecurityEvent({ type: "registration", actorUserId: user.id, ip: ctx.req.ip, metadata: { email: input.email } });

        return { success: true, user } as const;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: emailSchema,
          password: z.string().min(1).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !verifyPassword(input.password, user.passwordHash)) {
          void logSecurityEvent({ type: "login_failure", ip: ctx.req.ip, metadata: { email: input.email } });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        }

        await touchLastSignedIn(user.id);

        const sessionToken = await createSessionToken(user.id, { expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        void logSecurityEvent({ type: "login_success", actorUserId: user.id, ip: ctx.req.ip });

        return { success: true, user } as const;
      }),
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120) }))
      .mutation(async ({ ctx, input }) => {
        const updated = await updateUserProfile(ctx.user.id, { name: input.name });
        if (!updated) throw new Error("User not found");
        return { success: true, user: updated } as const;
      }),
  }),
  evaluation: evaluationRouter,
  institutional: institutionalRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
