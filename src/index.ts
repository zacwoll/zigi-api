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

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
