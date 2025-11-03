import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext, SubtaskModel, TaskModel } from "../types";

export class TaskListAll extends OpenAPIRoute {
  schema = {
    tags: ["Tasks"],
    summary: "List All Tasks",
    request: {},
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
    const db = c.env.prod_zigi_api;
    // Query D1 for all tasks belonging to the user
    // Get all tasks, Left Joined by Subtasks
const { results } = await db
  .prepare(
    `SELECT
         t.*,
         s.id AS subtask_id, s.task_id AS subtask_task_id, s.title AS subtask_title,
         s.description AS subtask_description, s.success_points AS subtask_success_points,
         s.failure_points AS subtask_failure_points, s.status AS subtask_status,
         s.completed_at AS subtask_completed_at, s.expires_at AS subtask_expires_at
       FROM tasks t
       LEFT JOIN subtasks s ON t.id = s.task_id
       ORDER BY t.created_at DESC`,
  )
  .all();

  const taskMap: Record<string, z.infer<typeof TaskModel>> = {};

  for (const row of results) {
    // Validate and parse the task directly
    // Parse the task
    const task = TaskModel.omit({ subtasks: true }).parse({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      success_points: row.success_points,
      failure_points: row.failure_points,
      status: row.status,
      created_at: row.created_at,
      completed_at: row.completed_at,
      expires_at: row.expires_at,
    });

    // Create the Task Entry in the TaskMap
    if (!taskMap[task.id]) {
      taskMap[task.id] = { ...task, subtasks: [] };
    }

    // Parse the subtask
    const subtaskData = SubtaskModel.parse({
      id: row.subtask_id,
      task_id: row.subtask_task_id,
      title: row.subtask_title,
      description: row.subtask_description,
      success_points: row.subtask_success_points,
      failure_points: row.subtask_failure_points,
      status: row.subtask_status,
      completed_at: row.subtask_completed_at,
      expires_at: row.subtask_expires_at,
    });
    
    taskMap[task.id].subtasks!.push(subtaskData);
  }

    return {
      success: true,
      tasks: Object.values(taskMap),
    };
  }
}
