import { createBeehiivDraft } from "./beehiiv";
import {
  newsletterFilename,
  newsletterTitle,
  renderHtml,
  renderMarkdown,
} from "./render";
import { generateSocialPosts } from "./social";
import { saveNewsletter, updateArticleStatus } from "./supabase";
import type { PublishItem, PublishResult } from "./types";

async function triggerSiteRebuild(): Promise<void> {
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return;
  try {
    await fetch(hook, { method: "POST" });
  } catch (exc) {
    console.error("Vercel deploy hook hatası:", exc);
  }
}

export async function publishNewsletter(
  items: PublishItem[],
  rejectedHashes: string[]
): Promise<PublishResult> {
  if (rejectedHashes.length) {
    await updateArticleStatus(rejectedHashes, "rejected");
  }
  if (!items.length) {
    return {
      count: 0,
      markdown: "",
      html: "",
      beehiiv: null,
      social_posts: { posts: [], strategy_note: "Yayınlanacak haber yok." },
      title: "",
    };
  }

  const sorted = [...items].sort(
    (a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0)
  );

  const markdown = await renderMarkdown(sorted);
  const html = renderHtml(markdown);
  const title = newsletterTitle();
  const filename = newsletterFilename();

  const [beehiiv, social] = await Promise.all([
    createBeehiivDraft(html, title),
    generateSocialPosts(sorted),
  ]);

  await saveNewsletter(filename, markdown, sorted.length, social);
  await updateArticleStatus(
    sorted.map((i) => i.hash),
    "published"
  );
  await triggerSiteRebuild();

  return {
    count: sorted.length,
    markdown,
    html,
    beehiiv,
    social_posts: social,
    title,
  };
}
