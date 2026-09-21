import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, Search, ShieldCheck } from "lucide-react";
import {
  WATCH_CATEGORIES,
  WATCHED_SERVICES,
  type WatchedService,
} from "@/lib/watchlist";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { title: "Watchlist — Right2Privacy" },
      {
        name: "description",
        content:
          "Which messaging, email and cloud services can be scanned under current EU rules, and which stay end-to-end encrypted.",
      },
      { property: "og:title", content: "Watchlist — Right2Privacy" },
      {
        property: "og:description",
        content:
          "Which messaging, email and cloud services can be scanned under current EU rules, and which stay end-to-end encrypted.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WatchlistPage,
});

type Filter = "all" | "watched" | "protected";

function WatchlistPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const watchedCount = WATCHED_SERVICES.filter((s) => s.status === "watched").length;
  const protectedCount = WATCHED_SERVICES.length - watchedCount;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WATCHED_SERVICES.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.feature.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold lg:text-2xl">Watchlist</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Services and service features that can be read or scanned under the current EU
          rules (the voluntary scanning derogation and the planned detection orders), and
          those where the provider holds no key at all.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`All (${WATCHED_SERVICES.length})`}
        />
        <Chip
          active={filter === "watched"}
          onClick={() => setFilter("watched")}
          label={`Watched (${watchedCount})`}
          dot="red"
        />
        <Chip
          active={filter === "protected"}
          onClick={() => setFilter("protected")}
          label={`Not watched (${protectedCount})`}
          dot="green"
        />
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a service"
            className="h-10 w-full rounded-full border border-border bg-input pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="mt-6 space-y-7">
        {WATCH_CATEGORIES.map((cat) => {
          const items = visible.filter((s) => s.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {cat}
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {items.map((s) => (
                  <ServiceCard key={s.name} service={s} />
                ))}
              </div>
            </section>
          );
        })}
        {visible.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No service matches that search.
          </p>
        )}
      </div>

      <p className="mt-8 rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        A green dot means the provider cannot read your content, so there is nothing to
        hand over or scan. A red dot means the content is readable on the provider's side
        today. Statuses reflect default settings of the consumer products and change when
        providers change their defaults or when the legislation is adopted.
      </p>
    </main>
  );
}

function ServiceCard({ service }: { service: WatchedService }) {
  const watched = service.status === "watched";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            watched
              ? "bg-destructive shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-destructive)_20%,transparent)]"
              : "bg-emerald-500 shadow-[0_0_0_3px_color-mix(in_oklab,#10b981_20%,transparent)]"
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-semibold">{service.name}</h3>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                watched
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              {watched ? <Eye className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {watched ? "Watched" : "Not watched"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{service.feature}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {service.note}
          </p>
        </div>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  dot?: "red" | "green";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
        active
          ? "border-primary/40 bg-accent text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {dot && (
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${dot === "red" ? "bg-destructive" : "bg-emerald-500"}`}
        />
      )}
      {label}
    </button>
  );
}
