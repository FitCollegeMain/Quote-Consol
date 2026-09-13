import React, { useState } from "react";
import { Lock, Mail, ShieldAlert } from "lucide-react";
import Logo from "./Logo";
import { signIn } from "../lib/auth";

interface LoginScreenProps {
  /** A problem raised by the session watcher, e.g. a missing profile. */
  sessionError?: string | null;
}

export default function LoginScreen({ sessionError }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your work email address and password.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await signIn(email, password);
      // The session watcher in App takes it from here.
    } catch (err: any) {
      setError(err?.message || "Sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const message = error || sessionError;

  return (
    <div className="min-h-screen bg-[#0F0F10] text-white font-sans flex items-center justify-center p-4 antialiased selection:bg-fit-red selection:text-white">
      <div className="w-full max-w-md bg-[#18181B] rounded-xl border border-zinc-800 shadow-2xl p-8 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-fit-red" />

        <div className="flex flex-col items-center justify-center pt-2 pb-6 border-b border-zinc-800/60 mb-6">
          <Logo variant="dark" className="h-[75px] w-auto drop-shadow-[0_0_8px_rgba(214,40,40,0.25)]" />
          <h1 className="font-bebas text-3xl tracking-widest text-white mt-4 font-black">FIT COLLEGE</h1>
          <p className="text-[10px] text-fit-red font-bold tracking-widest uppercase mt-1">
            Quote Console Sign In
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="loginEmail"
              className="block text-[10px] font-extrabold text-[#8B909A] uppercase tracking-wider mb-2 text-left"
            >
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                id="loginEmail"
                type="email"
                autoComplete="username"
                placeholder="name@fitcollege.edu.au"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full bg-[#202023] border border-zinc-800 rounded-lg pl-10 pr-3 py-3 text-sm text-white focus:outline-none focus:border-fit-red placeholder-zinc-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="loginPassword"
              className="block text-[10px] font-extrabold text-[#8B909A] uppercase tracking-wider mb-2 text-left"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
              <input
                id="loginPassword"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className="w-full bg-[#202023] border border-zinc-800 rounded-lg pl-10 pr-3 py-3 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-fit-red placeholder-zinc-600"
              />
            </div>
          </div>

          {message && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/80 rounded-lg text-xs text-red-400 font-medium text-left">
              <ShieldAlert className="shrink-0 mt-0.5 w-4 h-4" />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-fit-red hover:bg-[#a80d13] disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-300 font-sans shadow-lg shadow-red-950/20 active:translate-y-px cursor-pointer"
          >
            <Lock size={14} />
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-5 border-t border-zinc-800/40 text-center text-[10px] text-zinc-500 font-medium leading-relaxed">
          Accounts are issued by the console administrator. If you have forgotten your
          password, or need access for a new advisor, contact them for a reset.
        </div>
      </div>
    </div>
  );
}
