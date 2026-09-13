import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { AppUser, UserRole } from "../types";

export class ProfileMissingError extends Error {
  constructor(email: string) {
    super(
      `${email} signed in, but has no console profile yet. Ask an administrator ` +
        `to add your record before using the console.`
    );
    this.name = "ProfileMissingError";
  }
}

export class ProfileInactiveError extends Error {
  constructor(email: string) {
    super(`Access for ${email} has been deactivated. Contact an administrator.`);
    this.name = "ProfileInactiveError";
  }
}

/**
 * Reads the role and display name for a signed-in account.
 *
 * The role lives in Firestore rather than in the client, because the security
 * rules read the same document. A tampered client cannot promote itself: it
 * would still be refused by the server on every admin read.
 */
async function loadProfile(user: User): Promise<AppUser> {
  const snapshot = await getDoc(doc(db, "users", user.uid));
  const email = user.email || "This account";

  if (!snapshot.exists()) throw new ProfileMissingError(email);

  const data = snapshot.data();
  if (data.active === false) throw new ProfileInactiveError(email);

  return {
    uid: user.uid,
    email: user.email || data.email || "",
    name: data.name || user.displayName || email,
    role: (data.role as UserRole) === "admin" ? "admin" : "advisor",
    active: true,
  };
}

/**
 * Subscribes to sign-in state. Fires with the resolved profile, or with null
 * once signed out. Profile problems are reported through onProblem and the
 * account is signed straight back out, so the app never holds a half-valid
 * session.
 */
export function watchSession(
  onUser: (user: AppUser | null) => void,
  onProblem: (message: string) => void
) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onUser(null);
      return;
    }
    try {
      onUser(await loadProfile(user));
    } catch (err: any) {
      onProblem(err?.message || "Could not load your console profile.");
      await signOut(auth);
      onUser(null);
    }
  });
}

const SIGN_IN_ERRORS: Record<string, string> = {
  "auth/invalid-email": "That does not look like a valid email address.",
  "auth/user-disabled": "This account has been disabled. Contact an administrator.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/too-many-requests":
    "Too many failed attempts. Wait a few minutes, or reset the password.",
  "auth/network-request-failed": "No connection to the sign-in service. Check your network.",
};

export async function signIn(email: string, password: string): Promise<void> {
  try {
    // Local persistence keeps advisors signed in between visits on their own
    // machine, which is what the old seven-day session was reaching for.
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (err: any) {
    throw new Error(SIGN_IN_ERRORS[err?.code] || "Sign-in failed. Please try again.");
  }
}

export async function signOutOfConsole(): Promise<void> {
  await signOut(auth);
}

export async function changePassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("You need to be signed in to change your password.");
  try {
    await updatePassword(user, newPassword);
  } catch (err: any) {
    if (err?.code === "auth/requires-recent-login") {
      throw new Error("For security, sign out and back in before changing your password.");
    }
    throw new Error(err?.message || "Could not change the password.");
  }
}
