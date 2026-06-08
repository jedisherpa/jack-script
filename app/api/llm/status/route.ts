import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadUserLlmRoles, publicLLMStatus } from "@/lib/llm";
import { toErrorResponse } from "@/lib/errors";

export async function GET() {
  try {
    const user = await requireUser();
    const rolePrefs = await loadUserLlmRoles(user.id, user.workspaceId);
    return NextResponse.json(publicLLMStatus(process.env, rolePrefs));
  } catch (err) {
    return toErrorResponse(err);
  }
}
