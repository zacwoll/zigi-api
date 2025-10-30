import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import {
  TaskModel,
  type AppContext,
  TaskStatusEnum,
  SubtaskModel,
} from "../types";
import { TransactionData, writeTransaction } from "../transaction";

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

    try {
      console.log(`looking for task ${task_id}`);
      // Check if the task is found
      const task_exists = await db
        .prepare("SELECT * FROM tasks WHERE id = ?")
        .bind(task_id)
        .first();

      if (!task_exists.status) throw new Error("Task not found");
      console.log(task_exists);
      const parent_task = TaskModel.parse(task_exists);
      const user_id = parent_task.user_id;

      // find all the attached subtasks to mark them as well
      const result = await db.prepare(`
        SELECT * FROM subtasks
        WHERE task_id = ?
      `)
        .bind(task_id)
        .all();

      const subtasks = SubtaskModel.array().parse(result.results);
      console.log({ subtasks });

      // Finish all subtasks if main task is completed
      if (status === "completed") {
        // set all the currently in-progress subtasks to completed
        for (const subtask of subtasks) {
          if (subtask.status === "in-progress") {
            // set all in-progress tasks to complete
            await db
              .prepare(`
                UPDATE subtasks
                SET status = ?
                WHERE id = ?
              `)
              .bind(status, subtask.id)
              .run();

            // execute transaction
            const data: TransactionData = {
              user_id,
              amount: subtask.success_points,
              reason: subtask.title,
              related_task_id: task_id,
            };
            const applied = await writeTransaction(c.env, data);
            console.log(applied);
          }
        }
        console.log("all sub tasks completed");

        // Set the task to complete
        const completed_at = new Date().toISOString();
        const completedTask = await db
          .prepare(
            `
          UPDATE tasks
          SET status = ?, completed_at = ?
          WHERE id = ?
        `,
          )
          .bind(status, completed_at, task_id)
          .run();

        // execute deposit transaction
        const data: TransactionData = {
          user_id,
          amount: parent_task.success_points,
          reason: parent_task.title,
          related_task_id: task_id,
        };
        const applied = await writeTransaction(c.env, data);
        console.log(applied);
      } else if (status === "failed" || status === "expired") {
        // set all the currently in-progress subtasks to failed
        for (const subtask of subtasks) {
          if (
            subtask.status === "pending" ||
            subtask.status === "in-progress"
          ) {
            // set all in-progress tasks to failed
            await db
              .prepare("UPDATE subtasks SET status = ? WHERE id = ?")
              .bind(status, subtask.id)
              .run();

            // execute withdrawal
            // execute transaction
            const data: TransactionData = {
              user_id,
              amount: subtask.failure_points,
              reason: subtask.title,
              related_task_id: task_id,
            };
            const applied = await writeTransaction(c.env, data);
            console.log(applied);
          }
        }

        // Set the task to failed or expired
        const completedTask = await db
          .prepare(
            `
          UPDATE tasks
          SET status = ?
          WHERE id = ?
        `,
          )
          .bind(status, task_id)
          .run();

        // execute failure transaction
        const data: TransactionData = {
          user_id,
          amount: parent_task.failure_points,
          reason: parent_task.title,
          related_task_id: task_id,
        };
        const applied = await writeTransaction(c.env, data);
        console.log(applied);
      } else {
        // other option is changing pending->in-progress,
        // possible future option is pending/in-progress->cancelled or some other state change
        // Set the task to in-progress or otherwise
        const completedTask = await db
          .prepare(
            `
          UPDATE tasks
          SET status = ?
          WHERE id = ?
        `,
          )
          .bind(status, task_id)
          .run();

        for (const subtask of subtasks) {
          const completedSubtask = await db.prepare(`
            UPDATE subtasks
            SET status = ?
            WHERE id = ?
          `,)
          .bind(status, subtask.id)
          .run();
        }
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