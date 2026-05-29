import { marked } from "marked";
import { generateIntro } from "./intro";
import type { PublishItem } from "./types";

const TR_MONTHS = [
  "",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function nowIstanbul(): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const iso = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get(
    "minute"
  )}:00+03:00`;
  return new Date(iso);
}

export async function renderMarkdown(items: PublishItem[]): Promise<string> {
  const title = process.env.NEWSLETTER_TITLE ?? "MedTech Sinyali";
  const dt = nowIstanbul();
  const readable = `${dt.getDate()} ${TR_MONTHS[dt.getMonth() + 1]} ${dt.getFullYear()}`;
  const intro = await generateIntro(items);
  const lines = [
    `# ${title}`,
    `**Tarih:** ${readable}`,
    "",
    intro,
    "",
    "---",
    "",
  ];
  items.forEach((item, idx) => {
    const heading = item.title_tr || item.title;
    lines.push(`### ${idx + 1}. [${heading}](${item.link})`);
    let meta = `**Kaynak:** ${item.source}`;
    if (item.impact_score != null) {
      meta += `  ·  📊 **Sinyal Gücü:** ${Math.round(item.impact_score)}/10`;
    }
    lines.push(meta);
    lines.push("");
    lines.push(`💡 **Analist Sinyali:**\n> ${item.ai_insight ?? ""}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  });
  return lines.join("\n");
}

export function renderHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export function newsletterFilename(): string {
  const dt = nowIstanbul();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `newsletter_${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(
    dt.getDate()
  )}_${pad(dt.getHours())}${pad(dt.getMinutes())}.md`;
}

export function newsletterTitle(): string {
  const base = process.env.NEWSLETTER_TITLE ?? "MedTech Sinyali";
  const dt = nowIstanbul();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base} — ${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}
