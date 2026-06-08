import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { loadUserLlmRoles } from "@/lib/llm";
import { llmTestBodySchema, runLLMConnectionTest } from "@/lib/llm/testConnection";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = llmTestBodySchema.parse(await req.json());
    const basePrefs = await loadUserLlmRoles(user.id, user.workspaceId);
    const result = await runLLMConnectionTest(body, { basePrefs });
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
