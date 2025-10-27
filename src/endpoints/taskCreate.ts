import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { SubtaskModel, TaskModel, type AppContext } from "../types";

export class TaskCreate extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "Create a new Task",
    request: {
      body: contentJson(
        z.object({
          user_id: z.string().uuid(),
          title: z.string(),
          description: z.string().nullable().optional(),
          success_points: z.number().int(),
          failure_points: z.number().int(),
          subtasks: z.array(SubtaskModel).optional(),
        }),
      ),
    },
    responses: {
      "200": {
        description: "Returns the created task (and any subtasks)",
        ...contentJson(TaskModel),
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const {
      user_id,
      title,
      description,
      success_points,
      failure_points,
      subtasks = [],
    } = data.body;

    const task_id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const status = "pending";

    const db = c.env.prod_zigi_api;

    // Insert Task
    await db
      .prepare(
        `INSERT INTO tasks (id, user_id, title, description, success_points, failure_points, status, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        task_id,
        user_id,
        title,
        description ?? null,
        success_points,
        failure_points,
        status,
        created_at,
      )
      .run();

    // Insert Subtasks (if any)
    for (const subtask of subtasks) {
      const subtask_id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO subtasks (id, task_id, title, description, success_points, failure_points, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          subtask_id,
          task_id,
          subtask.title,
          subtask.description ?? null,
          subtask.success_points,
          subtask.failure_points,
		  status
        )
        .run();
    }

    return {
      id: task_id,
      user_id,
      title,
      description,
      success_points,
      failure_points,
      status,
      created_at,
      subtasks,
    };
  }
}