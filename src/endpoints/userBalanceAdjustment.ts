import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, UserModel } from "../types";
import { TransactionData, writeTransaction } from "../transaction";

export class UserBalanceAdjustment extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Adjust User Balance with Zigi",
    request: {
		params: z.object({
			id: z.string(),
		}),
		body: contentJson(z.object({
				amount: z.number().int(),
				reason: z.string().optional(),
			}),
		),
    },
    responses: {
      "200": {
        description: "Returns user and their updated balance with Zigi",
        ...contentJson(
          z.object({
            status: z.string().default("success"),
            user: UserModel,
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
    const data = await this.getValidatedData<typeof this.schema>();
    const user_id = data.params.id;
    const { amount, reason } = data.body;

    // Get user Account
    const getUser = await c.env.prod_zigi_api
      .prepare(
        `
		SELECT id, username, balance, created_at, deleted_at
		FROM users
		WHERE id = ?
		`,
      )
      .bind(user_id)
      .first<typeof UserModel>();
    const user = UserModel.parse(getUser);
    if (!user || user.deleted_at) {
      throw new Error("User not Found");
    }

    // Apply Transaction to User Account
    const tx_data: TransactionData = {
      user_id,
      amount,
      reason,
    };
    const applied = await writeTransaction(c.env, tx_data);
    console.log(applied);

    // Get updated user Account
    const getUpdatedUser = await c.env.prod_zigi_api
      .prepare(
        `
		SELECT id, username, balance, created_at, deleted_at
		FROM users
		WHERE id = ?
		`,
      )
      .bind(user_id)
      .first<typeof UserModel>();
	const updatedUser = UserModel.parse(getUser);


    return {
      success: true,
      updatedUser,
    };
  }
}
