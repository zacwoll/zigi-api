import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, UserModel, TaskModel } from "../types";

export class TaskList extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "List Tasks by User Id",
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      "200": {
        description: "Returns all users and their balances with Zigi",
        ...contentJson(
          z.object({
            status: z.string().default("success"),
            tasks: z.array(TaskModel),
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
    const userId = data.params.id;

    // Query D1 for all tasks belonging to the user
    const { results } = await c.env.prod_zigi_api
      .prepare(
        `SELECT id, user_id, title, description, success_points, failure_points, status, created_at, completed_at
       FROM tasks
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      )
      .bind(userId)
      .all<typeof TaskModel>();

    return {
      success: true,
      tasks: results,
    };
  }
}