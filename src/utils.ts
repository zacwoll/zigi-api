import { z } from "zod";
import { TaskStatusEnum } from "./types";

// Utility function for status
export function isComplete(status: z.infer<typeof TaskStatusEnum>) {
  if (status === "completed" || status === "failed" || status === "expired") {
	return true;
  }
  return false;
}
