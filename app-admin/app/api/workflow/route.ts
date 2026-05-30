import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const GH_HEADERS = (token: string): Record<string, string> => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "sovereign-admin-workflow",
});

async function getWorkflowState(): Promise<{ state: string | null; error?: string }> {
  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  const ghWorkflow = process.env.GH_WORKFLOW || "bulletin.yml";
  if (!ghToken) return { state: null, error: "token_missing" };
  try {
    const r = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}`,
      { headers: GH_HEADERS(ghToken) }
    );
    if (!r.ok) return { state: null, error: `gh_get_${r.status}` };
    const wf = await r.json();
    return { state: wf.state };
  } catch (exc) {
    return { state: null, error: String(exc) };
  }
}

// GET — durumu döndür
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { state, error } = await getWorkflowState();
  if (state === null) {
    return NextResponse.json({ error: error || "unknown" }, { status: 502 });
  }
  return NextResponse.json({ state });
}

// POST — toggle
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ghToken = process.env.GH_DEPLOY_TOKEN;
  const ghRepo = process.env.GH_REPO || "mehmetdem2005/Ai";
  const ghWorkflow = process.env.GH_WORKFLOW || "bulletin.yml";
  if (!ghToken) {
    return NextResponse.json({ error: "token_missing" }, { status: 500 });
  }
  const { state, error } = await getWorkflowState();
  if (state === null) {
    return NextResponse.json({ error: error || "unknown" }, { status: 502 });
  }
  const action = state === "active" ? "disable" : "enable";
  try {
    const r = await fetch(
      `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}/${action}`,
      { method: "PUT", headers: GH_HEADERS(ghToken) }
    );
    if (r.status !== 204) {
      const text = await r.text();
      return NextResponse.json(
        { error: `gh_${action}_failed`, status: r.status, detail: text.slice(0, 300) },
        { status: 502 }
      );
    }
  } catch (exc) {
    return NextResponse.json({ error: String(exc) }, { status: 502 });
  }
  const newState = action === "enable" ? "active" : "disabled_manually";
  return NextResponse.json({ ok: true, action, previous_state: state, new_state: newState });
}
