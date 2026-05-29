import OpenAI from "openai";
import type { PublishItem } from "./types";

const INTRO_SYSTEM_PROMPT = `Sen sağlık teknolojileri & biyoteknoloji bülteninin başyazarısın. Sana bu sayının haberleri verilecek. Bültenin ilk paragrafını yazacaksın: okuyucu (VC, hastane CIO, sağlık AI mühendisi) "tamam bu sayıda neler var, neden açayım" diye anlasın.

KURALLAR:
- 2-4 cümle. Akıcı, doğal Türkçe. Bir arkadaşına "bu hafta sektörde şunlar oldu" der gibi.
- Klişe başlama yasak: "Bu hafta...", "Bültenimizde...", "Sevgili okuyucular..." — KESİNLİKLE HAYIR.
- Direkt en güçlü temayı/oyuncuyu söyleyerek başla. Eğer iki net tema varsa ikisini bağla. Tek mega-haber varsa onu vurgula.
- Türkçe karakterleri (ı ş ğ ü ö ç) MUTLAKA doğru kullan. ASCII transliterasyon YASAK.
- Hiçbir madde imi, başlık, alıntı yok — sadece düz paragraf metin.
- Çıktı: SADECE paragraf metni. Tırnak, kod çiti, "İşte intro:" gibi önsöz yok.`;

const DEFAULT_INTRO =
  "Sektördeki gürültüyü filtreliyor, otonom yapay zeka mimarimizle sadece sinyali veriyoruz.";

type ProviderCfg = {
  baseURL: string;
  key: string;
  model: string;
};

function pickProvider(): ProviderCfg | null {
  const provider = (process.env.LLM_PROVIDER ?? "deepseek").toLowerCase();
  if (provider === "deepseek") {
    const key = process.env.DEEPSEEK_API_KEY;
    if (!key) return null;
    return {
      baseURL: "https://api.deepseek.com",
      key,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
    };
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return {
    baseURL:
      process.env.GEMINI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta/openai/",
    key,
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  };
}

export async function generateIntro(items: PublishItem[]): Promise<string> {
  if (!items.length) return DEFAULT_INTRO;
  const cfg = pickProvider();
  if (!cfg) return DEFAULT_INTRO;

  const top = [...items]
    .sort((a, b) => (b.impact_score ?? 0) - (a.impact_score ?? 0))
    .slice(0, 6);
  const digest = top
    .map(
      (i) =>
        `- (${Math.round(i.impact_score ?? 0)}/10) ${
          i.title_tr || i.title
        }`
    )
    .join("\n");
  const userMsg =
    `Bu sayıda toplam ${items.length} haber var. En etkili ${top.length} tanesinin ` +
    `başlıkları (Türkçe):\n${digest}\n\nBu sayının açılış paragrafını yaz.`;

  try {
    const client = new OpenAI({ apiKey: cfg.key, baseURL: cfg.baseURL });
    const resp = await client.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "system", content: INTRO_SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.7,
    });
    let intro = (resp.choices[0]?.message?.content ?? "").trim();
    intro = intro.replace(/^```[\s\S]*?\n|\n```$/g, "").trim();
    intro = intro.replace(/^#{1,6}\s.*\n/, "").trim();
    intro = intro.split(/\s+/).join(" ");
    return intro || DEFAULT_INTRO;
  } catch (exc) {
    console.warn("Intro üretimi başarısız:", exc);
    return DEFAULT_INTRO;
  }
}
