import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, TaskModel, TransactionModel } from "../types";

export class TransactionListAll extends OpenAPIRoute {
  schema = {
    tags: ["Transactions"],
    summary: "List All Transactions",
    request: {},
    responses: {
      "200": {
        description: "Returns all transactions made with Zigi",
        ...contentJson(
          z.object({
            status: z.string().default("success"),
            transactions: z.array(TransactionModel),
          }),
        ),
      },
      "500": {
        description: "Internal Server Error",
        ...contentJson(
          z.object({
            status: z.string().default("error"),
            message: z.string(),
          }),
        ),
      },
    },
  };

  async handle(c: AppContext) {
    // Query D1 for all tasks belonging to the user
    const { results } = await c.env.prod_zigi_api
      .prepare(`
		SELECT id, user_id, amount, reason, related_task_id, timestamp
		FROM transactions
		ORDER BY timestamp DESC
	`,)
      .all<typeof TransactionModel>();

    return {
      success: true,
      transactions: results,
    };
  }
}
