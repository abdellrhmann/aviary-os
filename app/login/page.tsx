"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        router.push("/");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          setIsLoading(false);
          return;
        }

        setInfoMessage(
          "Registration submitted. If email confirmation is required, please verify your email before signing in."
        );
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during authentication.");
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm bg-surface border border-border rounded-md p-6 sm:p-8">
        <div className="border-b border-border pb-4 mb-6">
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            AviaryOS
          </h1>
          <p className="text-xs text-muted mt-1">
            {mode === "signin"
              ? "Sign in to access your aviary management workspace."
              : "Create an account to start managing your aviary records."}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-md border border-danger/30 bg-danger-subtle text-danger text-xs">
            {errorMessage}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-md border border-border bg-muted-surface text-foreground text-xs">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface text-foreground border border-border rounded-md focus:outline-none focus:border-accent"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-foreground mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface text-foreground border border-border rounded-md focus:outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-md transition-colors disabled:opacity-60"
          >
            {isLoading
              ? "Processing..."
              : mode === "signin"
              ? "Sign in"
              : "Register"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErrorMessage(null);
              setInfoMessage(null);
            }}
            className="text-xs text-muted hover:text-foreground transition-colors underline"
          >
            {mode === "signin"
              ? "Need an account? Register"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
