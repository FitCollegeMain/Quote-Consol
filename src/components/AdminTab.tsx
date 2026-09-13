import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  formatMonthKey,
  monthKeyOf,
  shiftMonthKey,
  type QuoteRecord,
} from "../types";
import { subscribeToMonthQuotes } from "../lib/quotes";
import {
  daysLeftInMonth,
  formatCurrency,
  formatPercent,
  summarise,
  summariseByAdvisor,
} from "../lib/metrics";

interface AdminTabProps {
  adminName: string;
}

export default function AdminTab({ adminName }: AdminTabProps) {
  const thisMonth = monthKeyOf(new Date());
  const [monthKey, setMonthKey] = useState(thisMonth);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // One live subscription per selected month. Firestore pushes changes as they
  // happen, so the report updates the moment an advisor marks a quote closed.
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const unsubscribe = subscribeToMonthQuotes(
      monthKey,
      (next) => {
        setQuotes(next);
        setIsLoading(false);
      },
      (message) => {
        setError(message);
        setIsLoading(false);
      }
    );
    return unsubscribe;
  }, [monthKey]);

  const team = useMemo(() => summarise(quotes), [quotes]);
  const advisors = useMemo(() => summariseByAdvisor(quotes), [quotes]);
  const isCurrentMonth = monthKey === thisMonth;
  const daysLeft = daysLeftInMonth();

  const handleExportCsv = () => {
    const header = [
      "Advisor",
      "Quotes sent",
      "Closed",
      "Closed value",
      "Still open",
      "Open value",
      "Lapsed",
      "Lost",
      "Didn't close value",
      "Close rate",
    ];
    const rows = advisors.map((a) => [
      a.advisorName,
      a.sent,
      a.closed,
      a.closedValue,
      a.open,
      a.openValue,
      a.lapsed,
      a.lost,
      a.notClosedValue,
      formatPercent(a.closeRate),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `quote-console-${monthKey}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto no-print bg-[#F8FAFC] p-6 md:p-8 font-sans text-left">
      <div className="max-w-6xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="text-fit-red w-5 h-5" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Management report</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Signed in as {adminName} · every advisor, live
              {isCurrentMonth && (
                <span className="text-slate-400">
                  {" "}· {daysLeft} {daysLeft === 1 ? "day" : "days"} left in the month
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-zinc-200 rounded-lg shadow-sm">
              <button
                type="button"
                onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
                className="px-2 py-2 text-slate-400 hover:text-slate-800 cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-bold text-slate-700 min-w-[7.5rem] text-center">
                {formatMonthKey(monthKey)}
              </span>
              <button
                type="button"
                disabled={isCurrentMonth}
                onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
                className="px-2 py-2 text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={advisors.length === 0}
              className="px-3 py-2 bg-white border border-zinc-200 rounded-lg shadow-sm text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
              title="Download this month as CSV"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700 font-medium">
            <AlertCircle className="shrink-0 w-4 h-4 mt-0.5" />
            <span>Could not load the report: {error}</span>
          </div>
        )}

        {/* Team totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <TeamCard
            label="Closed"
            value={formatCurrency(team.closedValue)}
            detail={`${team.closed} of ${team.sent} quotes`}
            tone="border-emerald-200 bg-emerald-50/60"
          />
          <TeamCard
            label={isCurrentMonth ? "Still could close" : "Open at month end"}
            value={formatCurrency(team.openValue)}
            detail={`${team.open} live ${team.open === 1 ? "quote" : "quotes"}`}
            tone="border-amber-200 bg-amber-50/60"
          />
          <TeamCard
            label="Didn't close"
            value={formatCurrency(team.notClosedValue)}
            detail={`${team.lapsed} lapsed · ${team.lost} lost`}
            tone="border-zinc-200 bg-white"
          />
          <TeamCard
            label="Close rate"
            value={formatPercent(team.closeRate)}
            detail={`${formatPercent(team.decidedCloseRate)} of decided quotes`}
            tone="border-zinc-200 bg-white"
          />
        </div>

        {/* Per-advisor breakdown */}
        <div className="flex items-center gap-2 mb-3">
          <Users size={15} className="text-slate-400" />
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-slate-500">
            By careers advisor
          </h2>
        </div>

        {isLoading && advisors.length === 0 ? (
          <Panel>Loading {formatMonthKey(monthKey)}…</Panel>
        ) : advisors.length === 0 ? (
          <Panel>No quotes were issued in {formatMonthKey(monthKey)}.</Panel>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left min-w-[46rem]">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-zinc-100">
                  <th className="px-4 py-3">Advisor</th>
                  <th className="px-4 py-3 text-right">Sent</th>
                  <th className="px-4 py-3 text-right">Closed</th>
                  <th className="px-4 py-3 text-right">Left to close</th>
                  <th className="px-4 py-3 text-right">Didn&rsquo;t close</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 w-32">Split</th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((advisor) => (
                  <tr
                    key={advisor.advisorUid}
                    className="border-b border-zinc-50 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3 font-bold text-slate-800 text-sm whitespace-nowrap">
                      {advisor.advisorName}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">
                      {advisor.sent}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-emerald-700">
                        {formatCurrency(advisor.closedValue)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {advisor.closed} {advisor.closed === 1 ? "quote" : "quotes"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-bold text-amber-700">
                        {formatCurrency(advisor.openValue)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {advisor.open} open
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-sm font-semibold text-slate-500">
                        {formatCurrency(advisor.notClosedValue)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">
                        {advisor.lapsed} lapsed · {advisor.lost} lost
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-slate-700">
                      {formatPercent(advisor.closeRate)}
                    </td>
                    <td className="px-4 py-3">
                      <SplitBar
                        closed={advisor.closed}
                        open={advisor.open}
                        notClosed={advisor.notClosed}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-slate-400 font-medium mt-4 leading-relaxed max-w-2xl">
          A quote counts towards the month it was issued in, and stays there. &ldquo;Lapsed&rdquo;
          means it passed its expiry date without a decision; &ldquo;lost&rdquo; means the advisor
          marked it as not proceeding.
        </p>
      </div>
    </div>
  );
}

function TeamCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: string;
}) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tone}`}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block mb-1.5">
        {label}
      </span>
      <div className="text-2xl font-black text-slate-900 leading-none tracking-tight">{value}</div>
      <div className="text-[11px] text-slate-500 font-semibold mt-2">{detail}</div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-8 text-center text-xs text-slate-500 font-medium">
      {children}
    </div>
  );
}

/** Proportion of an advisor's quotes that closed, are open, or didn't close. */
function SplitBar({
  closed,
  open,
  notClosed,
}: {
  closed: number;
  open: number;
  notClosed: number;
}) {
  const total = closed + open + notClosed;
  if (total === 0) return <div className="h-2 rounded-full bg-zinc-100" />;

  const pct = (n: number) => `${(n / total) * 100}%`;

  return (
    <div
      className="h-2 rounded-full bg-zinc-100 overflow-hidden flex"
      title={`${closed} closed, ${open} open, ${notClosed} didn't close`}
    >
      <div className="bg-emerald-500" style={{ width: pct(closed) }} />
      <div className="bg-amber-400" style={{ width: pct(open) }} />
      <div className="bg-zinc-300" style={{ width: pct(notClosed) }} />
    </div>
  );
}
