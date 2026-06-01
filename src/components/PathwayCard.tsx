import React from "react";
import { Plus, Trash2, MapPin, Calendar, Clock, Gift, Info, CheckCircle, ExternalLink, Globe, CalendarDays, PhoneCall, User } from "lucide-react";
import {
  Pathway,
  SelectedCourse,
  COURSE_PRICES,
  CAMPUSES_BY_STATE,
  TIMETABLES,
  AUTOMATIC_INCLUSIONS,
  CAMPUS_LINKS,
  ADVISER_CONTACTS,
} from "../types";

interface PathwayCardProps {
  key?: string;
  pathway: Pathway;
  index: number;
  onUpdatePathway: (updated: Pathway) => void;
  onRemovePathway: () => void;
  isFirst: boolean;
  isAccepted?: boolean;
  onAcceptToggle?: () => void;
  advisorName?: string;
}

export default function PathwayCard({
  pathway,
  index,
  onUpdatePathway,
  onRemovePathway,
  isFirst,
  isAccepted = false,
  onAcceptToggle,
  advisorName,
}: PathwayCardProps) {
  // Determine pathway mode from the first course
  const [showOtherAdvisers, setShowOtherAdvisers] = React.useState(false);
  const firstCourseName = pathway.courses[0]?.name || "";
  let derivedMode: "online" | "campus" | "default" = "default";
  if (firstCourseName.includes("ONLINE")) {
    derivedMode = "online";
  } else if (
    firstCourseName.includes("F2F") ||
    firstCourseName.includes("PART TIME") ||
    firstCourseName.includes("FULL TIME")
  ) {
    derivedMode = "campus";
  }

  // Derived Title based on mode containing elegant Bebas Neue font spacing
  const derivedTitle =
    derivedMode === "online"
      ? "RECOMMENDED ONLINE STUDY PATHWAY"
      : derivedMode === "campus"
      ? "RECOMMENDED ON-CAMPUS STUDY PATHWAY"
      : "RECOMMENDED STUDY PATHWAY";

  // Helper to format money strings nicely
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount);
  };

  // Safe helper to calculate individual row details
  const calculateRowValues = (course: SelectedCourse) => {
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

  // Add a blank course row to current pathway
  const handleAddCourseRow = () => {
    const newCourse: SelectedCourse = {
      id: crypto.randomUUID(),
      name: "",
      mode: "",
      rrp: 0,
      discountValue: 0,
      discountType: "%",
      isIncluded: false,
    };
    onUpdatePathway({
      ...pathway,
      courses: [...pathway.courses, newCourse],
    });
  };

  // Update a single field on a course
  const handleCourseChange = (courseId: string, updatedFields: Partial<SelectedCourse>) => {
    const updatedCourses = [...pathway.courses];
    const courseIdx = updatedCourses.findIndex((c) => c.id === courseId);
    if (courseIdx === -1) return;

    let targetCourse = { ...updatedCourses[courseIdx], ...updatedFields };

    // If changing course name, auto-fill price, mode and handle automatic inclusions
    if (updatedFields.name !== undefined) {
      const selectedName = updatedFields.name;
      const rrp = COURSE_PRICES[selectedName] || 0;
      let mode = "";

      if (selectedName.includes("ONLINE")) {
        mode = "Online";
      } else if (selectedName.includes("F2F") || selectedName.includes("PART TIME") || selectedName.includes("FULL TIME")) {
        mode = "On Campus";
      } else if (selectedName) {
        mode = "Blended";
      }

      targetCourse.rrp = rrp;
      targetCourse.mode = mode;

      updatedCourses[courseIdx] = targetCourse;

      // Handle Automatic Inclusions: 
      // If the selected course is a "FIT Elite PT Program", "Fit Ultra", or "Complete PT Program", append inclusions
      const normName = selectedName.toLowerCase();
      const isComposite = normName.includes("elite ultra") || 
                          normName.includes("elite pt program") || 
                          normName.includes("complete pt program");

      if (isComposite) {
        // Remove prior inclusions first to avoid duplicates or piling them up
        const filteredMainCourses = updatedCourses.filter((c, idx) => {
          return !c.isIncluded || idx <= courseIdx;
        });

        // All of them get Certificate III and IV in fitness as inclusions
        let inclusionsToAppend = [
          "ONLINE Certificate III in Fitness (SIS30321)",
          "ONLINE Certificate IV in Fitness (SIS40221)"
        ];

        // If the selected package is face-to-face, match the inclusions mode
        const isF2F = selectedName.includes("F2F") || selectedName.includes("PART TIME") || selectedName.includes("FULL TIME");
        if (isF2F) {
          inclusionsToAppend = [
            "PART TIME or FULL TIME Certificate III in Fitness (SIS30321)",
            "PART TIME or FULL TIME Certificate IV in Fitness (SIS40221)"
          ];
        }

        // Elite/Ultra also get the standard automatic short courses
        if (normName.includes("elite") || normName.includes("ultra")) {
          // Keep additional short course inclusions
          inclusionsToAppend = [...inclusionsToAppend, ...AUTOMATIC_INCLUSIONS];
        }

        // Add the free inclusions
        const inclusionRows: SelectedCourse[] = inclusionsToAppend.map((incName) => {
          let incMode = isF2F ? "On Campus" : "Online";
          if (incName.startsWith("ONLINE ")) {
            incMode = "Online";
          } else if (incName.startsWith("PART TIME") || incName.startsWith("FULL TIME") || incName.startsWith("F2F ")) {
            incMode = "On Campus";
          }

          return {
            id: crypto.randomUUID(),
            name: incName,
            mode: incMode,
            rrp: 0,
            discountValue: 0,
            discountType: "%",
            isIncluded: true,
          };
        });

        onUpdatePathway({
          ...pathway,
          courses: [...filteredMainCourses, ...inclusionRows],
        });
        return;
      }
    } else {
      updatedCourses[courseIdx] = targetCourse;
    }

    onUpdatePathway({
      ...pathway,
      courses: updatedCourses,
    });
  };

  // Remove a course from the pathway
  const handleRemoveCourse = (courseId: string) => {
    const updatedCourses = pathway.courses.filter((c) => c.id !== courseId);
    onUpdatePathway({
      ...pathway,
      courses: updatedCourses,
    });
  };

  // Calculate totals for rendering
  let totalSavings = 0;
  let totalInvestment = 0;

  pathway.courses.forEach((course) => {
    const { savings, finalPrice } = calculateRowValues(course);
    totalSavings += savings;
    totalInvestment += finalPrice;
  });

  return (
    <div className="border border-fit-lightgray p-6 sm:p-8 rounded-lg bg-white relative shadow-sm mb-12 last:mb-0 print:border-none print:shadow-none print:p-0 print:m-0 break-inside-avoid">
      {/* Header action panel */}
      <div className="flex justify-between items-start mb-6 border-b border-fit-lightgray pb-4">
        <div>
          <h3 className="font-bebas text-3xl tracking-wider text-fit-red">
            {derivedTitle}
          </h3>
          <p className="text-xs text-fit-gray uppercase tracking-widest font-semibold mt-1">
            Pathway {index + 1}
          </p>
        </div>

        {!isFirst && (
          <button
            type="button"
            onClick={onRemovePathway}
            className="no-print flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-fit-red border border-gray-200 hover:border-red-200 text-xs font-bold rounded cursor-pointer transition-colors"
          >
            <Trash2 size={13} />
            Remove Pathway
          </button>
        )}
      </div>

      {/* Campus / Mode Information Blocks */}
      <div className="mb-6">
        {derivedMode === "campus" && (
          <div className="bg-gray-50 border-l-4 border-fit-red p-4 rounded-r-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-fit-darkgray uppercase tracking-wide mb-1">
                  Campus Location:
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-fit-gray pointer-events-none" />
                  <select
                    value={pathway.campusLocation}
                    onChange={(e) => onUpdatePathway({ ...pathway, campusLocation: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-md pl-9 pr-3 py-2.5 focus:border-fit-red focus:ring-1 focus:ring-fit-red outline-none cursor-pointer"
                  >
                    <option value="">-- Select Campus --</option>
                    {Object.keys(CAMPUSES_BY_STATE).map((state) => (
                      <optgroup key={state} label={state} className="font-bold text-fit-darkgray bg-white">
                        {CAMPUSES_BY_STATE[state].map((campus) => (
                          <option key={campus} value={campus}>
                            {campus}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {pathway.campusLocation && CAMPUS_LINKS[pathway.campusLocation] && (
                  <div className="mt-2.5 rounded bg-white p-2.5 border border-slate-200/60 shadow-xs no-print text-[11px] text-slate-600">
                    {CAMPUS_LINKS[pathway.campusLocation].address && (
                      <p className="mb-2 font-medium leading-relaxed">
                        <strong className="text-slate-800">Address:</strong> {CAMPUS_LINKS[pathway.campusLocation].address}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 font-semibold">
                      <a
                        href={CAMPUS_LINKS[pathway.campusLocation].mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-fit-red hover:text-red-700 transition-colors"
                      >
                        <MapPin size={12} className="shrink-0" />
                        <span>View Google Map</span>
                        <ExternalLink size={10} className="shrink-0 opacity-70" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-fit-darkgray uppercase tracking-wide mb-1">
                  Start Date:
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-fit-gray pointer-events-none" />
                  <input
                    type="date"
                    value={pathway.startDate}
                    onChange={(e) => onUpdatePathway({ ...pathway, startDate: e.target.value })}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-md pl-9 pr-3 py-2 outline-none focus:border-fit-red focus:ring-1 focus:ring-fit-red"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-fit-darkgray uppercase tracking-wide mb-1">
                Timetable:
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-fit-gray pointer-events-none" />
                  <select
                    value={pathway.timetable}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const selectedItem = TIMETABLES.find((t) => t.value === selectedVal);
                      onUpdatePathway({
                        ...pathway,
                        timetable: selectedVal,
                        timetableDesc: selectedItem ? selectedItem.desc : "",
                      });
                    }}
                    className="w-full bg-white border border-gray-300 text-gray-800 text-xs rounded-md pl-9 pr-3 py-2.5 focus:border-fit-red focus:ring-1 focus:ring-fit-red outline-none cursor-pointer"
                  >
                    <option value="">-- Select Timetable --</option>
                    {TIMETABLES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {pathway.timetableDesc && (
                  <div className="text-xs font-bold text-fit-red flex items-center gap-1">
                    <Info size={14} className="shrink-0" />
                    <span>{pathway.timetableDesc}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {derivedMode === "online" && (
          <div className="bg-gray-50 border-l-4 border-fit-red p-4 rounded-r-md flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-fit-red text-xs shrink-0">
              ✓
            </span>
            <p className="text-xs font-medium text-fit-darkgray">
              <strong className="text-fit-red uppercase tracking-wider font-semibold">Online Pathway:</strong>{" "}
              Flexible start anytime. Study at your own pace from anywhere with interactive tutor assistance!
            </p>
          </div>
        )}
      </div>

      {/* Grid of study qualifications table */}
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <table className="w-full text-left border-collapse border-b border-fit-lightgray">
          <thead>
            <tr className="bg-fit-black text-white">
              <th className="py-2.5 px-3 text-xs tracking-wider uppercase font-bebas text-left w-[40%] rounded-tl-md">
                Course Qualification
              </th>
              <th className="py-2.5 px-3 text-xs tracking-wider uppercase font-bebas text-center w-[15%]">
                Mode
              </th>
              <th className="py-2.5 px-3 text-xs tracking-wider uppercase font-bebas text-right w-[13%]">
                RRP ($)
              </th>
              <th className="py-2.5 px-3 text-xs tracking-wider uppercase font-bebas text-center w-[15%]">
                Discount
              </th>
              <th className="py-2.5 px-3 text-xs tracking-wider uppercase font-bebas text-right w-[12%]">
                Savings
              </th>
              <th className="py-2.5 px-3 text-xs tracking-wider uppercase font-bebas text-right w-[12%] rounded-tr-md">
                Final ($)
              </th>
              <th className="py-2.5 px-2 text-xs tracking-wider uppercase font-bebas text-center w-[5%] no-print">
                Act
              </th>
            </tr>
          </thead>
          <tbody>
            {pathway.courses.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-xs text-fit-gray font-medium">
                  No courses selected yet. Click the button below to add a qualification segment.
                </td>
              </tr>
            ) : (
              pathway.courses.map((course) => {
                const { savings, finalPrice } = calculateRowValues(course);

                if (course.isIncluded) {
                  // Rendering included free items differently (grayed out, non-editable)
                  return (
                    <tr
                      key={course.id}
                      className="bg-gray-100/70 text-gray-500 border-b border-gray-200/60 font-medium"
                    >
                      <td className="py-2.5 px-3 text-xs flex items-center gap-1.5 font-semibold text-gray-600">
                        <Gift size={13} className="text-fit-gray shrink-0" />
                        <span>{course.name} <span className="text-[10px] text-fit-red tracking-wider">(INCLUDED)</span></span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-center">
                        {course.mode}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-right text-gray-400">
                      </td>
                      <td className="py-2.5 px-3 text-xs text-center text-gray-400">
                      </td>
                      <td className="py-2.5 px-3 text-xs text-right text-gray-400">
                      </td>
                      <td className="py-2.5 px-3 text-xs text-right font-bold text-gray-650">
                      </td>
                      <td className="py-2.5 px-2 text-xs text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleRemoveCourse(course.id)}
                          className="hover:text-fit-red text-gray-400 p-1 rounded cursor-pointer transition-colors"
                          title="Remove inclusion"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                }

                // Normal main courses rows
                return (
                  <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    {/* Qualification Dropdown */}
                    <td className="py-2 px-1">
                      <select
                        value={course.name}
                        onChange={(e) => handleCourseChange(course.id, { name: e.target.value })}
                        className="w-full bg-transparent text-xs text-fit-darkgray rounded border border-gray-200 px-2 py-1.5 outline-none focus:border-fit-red focus:ring-1 focus:ring-fit-red"
                      >
                        <option value="">-- Select Course Product --</option>
                        {Object.keys(COURSE_PRICES).map((priceKey) => (
                          <option key={priceKey} value={priceKey}>
                            {priceKey}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Mode select */}
                    <td className="py-2 px-1 text-center">
                      <select
                        value={course.mode}
                        onChange={(e) => handleCourseChange(course.id, { mode: e.target.value })}
                        className="w-full bg-transparent text-xs text-fit-darkgray rounded border border-gray-200 px-2 py-1.5 focus:border-fit-red outline-none text-center"
                      >
                        <option value="">- Mode -</option>
                        <option value="On Campus">On Campus</option>
                        <option value="Online">Online</option>
                        <option value="Blended">Blended</option>
                      </select>
                    </td>

                    {/* RRP editable field */}
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        value={course.rrp || ""}
                        onChange={(e) => handleCourseChange(course.id, { rrp: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-transparent text-xs text-fit-darkgray text-right rounded border border-gray-200 px-2 py-1.5 focus:border-fit-red outline-none"
                        placeholder="0.00"
                        min="0"
                      />
                    </td>

                    {/* Discount value & type selector */}
                    <td className="py-2 px-1 text-center">
                      <div className="flex rounded border border-gray-200 overflow-hidden bg-white max-w-[120px] mx-auto">
                        <input
                          type="number"
                          value={course.discountValue || ""}
                          onChange={(e) =>
                            handleCourseChange(course.id, { discountValue: parseFloat(e.target.value) || 0 })
                          }
                          className="w-0 flex-1 text-xs text-fit-darkgray text-right px-1.5 py-1 outline-none"
                          placeholder="0"
                          min="0"
                        />
                        <select
                          value={course.discountType}
                          onChange={(e) =>
                            handleCourseChange(course.id, { discountType: e.target.value as "%" | "$" })
                          }
                          className="bg-gray-100 text-xs border-l border-gray-200 px-1 py-1 outline-none cursor-pointer font-bold text-center w-[36px]"
                        >
                          <option value="%">%</option>
                          <option value="$">$</option>
                        </select>
                      </div>
                    </td>

                    {/* Savings display */}
                    <td className="py-2 px-3 text-xs text-right text-fit-red font-medium">
                      -{formatMoney(savings)}
                    </td>

                    {/* Final price display */}
                    <td className="py-2 px-3 text-xs text-right font-bold text-fit-darkgray">
                      {formatMoney(finalPrice)}
                    </td>

                    {/* Delete button */}
                    <td className="py-2 px-2 text-center no-print">
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(course.id)}
                        className="text-gray-400 hover:text-fit-red p-1 rounded cursor-pointer transition-colors"
                        title="Delete row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Totals Section */}
            <tr className="bg-gray-50/70 border-t border-fit-lightgray">
              <td colSpan={4} className="py-2 px-3 text-xs text-right font-bold text-fit-gray uppercase tracking-wider">
                Total Savings:
              </td>
              <td className="py-2 px-3 text-xs text-right font-bold text-fit-red">
                -{formatMoney(totalSavings)}
              </td>
              <td></td>
              <td className="no-print"></td>
            </tr>

            <tr className="bg-gray-50 border-t border-fit-lightgray">
              <td colSpan={5} className="py-3 px-3 text-sm text-right font-bold text-fit-black uppercase tracking-wider">
                Total Final Investment:
              </td>
              <td className="py-3 px-3 text-base text-right font-bold text-fit-red font-sans">
                {formatMoney(totalInvestment)}
              </td>
              <td className="no-print"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end no-print">
        <button
          type="button"
          onClick={handleAddCourseRow}
          className="flex items-center gap-1 px-3 py-1.5 bg-fit-black hover:bg-fit-darkgray text-white text-xs font-bold rounded cursor-pointer transition-colors"
        >
          <Plus size={14} />
          Add Course to this Pathway
        </button>
      </div>

      {/* Why Choose FIT College Box - changes conditionally based on path mode */}
      <div className="bg-gray-50 border-l-4 border-fit-black p-5 rounded-r-md mt-6">
        <h4 className="font-bebas text-xl text-fit-black tracking-wide mb-3">
          Why Choose FIT College?
        </h4>

        {derivedMode === "online" && (
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Responsive Marking:</strong> Proud 3-day marking turnaround for all online course units.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Comprehensive Support:</strong> Dedicated student advisors and assessors available 5 days a week.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Flexible Learning:</strong> Portal available 24/7 with 100% downloadable content with virtual lectures.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Genuine Graduate Outcomes:</strong> Custom-designed practical mentorship to make you career-ready!</span>
            </li>
          </ul>
        )}

        {derivedMode === "campus" && (
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>World Class Facilities:</strong> High-specification real gym classrooms for actual hands-on fitness education.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Qualified Industry Evaluators:</strong> Learn directly from qualified fitness professionals with running businesses.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Blended Study Access:</strong> Complete digital resources coupled with mandatory direct face-to-face modules.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Gym Partners Network:</strong> Immediate access to interviews with commercial gyms upon graduation.</span>
            </li>
          </ul>
        )}

        {derivedMode === "default" && (
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>World Class Facilities:</strong> Practical training occurs inside functional gyms, not isolated classrooms.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Unmatched Campus & Virtual Support:</strong> Full education support available from 9am to 5pm daily.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Flexible Options:</strong> Blend on-campus practical sessions with flexible online theories.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-fit-red">✦</span>
              <span><strong>Registered Training Organisation:</strong> High standards of compliance, fully audited under RTO: 31903.</span>
            </li>
          </ul>
        )}
      </div>

      {/* Careers Advisor Meeting Booking Prompt Section */}
      <div className="mt-8 pt-6 border-t border-[#D5D8DE]/60 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 p-4 md:p-5 rounded-xl transition-all duration-300 bg-slate-50 border border-[#D5D8DE]/40">
          <div className="text-left flex-1 flex items-start gap-3.5">
            <div className="p-2.5 bg-fit-red/10 text-fit-red rounded-lg mt-0.5 shrink-0">
              <CalendarDays size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-fit-red block mb-1">
                Next Steps • Consult Careers Specialist
              </span>
              <h4 className="font-bold text-sm text-slate-800 leading-tight">
                Secure this pathway & finalize custom intake
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Schedule a quick 1-on-1 course discussion with <strong className="text-slate-800">{advisorName || "your Careers Advisor"}</strong> to lock in timetables, verify tuition inclusions, or discuss payment choices.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col justify-center items-stretch sm:items-end gap-2 shrink-0 md:min-w-[200px] no-print">
            <a
              href={(advisorName && ADVISER_CONTACTS[advisorName]?.meetingUrl) || "https://meetings-ap1.hubspot.com/dean-eggins"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 hover:scale-102 active:scale-98 shadow-sm bg-fit-red hover:bg-[#a80d13] text-white"
            >
              <CalendarDays size={14} />
              <span>Book Consultation ↗</span>
            </a>
            
            <button
              type="button"
              onClick={() => setShowOtherAdvisers(!showOtherAdvisers)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wide underline transition-colors cursor-pointer text-center bg-transparent border-none outline-none"
            >
              {showOtherAdvisers ? "Hide Other Schedules ↑" : "Choose Another Advisor ↓"}
            </button>
          </div>

          {/* Print-Only Booking Instruction */}
          <div className="hidden print:block text-right self-center text-[10px] text-slate-500 font-mono max-w-[250px]">
            <strong>Book Consultation Link:</strong>
            <p className="text-fit-black font-semibold break-all text-[9px] mt-0.5">
              {(advisorName && ADVISER_CONTACTS[advisorName]?.meetingUrl) || "https://meetings-ap1.hubspot.com/dean-eggins"}
            </p>
          </div>
        </div>

        {/* Other Advisors Quick Link Table */}
        {showOtherAdvisers && (
          <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs no-print text-left animate-fade-in">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
              <User size={12} />
              <span>Admissions Specialist Availability (HubSpot Bookings)</span>
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.keys(ADVISER_CONTACTS)
                .filter(name => name !== advisorName)
                .map((name) => {
                  const info = ADVISER_CONTACTS[name];
                  return (
                    <a
                      key={name}
                      href={info.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700"
                    >
                      <span className="truncate">{name}</span>
                      <span className="text-[10px] text-fit-red shrink-0 flex items-center gap-0.5 hover:underline font-bold">
                        Schedule ↗
                      </span>
                    </a>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
