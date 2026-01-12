// web-app/src/app/api/ai-search/route.ts
import { NextResponse } from "next/server";
import { aiSearch } from "@/lib/aiSearch/search";

export const runtime = "nodejs"; // важно: embeddings + service role key должны быть только на сервере

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query || "").trim();

    if (!query) {
      return NextResponse.json(
        { error: "Missing 'query' in request body" },
        { status: 400 }
      );
    }

    const topModels =
      typeof body?.topModels === "number" ? body.topModels : undefined;
    const evidencePerModel =
      typeof body?.evidencePerModel === "number"
        ? body.evidencePerModel
        : undefined;
    const kChunks = typeof body?.kChunks === "number" ? body.kChunks : undefined;

    const result = await aiSearch(query, { topModels, evidencePerModel, kChunks });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("ai-search failed:", err?.message, err?.stack || err);
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
