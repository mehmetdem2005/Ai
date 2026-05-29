import type { PendingItem, SocialResult } from "./types";

function env() {
  const url = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_KEY ?? "";
  return { url, key, ok: Boolean(url && key) };
}

function headers(merge = false): Record<string, string> {
  const { key } = env();
  const h: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (merge) h["Prefer"] = "resolution=merge-duplicates";
  return h;
}

export function supabaseConfigured(): boolean {
  return env().ok;
}

export async function getPendingItems(): Promise<PendingItem[]> {
  const { url, ok } = env();
  if (!ok) return [];
  const q =
    `${url}/rest/v1/articles` +
    `?status=eq.pending` +
    `&select=id_hash,title,title_tr,link,source,summary,ai_insight,impact_score,category,processed_at` +
    `&order=impact_score.desc.nullslast,processed_at.desc`;
  const r = await fetch(q, { headers: headers(), cache: "no-store" });
  if (!r.ok) {
    console.error("getPendingItems", r.status, await r.text());
    return [];
  }
  return (await r.json()) as PendingItem[];
}

export async function oldestPendingAgeHours(): Promise<number | null> {
  const { url, ok } = env();
  if (!ok) return null;
  const q =
    `${url}/rest/v1/articles` +
    `?status=eq.pending&select=processed_at&order=processed_at.asc&limit=1`;
  const r = await fetch(q, { headers: headers(), cache: "no-store" });
  if (!r.ok) return null;
  const rows = (await r.json()) as { processed_at: string }[];
  if (!rows.length) return null;
  const oldest = new Date(rows[0].processed_at.replace("Z", "+00:00"));
  return (Date.now() - oldest.getTime()) / 3_600_000;
}

export async function updateArticleStatus(
  hashes: string[],
  status: "published" | "rejected"
): Promise<boolean> {
  const { url, ok } = env();
  if (!ok || !hashes.length) return true;
  let allOk = true;
  for (let i = 0; i < hashes.length; i += 100) {
    const chunk = hashes.slice(i, i + 100);
    const inList = chunk.join(",");
    const r = await fetch(
      `${url}/rest/v1/articles?id_hash=in.(${inList})`,
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ status }),
      }
    );
    if (!r.ok) {
      console.error("updateArticleStatus", r.status, await r.text());
      allOk = false;
    }
  }
  return allOk;
}

export async function saveNewsletter(
  filename: string,
  content: string,
  articleCount: number,
  socialPosts: SocialResult
): Promise<void> {
  const { url, ok } = env();
  if (!ok) return;
  const body: Record<string, unknown> = {
    filename,
    content,
    article_count: articleCount,
    social_posts: socialPosts,
  };
  const r = await fetch(`${url}/rest/v1/newsletters`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    if (text.includes("social_posts")) {
      delete body.social_posts;
      const r2 = await fetch(`${url}/rest/v1/newsletters`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(body),
      });
      if (!r2.ok) console.error("saveNewsletter retry", r2.status, await r2.text());
      return;
    }
    console.error("saveNewsletter", r.status, text);
  }
}
