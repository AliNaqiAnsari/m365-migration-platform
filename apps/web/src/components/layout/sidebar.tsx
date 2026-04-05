"use client";

import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  ArrowRightLeft,
  Users,
  CreditCard,
  Activity,
  Settings,
  Key,
  Webhook,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { ROUTES } from "@/lib/utils/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    ],
  },
  {
    label: "Migration",
    items: [
      { label: "Tenants", href: ROUTES.TENANTS, icon: Server },
      { label: "Migrations", href: ROUTES.MIGRATIONS, icon: ArrowRightLeft },
    ],
  },
  {
    label: "Organization",
    items: [
      { label: "Team", href: ROUTES.TEAM, icon: Users },
      { label: "Billing", href: ROUTES.BILLING, icon: CreditCard },
      { label: "Activity", href: ROUTES.ACTIVITY, icon: Activity },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "General", href: ROUTES.SETTINGS, icon: Settings },
      { label: "API Keys", href: ROUTES.SETTINGS_API_KEYS, icon: Key },
      { label: "Webhooks", href: ROUTES.SETTINGS_WEBHOOKS, icon: Webhook },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <img
            src="/logo.svg"
            alt="3LI GLOBAL"
            width={32}
            height={22}
            className="shrink-0"
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground whitespace-nowrap tracking-tight">
                MigrationHub
              </span>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                by 3LI GLOBAL
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-6 px-3">
          {navigation.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

                  const linkContent = (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand" />
                      )}
                      <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-brand" : "")} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return linkContent;
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-full"
          onClick={toggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
