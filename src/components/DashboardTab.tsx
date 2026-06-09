import React, { useState, useEffect, useMemo } from "react";
import { 
  Target, Users, TrendingUp, Sparkles, Clock, ArrowUpRight, CheckCircle, 
  AlertCircle, Award, DollarSign, Check, Search, Calendar, ChevronRight
} from "lucide-react";
import { SavedQuote, ADVISERS, ADVISER_CONTACTS } from "../types";

interface DashboardTabProps {
  quotes: SavedQuote[];
  onToggleQuoteAccept: (quote: SavedQuote) => Promise<void>;
  currentUser: string | null;
}

export default function DashboardTab({ quotes, onToggleQuoteAccept, currentUser }: DashboardTabProps) {
  // Time span filter: "closeout" | "month" | "all"
  const [timeFilter, setTimeFilter] = useState<"closeout" | "month" | "all">("closeout");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom interactive target states, persisting to localStorage
  const [globalTarget, setGlobalTarget] = useState<number>(() => {
    const saved = localStorage.getItem("fit_global_target");
    return saved ? Number(saved) : 80000;
  });

  const [advisorTargets, setAdvisorTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem("fit_advisor_targets");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse advisor targets", e);
      }
    }
    // Default $15,000 target per advisor
    const defaults: Record<string, number> = {};
    ADVISERS.forEach(adv => {
      defaults[adv] = 15000;
    });
    return defaults;
  });

  // Calculate close-out week dates dynamically based on current local time
  const closeOutInfo = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Closeout is the final 7 days of the month (inclusive)
    const startDay = totalDays - 6;
    
    const startDate = new Date(year, month, startDay);
    const endDate = new Date(year, month, totalDays);
    
    const isTodayInCloseOut = now.getDate() >= startDay && now.getDate() <= totalDays;
    const daysElapsed = isTodayInCloseOut ? (now.getDate() - startDay + 1) : 0;
    
    // Get month name
    const monthName = now.toLocaleString("en-US", { month: "long" });
    
    return {
      monthName,
      year,
      totalDays,
      startDay,
      startDateStr: `${startDay} ${monthName.substring(0, 3)}`,
      endDateStr: `${totalDays} ${monthName.substring(0, 3)}`,
      isTodayInCloseOut,
      daysElapsed,
      daysRemaining: totalDays - now.getDate() + 1,
    };
  }, []);

  // Save targets to local storage whenever adjusted
  const handleUpdateGlobalTarget = (value: number) => {
    const targetVal = isNaN(value) ? 0 : Math.max(0, value);
    setGlobalTarget(targetVal);
    localStorage.setItem("fit_global_target", targetVal.toString());
  };

  const handleUpdateAdvisorTarget = (adv: string, value: number) => {
    const targetVal = isNaN(value) ? 0 : Math.max(0, value);
    const updated = { ...advisorTargets, [adv]: targetVal };
    setAdvisorTargets(updated);
    localStorage.setItem("fit_advisor_targets", JSON.stringify(updated));
  };

  // Filter quotes based on time span and query
  const filteredQuotes = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return quotes.filter(quote => {
      const quoteDate = new Date(quote.dateIssued);
      const isSameMonth = quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
      
      // Filter by time span
      if (timeFilter === "closeout") {
        if (!isSameMonth) return false;
        // Check if day falls in the last 7 days of this month
        const day = quoteDate.getDate();
        if (day < closeOutInfo.startDay) return false;
      } else if (timeFilter === "month") {
        if (!isSameMonth) return false;
      }
      
      // Filter by search query (deals, advisors, students)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const studentMatch = quote.studentName?.toLowerCase().includes(query);
        const advisorMatch = quote.advisorName?.toLowerCase().includes(query);
        const courseMatch = quote.courseSummary?.toLowerCase().includes(query);
        return studentMatch || advisorMatch || courseMatch;
      }
      
      return true;
    });
  }, [quotes, timeFilter, searchQuery, closeOutInfo]);

  // Aggregate stats across ALL advisors
  const cumulativeStats = useMemo(() => {
    let closedValue = 0;
    let possibleValue = 0; // accepted + pending
    let pendingValue = 0;
    let closedCount = 0;
    let totalCount = 0;

    filteredQuotes.forEach(q => {
      totalCount++;
      possibleValue += q.totalCost || 0;
      
      if (q.isAccepted) {
        closedValue += q.totalCost || 0;
        closedCount++;
      } else if (q.status === "amber pending") {
        pendingValue += q.totalCost || 0;
      }
    });

    const targetDeficit = Math.max(0, globalTarget - closedValue);
    const progressPercent = globalTarget > 0 ? (closedValue / globalTarget) * 100 : 0;
    const canReachTarget = (closedValue + pendingValue) >= globalTarget;

    return {
      closedValue,
      possibleValue,
      pendingValue,
      closedCount,
      totalCount,
      targetDeficit,
      progressPercent,
      canReachTarget
    };
  }, [filteredQuotes, globalTarget]);

  // Aggregate advisor breakdown data
  const advisorStats = useMemo(() => {
    const stats: Record<string, {
      totalCount: number;
      closedCount: number;
      closedValue: number;
      pendingValue: number;
      possibleValue: number;
      target: number;
    }> = {};

    // Initialize all registered advisors
    ADVISERS.forEach(adv => {
      stats[adv] = {
        totalCount: 0,
        closedCount: 0,
        closedValue: 0,
        pendingValue: 0,
        possibleValue: 0,
        target: advisorTargets[adv] ?? 15000
      };
    });

    // Populate actuals
    filteredQuotes.forEach(q => {
      const adv = q.advisorName;
      // Safeguard if advisor is not listed in registered set, but capitalize
      if (stats[adv]) {
        stats[adv].totalCount++;
        stats[adv].possibleValue += q.totalCost || 0;
        
        if (q.isAccepted) {
          stats[adv].closedValue += q.totalCost || 0;
          stats[adv].closedCount++;
        } else if (q.status === "amber pending") {
          stats[adv].pendingValue += q.totalCost || 0;
        }
      }
    });

    const sortedAdvisors = Object.entries(stats).map(([name, data]) => {
      const target = advisorTargets[name] ?? 15000;
      const deficit = Math.max(0, target - data.closedValue);
      const progressPercent = target > 0 ? (data.closedValue / target) * 100 : 0;
      const pipelineCoverage = deficit > 0 ? (data.pendingValue / deficit) * 100 : 100;

      return {
        name,
        ...data,
        target,
        deficit,
        progressPercent,
        pipelineCoverage,
        isTargetMet: data.closedValue >= target,
        hasCoverage: data.pendingValue >= deficit
      };
    });

    // Sort leaderboard by closed value
    return sortedAdvisors.sort((a, b) => b.closedValue - a.closedValue);
  }, [filteredQuotes, advisorTargets]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="flex-1 overflow-y-auto no-print bg-[#F8FAFC] p-6 md:p-8 font-sans text-left">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP ROW HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-250 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-fit-red text-white rounded-lg">
                <Target size={20} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Careers Team Conversions</h1>
              <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded uppercase tracking-wider">
                BETA ACTIVE
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Performance analysis, advisor pipeline tracking, and interactive goal validation metrics.
            </p>
          </div>

          {/* Timeframe selector tab pill */}
          <div className="flex bg-zinc-200/80 p-1 rounded-lg self-start sm:self-auto border border-zinc-300">
            <button
              onClick={() => setTimeFilter("closeout")}
              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                timeFilter === "closeout"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Close-Out Sprint (Last 7 Days)
            </button>
            <button
              onClick={() => setTimeFilter("month")}
              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                timeFilter === "month"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Full Month ({closeOutInfo.monthName})
            </button>
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                timeFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All-Time Records
            </button>
          </div>
        </div>

        {/* BETA WARNING BANNER */}
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 text-left">
          <div className="p-2 bg-amber-500 text-black rounded-lg shrink-0">
            <AlertCircle size={18} />
          </div>
          <div>
            <h4 className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
              <span>Conversion Dashboard Functions Locked</span>
            </h4>
            <p className="text-xs text-amber-700/90 leading-relaxed font-semibold mt-1">
              Interactive target setting, team goal planning, and real-time conversion actions are currently locked in <strong>read-only mode</strong>. Persistent admissions targets are undergoing IT authorisation reviews. All values are locked.
            </p>
          </div>
        </div>

        {/* CLOSE-OUT SPRINT TRACKING HERO PANEL (calculated automatically) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Calendar status card (4-col widget) */}
          <div className="lg:col-span-4 bg-[#0F0F10] text-white rounded-2xl p-6 shadow-md border border-zinc-850 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -right-16 -bottom-16 opacity-10 text-fit-red pointer-events-none select-none">
              <Calendar size={180} />
            </div>

            <div className="space-y-4 z-10 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8B909A] font-mono">
                  Admissions Calendar
                </span>
                {closeOutInfo.isTodayInCloseOut ? (
                  <span className="px-2 py-0.5 bg-red-500/20 text-fit-red border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-wider animate-pulse font-mono">
                    Close-Out ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700/60 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                    Sprint Countdown
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Current Close-Out Sprint
                </span>
                <h3 className="text-xl font-extrabold tracking-tight">
                  {closeOutInfo.startDateStr} – {closeOutInfo.endDateStr} {closeOutInfo.year}
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  We drive prospects to close or enrol during the crucial final 7 days of the calendar month.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800/60 space-y-3">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-zinc-400 font-semibold">Goal Status:</span>
                  <span className={`font-extrabold pb-0.5 uppercase tracking-wide pr-1 ${cumulativeStats.canReachTarget ? "text-emerald-400" : "text-amber-400"}`}>
                    {cumulativeStats.canReachTarget ? "🟢 Fully Covered" : "⚠️ Leads Deficit"}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-fit-red transition-all duration-550" 
                    style={{ 
                      width: `${closeOutInfo.isTodayInCloseOut ? (closeOutInfo.daysElapsed / 7) * 100 : 0}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-zinc-400 font-bold uppercase font-mono">
                  <span>Day {closeOutInfo.isTodayInCloseOut ? closeOutInfo.daysElapsed : 0} of 7</span>
                  <span>{closeOutInfo.daysRemaining} days left in month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core financial dashboards (8-col widget) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Total Value We Could Close */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-150 shadow-sm flex flex-col justify-between text-left">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8B909A] font-mono block">
                  Potential Close Value
                </span>
                <div className="text-3xl font-black text-slate-800 tracking-tight leading-none">
                  {formatCurrency(cumulativeStats.possibleValue)}
                </div>
                <p className="text-xs text-slate-400 font-semibold">
                  Sum of all {cumulativeStats.totalCount} active proposals issued this period.
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Pending Deal Pipeline:</span>
                <span className="font-bold text-slate-700">{formatCurrency(cumulativeStats.pendingValue)}</span>
              </div>
            </div>

            {/* Total Closed / Enrolled so far */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-150 shadow-sm flex flex-col justify-between text-left">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 font-mono block">
                  Closed & Enrolled Value
                </span>
                <div className="text-3xl font-black text-emerald-600 tracking-tight leading-none">
                  {formatCurrency(cumulativeStats.closedValue)}
                </div>
                <p className="text-xs text-slate-400 font-semibold">
                  Secure conversion revenue from {cumulativeStats.closedCount} finalized agreements.
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Team conversion rate:</span>
                <span className="font-extrabold text-[#10B981]">
                  {cumulativeStats.totalCount > 0 ? ((cumulativeStats.closedCount / cumulativeStats.totalCount) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>

            {/* DEFICIT AND INTERACTIVE EDIT TARGET GAUGE */}
            <div className="bg-white p-6 rounded-x2 border border-blue-100 bg-blue-50/20 rounded-2xl shadow-sm flex flex-col justify-between text-left">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">
                    Team Target Target
                  </span>
                  
                  {/* Inline interactive adjustment - LOCKED IN BETA */}
                  <div className="flex items-center gap-1 border border-zinc-200 rounded px-2 py-0.5 bg-zinc-100 shadow-none cursor-not-allowed opacity-80" title="Locked in Beta">
                    <span className="text-zinc-500 font-bold text-xs">🔒 $</span>
                    <input
                      type="number"
                      value={globalTarget}
                      disabled
                      className="w-16 font-extrabold text-xs text-slate-500 outline-none p-0 text-center bg-transparent cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  {cumulativeStats.targetDeficit > 0 ? (
                    <>
                      <div className="text-3xl font-black text-fit-red tracking-tight leading-none">
                        {formatCurrency(cumulativeStats.targetDeficit)}
                      </div>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                        Deficit remaining to reach specified {formatCurrency(globalTarget)} sales team target.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-black text-emerald-600 tracking-tight leading-none">
                        TARGET MET 🎉
                      </div>
                      <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1">
                        <CheckCircle size={14} /> Deficit cleared! Closed surplus value.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar for the Target */}
              <div className="pt-4 border-t border-zinc-100 space-y-1.5">
                <div className="flex justify-between items-baseline text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">
                  <span>Progress to Target:</span>
                  <span>{cumulativeStats.progressPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-100 border border-zinc-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-350 ${cumulativeStats.progressPercent >= 100 ? "bg-emerald-500" : "bg-fit-red"}`}
                    style={{ width: `${Math.min(100, cumulativeStats.progressPercent)}%` }}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* TEAM LEADERBOARD & INTERACTIVE ADVISOR TABLE BREAKDOWN */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden text-left">
          
          <div className="p-6 border-b border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Careers Executive Leaderboard</h2>
              <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                Individual performance statistics, self-regulated targets, progress charts, and pipeline values.
              </p>
            </div>
            
            {/* Direct Quick search layout */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 font-bold" />
              <input
                type="text"
                placeholder="Search sales reps, prospects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-50 border border-zinc-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-700 placeholder-zinc-400 outline-none focus:border-fit-red focus:bg-white w-full sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#0F0F10] text-[#8B909A] font-extrabold uppercase tracking-widest text-[9px] font-mono border-b border-zinc-800">
                  <th className="py-4 px-6 text-left">Careers Representative</th>
                  <th className="py-4 px-4 text-center w-[150px]">Target Target ($)</th>
                  <th className="py-4 px-4 text-right w-[140px]">Enrolled Closed ($)</th>
                  <th className="py-4 px-4 text-right w-[140px]">Pending pipeline ($)</th>
                  <th className="py-4 px-6 text-center w-[200px]">Goal Progress Gauge</th>
                  <th className="py-4 px-4 text-center w-[120px]">Leads count</th>
                  <th className="py-4 px-4 text-center w-[150px]">Coverage alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/50">
                {advisorStats.map((advRow, index) => {
                  let alertBadgeBg = "bg-rose-50 text-rose-750 border-rose-200";
                  let alertLabel = "Pipeline Deficit";
                  
                  if (advRow.isTargetMet) {
                    alertBadgeBg = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
                    alertLabel = "🟢 Target Cleared";
                  } else if (advRow.hasCoverage) {
                    alertBadgeBg = "bg-emerald-50 text-emerald-600 border-zinc-200";
                    alertLabel = "🟢 Gap Covered";
                  } else {
                    alertBadgeBg = "bg-amber-50 text-amber-700 border-amber-200";
                    alertLabel = "⚠️ Leads Deficit";
                  }

                  let barColorClass = "bg-fit-red";
                  if (advRow.progressPercent >= 100) {
                    barColorClass = "bg-emerald-500";
                  } else if (advRow.progressPercent >= 50) {
                    barColorClass = "bg-amber-400";
                  }

                  return (
                    <tr 
                      key={advRow.name} 
                      className={`hover:bg-slate-50/50 transition-colors font-sans ${
                        currentUser === advRow.name ? "bg-red-50/30" : ""
                      }`}
                    >
                      {/* Name profile layout */}
                      <td className="py-4 px-6 font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-[11px] text-white uppercase select-none ${
                            index === 0 ? "bg-amber-400 border-amber-500 shadow-sm" : "bg-slate-700 border-slate-800"
                          }`}>
                            {index === 0 ? "👑" : advRow.name[0]}
                          </div>
                          <div>
                            <span className="font-extrabold text-sm block">{advRow.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">
                              {ADVISER_CONTACTS[advRow.name]?.email.split("@")[0]}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Interactive target setter row - LOCKED IN BETA */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 border border-zinc-200 bg-zinc-100 rounded pl-1.5 w-28 mx-auto shadow-none cursor-not-allowed opacity-85" title="Locked in Beta">
                          <span className="text-zinc-400 font-black text-[10px]">🔒 $</span>
                          <input
                            type="number"
                            value={advRow.target}
                            disabled
                            className="w-16 font-extrabold text-center text-xs text-slate-500 outline-none bg-transparent py-1 border-none outline-none cursor-not-allowed"
                          />
                        </div>
                      </td>

                      {/* Financial outputs */}
                      <td className="py-4 px-4 text-right font-extrabold text-slate-800 text-sm">
                        {formatCurrency(advRow.closedValue)}
                      </td>

                      <td className="py-4 px-4 text-right font-semibold text-slate-500">
                        {formatCurrency(advRow.pendingValue)}
                      </td>

                      {/* Gauge progression */}
                      <td className="py-4 px-6 text-center">
                        <div className="space-y-1.5 max-w-[180px] mx-auto">
                          <div className="flex justify-between text-[10px] font-extrabold text-slate-500 font-mono">
                            <span>Completed:</span>
                            <span>{advRow.progressPercent.toFixed(0)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200/50">
                            <div 
                              className={`h-full ${barColorClass}`}
                              style={{ width: `${Math.min(100, advRow.progressPercent)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Lead conversions count list */}
                      <td className="py-4 px-4 text-center font-bold text-slate-700">
                        <span className="text-emerald-600 truncate">{advRow.closedCount}</span>
                        <span className="text-slate-400 font-medium"> / {advRow.totalCount}</span>
                      </td>

                      {/* Active health status badges */}
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase tracking-wide border font-mono ${alertBadgeBg}`}>
                          {alertLabel}
                        </span>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {advisorStats.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic">
              No registered career advisors active in database. Ensure local seedings are initialized.
            </div>
          )}
        </div>

        {/* ACTIVE SALES SPRINT: LIST OF PENDING CLIENTS IN THE Sprint WINDOW */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Active Conversion Pipeline (Amber Pending)</h2>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              {filteredQuotes.filter(q => q.status === "amber pending").length} potential closes available
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuotes.filter(q => q.status === "amber pending").map((quote) => {
              const dateIssuedFormatted = quote.dateIssued ? quote.dateIssued.split("-").reverse().join("/") : "-";
              return (
                <div 
                  key={quote.id} 
                  className="bg-white rounded-xl border border-amber-200/80 shadow-sm overflow-hidden flex flex-col justify-between p-5 text-left hover:border-amber-300 transition-all duration-200"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-extrabold text-[#111] uppercase tracking-wider block font-mono">
                          Student prospect
                        </span>
                        <h4 className="font-extrabold text-slate-800 text-sm">{quote.studentName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Investment Value</span>
                        <span className="text-slate-800 font-extrabold text-sm">{formatCurrency(quote.totalCost)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 leading-relaxed font-semibold">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Advisor Assignment:</span>
                        <span className="text-slate-700"><Award size={10} className="inline mr-1 text-fit-red shrink-0" />{quote.advisorName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Date Issued:</span>
                        <span className="text-slate-600">{dateIssuedFormatted}</span>
                      </div>
                    </div>

                    <div className="pt-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Qualified Pathway:</span>
                      <p className="text-[11px] text-slate-700 font-semibold truncate mt-0.5">{quote.courseSummary}</p>
                    </div>
                  </div>

                  {/* Immediate conversions triggers - LOCKED IN BETA */}
                  <div className="pt-4 mt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                    <div className="text-[10px] text-zinc-400 mr-auto font-mono text-[9px]">Issued ID: {quote.id.substring(6, 14)}</div>
                    
                    <button
                      disabled
                      className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 border border-zinc-200 text-zinc-400 text-[10px] font-extrabold uppercase tracking-wider rounded cursor-not-allowed opacity-75 text-center"
                      title="Locked in Beta"
                    >
                      <span>🔒 Enrol Locked</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredQuotes.filter(q => q.status === "amber pending").length === 0 && (
              <div className="col-span-2 bg-zinc-50 border border-dashed rounded-xl p-8 text-center italic text-slate-400 text-xs">
                No active pending proposals in selected close-out timeframe. Go to "Quote Builder" to generate new pipeline!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
