import React, { useState, useEffect } from "react";
import { 
  Plus, Printer, HelpCircle, Check, Key, BookOpen, User, Phone, Mail, Award, Lock, 
  ShieldAlert, Calendar, RefreshCw, Database, FileSpreadsheet, AlertCircle, Trash2, 
  LogOut, CheckCircle, Hash
} from "lucide-react";
import Logo from "./components/Logo";
import PathwayCard from "./components/PathwayCard";
import DashboardTab from "./components/DashboardTab";
import {
  Pathway,
  SelectedCourse,
  QuoteDetails,
  ADVISERS,
  ADVISER_CONTACTS,
  TIMETABLES,
  SavedQuote,
  CAMPUS_LINKS,
  cleanCourseName,
} from "./types";
import {
  initGoogleAuth,
  connectGoogleAccount,
  disconnectGoogleAccount,
  getGoogleAccessToken,
  getConnectedUser,
  fetchSyncedQuotes,
  saveQuoteToSheet,
} from "./lib/workspace";


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

// Helper to get formatted date string for the end of the current month
const getEndOfCurrentMonthString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(lastDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
};

const getSeedQuotes = (): SavedQuote[] => {
  const getDynamicDate = (dayOffsetFromCurrentEnd: number): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const day = Math.max(1, Math.min(totalDays, totalDays - dayOffsetFromCurrentEnd));
    
    const yyyy = year;
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return [
    {
      id: "quote_seed_1",
      advisorName: "Dean Eggins",
      studentName: "Ashley Cole",
      hubspotDealCode: "HS-62849",
      dateIssued: getDynamicDate(2), // 2 days before end of month (inside closeout)
      validUntil: getDynamicDate(-28),
      courseSummary: "Pathway 1: F2F Complete PT Program - Dual Qualification (SIS30321 & SIS40221)",
      totalCost: 9000,
      status: "accepted",
      updatedAt: new Date().toISOString(),
      isAccepted: true
    },
    {
      id: "quote_seed_2",
      advisorName: "Ryan Crilly",
      studentName: "Zack Snyder",
      hubspotDealCode: "HS-93821",
      dateIssued: getDynamicDate(3), // 3 days before end of month (inside closeout)
      validUntil: getDynamicDate(-27),
      courseSummary: "Pathway 1: F2F FIT Elite PT Program (SIS30321 & SIS40221 & Specialty)",
      totalCost: 11400,
      status: "amber pending",
      updatedAt: new Date().toISOString(),
      isAccepted: false
    },
    {
      id: "quote_seed_3",
      advisorName: "Nicky Wood",
      studentName: "Mary Jane",
      hubspotDealCode: "HS-10492",
      dateIssued: getDynamicDate(1), // 1 day before end of month (inside closeout)
      validUntil: getDynamicDate(-29),
      courseSummary: "Pathway 1: ONLINE Diploma of Sport - Coaching (SIS50321)",
      totalCost: 20000,
      status: "amber pending",
      updatedAt: new Date().toISOString(),
      isAccepted: false
    },
    {
      id: "quote_seed_4",
      advisorName: "Sam Russell",
      studentName: "Peter Parker",
      hubspotDealCode: "HS-48201",
      dateIssued: getDynamicDate(4), // 4 days before end of month (inside closeout)
      validUntil: getDynamicDate(-26),
      courseSummary: "Pathway 1: ONLINE Certificate III in Fitness (SIS30321)",
      totalCost: 3000,
      status: "accepted",
      updatedAt: new Date().toISOString(),
      isAccepted: true
    },
    {
      id: "quote_seed_5",
      advisorName: "Tess Szabath",
      studentName: "Bruce Wayne",
      hubspotDealCode: "HS-55921",
      dateIssued: getDynamicDate(15), // Middle of the month (outside closeout, inside month)
      validUntil: getDynamicDate(-15),
      courseSummary: "Pathway 1: Fit Elite Ultra F2F (SIS30321 & SIS40221)",
      totalCost: 12900,
      status: "accepted",
      updatedAt: new Date().toISOString(),
      isAccepted: true
    },
    {
      id: "quote_seed_6",
      advisorName: "Marcus Krause",
      studentName: "Diana Prince",
      hubspotDealCode: "HS-38291",
      dateIssued: getDynamicDate(20), // 20 days ago (outside closeout, old)
      validUntil: getDynamicDate(-10),
      courseSummary: "Pathway 1: ONLINE Complete PT Program - Dual Qualification (SIS30321 & SIS40221)",
      totalCost: 6000,
      status: "amber pending",
      updatedAt: new Date().toISOString(),
      isAccepted: false
    }
  ];
};

export default function App() {
  // Session login system matching "Each career advisor must log in every 7 days"
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const user = localStorage.getItem("fit_advisor");
    const time = localStorage.getItem("fit_advisor_login_time");
    if (user && time) {
      const isExpired = Date.now() - Number(time) >= 7 * 24 * 60 * 60 * 1000;
      if (!isExpired) return user;
    }
    return null;
  });

  const [sessionTime, setSessionTime] = useState<number | null>(() => {
    const time = localStorage.getItem("fit_advisor_login_time");
    if (time) {
      const isExpired = Date.now() - Number(time) >= 7 * 24 * 60 * 60 * 1000;
      if (!isExpired) return Number(time);
    }
    return null;
  });

  // QTrak Log Tab state variables
  const [activeTab, setActiveTab] = useState<"builder" | "qtrak" | "dashboard">("builder");
  const [isQuoteAccepted, setIsQuoteAccepted] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [gUser, setGUser] = useState<any>(null);
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [allQuotes, setAllQuotes] = useState<SavedQuote[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Details form state
  const [details, setDetails] = useState<QuoteDetails>(() => {
    const adviser = currentUser || "";
    const contact = adviser ? ADVISER_CONTACTS[adviser] : undefined;
    return {
      studentName: "",
      hubspotDealCode: "",
      date: getDateString(),
      validUntil: getEndOfCurrentMonthString(), // Defaults to end of current month
      adviserName: adviser,
      adviserEmail: contact?.email || "",
      adviserPhone: contact?.phone || "",
    };
  });

  // Sync adviserName if user logs in
  useEffect(() => {
    if (currentUser) {
      setDetails((prev) => {
        const contact = ADVISER_CONTACTS[currentUser];
        return {
          ...prev,
          adviserName: prev.adviserName || currentUser,
          adviserEmail: prev.adviserEmail || contact?.email || "",
          adviserPhone: prev.adviserPhone || contact?.phone || "",
        };
      });
    }
  }, [currentUser]);

  // Load Google Auth session and sync on startup
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user, token) => {
        setGUser(user);
        setGoogleToken(token);
      },
      () => {
        setGUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadQuotes = async (token = googleToken) => {
    if (!currentUser) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      let localStr = localStorage.getItem("fit_local_quotes");
      let localQuotes: SavedQuote[] = localStr ? JSON.parse(localStr) : [];
      
      // Seed if empty
      if (localQuotes.length === 0) {
        localQuotes = getSeedQuotes();
        localStorage.setItem("fit_local_quotes", JSON.stringify(localQuotes));
      }
      
      if (token) {
        const synced = await fetchSyncedQuotes(token, currentUser);
        const mergedMap = new Map<string, SavedQuote>();
        
        localQuotes.forEach(q => {
          if (q.advisorName.toLowerCase() === currentUser.toLowerCase()) {
            mergedMap.set(q.id, q);
          }
        });
        synced.forEach(q => mergedMap.set(q.id, q));
        
        const finalQuotes = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        const otherAdvisorsQuotes = localQuotes.filter(q => q.advisorName.toLowerCase() !== currentUser.toLowerCase());
        const mergedAll = [...otherAdvisorsQuotes, ...finalQuotes];
        localStorage.setItem("fit_local_quotes", JSON.stringify(mergedAll));
        setQuotes(finalQuotes);
        setAllQuotes(mergedAll);
      } else {
        const filtered = localQuotes
          .filter(q => q.advisorName.toLowerCase() === currentUser.toLowerCase())
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setQuotes(filtered);
        setAllQuotes(localQuotes);
      }
    } catch (err: any) {
      console.error("Load quotes failed:", err);
      setSyncError("Google Sync Pending: Could not fetch from Google Sheet. Loaded offline fallback logs.");
      const localStr = localStorage.getItem("fit_local_quotes");
      let localQuotes: SavedQuote[] = localStr ? JSON.parse(localStr) : [];
      if (localQuotes.length === 0) {
        localQuotes = getSeedQuotes();
        localStorage.setItem("fit_local_quotes", JSON.stringify(localQuotes));
      }
      const filtered = localQuotes
        .filter(q => q.advisorName.toLowerCase() === currentUser.toLowerCase())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setQuotes(filtered);
      setAllQuotes(localQuotes);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadQuotes();
    }
  }, [currentUser, googleToken, activeTab]);

  const handleSaveQuote = async (isAutoSave = false) => {
    if (!details.studentName.trim()) {
      if (isAutoSave) {
        console.warn("Could not auto-sync quote to QTrak: Student name is empty.");
      } else {
        alert("Please enter the student's full name to save or sync this study quote.");
      }
      return;
    }
    
    setIsSyncing(true);
    try {
      const courseSummaries = pathways.map((p, pIdx) => {
        const selectedNames = p.courses
          .filter(c => c.name && !c.isIncluded)
          .map(c => cleanCourseName(c.name).split(" (")[0]);
        return `Pathway ${pIdx + 1}: ${selectedNames.join(", ") || "No course selected"}`;
      }).join("; ");
      
      let overallCost = 0;
      pathways.forEach(p => {
        p.courses.forEach(c => {
          if (c.name) {
            const price = c.rrp || 0;
            const discount = c.discountValue || 0;
            let finalPrice = price;
            if (c.discountType === "%") {
              finalPrice = price - (price * (discount / 100));
            } else {
              finalPrice = price - discount;
            }
            if (finalPrice < 0) finalPrice = 0;
            overallCost += finalPrice;
          }
        });
      });
      
      const isExpiredQuote = details.validUntil ? new Date() > new Date(details.validUntil) : false;
      const finalStatus = isQuoteAccepted 
        ? "accepted" 
        : (isExpiredQuote ? "expired" : "amber pending");
      
      const quoteId = `quote_${Date.now()}`;
      const newQuote: SavedQuote = {
        id: quoteId,
        advisorName: currentUser || "Unknown Advisor",
        studentName: details.studentName,
        hubspotDealCode: details.hubspotDealCode,
        dateIssued: details.date,
        validUntil: details.validUntil,
        courseSummary: courseSummaries || "No course selected",
        totalCost: overallCost,
        status: finalStatus,
        updatedAt: new Date().toISOString(),
        isAccepted: isQuoteAccepted,
        pathwaysData: JSON.stringify(pathways)
      };
      
      const localStr = localStorage.getItem("fit_local_quotes");
      const localQuotes: SavedQuote[] = localStr ? JSON.parse(localStr) : [];
      const otherQuotes = localQuotes.filter(q => q.id !== quoteId);
      const updatedLocal = [newQuote, ...otherQuotes];
      localStorage.setItem("fit_local_quotes", JSON.stringify(updatedLocal));
      
      if (googleToken) {
        await saveQuoteToSheet(googleToken, newQuote);
      }
      
      await loadQuotes();
      if (isAutoSave) {
        console.log(`Quote auto-saved and synced to QTrak as "${finalStatus.toUpperCase()}".`);
      } else {
        alert(`Quote issued and saved successfully as "${finalStatus.toUpperCase()}"! Synchronized with QTrak.`);
      }
    } catch (err: any) {
      console.error("Save quote failed:", err);
      if (!isAutoSave) {
        alert("Quote saved to local temporary records. Connect to Google Sheets to keep standard logs synced.");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleQuoteAccept = async (quote: SavedQuote) => {
    const actionText = quote.isAccepted ? "mark as Amber Pending" : "ACCEPT and signal team";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} the proposal for student ${quote.studentName}? This updates your Google Sheet tracker.`
    );
    if (!confirmed) return;
    
    setIsSyncing(true);
    try {
      const nextStatus = quote.isAccepted ? "amber pending" : "accepted";
      const updatedQuote: SavedQuote = {
        ...quote,
        isAccepted: !quote.isAccepted,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };
      
      const localStr = localStorage.getItem("fit_local_quotes");
      const localQuotes: SavedQuote[] = localStr ? JSON.parse(localStr) : [];
      const updatedLocal = localQuotes.map(q => q.id === quote.id ? updatedQuote : q);
      localStorage.setItem("fit_local_quotes", JSON.stringify(updatedLocal));
      
      if (googleToken) {
        await saveQuoteToSheet(googleToken, updatedQuote);
      }
      
      await loadQuotes();
    } catch (err) {
      console.error("Failed to toggle quote status:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteQuoteLog = async (quoteId: string) => {
    const confirmed = window.confirm("Are you sure you want to remove this quote from your local historical view? Note: Google Sheet logs remain intact.");
    if (!confirmed) return;
    
    const localStr = localStorage.getItem("fit_local_quotes");
    if (localStr) {
      const localQuotes: SavedQuote[] = JSON.parse(localStr);
      const filtered = localQuotes.filter(q => q.id !== quoteId);
      localStorage.setItem("fit_local_quotes", JSON.stringify(filtered));
      await loadQuotes();
    }
  };

  const handleLoadQuoteBack = (quote: SavedQuote) => {
    try {
      if (quote.pathwaysData) {
        const loadedPathways = JSON.parse(quote.pathwaysData);
        setPathways(loadedPathways);
      }
      const activeAdvisor = currentUser || quote.advisorName;
      setDetails({
        studentName: quote.studentName,
        hubspotDealCode: quote.hubspotDealCode || "",
        date: quote.dateIssued,
        validUntil: quote.validUntil,
        adviserName: activeAdvisor,
        adviserEmail: ADVISER_CONTACTS[activeAdvisor]?.email || "",
        adviserPhone: ADVISER_CONTACTS[activeAdvisor]?.phone || ""
      });
      setIsQuoteAccepted(quote.isAccepted);
      setActiveTab("builder");
      alert(`Quote session for ${quote.studentName} successfully restored into the Quote Builder view!`);
    } catch (err) {
      console.error("Failed to load pathways configuration:", err);
      alert("Failed to load full pathways payload. Student contact fields were restored.");
    }
  };

  const handleGoogleConnectToggle = async () => {
    if (googleToken) {
      await disconnectGoogleAccount();
      setGUser(null);
      setGoogleToken(null);
    } else {
      try {
        const res = await connectGoogleAccount();
        if (res) {
          setGUser(res.user);
          setGoogleToken(res.accessToken);
        }
      } catch (err) {
        alert("Google Authentication Connection Failed. Please ensure sheets & drive permissions are granted.");
      }
    }
  };

  const getAdvisorPassword = (name: string) => {
    const initials = name
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .toLowerCase();
    return `${initials}Fit26`;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUser = loginUser.trim();
    if (!normalizedUser) {
      setLoginError("Please choose your Careers Advisor name.");
      return;
    }

    if (!ADVISERS.includes(normalizedUser)) {
      setLoginError(`"${normalizedUser}" is not recognized in the advisor database.`);
      return;
    }

    const expectedPassword = getAdvisorPassword(normalizedUser);
    if (loginPassword === expectedPassword) {
      const currentTime = Date.now();
      localStorage.setItem("fit_advisor", normalizedUser);
      localStorage.setItem("fit_advisor_login_time", currentTime.toString());
      setCurrentUser(normalizedUser);
      setSessionTime(currentTime);
      const contact = ADVISER_CONTACTS[normalizedUser];
      setDetails((prev) => ({
        ...prev,
        adviserName: normalizedUser,
        adviserEmail: contact?.email || "",
        adviserPhone: contact?.phone || "",
      }));
      setLoginUser("");
      setLoginPassword("");
      setLoginError("");
    } else {
      setLoginError("Access Code Invalid. Please verify your secure password protocol with admissions desk.");
    }
  };

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
    document.title = `FIT College Quote - ${studentNameTrimmed} (${formattedDate}) by ${adviserFirstName}`;
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
      
      // Temporarily mark unlocked so they don't have to keep putting it,
      // and print!
      setIsUnlocked(true);
      
      // Automatically issue & sync to QTrak log upon printable export
      handleSaveQuote(true);

      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      setPinError("Access Denied: Incorrect PIN code. Please try again.");
    }
  };

  const handlePrintClick = () => {
    // Automatically issue & sync to QTrak log upon printable export
    handleSaveQuote(true);
    if (isUnlocked) {
      window.print();
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

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0F0F10] text-white font-sans flex items-center justify-center p-4 antialiased selection:bg-fit-red selection:text-white">
        <div className="w-full max-w-md bg-[#18181B] rounded-xl border border-zinc-800 shadow-2xl p-8 flex flex-col relative overflow-hidden">
          {/* Accent indicator line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-fit-red"></div>

          {/* Logo center */}
          <div className="flex flex-col items-center justify-center pt-2 pb-6 border-b border-zinc-800/60 mb-6">
            <Logo variant="dark" className="h-[75px] w-auto drop-shadow-[0_0_8px_rgba(214,40,40,0.25)]" />
            <h1 className="font-bebas text-3xl tracking-widest text-white mt-4 font-black">FIT COLLEGE</h1>
            <p className="text-[10px] text-fit-red font-bold tracking-widest uppercase mt-1">ADVISOR TERMINAL LOGIN</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label htmlFor="loginUser" className="block text-[10px] font-extrabold text-[#8B909A] uppercase tracking-wider mb-2 text-left">
                Careers Advisor Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <select
                  id="loginUser"
                  value={loginUser}
                  onChange={(e) => {
                    setLoginUser(e.target.value);
                    setLoginError("");
                  }}
                  className="w-full bg-[#202023] border border-zinc-800 rounded-lg pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:border-fit-red cursor-pointer appearance-none"
                >
                  <option value="" className="text-zinc-500">-- Choose Registered Name --</option>
                  {ADVISERS.map((adviser) => (
                    <option key={adviser} value={adviser} className="bg-[#18181B]">
                      {adviser}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center pr-1 text-zinc-500">
                  <span className="text-xs">▼</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="loginPassword" className="block text-[10px] font-extrabold text-[#8B909A] uppercase tracking-wider mb-2 text-left">
                Security Password Protocol
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                <input
                  id="loginPassword"
                  type="password"
                  placeholder="Enter Password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setLoginError("");
                  }}
                  className="w-full bg-[#202023] border border-zinc-800 rounded-lg pl-10 pr-3 py-3 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-fit-red placeholder-zinc-650"
                />
              </div>
            </div>

            {loginError && (
              <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/80 rounded-lg text-xs text-red-400 font-medium text-left">
                <ShieldAlert className="shrink-0 mt-0.5 w-4 h-4" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-fit-red hover:bg-[#a80d13] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 font-sans shadow-lg shadow-red-950/20 active:translate-y-px cursor-pointer"
            >
              <Lock size={14} />
              Validate and Start Session
            </button>
          </form>

          {/* Extra system details demonstrating alignment with requirements */}
          <div className="mt-8 pt-5 border-t border-zinc-800/40 text-center flex flex-col items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
            <div className="flex items-center gap-1.5 uppercase tracking-wider text-[9px] text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              <span>7-Day Security Session Protocol Enforced</span>
            </div>
            <p className="leading-relaxed">
              Standard admissions representatives and careers advisors are authorised strictly to generate active fee estimators. Contact lead operations for database inquiries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-fit-darkgray font-sans print:bg-white antialiased">
      {/* 1. TOP HEADER BRAND BAR (Hides on print completely) */}
      <header className="h-16 bg-[#0F0F10] text-white px-6 md:px-8 flex items-center justify-between shrink-0 border-b border-gray-800 no-print z-40">
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
            onClick={() => setActiveTab("qtrak")}
            className={`pb-1 font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "qtrak"
                ? "text-white border-b-2 border-fit-red"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${googleToken ? "bg-[#10B981]" : "bg-amber-400"} animate-pulse`}></span>
            <span>QTrak Log</span>
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
            Dashboard
          </button>
        </nav>

        {/* Active Session Identity */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold">{currentUser || "Not Authenticated"}</div>
            <div className="text-[10px] text-gray-400 flex items-center justify-end gap-1.5 leading-none mt-0.5">
              <span>Careers Advisor</span>
              {currentUser && (
                <>
                  <span className="text-zinc-700">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("fit_advisor");
                      localStorage.removeItem("fit_advisor_login_time");
                      setCurrentUser(null);
                      setSessionTime(null);
                    }}
                    className="text-fit-red font-semibold hover:underline cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-white uppercase select-none">
            {currentUser ? currentUser[0] : "?"}
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
                            validUntil: getEndOfCurrentMonthString()
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
                      value={currentUser || "No Advisor Logged In"}
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintClick}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer shadow-md"
                >
                  <Printer size={14} />
                  Export & Sync to QTrak
                </button>
                <span className="shrink-0 px-2.5 py-1.5 bg-amber-500 text-black text-[10px] font-black rounded uppercase tracking-wider animate-pulse shadow-sm border border-amber-600" title="Automatic QTrak background synchronization is active on document export in this Sandbox/Beta environment.">
                  BETA
                </span>
              </div>
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
      ) : activeTab === "qtrak" ? (
        /* --- QTRAK HISTORICAL RECRUITMENT LOGS BOARD --- */
        <div className="flex-1 overflow-y-auto no-print bg-[#F8FAFC] p-6 md:p-8 font-sans text-left">
          
          {/* BETA WARNING BANNER */}
          <div className="max-w-6xl mx-auto mb-6 bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-left">
            <div className="p-2 bg-amber-500 text-black rounded-lg shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
                <span>QTrak Logs Dashboard is in Beta</span>
                <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded uppercase">BETA ACTIVE</span>
              </h4>
              <p className="text-xs text-amber-700/90 leading-relaxed font-semibold mt-1">
                Persistent log actions, status updates, Google Sheets real-time cloud synchronisation, and record modifications are <strong>currently locked</strong> in this sandboxed Beta environment while IT completes domain authorisation. All actions are disabled.
              </p>
            </div>
          </div>

          {/* Header Action Row */}
          <div className="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Database className="text-fit-red w-5 h-5" />
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QTrak Workspace Logs</h1>
                <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded uppercase tracking-wider">
                  BETA
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Admissions, pipeline conversion, and historical study quote tracking.
              </p>
            </div>

            {/* Google Sheets Status Controller */}
            <div className="p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm bg-zinc-50 border-zinc-200/80 cursor-not-allowed opacity-80" title="Locked in Beta">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-100 text-zinc-400">
                  <FileSpreadsheet size={16} />
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-zinc-500 flex items-center gap-1">
                    <span>Google Sheets Status: Locked in Beta</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-semibold leading-none mt-1">
                    Admissions live sheet sync is restricted in sandbox beta mode.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto border-t sm:border-t-0 sm:border-l border-zinc-200/60 pt-2 sm:pt-0 sm:pl-3">
                <button
                  type="button"
                  disabled
                  className="px-3 py-1.5 bg-zinc-100 border border-zinc-200 text-zinc-400 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider cursor-not-allowed flex items-center gap-1"
                >
                  <span>🔒 Sheets Locked</span>
                </button>
                
                <button
                  type="button"
                  disabled
                  className="p-1.5 text-zinc-300 cursor-not-allowed"
                  title="Force Sync Locked in Beta"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Sync status error banner */}
          {syncError && (
            <div className="max-w-6xl mx-auto mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800 text-left font-medium">
              <AlertCircle className="shrink-0 text-amber-500 w-4 h-4 mt-0.5" />
              <span>{syncError}</span>
            </div>
          )}

          {/* Metric Cards Bento Block */}
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-sm text-left flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Total Generated</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-800">{quotes.length}</span>
                <span className="text-[10px] text-slate-400 font-semibold">proposals</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-sm text-left flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500 block mb-1">Consultations Booked</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-600">{quotes.filter(q => q.isAccepted).length}</span>
                <span className="text-[10px] text-slate-400 font-semibold">scheduled bookings</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-sm text-left flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 block mb-1">Pending Admissions</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-600">{quotes.filter(q => !q.isAccepted && q.status !== "expired" && q.status !== "grey").length}</span>
                <span className="text-[10px] text-slate-400 font-semibold">amber alerts</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200/60 shadow-sm text-left flex flex-col justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">Expired / Grey</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-400">
                  {quotes.filter(q => q.status === "expired" || q.status === "grey" || (!q.isAccepted && q.validUntil && new Date() > new Date(q.validUntil))).length}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">overdue references</span>
              </div>
            </div>
          </div>

          {/* List Content */}
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#8B909A]">
                Historical Logs for {currentUser}
              </span>
              <span className="text-xs text-slate-500 font-medium font-sans">
                {isSyncing ? "Syncing..." : "Database synchronized"}
              </span>
            </div>

            {quotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-12 text-center max-w-lg mx-auto">
                <Database size={40} className="mx-auto text-slate-300 mb-4 stroke-1" />
                <h3 className="font-bold text-slate-700 mb-1">No Historical Quotes Detected</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  You haven't logged any admissions estimators for your profile yet. Build your first estimate in the <strong>Quote Builder</strong> and save/sync it.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("builder")}
                  className="px-4 py-2 bg-fit-red hover:bg-[#a80d13] text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                >
                  Generate First Quote Offer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote) => {
                  const isExpired = quote.status === "expired" || quote.status === "grey" || (!quote.isAccepted && quote.validUntil && new Date() > new Date(quote.validUntil));
                  
                  // Stylings based on user requests:
                  // 1. Quotes issued amber pending = amber/yellow text + border.
                  // 2. Quotes passed valid design date or grey = grey.
                  // 3. Accepted quotes = green.
                  let cardBorderClass = "border-zinc-200";
                  let badgeBgClass = "bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20";
                  let statusLabel = "Amber Pending";
                  let stripeClass = "bg-amber-400";

                  if (quote.isAccepted) {
                    cardBorderClass = "border-emerald-200 shadow-emerald-50/[0.03]";
                    badgeBgClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    statusLabel = "Consultation Scheduled";
                    stripeClass = "bg-[#10B981]";
                  } else if (isExpired) {
                    cardBorderClass = "border-zinc-300 bg-zinc-50/50 opacity-80";
                    badgeBgClass = "bg-gray-100 text-gray-500 border-gray-200";
                    statusLabel = "Expired Offer";
                    stripeClass = "bg-zinc-400";
                  } else {
                    cardBorderClass = "border-amber-200/80 shadow-amber-50/[0.02]";
                    badgeBgClass = "bg-amber-50 text-amber-700 border-amber-200";
                    statusLabel = "Amber Pending";
                    stripeClass = "bg-amber-400";
                  }

                  const cleanDateStr = (dateStr: string) => {
                    if (!dateStr) return "";
                    const parts = dateStr.split("-");
                    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
                  };

                  const formattedCost = new Intl.NumberFormat("en-AU", {
                    style: "currency",
                    currency: "AUD",
                  }).format(quote.totalCost);

                  return (
                    <div
                      key={quote.id}
                      className={`bg-white rounded-xl border ${cardBorderClass} shadow-sm overflow-hidden flex flex-col md:flex-row text-left transition-all duration-300 hover:shadow-md ${
                        quote.isAccepted ? "hover:border-emerald-300" : ""
                      }`}
                    >
                      {/* Left color-coding indicator stripe */}
                      <div className={`w-full md:w-1.5 h-1.5 md:h-auto shrink-0 ${stripeClass}`} />

                      <div className="flex-1 p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                        
                        {/* Prospect block (4 cols) */}
                        <div className="md:col-span-4 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-extrabold tracking-widest uppercase text-slate-400 font-mono">
                              Prospect Info
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeBgClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          
                          <div className="font-bold text-slate-800 text-lg leading-tight font-sans">
                            {quote.studentName}
                          </div>

                          <div className="text-xs text-slate-500 space-y-1 font-medium select-text">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Hash size={11} className="text-slate-400 shrink-0" />
                              <span>{quote.hubspotDealCode || "No HubSpot Deal Code"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Proposal & courses summary block (4 cols) */}
                        <div className="md:col-span-4 space-y-1 border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-5">
                          <span className="text-[9px] font-extrabold tracking-widest uppercase text-slate-400 font-mono">
                            Courses Configuration
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                            {quote.courseSummary}
                          </p>
                          <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-400 font-bold uppercase">
                            <div>
                              <span>ISSUED: </span>
                              <span className="text-slate-600 font-sans">{cleanDateStr(quote.dateIssued)}</span>
                            </div>
                            <div>
                              <span>EXPIRY: </span>
                              <span className="text-slate-600 font-sans">{cleanDateStr(quote.validUntil)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Financial investment value (2 cols) */}
                        <div className="md:col-span-2 text-left md:text-right border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 md:pl-5 font-sans">
                          <span className="text-[10px] font-extrabold tracking-widest uppercase text-slate-400 block mb-0.5">
                            Total Investment
                          </span>
                          <div className="text-xl font-black text-slate-800 leading-none">
                            {formattedCost}
                          </div>
                          <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1 block">
                            AUD Inc GST
                          </span>
                        </div>

                        {/* Action controllers (2 cols) - LOCKED IN BETA */}
                        <div className="md:col-span-2 flex flex-col gap-2 w-full justify-center md:items-end border-t md:border-t-0 border-zinc-100 pt-4 md:pt-0">
                          
                          {/* Load back configuration button */}
                          <button
                            type="button"
                            disabled
                            className="w-full md:w-auto px-3.5 py-1.5 text-center bg-zinc-100 border border-zinc-200 text-[10px] text-zinc-400 font-bold uppercase tracking-wider rounded-md cursor-not-allowed opacity-75 inline-flex items-center justify-center gap-1"
                            title="Locked in Beta"
                          >
                            <span>🔒 Restore Locked</span>
                          </button>

                          {/* Quick client status acceptance toggler */}
                          <button
                            type="button"
                            disabled
                            className="w-full md:w-auto px-3.5 py-1.5 text-center bg-zinc-100 border border-zinc-200 text-[10px] text-zinc-400 font-bold uppercase tracking-wider rounded-md cursor-not-allowed opacity-75 inline-flex items-center justify-center gap-1"
                            title="Locked in Beta"
                          >
                            <span>🔒 Toggle Locked</span>
                          </button>

                          {/* Remove log reference */}
                          <button
                            type="button"
                            disabled
                            className="w-full md:w-auto px-3.5 py-1 text-center text-zinc-300 text-[9px] font-bold uppercase tracking-widest cursor-not-allowed opacity-75 inline-flex items-center justify-center gap-1"
                            title="Locked in Beta"
                          >
                            <span>🔒 Remove Locked</span>
                          </button>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* --- DASHBOARD TAB VIEW --- */
        <DashboardTab 
          quotes={allQuotes} 
          onToggleQuoteAccept={handleToggleQuoteAccept} 
          currentUser={currentUser}
        />
      )}

      {/* 3. HARDCOPY PRINT PAGE CLONES (Beautiful independent pages rendering on print) */}
      <div className="hidden print:block w-full">
        {pathways.map((pathway, index) => {
          const derivedMode = pathway.courses[0]?.name.includes("ONLINE")
            ? "online"
            : pathway.courses[0]?.name.includes("F2F") ||
              pathway.courses[0]?.name.includes("PART TIME") ||
              pathway.courses[0]?.name.includes("FULL TIME")
            ? "campus"
            : "default";

          const derivedTitle =
            derivedMode === "online"
              ? "RECOMMENDED ONLINE PATHWAY"
              : derivedMode === "campus"
              ? "RECOMMENDED ON-CAMPUS PATHWAY"
              : "RECOMMENDED PATHWAY";

          let runningSavings = 0;
          let runningInvestment = 0;

          // Date formatters for clean printing
          const dateParser = (str: string) => {
            if (!str) return "";
            const parts = str.split("-");
            if (parts.length === 3) {
              return `${parts[2]}/${parts[1]}/${parts[yyyyParser(str)]}`; // custom split check
            }
            return str;
          };
          const yyyyParser = (str: string) => 0; // return index 0
          
          const cleanDate = (dStr: string) => {
            if(!dStr) return "";
            const p = dStr.split("-");
            return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : dStr;
          };

          return (
            <div
              key={`print-page-${pathway.id}`}
              className="bg-white w-full p-[10mm] print:p-[5.5mm] flex flex-col pathway-print-block print-page-break-after font-sans text-xs print:text-[10px]"
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
                        <div className="flex items-start text-fit-red font-semibold">
                          <span className="w-24 print:w-20 font-bold text-gray-500 uppercase tracking-wider shrink-0">Booking Link:</span>
                          <a
                            href={(details.adviserName && ADVISER_CONTACTS[details.adviserName]?.meetingUrl) || "https://meetings-ap1.hubspot.com/dean-eggins"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-fit-red font-black break-all text-[10px] print:text-[8px] leading-tight"
                          >
                            {((details.adviserName && ADVISER_CONTACTS[details.adviserName]?.meetingUrl) || "https://meetings-ap1.hubspot.com/dean-eggins").replace("https://", "")}
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
                  {pathway.paymentPlanType === "weekly" || pathway.paymentPlanType === "fortnightly" ? (
                    <div>
                      <p className="text-slate-800 font-bold text-xs print:text-[10.5px]">
                        Payment Method: <span className="text-fit-red uppercase font-black">{pathway.paymentPlanType} Study Payment Plan</span>
                      </p>
                      <div className="grid grid-cols-2 gap-4 print:gap-2 mt-2 print:mt-1 border-t border-gray-200/60 pt-2 print:pt-1 font-medium">
                        <div>
                          <span className="text-gray-400 uppercase text-[9px] print:text-[8px] block">Minimum Deposit:</span>
                          <span className="text-slate-800 font-black text-xs print:text-[10.5px]">
                            {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(pathway.depositAmount === undefined ? 500 : pathway.depositAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 uppercase text-[9px] print:text-[8px] block">Recurring Repayment:</span>
                          <span className="text-slate-800 font-black text-xs print:text-[10.5px]">
                            {new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(pathway.paymentPlanAmount === undefined ? 100 : pathway.paymentPlanAmount)} / {pathway.paymentPlanType === "fortnightly" ? "fortnight" : "week"}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-500 text-[9px] print:text-[8px] leading-relaxed mt-3 print:mt-1 italic">
                        <strong className="text-gray-700 font-extrabold uppercase">ALL ENROLMENTS:</strong> Upfront payment available OR Payment Plans are interest free - $6.60 set up fee. Either $1.30 a week or $1.95 a fortnight billing fee.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-slate-800 font-bold text-xs print:text-[10.5px] select-none">
                        Payment Method: <span className="text-fit-black uppercase font-black">Pay In Full Upfront (Upfront Discount Applies)</span>
                      </p>
                      <p className="text-gray-500 text-[9px] print:text-[8px] leading-relaxed mt-2 print:mt-1 italic">
                        <strong className="text-gray-700 font-extrabold uppercase">ALL ENROLMENTS:</strong> Upfront payment available OR Payment Plans are interest free - $6.60 set up fee. Either $1.30 a week or $1.95 a fortnight billing fee.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}

        {/* 3.1. DEDICATED WHY STUDY WITH FIT COLLEGE PAGE AT THE END OF THE PRINT DOCUMENT */}
        <div
          className="bg-white min-h-[265mm] print:min-h-0 w-full p-[10mm] print:p-[5.5mm] flex flex-col justify-between print-page-break-before font-sans text-left"
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
                const derivedMode = pathway.courses[0]?.name.includes("ONLINE")
                  ? "online"
                  : pathway.courses[0]?.name.includes("F2F") ||
                    pathway.courses[0]?.name.includes("PART TIME") ||
                    pathway.courses[0]?.name.includes("FULL TIME")
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
