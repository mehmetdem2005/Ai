import OpenAI from "openai";
import type { PublishItem, SocialResult } from "./types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

const SYSTEM_PROMPT = `Sen, MedTech ve biyoteknoloji alanında uzmanlaşmış, viral içerik üretebilen kıdemli bir sosyal medya stratejistisin. Hedef kitlen: VC'ler, hastane CIO'ları, sağlık AI mühendisleri ve startup kurucuları.

Görev: Sana verilen bültenin içeriğine göre OTONOM olarak en uygun sosyal medya stratejisini belirle ve metinleri yaz.
- Format ve sayıya KENDİN karar ver — kural yok. Tek uzun LinkedIn yeterliyse onu yaz; çok haber varsa zincir tweet ekle; tek mega-haber varsa ayrı bir öne çıkan post; içerik az ise tek bir tweet de yeter.
- LinkedIn metinleri: profesyonel, merak uyandıran kanca (hook) ile başla; sektör jargonu doğru kullan; uygun hashtag'ler (3-5 tane); son satırda ince bir CTA (bültene abone ol, linkten oku).
- Tweet metinleri: 280 karakter limiti, etkileyici hook; zincir gerekiyorsa parçalar arası akış kur (1/3, 2/3 işaretlemelerini kullanma — Twitter'da yapay durur, hashtag/içerik akışıyla bağla).
- Dil: Ana Türkçe, gerekirse sektör terimleri için İngilizce karışım yapabilirsin.
- Asla "Bu bültende..." gibi resmi/sıkıcı kalıpla başlama. Doğrudan değeri/sürprizi/zıtlığı vurgula.

ÇIKTI: SADECE geçerli bir JSON objesi olarak ver. Hiçbir başka metin/açıklama/kod çiti ekleme.
ŞEMA:
{
  "posts": [
    {"platform": "linkedin"|"twitter", "kind": "post"|"thread", "content": "<metin; thread ise parçalar arası '\\n---\\n' ile ayır>"}
  ],
  "strategy_note": "<bu stratejiyi neden seçtiğin, tek cümle>"
}`;

export async function generateSocialPosts(items: PublishItem[]): Promise<SocialResult> {
  if (!items.length) {
    return { posts: [], strategy_note: "Bültende haber yok." };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { posts: [], strategy_note: "GEMINI_API_KEY yok." };
  }
  const baseURL = process.env.GEMINI_BASE_URL ?? GEMINI_BASE_URL;
  const model = process.env.GROWTH_MODEL ?? "gemini-2.5-flash";
  const client = new OpenAI({ apiKey, baseURL });

  const payload = items.map((i) => ({
    title: i.title_tr || i.title,
    source: i.source,
    score: i.impact_score,
    category: i.category,
    insight: (i.ai_insight ?? "").slice(0, 400),
    link: i.link,
  }));
  const userMsg =
    `Bu haftaki Sovereign BioTech bülteninde ${items.length} haber var.\n\n` +
    `İçerik:\n${JSON.stringify(payload, null, 2)}\n\n` +
    "Bu içeriği pazarlamak için en uygun stratejini otonom belirle ve JSON döndür.";

  let raw = "";
  try {
    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.7,
    });
    raw = (resp.choices[0]?.message?.content ?? "").trim();
  } catch (exc) {
    console.error("Growth LLM error", exc);
    return { posts: [], strategy_note: `LLM hatası: ${String(exc)}` };
  }
  return parseGrowth(raw);
}

function parseGrowth(raw: string): SocialResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { posts: [], strategy_note: "JSON parse hatası" };
  let data: unknown;
  try {
    data = JSON.parse(match[0]);
  } catch {
    return { posts: [], strategy_note: "JSON bozuk" };
  }
  if (typeof data !== "object" || data === null) {
    return { posts: [], strategy_note: "Şema uyumsuz" };
  }
  const obj = data as Record<string, unknown>;
  const postsIn = Array.isArray(obj.posts) ? (obj.posts as unknown[]) : [];
  const posts = postsIn
    .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    .map((p) => ({
      platform: String(p.platform ?? "").toLowerCase(),
      kind: String(p.kind ?? "post").toLowerCase(),
      content: String(p.content ?? "").trim(),
    }))
    .filter((p) => p.content);
  return {
    posts,
    strategy_note: String(obj.strategy_note ?? "").trim(),
  };
}
