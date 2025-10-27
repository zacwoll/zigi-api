import { OpenAPIRoute, contentJson, Str, Bool } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export class TaskDelete extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "Delete a Task by ID",
    request: {
      params: z.object({
        task_id: Str({ description: "Task ID (UUID)" }),
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
    const id = data.params.task_id;

    // Attempt to delete the user
    const result = await c.env.prod_zigi_api
      .prepare("DELETE FROM tasks WHERE id = ?")
      .bind(id)
      .run();

    if (result.success && result.meta.changes > 0) {
      return {
        success: true,
        message: `Task with id ${id} deleted successfully.`,
      };
    }

    return {
      success: false,
      message: `Task with id ${id} not found.`,
    };
  }
}
