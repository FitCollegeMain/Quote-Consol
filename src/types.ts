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

export const ADVISER_CONTACTS: Record<string, { email: string; phone: string; meetingUrl?: string }> = {
  "Dean Eggins": { email: "dean.eggins@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/dean-eggins" },
  "Marcus Krause": { email: "marcus.krause@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://blog.fitcollege.edu.au/meetings/marcus-krause" },
  "Matthew Johnson": { email: "matthew.johnson@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/matthew-johnson" },
  "Nicky Wood": { email: "nicky.wood@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/nicky-wood" },
  "Ryan Crilly": { email: "ryan.crilly@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/ryan-crilly" },
  "Sam Russell": { email: "sam.russell@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/sam-russell2" },
  "Shay Best": { email: "shay.best@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/shay-best" },
  "Tess Di Stefano": { email: "tess.distefano@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/tess-di-stefano" },
  "Thomas Jordan": { email: "thomas.jordan@fitcollege.edu.au", phone: "1300 887 017", meetingUrl: "https://meetings-ap1.hubspot.com/thomas-jordan2" }
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

export interface CampusLinkInfo {
  mapsUrl: string;
  webUrl: string;
  address?: string;
}

export const CAMPUS_LINKS: Record<string, CampusLinkInfo> = {
  "Brisbane – Fortitude Valley": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Fortitude+Valley+PCYC+Brisbane",
    webUrl: "https://www.fitcollege.edu.au/personal-training-course-brisbane.html",
    address: "PCYC, 60 Church Street, Fortitude Valley QLD 4006"
  },
  "Brisbane North – Carseldine": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Carseldine+Goodlife+Brisbane",
    webUrl: "https://www.fitcollege.edu.au/personal-training-course-brisbane.html",
    address: "Goodlife Health Clubs, Carseldine Central, 735 Beams Road, Carseldine QLD 4034"
  },
  "Cairns - City Centre": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Cairns+Grafton+St",
    webUrl: "https://www.fitcollege.edu.au/cairns.html",
    address: "Goodlife Health Clubs, 107 Grafton Street, Cairns QLD 4870"
  },
  "Gold Coast – Nerang": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Gold+Coast+Nerang",
    webUrl: "https://www.fitcollege.edu.au/gold-coast.html",
    address: "Goodlife Health Clubs, Nerang Mall, 50 Nealdon Dr, Nerang QLD 4211"
  },
  "Ipswich": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Ipswich+QLD",
    webUrl: "https://www.fitcollege.edu.au/ipswich.html",
    address: "Ipswich, QLD 4305"
  },
  "Sunshine Coast – Maroochydore": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Maroochydore+Goodlife",
    webUrl: "https://www.fitcollege.edu.au/sunshine-coast.html",
    address: "Goodlife Health Clubs, 32 Wises Rd, Maroochydore QLD 4558"
  },
  "Toowoomba": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Toowoomba+QLD",
    webUrl: "https://www.fitcollege.edu.au/toowoomba.html",
    address: "Toowoomba, QLD"
  },
  "Newcastle": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Newcastle+The+Forum",
    webUrl: "https://www.fitcollege.edu.au/newcastle.html",
    address: "The Forum, University of Newcastle, Callaghan NSW 2308"
  },
  "Sydney - Caringbah": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Caringbah+Vision+PT",
    webUrl: "https://www.fitcollege.edu.au/sydney.html",
    address: "Vision Personal Training, 7 Stokes Ave, Caringbah NSW 2229"
  },
  "Sydney - City Centre": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Sydney+Gym",
    webUrl: "https://www.fitcollege.edu.au/sydney.html",
    address: "Fitness First, 259 George St, Sydney NSW 2000"
  },
  "Sydney - Penrith": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Penrith+NSW",
    webUrl: "https://www.fitcollege.edu.au/sydney.html",
    address: "Penrith, NSW 2750"
  },
  "Sydney West - Parramatta": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Parramatta+Genesis+Fitness",
    webUrl: "https://www.fitcollege.edu.au/parramatta.html",
    address: "Genesis Fitness, 3 Horwood Pl, Parramatta NSW 2150"
  },
  "Geelong - North Geelong": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Geelong+VIC",
    webUrl: "https://www.fitcollege.edu.au/geelong.html",
    address: "North Geelong, VIC 3215"
  },
  "Melbourne - South Melbourne": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+South+Melbourne+VIC",
    webUrl: "https://www.fitcollege.edu.au/melbourne.html",
    address: "South Melbourne, VIC 3205"
  },
  "Melbourne - Wantirna": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Wantirna+VIC",
    webUrl: "https://www.fitcollege.edu.au/melbourne.html",
    address: "Goodlife Health Clubs, 1 Wantirna Rd, Wantirna VIC 3152"
  },
  "Adelaide - Glenelg": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Adelaide+Glenelg",
    webUrl: "https://www.fitcollege.edu.au/adelaide.html",
    address: "Glenelg, SA 5045"
  },
  "Perth North - Joondalup": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Joondalup+WA",
    webUrl: "https://www.fitcollege.edu.au/perth.html",
    address: "Joondalup, WA 6027"
  },
  "Perth South - Bibra Lake": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Bibra+Lake+WA",
    webUrl: "https://www.fitcollege.edu.au/perth.html",
    address: "Bibra Lake, WA 6163"
  },
  "Canberra – Deakin": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Canberra+Deakin",
    webUrl: "https://www.fitcollege.edu.au/canberra.html",
    address: "Deakin, ACT 2600"
  },
  "Hobart - Aquatic Center": {
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FIT+College+Hobart+TAS",
    webUrl: "https://www.fitcollege.edu.au/hobart.html",
    address: "Doone Kennedy Hobart Aquatic Centre, Davies Ave, Hobart TAS 7000"
  }
};

