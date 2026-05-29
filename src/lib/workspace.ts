import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import { SavedQuote } from "../types";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let googleUser: User | null = null;

// Initialize Google OAuth state list
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      googleUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Re-request if token disappeared from memory, but avoid blocking
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      googleUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in via Google popup to get scopes
export const connectGoogleAccount = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get Google Access Token");
    }
    cachedAccessToken = credential.accessToken;
    googleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Google Account connect failed:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getConnectedUser = (): User | null => {
  return googleUser;
};

export const disconnectGoogleAccount = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  googleUser = null;
};

// Spreadsheet creation & find Helpers
const SPREADSHEET_NAME = "FIT College Quote Logs - QTrak";

async function findOrCreateSpreadsheet(token: string): Promise<string> {
  // 1. Search for existing spreadsheet in user's Drive
  const query = encodeURIComponent(`name = '${SPREADSHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  try {
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const searchData = await searchRes.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // 2. Not found, create it
    const createUrl = "https://www.googleapis.com/drive/v3/files";
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: SPREADSHEET_NAME,
        mimeType: "application/vnd.google-apps.spreadsheet",
      }),
    });
    
    const createData = await createRes.json();
    if (!createData.id) {
      throw new Error("Failed to create spreadsheet");
    }
    
    // Initialize headers in the first row of sheet
    const spreadsheetId = createData.id;
    await initializeSheetHeaders(spreadsheetId, token);
    return spreadsheetId;
  } catch (err) {
    console.error("Error finding or creating Google Sheet:", err);
    throw err;
  }
}

const SHEET_HEADERS = [
  "Quote ID",
  "Advisor Name",
  "Student Name",
  "Student Phone",
  "Student Email",
  "Date Issued",
  "Expiry Date",
  "Course Summary",
  "Total Cost",
  "Status",
  "Updated At",
  "Pathways Data"
];

async function initializeSheetHeaders(spreadsheetId: string, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:L1?valueInputOption=USER_ENTERED`;
  try {
    await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [SHEET_HEADERS],
      }),
    });
  } catch (err) {
    console.error("Failed to initialize headers in sheet:", err);
  }
}

// Fetch all quotes for logged in advisor
export const fetchSyncedQuotes = async (token: string, advisorName: string): Promise<SavedQuote[]> => {
  try {
    const spreadsheetId = await findOrCreateSpreadsheet(token);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:L1000`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    
    if (!data.values) return [];
    
    const quotes: SavedQuote[] = data.values
      .map((row: any[]) => {
        const id = row[0] || "";
        const rowAdvisor = row[1] || "";
        const studentName = row[2] || "";
        const studentPhone = row[3] || "";
        const studentEmail = row[4] || "";
        const dateIssued = row[5] || "";
        const validUntil = row[6] || "";
        const courseSummary = row[7] || "";
        const totalCost = parseFloat(row[8] || "0");
        const status = (row[9] || "amber pending") as "amber pending" | "accepted" | "expired";
        const updatedAt = row[10] || "";
        const pathwaysData = row[11] || "";
        
        return {
          id,
          advisorName: rowAdvisor,
          studentName,
          studentPhone,
          studentEmail,
          dateIssued,
          validUntil,
          courseSummary,
          totalCost,
          status,
          updatedAt,
          isAccepted: status === "accepted",
          pathwaysData
        };
      })
      // Only display quotes generated by the logged-in careers advisor (case-insensitive check)
      .filter((q: SavedQuote) => q.advisorName.toLowerCase() === advisorName.toLowerCase());
      
    return quotes;
  } catch (err) {
    console.error("Error fetching quotes from sheet:", err);
    throw err;
  }
};

// Sync (Create or Update) quote to Google Sheet
export const saveQuoteToSheet = async (token: string, quote: SavedQuote): Promise<void> => {
  try {
    const spreadsheetId = await findOrCreateSpreadsheet(token);
    
    // 1. Read all rows to find if quote already exists
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:L1000`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const readData = await readRes.json();
    
    let existingRelativeRowIndex = -1;
    if (readData.values) {
      existingRelativeRowIndex = readData.values.findIndex((row: any[]) => row[0] === quote.id);
    }
    
    const rowValues = [
      quote.id,
      quote.advisorName,
      quote.studentName,
      quote.studentPhone,
      quote.studentEmail,
      quote.dateIssued,
      quote.validUntil,
      quote.courseSummary,
      quote.totalCost.toString(),
      quote.status,
      quote.updatedAt,
      quote.pathwaysData || ""
    ];
    
    if (existingRelativeRowIndex !== -1) {
      // 2. Overwrite existing row (Header is row 1, relative index 0 is row 2)
      const targetRow = existingRelativeRowIndex + 2;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A${targetRow}:L${targetRow}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [rowValues],
        }),
      });
    } else {
      // 3. Append new row
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:L:append?valueInputOption=USER_ENTERED`;
      await fetch(appendUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [rowValues],
        }),
      });
    }
  } catch (err) {
    console.error("Error saving quote to sheet:", err);
    throw err;
  }
};
