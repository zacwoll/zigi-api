import { OpenAPIRoute, contentJson, Str, Bool } from "chanfana";
import { z } from "zod";
import { type AppContext, UserModel } from "../types";

export class UserDelete extends OpenAPIRoute {
  schema = {
    tags: ["Users"],
    summary: "Delete a User by ID",
    request: {
      params: z.object({
        id: Str({ description: "User ID (UUID)" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns if the user was deleted successfully",
        ...contentJson(
          z.object({
            success: Bool(),
            message: z.string(),
          }),
        ),
      },
    },
  };

  async handle(c: AppContext) {
    // Get validated parameters
    const data = await this.getValidatedData<typeof this.schema>();
    const id = data.params.id;

    // Fetch the user
    const user = await c.env.prod_zigi_api
      .prepare("SELECT deleted_at FROM users WHERE id = ?")
      .bind(id)
      .first();

    if (!user || user.deleted_at) {
      throw new Error("User not found");
    }
    const timestamp = new Date().toISOString();

    // Attempt to delete the user
    const result = await c.env.prod_zigi_api
      .prepare(
        `
      UPDATE users
      SET deleted_at = ?
      WHERE id = ?
    `,
      )
      .bind(timestamp, id)
      .run();

    if (result.success && result.meta.changes > 0) {
      return {
        success: true,
        message: `User with id ${id} deleted successfully.`,
      };
    }

    return {
      success: false,
      message: `User with id ${id} not found.`,
    };
  }
}