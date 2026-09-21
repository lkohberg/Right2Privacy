import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Radio } from "lucide-react";

import { getPrivacyNews, type NewsItem } from "@/lib/news.functions";
import { EU_POLICY_FACTS } from "@/lib/eu-facts";

type Entry = { key: string; label: string; text: string; link?: string };

function buildEntries(news: NewsItem[]): Entry[] {
  const newsEntries: Entry[] = news.map((item, i) => ({
    key: `n${i}`,
    label: item.source,
    text: item.title,
    link: item.link,
  }));
  const factEntries: Entry[] = EU_POLICY_FACTS.map((fact, i) => ({
    key: `f${i}`,
    label: fact.label,
    text: fact.text,
  }));

  // Interleave: two news items, then one permanent EU policy fact.
  const mixed: Entry[] = [];
  let n = 0;
  let f = 0;
  while (n < newsEntries.length || f < factEntries.length) {
    for (let k = 0; k < 2 && n < newsEntries.length; k++) mixed.push(newsEntries[n++]!);
    if (f < factEntries.length) mixed.push(factEntries[f++]!);
  }
  return mixed;
}

function Item({ entry }: { entry: Entry }) {
  const body = (
    <>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        {entry.label}
      </span>
      <span className="text-xs text-muted-foreground">{entry.text}</span>
      <span aria-hidden="true" className="text-border">
        /
      </span>
    </>
  );
  return entry.link ? (
    <a
      href={entry.link}
      target="_blank"
      rel="noreferrer"
      className="flex shrink-0 items-center gap-2 px-4 hover:text-foreground"
    >
      {body}
    </a>
  ) : (
    <span className="flex shrink-0 items-center gap-2 px-4">{body}</span>
  );
}

export function NewsTicker() {
  const fetchNews = useServerFn(getPrivacyNews);
  const { data } = useQuery({
    queryKey: ["privacy-news"],
    queryFn: () => fetchNews(),
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });

  const entries = buildEntries((data ?? []) as NewsItem[]);
  if (entries.length === 0) return null;

  return (
    <div className="ticker-mask flex h-9 shrink-0 items-center overflow-hidden border-t border-border bg-background/60">
      <div className="flex h-full shrink-0 items-center gap-1.5 border-r border-border px-3">
        <Radio className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
          Privacy feed
        </span>
      </div>
      <div className="ticker-track flex min-w-0 items-center">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex items-center">
            {entries.map((entry) => (
              <Item key={`${copy}-${entry.key}`} entry={entry} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
