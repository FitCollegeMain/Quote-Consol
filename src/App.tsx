import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Printer, HelpCircle, Check, Key, BookOpen, User, Phone, Mail, Award, Lock,
  ShieldAlert, Calendar, AlertCircle, CheckCircle, Hash, ShieldCheck
} from "lucide-react";
import Logo from "./components/Logo";
import PathwayCard from "./components/PathwayCard";
import DashboardTab from "./components/DashboardTab";
import AdminTab from "./components/AdminTab";
import LoginScreen from "./components/LoginScreen";
import {
  Pathway,
  SelectedCourse,
  QuoteDetails,
  AppUser,
  ADVISER_CONTACTS,
  TIMETABLES,
  QuoteOutcome,
  QuoteRecord,
  CAMPUS_LINKS,
  cleanCourseName,
} from "./types";
import { watchSession, signOutOfConsole } from "./lib/auth";
import {
  newQuoteId,
  recordQuote,
  setQuoteOutcome,
  subscribeToAdvisorQuotes,
} from "./lib/quotes";


// Helper to get formatted date string relative to today
const getDateString = (daysOffset = 0) => {
  const date = new Date();
  if (daysOffset) {
    date.setDate(date.getDate() + daysOffset);
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to get default expiry date string (07/09/26 -> 2026-09-07)
const getDefaultExpiryDateString = () => {
  return "2026-09-07";
};

export default function App() {
  // --- Session ------------------------------------------------------------
  // Identity comes from Firebase Auth; the role and display name come from the
  // user's profile document, which the Firestore rules read too. Nothing about
  // who you are is decided in the browser.
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"builder" | "dashboard" | "admin">("builder");

  // --- Quote records -------------------------------------------------------
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(true);
  const [quotesError, setQuotesError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // One id per quote being built, generated once and reused on every export, so
  // re-printing a quote updates its record instead of logging a duplicate.
  const [currentQuoteId, setCurrentQuoteId] = useState<string>(() => newQuoteId());

  // Details form state
  const [details, setDetails] = useState<QuoteDetails>({
    studentName: "",
    hubspotDealCode: "",
    date: getDateString(),
    validUntil: getDefaultExpiryDateString(),
    adviserName: "",
    adviserEmail: "",
    adviserPhone: "",
  });

  // Pathways list state (initially containing exactly 1 pathway with a blank course selection)
  const [pathways, setPathways] = useState<Pathway[]>([
    {
      id: "pathway-initial-1",
      title: "Your Recommended Pathway",
      mode: "default",
      campusLocation: "",
      startDate: "",
      timetable: "",
      timetableDesc: "",
      paymentPlanType: "weekly",
      courses: [
        {
          id: "course-initial-1",
          name: "",
          mode: "",
          rrp: 0,
          discountValue: 0,
          discountType: "%",
          isIncluded: false,
        },
      ],
    },
  ]);

  useEffect(() => {
    const unsubscribe = watchSession(
      (nextUser) => {
        setUser(nextUser);
        setAuthReady(true);
        if (nextUser) setSessionError(null);
      },
      (message) => setSessionError(message)
    );
    return unsubscribe;
  }, []);

  // Stamp the signed-in advisor onto the quote form.
  useEffect(() => {
    if (!user) return;
    const contact = ADVISER_CONTACTS[user.name];
    setDetails((prev) => ({
      ...prev,
      adviserName: user.name,
      adviserEmail: contact?.email || user.email,
      adviserPhone: contact?.phone || prev.adviserPhone || "",
    }));
  }, [user]);

  // Live feed of this advisor's own quotes. Firestore keeps it current, so a
  // quote marked closed on a phone shows up here without a refresh.
  useEffect(() => {
    if (!user) {
      setQuotes([]);
      return;
    }
    setIsLoadingQuotes(true);
    setQuotesError(null);
    const unsubscribe = subscribeToAdvisorQuotes(
      user.uid,
      (next) => {
        setQuotes(next);
        setIsLoadingQuotes(false);
      },
      (message) => {
        setQuotesError(message);
        setIsLoadingQuotes(false);
      }
    );
    return unsubscribe;
  }, [user]);

  /** Total value of every course across every pathway, after discounts. */
  const calculateQuoteValue = useCallback(() => {
    let total = 0;
    pathways.forEach((pathway) => {
      pathway.courses.forEach((course) => {
        if (!course.name) return;
        const price = course.rrp || 0;
        const discount = course.discountValue || 0;
        const final =
          course.discountType === "%" ? price - price * (discount / 100) : price - discount;
        total += Math.max(0, final);
      });
    });
    return total;
  }, [pathways]);

  /** One-line summary of the pathways, for the tracking list. */
  const buildCourseSummary = useCallback(() => {
    return pathways
      .map((pathway, index) => {
        const names = pathway.courses
          .filter((course) => course.name && !course.isIncluded)
          .map((course) => cleanCourseName(course.name).split(" (")[0]);
        return `Pathway ${index + 1}: ${names.join(", ") || "No course selected"}`;
      })
      .join("; ");
  }, [pathways]);

  /**
   * Records the quote. Called automatically when the advisor exports the PDF —
   * that export is the moment a quote counts as sent.
   */
  const saveQuote = async (isAutoSave = false): Promise<boolean> => {
    if (!user) return false;

    if (!details.studentName.trim()) {
      const message = "Enter the student's full name so the quote can be recorded.";
      if (isAutoSave) console.warn(message);
      else alert(message);
      return false;
    }

    setIsSaving(true);
    try {
      await recordQuote(user, {
        id: currentQuoteId,
        studentName: details.studentName,
        hubspotDealCode: details.hubspotDealCode,
        courseSummary: buildCourseSummary() || "No course selected",
        totalValue: calculateQuoteValue(),
        dateIssued: details.date,
        validUntil: details.validUntil,
        pathwaysData: JSON.stringify(pathways),
      });
      if (!isAutoSave) alert(`Quote for ${details.studentName} recorded.`);
      return true;
    } catch (err: any) {
      console.error("Could not record quote:", err);
      alert(
        "The PDF is ready, but the quote could not be recorded just now. " +
          "It will sync automatically when the connection returns."
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetOutcome = async (quote: QuoteRecord, outcome: QuoteOutcome) => {
    try {
      await setQuoteOutcome(quote.id, outcome);
    } catch (err: any) {
      console.error("Could not update quote outcome:", err);
      alert("Could not update that quote. Check your connection and try again.");
    }
  };

  const handleLoadQuoteBack = (quote: QuoteRecord) => {
    try {
      if (quote.pathwaysData) setPathways(JSON.parse(quote.pathwaysData));
      const contact = ADVISER_CONTACTS[user?.name || ""];
      setDetails({
        studentName: quote.studentName,
        hubspotDealCode: quote.hubspotDealCode || "",
        date: quote.dateIssued,
        validUntil: quote.validUntil,
        adviserName: user?.name || quote.advisorName,
        adviserEmail: contact?.email || user?.email || "",
        adviserPhone: contact?.phone || "",
      });
      // Reuse the same id so re-exporting updates the existing record.
      setCurrentQuoteId(quote.id);
      setActiveTab("builder");
    } catch (err) {
      console.error("Could not restore pathways configuration:", err);
      alert("Could not restore the full pathway setup. The student details were restored.");
    }
  };

  const handleSignOut = async () => {
    await signOutOfConsole();
    setActiveTab("builder");
    setQuotes([]);
  };

  // PIN modal entry state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Set the document title dynamically based on inputs for printing
  useEffect(() => {
    let studentNameTrimmed = details.studentName.trim() || "Student";
    let rawDate = details.date;
    let formattedDate = rawDate;
    if (rawDate) {
      const parts = rawDate.split("-");
      if (parts.length === 3) {
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    const adviserFirstName = details.adviserName.split(" ")[0] || "Advisor";
    document.title = `Quote - FIT College - ${studentNameTrimmed} (${formattedDate}) by ${adviserFirstName}`;
  }, [details]);

  // Handle adding a new secondary pathway
  const handleAddPathway = () => {
    const newPathway: Pathway = {
      id: `pathway-${crypto.randomUUID()}`,
      title: "Your Recommended Pathway",
      mode: "default",
      campusLocation: "",
      startDate: "",
      timetable: "",
      timetableDesc: "",
      paymentPlanType: "weekly",
      courses: [
        {
          id: `course-${crypto.randomUUID()}`,
          name: "",
          mode: "",
          rrp: 0,
          discountValue: 0,
          discountType: "%",
          isIncluded: false,
        },
      ],
    };
    setPathways([...pathways, newPathway]);
  };

  // Update specific pathway in list
  const handleUpdatePathway = (index: number, updatedPathway: Pathway) => {
    const updated = [...pathways];
    updated[index] = updatedPathway;
    setPathways(updated);
  };

  // Remove secondary pathway from list
  const handleRemovePathway = (index: number) => {
    const updated = pathways.filter((_, idx) => idx !== index);
    setPathways(updated);
  };

  const verifyPinAndPrint = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === "1234") {
      setPinError("");
      setShowPinModal(false);
      setPinInput("");
      
      // Stay unlocked for the rest of the session so the PIN isn't re-entered
      // for every export.
      setIsUnlocked(true);
      exportAndRecord();
    } else {
      setPinError("Access Denied: Incorrect PIN code. Please try again.");
    }
  };

  /**
   * Records the quote first, then opens the print dialog. Recording first means
   * a quote the student is handed is always a quote management can see; if the
   * write fails the advisor is told, and the PDF still prints.
   */
  const exportAndRecord = async () => {
    await saveQuote(true);
    setTimeout(() => window.print(), 200);
  };

  const handlePrintClick = () => {
    if (isUnlocked) {
      exportAndRecord();
    } else {
      setShowPinModal(true);
    }
  };

  // Safe helper to calculate individual row details
  const getCourseRowValues = (course: SelectedCourse) => {
    const price = course.rrp || 0;
    const discVal = course.discountValue || 0;
    let savings = 0;

    if (course.discountType === "%") {
      savings = price * (discVal / 100);
    } else {
      savings = discVal;
    }

    if (savings > price) savings = price;
    const finalPrice = price - savings;
    return { savings, finalPrice };
  };

  // Wait for Firebase to say whether there is a session before painting either
  // the console or the login screen, so a signed-in advisor never sees a flash
  // of the sign-in form on reload.
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
        <Logo variant="dark" className="h-16 w-auto opacity-40 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen sessionError={sessionError} />;
  }

  const isAdmin = user.role === "admin";

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-fit-darkgray font-sans print:bg-white antialiased">
      {/* 1. TOP HEADER BRAND BAR (Hides on print completely) */}
      <header className="h-16 bg-[#0F0F10] text-white px-6 md:px-8 flex items-center justify-between gap-4 sm:gap-6 shrink-0 border-b border-gray-800 no-print z-40">
        <div className="flex items-center gap-3">
          <Logo variant="dark" className="h-11 w-auto py-0.5" />
          <div className="h-8 w-[1px] bg-zinc-800 hidden sm:block"></div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-extrabold tracking-widest uppercase leading-none text-white">FIT COLLEGE</span>
            <span className="text-[9px] text-fit-red font-bold tracking-widest uppercase mt-1">Careers Advisor Console</span>
          </div>
        </div>

        {/* Global navigation tabs matching the dashboard style */}
        <nav className="flex gap-6 md:gap-8 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("builder")}
            className={`pb-1 font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "builder"
                ? "text-white border-b-2 border-fit-red"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Quote Builder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`pb-1 font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "dashboard"
                ? "text-white border-b-2 border-fit-red"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            My Quotes
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`pb-1 font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "admin"
                  ? "text-white border-b-2 border-fit-red"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Management</span>
            </button>
          )}
        </nav>

        {/* Active Session Identity */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold">{user.name}</div>
            <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1.5 leading-none mt-0.5">
              <span>{isAdmin ? "Administrator" : "Careers Advisor"}</span>
              <span className="text-zinc-700">•</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-fit-red font-semibold hover:underline cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white uppercase select-none">
            {user.name[0] || "?"}
          </div>
        </div>
      </header>

      {/* 2. DUAL-COLUMN WORKSPACE CONTAINER */}
      {activeTab === "builder" ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden no-print">
        {/* SIDEBAR COLLAPSES AS TOP ACCORDION ON DESKTOP - ADVICE CONTROLS */}
        <aside className="w-full lg:w-[380px] bg-white border-r border-[#D5D8DE] flex flex-col shrink-0 overflow-y-auto">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-fit-black tracking-tight">Configure Quote</h1>
              <p className="text-xs text-fit-gray">Admissions and representative console</p>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-6">
            {/* Advice panel */}
            <div className="bg-red-50/55 border border-red-100 rounded-md p-3 text-[11px] text-gray-600 flex items-start gap-1.5 leading-relaxed text-left">
              <HelpCircle size={13} className="text-fit-red shrink-0 mt-0.5" />
              <p>
                <strong>Quote Generator Info:</strong> Selected qualification rows auto-calculate study mode and system inclusions immediately on the live document mockup on the right.
              </p>
            </div>

            {/* Prospect details section */}
            <div className="space-y-4">
              <label className="text-[11px] font-bold text-[#8B909A] uppercase tracking-wider block">
                Prospect Information
              </label>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#8B909A] uppercase mb-1">
                    Student Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full bg-[#F8FAFC] border border-[#D5D8DE] rounded pl-9 pr-3 py-2 text-xs text-fit-black focus:outline-none focus:ring-1 focus:ring-fit-red focus:bg-white"
                      placeholder="e.g. Michael Smith"
                      value={details.studentName}
                      onChange={(e) => setDetails({ ...details, studentName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8B909A] uppercase mb-1">
                    HubSpot Deal Code
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full bg-[#F8FAFC] border border-[#D5D8DE] rounded pl-9 pr-3 py-2 text-xs text-fit-black focus:outline-none focus:ring-1 focus:ring-fit-red focus:bg-white font-mono"
                      placeholder="e.g. HS-12345"
                      value={details.hubspotDealCode}
                      onChange={(e) => setDetails({ ...details, hubspotDealCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quote details section */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <label className="text-[11px] font-bold text-[#8B909A] uppercase tracking-wider block">
                Quote Parameters
              </label>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-[#8B909A] uppercase">
                        Issue Date
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const today = getDateString();
                          setDetails(prev => ({
                            ...prev,
                            date: today,
                            validUntil: getDefaultExpiryDateString()
                          }));
                        }}
                        className="text-[9px] font-extrabold text-fit-red hover:text-[#9e0c11] uppercase tracking-wider cursor-pointer"
                        title="Auto fill create date as today's date"
                      >
                        Set to Today
                      </button>
                    </div>
                    <input
                      type="date"
                      className="w-full bg-[#F8FAFC] border border-[#D5D8DE] rounded px-3 py-2 text-xs text-fit-black focus:outline-none focus:ring-1 focus:ring-fit-red text-center"
                      value={details.date}
                      onChange={(e) => setDetails({ ...details, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B909A] uppercase mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      className="w-full bg-[#F8FAFC] border border-[#D5D8DE] rounded px-3 py-2 text-xs text-fit-black focus:outline-none focus:ring-1 focus:ring-fit-red text-center"
                      value={details.validUntil}
                      onChange={(e) => setDetails({ ...details, validUntil: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8B909A] uppercase mb-1">
                    Careers Advisor (Locked)
                  </label>
                  <div className="relative font-bold">
                    <Award className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      className="w-full bg-[#E2E8F0] border border-[#CBD5E1] rounded pl-9 pr-3 py-2 text-xs text-slate-600 font-semibold focus:outline-none cursor-not-allowed selection:bg-slate-300"
                      value={user.name}
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 font-bold">
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B909A] uppercase mb-1">
                      Advisor Email (Locked)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="email"
                        className="w-full bg-[#E2E8F0] border border-[#CBD5E1] rounded pl-9 pr-3 py-2 text-xs text-slate-600 font-semibold focus:outline-none cursor-not-allowed selection:bg-slate-300"
                        value={details.adviserEmail || ""}
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#8B909A] uppercase mb-1">
                      Advisor Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        className="w-full bg-[#F8FAFC] border border-[#D5D8DE] rounded pl-9 pr-3 py-2 text-xs text-fit-black focus:outline-none focus:ring-1 focus:ring-fit-red focus:bg-white font-medium"
                        placeholder="1300 887 017"
                        value={details.adviserPhone || ""}
                        onChange={(e) => setDetails({ ...details, adviserPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

             {/* Quick action triggers */}
            <div className="space-y-3 pt-6 border-t border-gray-100 pb-12">
              <label className="text-[11px] font-bold text-[#8B909A] uppercase tracking-wider block">
                Actions
              </label>

              <button
                type="button"
                onClick={handleAddPathway}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-fit-darkgray hover:bg-[#0F0F10] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add Secondary Pathway
              </button>

              <button
                type="button"
                onClick={handlePrintClick}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shadow-md"
              >
                <Printer size={14} />
                {isSaving ? "Recording…" : "Export PDF & Record Quote"}
              </button>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Exporting records this quote against your name and adds it to the
                month&rsquo;s tracking. Re-exporting updates the same record rather than
                creating a second one.
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT PREVIEW WORKSPACE */}
        <section className="flex-1 bg-[#F8FAFC] p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-start">
          <div className="w-full max-w-[800px] mb-4 flex items-center justify-between text-[11px] text-[#8B909A] font-bold uppercase tracking-wider select-none">
            <span>Dynamic Document Mockup</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>LIVE EDIT SYNC ACTIVE</span>
            </div>
          </div>

          {/* THE DIGITAL INVOICE SHEET SHEET - MATCHES THE HIGH END PDF A4 VIBE */}
          <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-xl border border-[#D5D8DE] overflow-hidden flex flex-col min-h-[1050px]">
            {/* Header branding */}
            <div className="bg-fit-black text-white px-8 py-8 md:py-10 border-b-6 border-fit-red flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="text-left">
                <h2 className="font-bebas text-5xl tracking-widest leading-none text-white font-bold">
                  FIT COLLEGE
                </h2>
                <div className="h-1 w-12 bg-fit-red mt-2.5 mb-1.5 rounded-full" />
                <p className="font-bebas text-lg tracking-widest text-fit-red">
                  OFFICIAL STUDY QUOTE
                </p>
              </div>
              <div className="flex flex-col items-center sm:items-end">
                <Logo variant="dark" className="h-20 w-auto transform hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out cursor-pointer hover:drop-shadow-[0_0_12px_rgba(214,40,40,0.35)]" />
              </div>
            </div>

            {/* Document contents */}
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
              <div>
                {/* Clean metadata grid replacing original redundant input form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left pb-5 border-b border-[#D5D8DE] mb-8">
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] font-bold text-[#8B909A] uppercase tracking-wider block mb-0.5">Prepared For:</span>
                      <span className="font-bold text-fit-black text-sm block">{details.studentName || "Prospect Student"}</span>
                    </div>
                    {details.hubspotDealCode && (
                      <div className="text-[#8B909A] space-y-0.5">
                        <p className="flex items-center gap-1.5 font-mono"><Hash size={12} className="shrink-0 text-fit-red" />{details.hubspotDealCode}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-[#8B909A] uppercase tracking-wider block mb-0.5">Issued date:</span>
                        <span className="font-semibold text-gray-800">{details.date ? details.date.split("-").reverse().join("/") : "-"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#8B909A] uppercase tracking-wider block mb-0.5">Valid until:</span>
                        <span className="font-semibold text-gray-800">{details.validUntil ? details.validUntil.split("-").reverse().join("/") : "-"}</span>
                      </div>
                    </div>
                     <div>
                      <span className="text-[10px] font-bold text-[#8B909A] uppercase tracking-wider block mb-0.5">Careers Advisor:</span>
                      <span className="font-semibold text-fit-black flex items-center gap-1">
                        <Award size={13} className="text-fit-red shrink-0" />
                        {details.adviserName || "FIT Representative"}
                      </span>
                      {(details.adviserEmail || details.adviserPhone) && (
                        <div className="text-[#8B909A] mt-1 space-y-0.5 text-[10px] font-medium">
                          {details.adviserEmail && <p className="flex items-center gap-1.5"><Mail size={11} className="shrink-0 text-zinc-400" />{details.adviserEmail}</p>}
                          {details.adviserPhone && <p className="flex items-center gap-1.5"><Phone size={11} className="shrink-0 text-zinc-400" />{details.adviserPhone}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* List of interactive study pathways rendering inside the sheet mockup */}
                <div className="space-y-10">
                  {pathways.map((pathway, index) => (
                    <PathwayCard
                      key={pathway.id}
                      pathway={pathway}
                      index={index}
                      onUpdatePathway={(updated) => handleUpdatePathway(index, updated)}
                      onRemovePathway={() => handleRemovePathway(index)}
                      isFirst={index === 0}
                      advisorName={details.adviserName}
                    />
                  ))}
                </div>
              </div>

              {/* Dynamic Mockup Sheet Footer */}
              <div className="border-t border-[#D5D8DE] pt-8 mt-12 text-center text-xs text-slate-500">
                <p className="font-bold text-fit-black tracking-wide uppercase mb-3">
                  To progress this enrolment quote, book a 1-on-1 session with your careers advisor above.
                </p>
                <div className="bg-[#F8FAFC] border border-[#D5D8DE] p-4 rounded-lg inline-block w-full max-w-[550px]">
                  <strong className="text-fit-black block mb-1 tracking-widest uppercase text-[11px]">
                    FIT COLLEGE HEAD OFFICE
                  </strong>
                  <p className="leading-relaxed text-[#8B909A]">
                    Suite 8, Level 1, 102 Wises Road, Maroochydore, QLD, 4558
                  </p>
                  <p className="mt-1 font-semibold text-gray-600 text-[11px]">
                    Phone: 1300 887 017 | Email: info@fitcollege.edu.au | Web: www.fitcollege.edu.au
                  </p>
                  <p className="text-[9px] text-[#8B909A] mt-2 font-mono">
                    RTO Provider: 31903 | CRICOS Code: 03926G | ABN: 51 143 802 966
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      ) : activeTab === "admin" && isAdmin ? (
        <AdminTab adminName={user.name} />
      ) : (
        <DashboardTab
          quotes={quotes}
          advisorName={user.name}
          onSetOutcome={handleSetOutcome}
          onLoadQuote={handleLoadQuoteBack}
          isLoading={isLoadingQuotes}
          errorMessage={quotesError}
        />
      )}

      {/* 3. HARDCOPY PRINT PAGE CLONES (Beautiful independent pages rendering on print) */}
      <div className="hidden print:block w-full">
        {pathways.map((pathway, index) => {
          const firstCourseUpper = pathway.courses[0]?.name?.toUpperCase() || "";
          const derivedMode = firstCourseUpper.includes("ONLINE")
            ? "online"
            : firstCourseUpper.includes("F2F") ||
              firstCourseUpper.includes("PART TIME") ||
              firstCourseUpper.includes("FULL TIME") ||
              firstCourseUpper.includes("CAMPUS")
            ? "campus"
            : "default";

          const rawPlanType = pathway.paymentPlanType;
          const pathwayPaymentPlanType = (!rawPlanType || rawPlanType === "full") ? "weekly" : rawPlanType;

          const derivedTitle =
            derivedMode === "online"
              ? "RECOMMENDED ONLINE PATHWAY"
              : derivedMode === "campus"
              ? "RECOMMENDED ON-CAMPUS PATHWAY"
              : "RECOMMENDED PATHWAY";

          let runningSavings = 0;
          let runningInvestment = 0;

          // Date formatter for clean printing (YYYY-MM-DD or DD-MM-YYYY -> DD/MM/YYYY)
          const cleanDate = (dStr: string) => {
            if (!dStr) return "";
            if (dStr.includes("-")) {
              const p = dStr.split("-");
              if (p.length === 3) {
                if (p[0].length === 4) return `${p[2]}/${p[1]}/${p[0]}`;
                if (p[2].length === 4) return `${p[0]}/${p[1]}/${p[2]}`;
              }
            }
            return dStr;
          };

          return (
            <div
              key={`print-page-${pathway.id}`}
              className={`bg-white w-full p-[10mm] print:p-0 flex flex-col pathway-print-block print-page-layout font-sans text-xs print:text-[10px] ${index > 0 ? "print-page-break-before" : ""}`}
              style={{ boxSizing: "border-box" }}
            >
              {/* Top Section wrap */}
              <div>
                {/* Print page Header */}
                <div className="bg-white border-b-2 border-fit-red flex items-center justify-between pb-4 print:pb-2 mb-5 print:mb-2.5">
                  <div className="text-left">
                    <h2 className="font-bebas text-[30px] print:text-[23px] tracking-widest leading-none text-[#D62828] font-black uppercase">
                      OFFICIAL QUOTE SHEET
                    </h2>
                    <p className="font-bebas text-[11px] print:text-[9px] tracking-widest text-gray-500 mt-1 print:mt-0.5 font-semibold uppercase">
                      {derivedTitle}
                    </p>
                  </div>
                  
                  <Logo variant="light" className="h-16 print:h-11 w-auto" />
                </div>

                {/* Print Metadata fields */}
                <div className="grid grid-cols-2 gap-6 print:gap-4 mb-4 print:mb-2 text-[11px] print:text-[10px] border-b border-fit-lightgray pb-3 print:pb-1.5">
                  <div className="space-y-1 print:space-y-0.5 text-left">
                    <div className="flex">
                      <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Prepared For:</span>
                      <span className="font-bold text-fit-black text-xs print:text-[10.5px]">{details.studentName || "Prospect Student"}</span>
                    </div>
                    {details.hubspotDealCode && (
                      <div className="flex">
                        <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0 font-mono">Enquiry Code:</span>
                        <span className="text-gray-800 font-mono font-semibold print:text-[10px]">{details.hubspotDealCode}</span>
                      </div>
                    )}
                    <div className="flex">
                      <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Quote Date:</span>
                      <span className="text-gray-800 font-medium">{cleanDate(details.date)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Valid Until:</span>
                      <span className="text-gray-800 font-medium">{cleanDate(details.validUntil)}</span>
                    </div>
                  </div>
 
                  <div className="space-y-1 print:space-y-0.5 text-left">
                    {details.adviserName && (
                      <>
                        <div className="flex">
                          <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Advisor:</span>
                          <span className="text-fit-black font-semibold">{details.adviserName}</span>
                        </div>
                        {details.adviserPhone && (
                          <div className="flex">
                            <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Adv. Phone:</span>
                            <span className="text-gray-800 font-medium">{details.adviserPhone}</span>
                          </div>
                        )}
                        {details.adviserEmail && (
                          <div className="flex">
                            <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Adv. Email:</span>
                            <span className="text-gray-800 break-all">{details.adviserEmail}</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 mt-1 pb-1 pt-0.5">
                          <span className="text-[10px] print:text-[8.5px] font-bold text-gray-500 uppercase tracking-wider block">Booking Link:</span>
                          <a
                            href={(details.adviserName && ADVISER_CONTACTS[details.adviserName]?.meetingUrl) || "https://meetings-ap1.hubspot.com/dean-eggins"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 print:py-1.5 bg-fit-red text-white font-extrabold tracking-wide uppercase text-[10px] print:text-[8px] rounded hover:bg-red-700 transition-all text-center w-full max-w-[200px]"
                            style={{ display: "inline-flex", textDecoration: "none" }}
                          >
                            <span>📅 Book Consultation</span>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pathway Header Title */}
                <div className="mb-3 print:mb-1.55">
                  <h3 className="font-bebas text-2xl print:text-lg tracking-wider text-fit-red text-left font-black">
                    {derivedTitle}
                  </h3>
                  <div className="h-0.5 bg-fit-red w-24 print:w-16 mt-1 print:mt-0.5" />
                </div>

                {/* Mode description section */}
                <div className="mb-4 print:mb-2 text-left">
                  {derivedMode === "campus" && (
                    <div className="border border-fit-lightgray rounded-md p-3.5 print:p-2 bg-gray-50 text-[11px] print:text-[10px] grid grid-cols-2 gap-4 print:gap-2">
                      {pathway.campusLocation && (
                        <div>
                          <strong className="text-gray-500 uppercase block tracking-wider text-[9px] print:text-[8px] mb-0.5">Campus:</strong>
                          <span className="font-semibold text-fit-darkgray block">{pathway.campusLocation}</span>
                          {CAMPUS_LINKS[pathway.campusLocation] && (
                            <div className="mt-1 print:mt-0.5 flex items-center gap-1.5 text-[9px] print:text-[8px] font-bold">
                              <a
                                href={CAMPUS_LINKS[pathway.campusLocation].mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-fit-red hover:underline"
                              >
                                Google Maps Link
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                      {pathway.startDate && (
                        <div>
                          <strong className="text-gray-500 uppercase block tracking-wider text-[9px] print:text-[8px] mb-0.5">Start Date:</strong>
                          <span className="font-semibold text-fit-darkgray">{cleanDate(pathway.startDate)}</span>
                        </div>
                      )}
                      {pathway.timetable && (
                        <div className="col-span-2">
                          <strong className="text-gray-500 uppercase block tracking-wider text-[9px] print:text-[8px] mb-0.5">Timetable schedule:</strong>
                          <span className="font-bold text-fit-red uppercase text-xs print:text-[10px]">{pathway.timetableDesc}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {derivedMode === "online" && (
                    <div className="border border-fit-lightgray rounded-md p-3.5 print:p-2 bg-gray-50 text-[11px] print:text-[10px] print:leading-normal">
                      <span className="text-fit-red font-bold uppercase tracking-wider">Online Mode study:</span> Start anytime, anywhere! Fully flexible, self-paced, and comprehensive online assessment portal with designated tutor evaluations.
                    </div>
                  )}
                </div>

                {/* Table for Hardcopy */}
                <table className="w-full text-xs print:text-[10px] text-left border-collapse mb-6 print:mb-2">
                  <thead>
                    <tr className="bg-fit-black text-white font-bebas text-sm print:text-xs">
                      <th className="py-2.5 px-3 print:py-1.5 print:px-2 uppercase text-left">Course Qualification</th>
                      <th className="py-2.5 px-3 print:py-1.5 print:px-2 uppercase text-center w-[80px] print:w-[65px]">Mode</th>
                      <th className="py-2.5 px-3 print:py-1.5 print:px-2 uppercase text-right w-[85px] print:w-[70px]">RRP</th>
                      <th className="py-2.5 px-3 print:py-1.5 print:px-2 uppercase text-right w-[85px] print:w-[70px]">Savings</th>
                      <th className="py-2.5 px-3 print:py-1.5 print:px-2 uppercase text-right w-[95px] print:w-[85px] rounded-r-md">Final Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pathway.courses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-400 italic">No courses on this pathway</td>
                      </tr>
                    ) : (
                      pathway.courses.map((course) => {
                        const { savings, finalPrice } = getCourseRowValues(course);
                        runningSavings += savings;
                        runningInvestment += finalPrice;

                        const formatVal = (v: number) => {
                          return new Intl.NumberFormat("en-AU", {
                            style: "currency",
                            currency: "AUD",
                          }).format(v);
                        };

                        if (course.isIncluded) {
                          return (
                            <tr key={course.id} className="border-b border-gray-200 bg-gray-50 text-gray-500 font-medium">
                              <td className="py-2 px-3 print:py-1 print:px-2 font-semibold text-gray-600 flex items-center gap-1">
                                <span>{cleanCourseName(course.name)}</span>
                                <span className="text-[9px] print:text-[8px] text-fit-red font-bold tracking-wider uppercase">(Included)</span>
                              </td>
                              <td className="py-2 px-3 print:py-1 print:px-2 text-center text-xs print:text-[9px]">{course.mode || "Online"}</td>
                              <td className="py-2 px-3 print:py-1 print:px-2 text-right text-gray-400"></td>
                              <td className="py-2 px-3 print:py-1 print:px-2 text-right text-gray-400"></td>
                              <td className="py-2 px-3 print:py-1 print:px-2 text-right font-bold text-gray-600"></td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={course.id} className="border-b border-gray-100 font-medium">
                            <td className="py-2.5 px-3 print:py-1.25 print:px-2 text-fit-darkgray">{cleanCourseName(course.name) || "Custom Study Qualification"}</td>
                            <td className="py-2.5 px-3 print:py-1.25 print:px-2 text-center">{course.mode || "-"}</td>
                            <td className="py-2.5 px-3 print:py-1.25 print:px-2 text-right">{formatVal(course.rrp)}</td>
                            <td className="py-2.5 px-3 print:py-1.25 print:px-2 text-right text-fit-red">-{formatVal(savings)}</td>
                            <td className="py-2.5 px-3 print:py-1.25 print:px-2 text-right font-bold text-fit-darkgray">{formatVal(finalPrice)}</td>
                          </tr>
                        );
                      })
                    )}

                    {/* Print savings totals row */}
                    <tr className="border-t border-gray-300 font-bold bg-gray-50/50">
                      <td colSpan={3} className="py-2 px-3 print:py-1 print:px-2 text-right text-[10px] print:text-[8px] text-gray-500 uppercase tracking-widest">
                        Total Program Savings:
                      </td>
                      <td className="py-2 px-3 print:py-1 print:px-2 text-right text-fit-red font-black">
                        -{new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(runningSavings)}
                      </td>
                      <td></td>
                    </tr>

                    <tr className="border-t border-gray-300 font-bold bg-gray-50">
                      <td colSpan={4} className="py-2.5 px-3 print:py-1.5 print:px-2 text-right font-bold text-fit-black text-xs print:text-[10px] uppercase tracking-wider">
                        Total Course Investment:
                      </td>
                      <td className="py-2.5 px-3 print:py-1.5 print:px-2 text-right text-sm print:text-xs text-fit-red font-black">
                        {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(runningInvestment)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tuition Payment Option for Printout */}
                <div className="mt-4 print:mt-1 border border-gray-200 rounded-lg p-4 print:p-2 bg-gray-50/50 text-[11px] print:text-[10px] text-left">
                  <div>
                    <h4 className="text-slate-800 font-extrabold text-[12px] print:text-[10px] uppercase tracking-wider mb-2 border-b border-gray-200 pb-1.5">
                      TUITION INVESTMENT OPTIONS:
                    </h4>
                    {(() => {
                      const displayedPaymentMethods = pathway.displayedPaymentMethods ?? "both";
                      return (
                        <div className={`grid ${displayedPaymentMethods === "both" ? "grid-cols-2 gap-6 print:gap-4" : "grid-cols-1 max-w-md"} font-medium`}>
                          {/* Option 1: Pay In Full */}
                          {displayedPaymentMethods !== "plan" && (
                            <div className={displayedPaymentMethods === "both" ? "border-r border-gray-200/60 pr-4" : ""}>
                              <p className="text-fit-black font-extrabold text-[11px] print:text-[9.5px] uppercase tracking-wide mb-1 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-slate-700 inline-block"></span>
                                {displayedPaymentMethods === "both" ? "Option 1: Pay In Full Upfront" : "Pay In Full Upfront"}
                              </p>
                              <div className="mt-1.5 bg-white border border-gray-100 rounded p-2 print:p-1.5">
                                <span className="text-gray-400 uppercase text-[8px] block">Upfront Investment:</span>
                                <span className="text-slate-800 font-black text-xs print:text-[11px] text-base">
                                  {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(pathway.payInFullPrice ?? runningInvestment)}
                                </span>
                              </div>
                              <p className="text-gray-400 text-[8.5px] print:text-[7.5px] leading-tight mt-1">
                                Upfront discount applied. Zero setup fees.
                              </p>
                            </div>
                          )}

                          {/* Option 2: Payment Plan */}
                          {displayedPaymentMethods !== "full" && (
                            <div>
                              <p className="text-fit-red font-extrabold text-[11px] print:text-[9.5px] uppercase tracking-wide mb-1 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-fit-red inline-block"></span>
                                {displayedPaymentMethods === "both" ? "Option 2: Study Payment Plan" : "Study Payment Plan"}
                              </p>
                              <div className="grid grid-cols-2 gap-2 mt-1.5 bg-white border border-gray-100 rounded p-2 print:p-1.5">
                                <div>
                                  <span className="text-gray-400 uppercase text-[8px] block">Minimum Deposit:</span>
                                  <span className="text-slate-800 font-black text-xs print:text-[11px] text-base block">
                                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(pathway.depositAmount === undefined ? 500 : pathway.depositAmount)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400 uppercase text-[8px] block">Recurring:</span>
                                  <span className="text-slate-800 font-black text-xs print:text-[11px] text-base block">
                                    {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(pathway.paymentPlanAmount === undefined ? 100 : pathway.paymentPlanAmount)}<span className="text-[10px] text-gray-500 font-normal">/{pathwayPaymentPlanType === "fortnightly" ? "fn" : "wk"}</span>
                                  </span>
                                </div>
                              </div>
                              <p className="text-gray-400 text-[8.5px] print:text-[7.5px] leading-tight mt-1">
                                Interest-free structure. Single $6.60 setup fee only (no admin or continual fees).
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <p className="text-gray-500 text-[9px] print:text-[8px] leading-relaxed mt-2.5 print:mt-1.5 border-t border-gray-100 pt-2 print:pt-1 italic">
                      <strong className="text-gray-700 font-extrabold uppercase">ALL ENROLMENTS:</strong> Upfront payment available OR Payment Plans are interest free with a single $6.60 setup fee only (no admin fees, no continual fees).
                    </p>
                  </div>
                </div>

              </div>
            </div>
          );
        })}

        {/* 3.1. DEDICATED WHY STUDY WITH FIT COLLEGE PAGE AT THE END OF THE PRINT DOCUMENT */}
        <div
          className="bg-white min-h-[265mm] print:min-h-0 w-full p-[10mm] print:p-0 flex flex-col justify-between print-page-layout print-page-break-before font-sans text-left"
          style={{ boxSizing: "border-box" }}
        >
          <div>
            {/* Header section */}
            <div className="bg-white border-b-2 border-fit-red flex items-center justify-between pb-4 print:pb-2 mb-8 print:mb-3">
              <div className="text-left">
                <h2 className="font-bebas text-[30px] print:text-[23px] tracking-widest leading-none text-[#D62828] font-black uppercase">
                  STUDENT VALUE PROPOSITION
                </h2>
                <p className="font-bebas text-[11px] print:text-[9px] tracking-widest text-gray-500 mt-1 print:mt-0.5 font-semibold uppercase">
                  Why Study with FIT College
                </p>
              </div>
              <Logo variant="light" className="h-16 print:h-11 w-auto" />
            </div>

            {/* Section main title */}
            <div className="mb-6 print:mb-3">
              <h3 className="font-bebas text-2xl print:text-lg tracking-wider text-fit-red text-left font-black">
                WHY STUDY WITH FIT COLLEGE?
              </h3>
              <div className="h-0.5 bg-fit-red w-32 print:w-20 mt-1 print:mt-0.5" />
            </div>

            {/* Listing each pathway's custom value proposition based on its modes & selected courses */}
            <div className="space-y-6 print:space-y-3">
              {pathways.map((pathway, index) => {
                const firstCourseUpper = pathway.courses[0]?.name?.toUpperCase() || "";
                const derivedMode = firstCourseUpper.includes("ONLINE")
                  ? "online"
                  : firstCourseUpper.includes("F2F") ||
                    firstCourseUpper.includes("PART TIME") ||
                    firstCourseUpper.includes("FULL TIME")
                  ? "campus"
                  : "default";

                // Generate clean display titles matching the quoted pathways
                const selectedNames = pathway.courses
                  .filter(c => c.name && !c.isIncluded)
                  .map(c => cleanCourseName(c.name));
                const pathwayTitle = selectedNames.join(" & ") || "Your Recommended Study Plan";

                return (
                  <div key={`print-why-study-${pathway.id}`} className="border-l-4 border-fit-red bg-gray-50/50 p-4 rounded-r-md">
                    <h4 className="font-bebas text-lg text-fit-black tracking-wide mb-2 font-bold uppercase">
                      Pathway {index + 1}: {pathwayTitle}
                    </h4>

                    {derivedMode === "online" && (
                      <ul className="space-y-1.5 text-[11px] text-gray-700 font-medium">
                        <li>✦ <strong>Proven Success:</strong> Proven Success - 20k+ Online Graduates</li>
                        <li>✦ <strong>Unmatched Campus & Virtual Support:</strong> Full education support available from 9am to 5pm daily.</li>
                        <li>✦ <strong>Flexible Upgrade Options:</strong> Upgrade at any time to full-time or part-time, on-campus study to work around your busy life.</li>
                        <li>✦ <strong>Registered Training Organisation:</strong> High standards of compliance, fully audited under RTO: 31903.</li>
                      </ul>
                    )}

                    {derivedMode === "campus" && (
                      <ul className="space-y-1.5 text-[11px] text-gray-700 font-medium animate-fade-in">
                        <li>✦ <strong>World Class Facilities:</strong> High-specification real gym classrooms for actual hands-on fitness education.</li>
                        <li>✦ <strong>Qualified Industry Evaluators:</strong> Learn directly from qualified fitness professionals with running businesses.</li>
                        <li>✦ <strong>Blended Study Access:</strong> Complete digital resources coupled face-to-face learning</li>
                        <li>✦ <strong>Liason Network:</strong> Immediate access to interviews and opportunities with commercial gyms upon graduation.</li>
                      </ul>
                    )}

                    {derivedMode === "default" && (
                      <ul className="space-y-1.5 text-[11px] text-gray-700 font-medium animate-fade-in">
                        <li>✦ <strong>Proven Success:</strong> Proven Success - 20k+ Online Graduates</li>
                        <li>✦ <strong>Unmatched Campus & Virtual Support:</strong> Full education support available from 9am to 5pm daily.</li>
                        <li>✦ <strong>Flexible Upgrade Options:</strong> Upgrade at any time to full-time or part-time, on-campus study to work around your busy life.</li>
                        <li>✦ <strong>Registered Training Organisation:</strong> High standards of compliance, fully audited under RTO: 31903.</li>
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer of the Dedicated page */}
          <div className="text-center text-[10px] print:text-[8.5px] text-gray-400 border-t border-gray-100 pt-3 print:pt-1.5 mt-8 print:mt-4">
            <p className="font-semibold text-gray-600 uppercase tracking-widest text-[11px] print:text-[9.5px] mb-1 print:mb-0.5">
              FIT COLLEGE HEAD OFFICE
            </p>
            <p className="text-gray-500">
              Suite 8, Level 1, 102 Wises Road, Maroochydore, QLD, 4558 | Phone: 1300 887 017 | Email: info@fitcollege.edu.au
            </p>
            <p className="text-[8px] mt-1 font-mono">
              RTO Provider Code: 31903 | CRICOS: 03926G | ABN: 51 143 802 966
            </p>
          </div>
        </div>
      </div>

      {/* 4. PIN modal dialogue box */}
      {showPinModal && (
        <div className="fixed inset-0 bg-fit-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-gray-100 max-w-sm w-full overflow-hidden">
            <div className="bg-fit-black text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="text-fit-red shrink-0" size={18} />
                <h3 className="font-bebas text-lg tracking-wider">Representative Verification</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput("");
                  setPinError("");
                }}
                className="text-gray-400 hover:text-white cursor-pointer font-bold px-1 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={verifyPinAndPrint} className="p-5">
              <p className="text-xs text-gray-600 mb-4 leading-relaxed text-left">
                Please enter the 4-digit sales team security PIN code to initialize document print and export of this pathway quote.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 text-left">
                    Security PIN Code:
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-fit-gray" />
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value.replace(/\D/g, ""));
                        setPinError("");
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-md pl-9 pr-3 py-2 text-center text-sm font-mono tracking-widest text-fit-black focus:border-fit-red outline-none"
                      placeholder="••••"
                      autoFocus
                    />
                  </div>
                </div>

                {pinError && (
                  <div className="flex items-start gap-1.5 p-2 bg-red-50 rounded text-[11px] text-fit-red border border-red-100 font-medium">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <span className="text-left">{pinError}</span>
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPinInput("");
                      setPinError("");
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-4 py-1.5 bg-fit-red hover:bg-[#a80d13] text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-colors"
                  >
                    Verify & Print
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
