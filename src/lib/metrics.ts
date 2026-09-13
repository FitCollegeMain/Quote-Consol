import { displayStatusOf, type QuoteRecord } from "../types";

export interface QuoteSummary {
  /** Quotes issued in the period. */
  sent: number;
  sentValue: number;
  /** Accepted by the student. */
  closed: number;
  closedValue: number;
  /** Still pending and still inside its validity date: the realistic pipeline. */
  open: number;
  openValue: number;
  /** Pending, but the validity date has passed. */
  lapsed: number;
  lapsedValue: number;
  /** Explicitly written off by the advisor. */
  lost: number;
  lostValue: number;
  /** lapsed + lost. */
  notClosed: number;
  notClosedValue: number;
  /** Quotes with a decision either way. */
  decided: number;
  /** closed / sent. The month-end headline. */
  closeRate: number;
  /** closed / decided. Fairer mid-month, when much of the month is still open. */
  decidedCloseRate: number;
}

const EMPTY: QuoteSummary = {
  sent: 0,
  sentValue: 0,
  closed: 0,
  closedValue: 0,
  open: 0,
  openValue: 0,
  lapsed: 0,
  lapsedValue: 0,
  lost: 0,
  lostValue: 0,
  notClosed: 0,
  notClosedValue: 0,
  decided: 0,
  closeRate: 0,
  decidedCloseRate: 0,
};

export function summarise(quotes: QuoteRecord[], now = new Date()): QuoteSummary {
  const s: QuoteSummary = { ...EMPTY };

  for (const quote of quotes) {
    const value = Number(quote.totalValue) || 0;
    s.sent += 1;
    s.sentValue += value;

    switch (displayStatusOf(quote, now)) {
      case "closed":
        s.closed += 1;
        s.closedValue += value;
        break;
      case "open":
        s.open += 1;
        s.openValue += value;
        break;
      case "lapsed":
        s.lapsed += 1;
        s.lapsedValue += value;
        break;
      case "lost":
        s.lost += 1;
        s.lostValue += value;
        break;
    }
  }

  s.notClosed = s.lapsed + s.lost;
  s.notClosedValue = s.lapsedValue + s.lostValue;
  s.decided = s.closed + s.notClosed;
  s.closeRate = s.sent > 0 ? s.closed / s.sent : 0;
  s.decidedCloseRate = s.decided > 0 ? s.closed / s.decided : 0;

  return s;
}

export interface AdvisorSummary extends QuoteSummary {
  advisorUid: string;
  advisorName: string;
}

/**
 * Per-advisor breakdown for the admin report, busiest pipeline first so the
 * people with the most still to close sit at the top of the list.
 */
export function summariseByAdvisor(
  quotes: QuoteRecord[],
  now = new Date()
): AdvisorSummary[] {
  const grouped = new Map<string, { name: string; quotes: QuoteRecord[] }>();

  for (const quote of quotes) {
    const key = quote.advisorUid || quote.advisorName;
    const entry = grouped.get(key);
    if (entry) {
      entry.quotes.push(quote);
    } else {
      grouped.set(key, { name: quote.advisorName, quotes: [quote] });
    }
  }

  return Array.from(grouped.entries())
    .map(([advisorUid, { name, quotes: theirs }]) => ({
      advisorUid,
      advisorName: name,
      ...summarise(theirs, now),
    }))
    .sort((a, b) => b.openValue - a.openValue || b.closedValue - a.closedValue);
}

export function formatCurrency(value: number, withCents = false): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  }).format(value || 0);
}

export function formatPercent(ratio: number): string {
  return `${Math.round((ratio || 0) * 100)}%`;
}

/** DD/MM/YYYY from a YYYY-MM-DD string. */
export function formatDate(dateStr: string): string {
  const parts = (dateStr || "").split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr || "—";
}

/** Whole days left in the current month, today included. */
export function daysLeftInMonth(now = new Date()): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}
