"use client";

import { ArrowRightLeft, CheckCircle2, Server, HardDrive } from "lucide-react";
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
      label: "Total Migrations",
      value: stats.totalMigrations,
      icon: ArrowRightLeft,
      color: "text-brand",
      bg: "bg-brand-50 dark:bg-brand-950/30",
    },
    {
      label: "Active",
      value: stats.activeMigrations,
      icon: ArrowRightLeft,
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      label: "Completed",
      value: stats.completedMigrations,
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Connected Tenants",
      value: stats.totalTenants,
      icon: Server,
      color: "text-brand",
      bg: "bg-brand-50 dark:bg-brand-950/30",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">
                  <AnimatedCounter value={card.value} />
                </p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card className="relative overflow-hidden sm:col-span-2 lg:col-span-4">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Data Migrated</p>
              <p className="mt-1 text-2xl font-bold">
                {formatBytes(stats.totalDataMigrated)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/30">
              <HardDrive className="h-5 w-5 text-brand" />
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Items Migrated</p>
              <p className="mt-1 text-2xl font-bold">
                <AnimatedCounter value={stats.totalItemsMigrated} />
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
