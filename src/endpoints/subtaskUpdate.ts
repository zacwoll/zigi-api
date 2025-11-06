import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import {
  type AppContext,
  TaskStatusEnum,
  SubtaskModel,
} from "../types";
import { TransactionData, writeTransaction } from "../transaction";
import { isComplete } from "../utils";

export class SubtaskUpdate extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "Update status of subtask",
    request: {
      params: z
        .object({
          task_id: z.string(),
		  subtask_id: z.string(),
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
        ...contentJson(SubtaskModel),
      },
    },
  };

	async handle(c: AppContext) {

	const data = await this.getValidatedData<typeof this.schema>();
	const { task_id, subtask_id } = data.params;
	const { status } = data.body;

	
	try {
    const db = c.env.prod_zigi_api;

    // If setting status to an incomplete status
    if (!isComplete(status)) {
      // Set status of subtask to in-progress or pending (any incomplete status)
      // Get the subtask to update
      const updatedSubtask = await db
        .prepare(
          `
		UPDATE subtasks
		SET status = ?,
		WHERE id = ? AND task_id = ? AND completed_at IS NULL
		RETURNING *
		`,
        )
        .bind(status, subtask_id, task_id)
        .first();

      // Subtask cannot be updated or found
      if (!updatedSubtask) {
        return new Response(
          JSON.stringify({ error: "Subtask cannot be updated" }),
          { status: 400 }, // single error response for all invalid attempts
        );
      }
    }
    // Else status is a complete status
    // Set the completed_at time
    const completed_at = new Date().toISOString();
    // Get the subtask to update
    const updatedSubtask = await db
      .prepare(
        `
		UPDATE subtasks
		SET status = ?,
			completed_at = ?
		WHERE id = ? AND task_id = ? AND completed_at IS NULL
		RETURNING *,
      (SELECT user_id FROM tasks WHERE id = subtasks.task_id) AS user_id
		`,
      )
      .bind(status, completed_at, subtask_id, task_id)
      .first();

    // Subtask cannot be updated or found
    if (!updatedSubtask) {
      return new Response(
        JSON.stringify({ error: "Subtask cannot be updated" }),
        { status: 400 },
      );
    }

    // Extend Zod model to include user_id
    const SubtaskWithUserModel = SubtaskModel.extend({
      user_id: z.string(),
    });

    const updateSubtask = SubtaskWithUserModel.parse(updatedSubtask);

    // Execute transaction
    const data: TransactionData = {
      user_id: updateSubtask.user_id,
      amount: updateSubtask.success_points,
      reason: updateSubtask.title,
      related_task_id: task_id,
    };
    const applied = await writeTransaction(c.env, data);
    console.log(applied);

    // Success, return subtask
    return new Response(JSON.stringify(updateSubtask), { status: 200 });
  } catch (err) {
		console.error(err);
		throw err;
	}
	}
}