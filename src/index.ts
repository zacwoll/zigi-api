import { fromHono, OpenAPIHandler } from "chanfana";
import { Hono } from "hono";
import { UserCreate } from "./endpoints/userCreate";
import { UserList } from './endpoints/userList';
import { UserFetch } from "./endpoints/userFetch";
import { UserDelete } from "./endpoints/userDelete";
import { TaskCreate } from "./endpoints/taskCreate";
import { TaskList } from "./endpoints/taskList";
import { TaskListAll } from "./endpoints/taskListAll";
import { TaskDelete } from "./endpoints/taskDelete";
import { TaskUpdate } from "./endpoints/taskUpdate";
import { TransactionListAll } from "./endpoints/transactionListAll";

export interface Env {
	prod_zigi_api: D1Database
}

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
});

// Register OpenAPI endpoints

// Create User Account endpoint
openapi.get("/users", UserList);
openapi.post("/users", UserCreate);
openapi.get("/users/:id", UserFetch);
openapi.delete("/users/:id", UserDelete);

// Task Endpoints
openapi.get("/tasks", TaskListAll);
openapi.get("/tasks/:id", TaskList);
openapi.post("/tasks", TaskCreate);
openapi.delete("/tasks/:task_id", TaskDelete)
openapi.patch("/tasks/:task_id", TaskUpdate);

// Transaction Endpoint
openapi.get("/transactions", TransactionListAll);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
// export default app;

async function expireTasks(env: Env) {
	try {
		const now = new Date().toISOString();
		const expireSubtasks = await env.prod_zigi_api.prepare(`
		  UPDATE subtasks
		  SET status = 'expired'
		  WHERE expires_at IS NOT NULL
			AND expires_at < ?
			AND status NOT IN ('expired', 'complete', 'failed');
		`)
		.bind(now)
		.run();
		// Now run the expiration transaction on the subtasks
		console.log("Expired subtasks updated", expireSubtasks);

		const expireTasks = await env.prod_zigi_api.prepare(`
		  UPDATE tasks
		  SET status = 'expired'
		  WHERE expires_at IS NOT NULL
			AND expires_at < ?
			AND status NOT IN ('expired', 'complete', 'failed');
		`)
		.bind(now)
		.run();
		// now run the expiration transaction on the tasks
		console.log("Expired tasks updated", expireTasks);
	} catch (err) {
      console.error("Failed to update expired tasks", err);
    }
  }

export default {
  /** this part manages cronjobs */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ) {
	switch (controller.cron) {
    case "*/5 * * * *":
      // Every five minutes
	  console.log("Expiring tasks...")
      await expireTasks(env);
      break;
  }
    // console.log("Cron processed");
  },
  fetch: app.fetch,
};