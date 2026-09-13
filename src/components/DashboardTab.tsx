import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  displayStatusOf,
  formatMonthKey,
  monthKeyOf,
  shiftMonthKey,
  type QuoteOutcome,
  type QuoteRecord,
} from "../types";
import {
  daysLeftInMonth,
  formatCurrency,
  formatDate,
  formatPercent,
  summarise,
} from "../lib/metrics";

interface DashboardTabProps {
  /** The signed-in advisor's own quotes. */
  quotes: QuoteRecord[];
  advisorName: string;
  onSetOutcome: (quote: QuoteRecord, outcome: QuoteOutcome) => Promise<void>;
  /** Reloads a quote into the builder so it can be revised and re-issued. */
  onLoadQuote: (quote: QuoteRecord) => void;
  isLoading: boolean;
  errorMessage?: string | null;
}

export default function DashboardTab({
  quotes,
  advisorName,
  onSetOutcome,
  onLoadQuote,
  isLoading,
  errorMessage,
}: DashboardTabProps) {
  const thisMonth = monthKeyOf(new Date());
  const lastMonth = shiftMonthKey(thisMonth, -1);
  const [monthKey, setMonthKey] = useState(thisMonth);
  const isCurrentMonth = monthKey === thisMonth;

  const monthQuotes = useMemo(
    () => quotes.filter((q) => q.issueMonth === monthKey),
    [quotes, monthKey]
  );

  const summary = useMemo(() => summarise(monthQuotes), [monthQuotes]);

  // Soonest to expire first: those are the ones worth a phone call today.
  const openQuotes = useMemo(
    () =>
      monthQuotes
        .filter((q) => displayStatusOf(q) === "open")
        .sort((a, b) => a.validUntil.localeCompare(b.validUntil)),
    [monthQuotes]
  );

  const decidedQuotes = useMemo(
    () => monthQuotes.filter((q) => displayStatusOf(q) !== "open"),
    [monthQuotes]
  );

  const daysLeft = daysLeftInMonth();

  return (
    <div className="flex-1 overflow-y-auto no-print bg-[#F8FAFC] p-6 md:p-8 font-sans text-left">
      <div className="max-w-5xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {advisorName.split(" ")[0]}&rsquo;s quotes
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {formatMonthKey(monthKey)}
              {isCurrentMonth && (
                <span className="ml-1.5 text-slate-400">
                  · {daysLeft} {daysLeft === 1 ? "day" : "days"} left in the month
                </span>
              )}
            </p>
          </div>

          <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1 shadow-sm self-start">
            {[
              { key: thisMonth, label: "This month" },
              { key: lastMonth, label: "Last month" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setMonthKey(option.key)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  monthKey === option.key
                    ? "bg-fit-red text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700 font-medium">
            <AlertCircle className="shrink-0 w-4 h-4 mt-0.5" />
            <span>Could not load your quotes: {errorMessage}</span>
          </div>
        )}

        {/* The two numbers that matter, then the supporting detail. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <HeadlineCard
            tone="green"
            icon={<CheckCircle2 size={18} />}
            label="Closed"
            value={formatCurrency(summary.closedValue)}
            detail={`${summary.closed} of ${summary.sent} ${
              summary.sent === 1 ? "quote" : "quotes"
            } sent`}
          />
          <HeadlineCard
            tone="amber"
            icon={<Target size={18} />}
            label={isCurrentMonth ? "Still could close" : "Was still open at month end"}
            value={formatCurrency(summary.openValue)}
            detail={`${summary.open} ${summary.open === 1 ? "quote" : "quotes"} live${
              isCurrentMonth && summary.open > 0 ? ", awaiting a decision" : ""
            }`}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatTile label="Sent" value={String(summary.sent)} sub={formatCurrency(summary.sentValue)} />
          <StatTile
            label="Didn't close"
            value={String(summary.notClosed)}
            sub={formatCurrency(summary.notClosedValue)}
          />
          <StatTile
            label="Lapsed / lost"
            value={`${summary.lapsed} / ${summary.lost}`}
            sub="expired / written off"
          />
          <StatTile
            label="Close rate"
            value={formatPercent(summary.closeRate)}
            sub={`${formatPercent(summary.decidedCloseRate)} of decided`}
          />
        </div>

        {isLoading && monthQuotes.length === 0 ? (
          <EmptyPanel title="Loading your quotes…" body="Fetching records from the console database." />
        ) : summary.sent === 0 ? (
          <EmptyPanel
            title={`No quotes recorded for ${formatMonthKey(monthKey)}`}
            body="A quote is recorded automatically the moment you export its PDF from the Quote Builder."
          />
        ) : (
          <>
            <QuoteSection
              title={isCurrentMonth ? "Open — chase these" : "Open at month end"}
              icon={<Clock size={15} className="text-amber-500" />}
              quotes={openQuotes}
              onSetOutcome={onSetOutcome}
              onLoadQuote={onLoadQuote}
              emptyText="Nothing open. Every quote this month has a decision against it."
            />

            <QuoteSection
              title="Decided"
              icon={<TrendingUp size={15} className="text-slate-400" />}
              quotes={decidedQuotes}
              onSetOutcome={onSetOutcome}
              onLoadQuote={onLoadQuote}
              emptyText="No decisions recorded yet this month."
            />
          </>
        )}
      </div>
    </div>
  );
}

function HeadlineCard({
  tone,
  icon,
  label,
  value,
  detail,
}: {
  tone: "green" | "amber";
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/60 text-amber-700",
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] font-extrabold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-3xl font-black text-slate-900 leading-none tracking-tight">{value}</div>
      <div className="text-xs font-semibold mt-2 opacity-80">{detail}</div>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-sm">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
        {label}
      </span>
      <div className="text-xl font-extrabold text-slate-800 leading-none">{value}</div>
      <div className="text-[10px] text-slate-400 font-semibold mt-1.5">{sub}</div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-10 text-center">
      <h3 className="font-bold text-slate-700 mb-1.5">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{body}</p>
    </div>
  );
}

function QuoteSection({
  title,
  icon,
  quotes,
  onSetOutcome,
  onLoadQuote,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  quotes: QuoteRecord[];
  onSetOutcome: (quote: QuoteRecord, outcome: QuoteOutcome) => Promise<void>;
  onLoadQuote: (quote: QuoteRecord) => void;
  emptyText: string;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
          {title}
        </h2>
        <span className="text-xs text-slate-400 font-semibold">({quotes.length})</span>
      </div>

      {quotes.length === 0 ? (
        <p className="text-xs text-slate-400 font-medium bg-white border border-zinc-200/60 rounded-xl p-5">
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote) => (
            <QuoteRow
              key={quote.id}
              quote={quote}
              onSetOutcome={onSetOutcome}
              onLoadQuote={onLoadQuote}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const STATUS_STYLES: Record<string, { label: string; badge: string; stripe: string }> = {
  open: {
    label: "Open",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    stripe: "bg-amber-400",
  },
  closed: {
    label: "Closed",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stripe: "bg-emerald-500",
  },
  lost: {
    label: "Lost",
    badge: "bg-red-50 text-red-700 border-red-200",
    stripe: "bg-red-400",
  },
  lapsed: {
    label: "Lapsed",
    badge: "bg-zinc-100 text-zinc-500 border-zinc-200",
    stripe: "bg-zinc-400",
  },
};

function QuoteRow({
  quote,
  onSetOutcome,
  onLoadQuote,
}: {
  quote: QuoteRecord;
  onSetOutcome: (quote: QuoteRecord, outcome: QuoteOutcome) => Promise<void>;
  onLoadQuote: (quote: QuoteRecord) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const status = displayStatusOf(quote);
  const style = STATUS_STYLES[status];

  const apply = async (outcome: QuoteOutcome) => {
    setIsSaving(true);
    try {
      await onSetOutcome(quote, outcome);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex">
      <div className={`w-1.5 shrink-0 ${style.stripe}`} />

      <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-slate-800 leading-tight">{quote.studentName}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${style.badge}`}
            >
              {style.label}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {quote.hubspotDealCode || "No HubSpot code"}
          </div>
          <button
            type="button"
            onClick={() => onLoadQuote(quote)}
            className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-fit-red hover:underline mt-1.5 cursor-pointer"
          >
            Open in builder
          </button>
        </div>

        <div className="md:col-span-4 text-xs text-slate-600 font-medium leading-relaxed">
          <p className="line-clamp-2">{quote.courseSummary}</p>
          <div className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">
            Sent {formatDate(quote.dateIssued)} · Expires {formatDate(quote.validUntil)}
          </div>
        </div>

        <div className="md:col-span-2 md:text-right">
          <div className="text-lg font-black text-slate-800 leading-none">
            {formatCurrency(quote.totalValue)}
          </div>
        </div>

        <div className="md:col-span-2 flex md:justify-end gap-1.5">
          {status === "closed" || status === "lost" ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => apply("pending")}
              className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-zinc-200 text-slate-500 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
              title="Put this quote back to open"
            >
              <RotateCcw size={11} />
              Reopen
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => apply("closed")}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
              >
                <CheckCircle2 size={11} />
                Closed
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => apply("lost")}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border border-zinc-200 text-slate-500 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
              >
                <XCircle size={11} />
                Lost
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
