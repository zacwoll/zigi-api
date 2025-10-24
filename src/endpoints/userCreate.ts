import { contentJson, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../types";

export const UserModel = z.object({
	id: z.string().uuid(),
	username: z.string(),
	balance: z.number().int(),
	created_at: z.string().datetime(),
})

export class UserCreate extends OpenAPIRoute {
	schema = {
		tags: ["Users"],
		summary: "Create a new user",
		request: {
			body: contentJson(
				z.object({
					username: z.string(),
				})
			),
		},
		responses: {
			"200": {
				description: "Returns the created user",
				...contentJson(
					z.object({
						status: z.string().default("success"),
						data: z.object({ username: z.string() })
					})
				)
			},
			"500": {
				description: "Internal Server Error",
				...contentJson(
					z.object({
						status: z.string().default("error"),
						message: z.string(),
					})
				)
			}
		}
	};

	async handle(c: AppContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const { username } = data.body;

	const newUser = {
		id: crypto.randomUUID(),
		username,
		balance: 0,
		createdAt: new Date().toISOString(),
	}

    // Return the new user
    return { success: true, user: newUser };
  }
}