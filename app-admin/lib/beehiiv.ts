export async function createBeehiivDraft(
  htmlContent: string,
  title: string
): Promise<unknown | null> {
  const apiKey = process.env.BEEHIIV_API_KEY;
  const pubId = process.env.BEEHIIV_PUB_ID;
  if (!apiKey || !pubId) return null;
  try {
    const r = await fetch(
      `https://api.beehiiv.com/v2/publications/${pubId}/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body_content: htmlContent,
          status: "draft",
        }),
      }
    );
    if (!r.ok) {
      console.error("Beehiiv", r.status, await r.text());
      return null;
    }
    return await r.json();
  } catch (exc) {
    console.error("Beehiiv error", exc);
    return null;
  }
}
