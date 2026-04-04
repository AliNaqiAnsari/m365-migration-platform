"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SEGMENT_LABELS: Record<string, string> = {
  tenants: "Tenants",
  connect: "Connect",
  migrations: "Migrations",
  new: "New",
  mappings: "Mappings",
  errors: "Errors",
  "dead-letter": "Dead Letter",
  report: "Report",
  team: "Team",
  billing: "Billing",
  activity: "Activity",
  settings: "Settings",
  "api-keys": "API Keys",
  webhooks: "Webhooks",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    const isUuid = /^[0-9a-f]{8}-/.test(segment);
    const label = isUuid
      ? segment.slice(0, 8) + "..."
      : SEGMENT_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return { href, label, isLast };
  });

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link href="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className={cn("text-foreground font-medium")}>{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
