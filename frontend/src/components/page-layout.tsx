import type { ReactNode } from "react";

/** Breadcrumb, title, description and optional actions at the top of a page. */
export function PageHeader({
  breadcrumb,
  title,
  description,
  actions,
}: {
  breadcrumb: string[];
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
      <div>
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
          {breadcrumb.map((crumb, i) => (
            <span key={crumb}>
              {i > 0 && <span className="mx-1.5 text-slate-400">/</span>}
              <span className={i === breadcrumb.length - 1 ? "text-slate-700" : ""}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/** White card with a titled header bar — one per logical section of a page. */
export function SectionCard({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            {title}
          </h2>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
        {actions}
      </header>
      <div>{children}</div>
    </section>
  );
}

const STAT_ACCENTS = {
  brand: "border-l-brand-700",
  green: "border-l-green-600",
  red: "border-l-red-600",
  gray: "border-l-slate-400",
} as const;

export function StatCard({
  label,
  value,
  accent = "brand",
}: {
  label: string;
  value: number | string;
  accent?: keyof typeof STAT_ACCENTS;
}) {
  return (
    <div
      className={`rounded-lg border border-l-4 border-slate-200 bg-white px-5 py-4 shadow-sm ${STAT_ACCENTS[accent]}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

/** Shared table styles so every data table looks the same. */
export const tableStyles = {
  table: "w-full text-left text-sm",
  thead: "border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500",
  th: "px-5 py-3 font-semibold",
  tbody: "divide-y divide-slate-100",
  td: "px-5 py-3",
};

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-800 disabled:opacity-60",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60",
};
