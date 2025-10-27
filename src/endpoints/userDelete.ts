import { OpenAPIRoute, contentJson, Str, Bool } from "chanfana";
import { z } from "zod";
import { type AppContext, UserModel } from "../types";

export class UserDelete extends OpenAPIRoute {
  schema = {
    summary: "Delete a User by ID",
    request: {
      params: z.object({
        id: Str({ description: "User ID (UUID)" }),
      }),
    },
    responses: {
      "200": {
        description: "Returns if the task was deleted successfully",
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
    const { id } = data.params;

    // Attempt to delete the user
    const result = await c.env.prod_zigi_api.prepare("DELETE FROM users WHERE id = ?")
      .bind(id)
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