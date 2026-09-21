import { createServerFn } from "@tanstack/react-start";

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  date: string | null;
};

const FEEDS: { source: string; url: string }[] = [
  { source: "EDRi", url: "https://edri.org/feed/" },
  { source: "noyb", url: "https://noyb.eu/en/rss.xml" },
  { source: "EFF", url: "https://www.eff.org/rss/updates.xml" },
];

function decode(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&#8217;|&#039;|&apos;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1] ? decode(m[1]) : null;
}

function parseFeed(xml: string, source: string): NewsItem[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const out: NewsItem[] = [];
  for (const block of blocks.slice(0, 12)) {
    const title = pick(block, "title");
    let link = pick(block, "link");
    if (!link) {
      const href = block.match(/<link[^>]*href="([^"]+)"/i);
      link = href?.[1] ?? null;
    }
    if (!title || !link) continue;
    out.push({
      title,
      link,
      source,
      date: pick(block, "pubDate") ?? pick(block, "updated") ?? null,
    });
  }
  return out;
}

let cache: { at: number; items: NewsItem[] } | null = null;
const TTL = 30 * 60 * 1000;

export const getPrivacyNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsItem[]> => {
    if (cache && Date.now() - cache.at < TTL) return cache.items;

    const results = await Promise.all(
      FEEDS.map(async ({ source, url }) => {
        try {
          const res = await fetch(url, {
            headers: { "user-agent": "Right2Privacy/1.0 (+https://right2privacy.at)" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return [];
          return parseFeed(await res.text(), source);
        } catch {
          return [];
        }
      }),
    );

    const items: NewsItem[] = [];
    const maxPerSource = 6;
    for (const list of results) items.push(...list.slice(0, maxPerSource));

    items.sort((a, b) => {
      const ta = a.date ? Date.parse(a.date) : 0;
      const tb = b.date ? Date.parse(b.date) : 0;
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });

    if (items.length > 0) cache = { at: Date.now(), items };
    return items;
  },
);
