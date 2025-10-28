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

export const TaskModel = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  success_points: z.number().int(),
  failure_points: z.number().int(),
  status: z.enum(["pending", "in-progress", "completed", "failed", "expired"]),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
});

export const SubtaskModel = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable().optional(),
  success_points: z.number().int(),
  failure_points: z.number().int(),
  status: z.enum(["pending", "in-progress", "completed", "failed", "expired"]),
  completed_at: z.string().datetime().nullable().optional(),
});

export const TransactionModel = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().nullable().optional(),
  related_task_id: z.string().uuid().nullable().optional(),
  timestamp: z.string().datetime(),
});

export const TaskStatusEnum = z.enum([
  "pending",
  "in-progress",
  "completed",
  "failed",
  "expired",
]);
