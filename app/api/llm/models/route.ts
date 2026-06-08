import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/errors";
import { DEFAULT_DOCKER_MODEL_RUNNER_BASE_URL } from "@/lib/llm/config";

const querySchema = z.object({
  provider: z.enum(["docker-model-runner"]),
  baseUrl: z.string().trim().max(512).optional(),
});

type ModelsResponse = {
  data?: Array<{ id?: string }>;
};

export async function GET(req: Request) {
  try {
    await requireUser();
    const url = new URL(req.url);
    const query = querySchema.parse({
      provider: url.searchParams.get("provider") || undefined,
      baseUrl: url.searchParams.get("baseUrl") || undefined,
    });
    const baseUrl = (query.baseUrl || DEFAULT_DOCKER_MODEL_RUNNER_BASE_URL).replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ models: [], error: "Could not list Docker Model Runner models." }, { status: 502 });
    }
    const json = (await res.json()) as ModelsResponse;
    const models = (json.data || []).map((model) => model.id).filter((id): id is string => Boolean(id));
    return NextResponse.json({ provider: query.provider, baseUrl, models });
  } catch (err) {
    return toErrorResponse(err);
  }
}
