import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type QuerySnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  monthKeyOfDateString,
  type AppUser,
  type QuoteOutcome,
  type QuoteRecord,
} from "../types";

const QUOTES = "quotes";

/** Upper bound on a single subscription, so one runaway month can't blow up the client. */
const MAX_QUOTES = 1000;

/** A stable id, generated once when the builder starts a quote and reused on every re-save. */
export function newQuoteId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** The fields the builder supplies. Everything else is stamped on by recordQuote. */
export interface QuoteDraft {
  id: string;
  studentName: string;
  hubspotDealCode: string;
  courseSummary: string;
  totalValue: number;
  dateIssued: string;
  validUntil: string;
  pathwaysData?: string;
}

function toRecord(id: string, data: any): QuoteRecord {
  return {
    id,
    advisorUid: data.advisorUid || "",
    advisorName: data.advisorName || "Unknown advisor",
    advisorEmail: data.advisorEmail || "",
    studentName: data.studentName || "",
    hubspotDealCode: data.hubspotDealCode || "",
    courseSummary: data.courseSummary || "",
    totalValue: Number(data.totalValue) || 0,
    dateIssued: data.dateIssued || "",
    issueMonth: data.issueMonth || monthKeyOfDateString(data.dateIssued || ""),
    validUntil: data.validUntil || "",
    outcome: (data.outcome as QuoteOutcome) || "pending",
    outcomeAt: data.outcomeAt ?? null,
    outcomeNote: data.outcomeNote || "",
    createdAt: data.createdAt || "",
    updatedAt: data.updatedAt || "",
    pathwaysData: data.pathwaysData || "",
  };
}

function mapSnapshot(snapshot: QuerySnapshot): QuoteRecord[] {
  return snapshot.docs.map((d) => toRecord(d.id, d.data()));
}

/**
 * Writes the quote at the moment the advisor exports the PDF.
 *
 * Upsert, not insert: re-printing the same quote updates the existing record
 * instead of logging a duplicate. issueMonth and createdAt are stamped on the
 * first save and never rewritten, which is what keeps a quote in the month it
 * was issued even if it is edited weeks later.
 */
export async function recordQuote(user: AppUser, draft: QuoteDraft): Promise<void> {
  const ref = doc(db, QUOTES, draft.id);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();

  const shared = {
    advisorName: user.name,
    advisorEmail: user.email,
    studentName: draft.studentName.trim(),
    hubspotDealCode: draft.hubspotDealCode.trim(),
    courseSummary: draft.courseSummary,
    totalValue: Number(draft.totalValue) || 0,
    dateIssued: draft.dateIssued,
    validUntil: draft.validUntil,
    pathwaysData: draft.pathwaysData || "",
    updatedAt: now,
  };

  if (existing.exists()) {
    await updateDoc(ref, shared);
    return;
  }

  await setDoc(ref, {
    ...shared,
    advisorUid: user.uid,
    issueMonth: monthKeyOfDateString(draft.dateIssued),
    outcome: "pending" as QuoteOutcome,
    outcomeAt: null,
    outcomeNote: "",
    createdAt: now,
  });
}

/** Marks a quote closed, lost, or back to pending. */
export async function setQuoteOutcome(
  quoteId: string,
  outcome: QuoteOutcome,
  note = ""
): Promise<void> {
  await updateDoc(doc(db, QUOTES, quoteId), {
    outcome,
    outcomeAt: outcome === "pending" ? null : new Date().toISOString(),
    outcomeNote: note,
    updatedAt: new Date().toISOString(),
  });
}

/** Permanently removes a quote. Restricted to admins by the security rules. */
export async function deleteQuote(quoteId: string): Promise<void> {
  await deleteDoc(doc(db, QUOTES, quoteId));
}

/** Live feed of one advisor's own quotes, newest first. */
export function subscribeToAdvisorQuotes(
  advisorUid: string,
  onQuotes: (quotes: QuoteRecord[]) => void,
  onError: (message: string) => void
) {
  const q = query(
    collection(db, QUOTES),
    where("advisorUid", "==", advisorUid),
    orderBy("createdAt", "desc"),
    limit(MAX_QUOTES)
  );
  return onSnapshot(
    q,
    (snap) => onQuotes(mapSnapshot(snap)),
    (err) => onError(err.message)
  );
}

/** Live feed of every quote issued in a given YYYY-MM. Admins only. */
export function subscribeToMonthQuotes(
  monthKey: string,
  onQuotes: (quotes: QuoteRecord[]) => void,
  onError: (message: string) => void
) {
  const q = query(
    collection(db, QUOTES),
    where("issueMonth", "==", monthKey),
    orderBy("createdAt", "desc"),
    limit(MAX_QUOTES)
  );
  return onSnapshot(
    q,
    (snap) => onQuotes(mapSnapshot(snap)),
    (err) => onError(err.message)
  );
}
