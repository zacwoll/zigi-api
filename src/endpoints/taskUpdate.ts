import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import {
  TaskModel,
  type AppContext,
  TaskStatusEnum,
  SubtaskModel,
} from "../types";

export class TaskUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "Update status of task",
    request: {
      params: z
        .object({
          task_id: z.string(),
        }),
      body: contentJson(
        z.object({
          status: TaskStatusEnum,
        }),
      ),
    },
    responses: {
      "200": {
        description: "Returns the updated model of the task",
        ...contentJson(TaskModel),
      },
    },
  };

  async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const task_id = data.params.task_id;
    const { status } = data.body;

    const db = c.env.prod_zigi_api;

    const tx = await db.withSession();

    try {
      console.log(`looking for task ${task_id}`);
      // Check if the task is found
      const task_exists = await tx
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .first();

      if (!task_exists.status) throw new Error("Task not found");
      const parent_task = TaskModel.parse(task_exists);
      const user_id = parent_task.user_id;

      // Finish all subtasks if main task is completed
      if (status === "completed") {
        // find all the currently in-progress subtasks to completed
        const result = await tx
          .prepare("SELECT * FROM subtasks WHERE task_id = ?")
          .bind(task_id)
          .all();
        const subtasks = SubtaskModel.array().parse(result.results);
        console.log({ subtasks });

        // set all the currently in-progress subtasks to completed
        for (const subtask of subtasks) {
          if (subtask.status === "in-progress") {
            // set all in-progress tasks to complete
            await tx
              .prepare("UPDATE subtasks SET status = ? WHERE id = ?")
              .bind("completed", subtask.id)
              .run();
            // increase the user's account by the success_points of the subtask
            await tx
              .prepare(
                `
              UPDATE users
              SET balance = balance + ?
              WHERE id = ?
            `,
              )
              .bind(subtask.success_points, user_id)
              .run();
          }
        }
        console.log("all sub tasks completed")

        // Set the task to complete
        const completed_at = new Date().toISOString();
        const completedTask = await tx
          .prepare(
            `
          UPDATE tasks
          SET status = ?, completed_at = ?
          WHERE id = ?
        `,
          )
          .bind(status, completed_at, task_id)
          .run();

        // increase the account balance
        const updateAccount = await tx
          .prepare(
            `
          update users
          SET balance = balance + ?
          where id = ?
        `,
          )
          .bind(parent_task.success_points, user_id)
          .run();
      } else if (status === "failed" || status === "expired") {
        // find all the currently in-progress subtasks to completed
        const result = await tx
          .prepare("SELECT * FROM subtasks WHERE task_id = ?")
          .bind(task_id)
          .all();
        const subtasks = SubtaskModel.array().parse(result.results);

        // set all the currently in-progress subtasks to failed
        for (const subtask of subtasks) {
          if (subtask.status === "in-progress") {
            // set all in-progress tasks to failed
            await tx
              .prepare("UPDATE subtasks SET status = ? WHERE id = ?")
              .bind(status, subtask.id)
              .run();
            // increase the user's account by the success_points of the subtask
            await tx
              .prepare(
                `
              UPDATE users
              SET balance = balance - ?
              WHERE id = ?
            `,
              )
              .bind(subtask.failure_points, user_id)
              .run();
          }
        }

        // Set the task to failed or expired
        const completedTask = await tx
          .prepare(
            `
          UPDATE tasks
          SET status = ?
          WHERE id = ?
        `,
          )
          .bind(status, task_id)
          .run();

        // increase the account balance
        const updateAccount = await tx
          .prepare(
            `
          UPDATE users
          SET balance = balance - ?
          WHERE id = ?
        `,
          )
          .bind(parent_task.failure_points, user_id)
          .run();
      } else {
        // Set the task to failed or expired
        const completedTask = await tx
          .prepare(
            `
          UPDATE tasks
          SET status = ?
          WHERE id = ?
        `,
          )
          .bind(status, task_id)
          .run();
      }
    } catch (err) {
      console.error(err);
      throw err;
    }

    return {
      success: true,
      message: `Task ${task_id} was marked as ${status}`,
    };
  }
}