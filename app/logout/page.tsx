"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LogoutPage() {
  const [isLoggedOut, setIsLoggedOut] = useState(false);

  useEffect(() => {
    async function performLogout() {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsLoggedOut(true);
    }
    performLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm bg-surface border border-border rounded-md p-6 sm:p-8 text-center">
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          {isLoggedOut ? "Signed out" : "Signing out..."}
        </h1>
        <p className="text-xs text-muted mt-2">
          {isLoggedOut
            ? "Your session has ended. You have been successfully signed out of AviaryOS."
            : "Terminating session, please wait..."}
        </p>

        {isLoggedOut && (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-block w-full py-2 px-4 text-xs font-medium bg-accent text-accent-foreground hover:bg-accent-hover rounded-md transition-colors"
            >
              Return to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
