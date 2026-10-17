"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Bird, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Birds", href: "/birds", icon: Bird },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-surface border-r border-border">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center h-14 px-5 border-b border-border">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            AviaryOS
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? "bg-accent-subtle text-accent font-medium"
                    : "text-muted hover:text-foreground hover:bg-muted-surface"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-muted-surface rounded-md transition-colors text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-surface border-b border-border">
      <span className="text-sm font-semibold tracking-tight text-foreground">
        AviaryOS
      </span>
      <Link
        href="/logout"
        className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground px-2.5 py-1.5 rounded-sm border border-border bg-surface"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Log out</span>
      </Link>
    </header>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border">
      <div className="grid grid-cols-3 h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-1 text-xs transition-colors ${
                isActive
                  ? "text-accent font-medium"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-[11px] leading-tight">{item.name}</span>
            </Link>
          );
        })}
        <Link
          href="/logout"
          className="flex flex-col items-center justify-center gap-1 py-1 text-xs text-muted hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="text-[11px] leading-tight">Log out</span>
        </Link>
      </div>
    </nav>
  );
}
