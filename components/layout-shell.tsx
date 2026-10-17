import { SidebarNav, MobileHeader, MobileBottomNav } from "@/components/navigation";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="md:pl-60 flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-20 md:pb-8">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
