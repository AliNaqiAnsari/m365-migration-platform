"use client";

import { ArrowRightLeft, CheckCircle2, Server, HardDrive, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { formatBytes } from "@/lib/utils/format";
import type { DashboardStats } from "@/lib/api/dashboard";

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Connected Tenants",
      value: stats.totalTenants,
      icon: Server,
      color: "text-brand-600 dark:text-brand-400",
    },
    {
      label: "Active Migrations",
      value: stats.activeMigrations,
      icon: ArrowRightLeft,
      color: "text-info",
      attention: stats.activeMigrations > 0,
    },
    {
      label: "Completed",
      value: stats.completedMigrations,
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      label: "Total Migrations",
      value: stats.totalMigrations,
      icon: ArrowRightLeft,
      color: "text-brand-600 dark:text-brand-400",
    },
    {
      label: "Data Migrated",
      value: -1, // sentinel for formatted bytes
      formatted: formatBytes(stats.totalDataMigrated),
      icon: HardDrive,
      color: "text-brand-600 dark:text-brand-400",
    },
    {
      label: "Items Migrated",
      value: stats.totalItemsMigrated,
      icon: HardDrive,
      color: "text-brand-600 dark:text-brand-400",
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <Card
          key={card.label}
          className="relative border border-border/60 shadow-sm"
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <card.icon className={`h-5 w-5 ${card.color} opacity-70`} />
              {card.attention && (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
              {card.formatted ? (
                card.formatted
              ) : (
                <AnimatedCounter value={card.value} />
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
