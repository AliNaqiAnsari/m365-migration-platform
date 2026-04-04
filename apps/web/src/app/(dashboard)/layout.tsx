"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { AuthProvider } from "@/lib/providers/auth-provider";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { cn } from "@/lib/utils/cn";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div
          className={cn(
            "flex flex-1 flex-col transition-all duration-300",
            collapsed ? "lg:ml-16" : "lg:ml-60"
          )}
        >
          <TopNav />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
