import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { publishNewsletter } from "@/lib/publish";
import type { PublishItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isLoggedIn())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { items?: PublishItem[]; rejected?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  const rejected = Array.isArray(body.rejected) ? body.rejected : [];

  try {
    const result = await publishNewsletter(items, rejected);
    return NextResponse.json(result);
  } catch (exc) {
    console.error("publish error", exc);
    return NextResponse.json(
      { error: String(exc) },
      { status: 500 }
    );
  }
}
