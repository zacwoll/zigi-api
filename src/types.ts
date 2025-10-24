import { DateTime, Str } from "chanfana";
import type { Context } from "hono";
import { z } from "zod";

export type AppContext = Context<{ Bindings: Env }>;

export const UserModel = z.object({
  id: z.string().uuid(),
  username: z.string(),
  balance: z.number().int(),
  created_at: z.string().datetime(),
});