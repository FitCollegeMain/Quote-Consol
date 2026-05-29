export interface CourseInclusion {
  name: string;
}

export interface SelectedCourse {
  id: string;
  name: string;
  mode: string; // "Online" | "On Campus" | "Blended" | ""
  rrp: number;
  discountValue: number;
  discountType: "%" | "$";
  isIncluded: boolean; // Is it an automatic free inclusion course?
}

export interface Pathway {
  id: string;
  title: string;
  mode: "online" | "campus" | "default";
  campusLocation: string;
  startDate: string;
  timetable: string;
  timetableDesc: string;
  courses: SelectedCourse[];
}

export interface QuoteDetails {
  studentName: string;
  phoneNumber: string;
  emailAddress: string;
  date: string;
  validUntil: string;
  adviserName: string;
  adviserEmail?: string;
  adviserPhone?: string;
}

export const ADVISER_CONTACTS: Record<string, { email: string; phone: string }> = {
  "Dean Eggins": { email: "dean.eggins@fitcollege.edu.au", phone: "1300 887 017" },
  "Marcus Krause": { email: "marcus.krause@fitcollege.edu.au", phone: "1300 887 017" },
  "Matthew Johnson": { email: "matthew.johnson@fitcollege.edu.au", phone: "1300 887 017" },
  "Nicky Wood": { email: "nicky.wood@fitcollege.edu.au", phone: "1300 887 017" },
  "Ryan Crilly": { email: "ryan.crilly@fitcollege.edu.au", phone: "1300 887 017" },
  "Sam Russel": { email: "sam.russel@fitcollege.edu.au", phone: "1300 887 017" },
  "Shay Best": { email: "shay.best@fitcollege.edu.au", phone: "1300 887 017" },
  "Tess Szabath": { email: "tess.szabath@fitcollege.edu.au", phone: "1300 887 017" },
  "Thomas Jordan": { email: "thomas.jordan@fitcollege.edu.au", phone: "1300 887 017" }
};

export const ADVISERS = Object.keys(ADVISER_CONTACTS);

export const COURSE_PRICES: Record<string, number> = {
  "Fit Elite Ultra ONLINE (SIS30321 & SIS40221 & SIS50321 / TAE40122)": 9900.00,
  "Fit Elite Ultra F2F (SIS30321 & SIS40221 & SIS50321 / TAE40122)": 12900.00,
  "ONLINE FIT Elite PT Program (SIS30321 & SIS40221 & Specialty)": 8400.00,
  "F2F FIT Elite PT Program (SIS30321 & SIS40221 & Specialty)": 11400.00,
  "ONLINE Complete PT Program - Dual Qualification (SIS30321 & SIS40221)": 6000.00,
  "F2F Complete PT Program - Dual Qualification (SIS30321 & SIS40221)": 9000.00,
  "RPL Assessment (Recognition of Prior Learning / Portfolio Assessment)": 950.00,
  "ONLINE Certificate III in Fitness (SIS30321)": 3000.00,
  "PART TIME or FULL TIME Certificate III in Fitness (SIS30321)": 4500.00,
  "SIS30321 Study Mode Upgrade (ONL to F2F)": 2000.00,
  "ONLINE Certificate IV in Fitness (SIS40221)": 3000.00,
  "PART TIME or FULL TIME Certificate IV in Fitness (SIS40221)": 4500.00,
  "SIS40221 Study Mode Upgrade (ONL to F2F)": 2000.00,
  "ONLINE Diploma of Sport - Coaching (SIS50321)": 20000.00,
  "ONLINE Strength & Conditioning (SAC) - ASCA L1 Accredited": 1500.00,
  "ONLINE Individual Support - Disability Skillset (CHCSS00130)": 1500.00,
  "ONLINE Kettlebell FIT Foundation Skills (KBB-FIT)": 300.00,
  "F2F Kettlebell FIT Foundation Skills (KBB-FIT)": 400.00,
  "ONLINE Rumble FIT Foundation Skills (RMB-FIT)": 300.00,
  "F2F Rumble FIT Foundation Skills (RMB-FIT)": 400.00,
  "ONLINE Stretch FIT Foundation Skills (STC-FIT)": 300.00,
  "F2F Stretch FIT Foundation Skills (STC-FIT)": 400.00,
  "ONLINE Suspension FIT Foundation Skills (SUS-FIT)": 300.00,
  "F2F Suspension FIT Foundation Skills (SUS-FIT)": 400.00,
  "F2F Provide Cardiopulmonary Resuscitation (HLTAID009)": 75.00,
  "F2F Provide First Aid (HLTAID011)": 150.00,
  "ONLINE Certificate IV in Training & Assessment (TAE40122)": 3000.00,
  "F2F Certificate IV in Training & Assessment (TAE40122)": 4500.00,
  "ONLINE Training Package Upgrade - Cert IV in T&A (TAE40122)": 2000.00
};

export const AUTOMATIC_INCLUSIONS = [
  "ONLINE Strength & Conditioning (SAC) - ASCA L1 Accredited",
  "ONLINE Individual Support - Disability Skillset (CHCSS00130)",
  "ONLINE Rumble FIT Foundation Skills (RMB-FIT)",
  "ONLINE Kettlebell FIT Foundation Skills (KBB-FIT)",
  "ONLINE Suspension FIT Foundation Skills (SUS-FIT)"
];

export const TIMETABLES = [
  { value: "FT", desc: "Monday to Thursday 10am to 1pm for 14 weeks on campus", label: "Full-Time" },
  { value: "PT-MW", desc: "Mondays and Wednesdays 6pm - 9pm for 28 weeks on campus", label: "Part-Time (Mon/Wed)" },
  { value: "PT-TT", desc: "Tuesdays and Thursdays 6pm - 9pm for 28 weeks on campus", label: "Part-Time (Tue/Thu)" }
];

export const CAMPUSES_BY_STATE: Record<string, string[]> = {
  "Queensland": [
    "Brisbane – Fortitude Valley",
    "Brisbane North – Carseldine",
    "Cairns - City Centre",
    "Gold Coast – Nerang",
    "Ipswich",
    "Sunshine Coast – Maroochydore",
    "Toowoomba"
  ],
  "New South Wales": [
    "Newcastle",
    "Sydney - Caringbah",
    "Sydney - City Centre",
    "Sydney - Penrith",
    "Sydney West - Parramatta"
  ],
  "Victoria": [
    "Geelong - North Geelong",
    "Melbourne - South Melbourne",
    "Melbourne - Wantirna"
  ],
  "South Australia": [
    "Adelaide - Glenelg"
  ],
  "Western Australia": [
    "Perth North - Joondalup",
    "Perth South - Bibra Lake"
  ],
  "ACT & Tasmania": [
    "Canberra – Deakin",
    "Hobart - Aquatic Center"
  ]
};

export interface SavedQuote {
  id: string;
  advisorName: string;
  studentName: string;
  studentPhone: string;
  studentEmail: string;
  dateIssued: string;
  validUntil: string;
  courseSummary: string;
  totalCost: number;
  status: "amber pending" | "accepted" | "expired";
  updatedAt: string;
  isAccepted: boolean;
  pathwaysData?: string; // JSON configuration of pathways
}

