import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  const ghWorkflow = process.env.GH_WORKFLOW || "bulletin.yml";
  const ghRef = process.env.GH_REF || "main";
  if (!ghToken) {
    return NextResponse.json({ error: "github_token_missing" }, { status: 500 });
  }
  try {
    const r = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          "User-Agent": "sovereign-admin-trigger",
        },
        body: JSON.stringify({ ref: ghRef }),
      }
    );
    if (r.status !== 204) {
      const text = await r.text();
      return NextResponse.json(
        { error: "github_dispatch_failed", status: r.status, detail: text.slice(0, 500) },
        { status: 502 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: "Worker tetiklendi. 3-6 dakika içinde yeni bültenler pending kuyruğuna düşer.",
      ref: ghRef,
    });
  } catch (exc) {
    return NextResponse.json({ error: "github_error", detail: String(exc) }, { status: 502 });
  }
}
