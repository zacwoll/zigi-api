import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, UserModel } from "../types";

export class UserFetch extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Fetch User information",
    request: {},
    responses: {
      "200": {
        description: "Returns user and their balances with Zigi",
        ...contentJson(
          z.object({
            status: z.string().default("success"),
            user: z.array(UserModel),
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
    // Query D1 for all users
    const { results } = await c.env.prod_zigi_api
      .prepare(
        "SELECT id, username, balance, created_at FROM users ORDER BY created_at DESC",
      )
      .all<typeof UserModel>();

    return {
      success: true,
      user: results,
    };
  }
}
