"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Play, Pause, RotateCcw, XCircle,
  FileWarning, Map, FileText, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMigration, startMigration, pauseMigration,
  resumeMigration, cancelMigration,
} from "@/lib/api/migrations";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { WORKLOAD_META } from "@/lib/utils/workloads";
import { formatBytes, formatRelativeTime, formatPercent } from "@/lib/utils/format";
import { useMigrationProgress } from "@/lib/hooks/use-migration-progress";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PhaseTimeline } from "@/components/migrations/migration-detail/phase-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useState } from "react";
import type { WorkloadType } from "@m365-migration/types";

export default function MigrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MIGRATION(id),
    queryFn: () => getMigration(id),
    refetchInterval: 10_000,
  });

  const progress = useMigrationProgress(
    id,
    !!job && ["DISCOVERY", "MAPPING", "PRE_MIGRATION", "MIGRATION", "VALIDATION", "CUTOVER"].includes(job.currentPhase)
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MIGRATION(id) });

  const startMut = useMutation({ mutationFn: () => startMigration(id), onSuccess: () => { toast.success("Migration started"); invalidate(); } });
  const pauseMut = useMutation({ mutationFn: () => pauseMigration(id), onSuccess: () => { toast.success("Migration paused"); invalidate(); } });
  const resumeMut = useMutation({ mutationFn: () => resumeMigration(id), onSuccess: () => { toast.success("Migration resumed"); invalidate(); } });
  const cancelMut = useMutation({
    mutationFn: () => cancelMigration(id),
    onSuccess: () => { toast.success("Migration cancelled"); invalidate(); setCancelOpen(false); },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!job) return null;

  const livePercent = progress?.progressPercent ?? job.progressPercent;
  const livePhase = progress?.phase ?? job.currentPhase;
  const liveStatus = progress?.status ?? job.status;
  const isActive = ["DISCOVERY", "MAPPING", "PRE_MIGRATION", "MIGRATION", "VALIDATION", "CUTOVER"].includes(liveStatus);
  const isPaused = liveStatus === "PAUSED";
  const isCreated = liveStatus === "CREATED";
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(liveStatus);

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title={job.name}>
        <Button variant="ghost" onClick={() => router.push(ROUTES.MIGRATIONS)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {isCreated && (
          <Button variant="brand" onClick={() => startMut.mutate()} disabled={startMut.isPending}>
            <Play className="h-4 w-4" /> Start
          </Button>
        )}
        {isActive && (
          <Button variant="outline" onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending}>
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        {isPaused && (
          <Button variant="brand" onClick={() => resumeMut.mutate()} disabled={resumeMut.isPending}>
            <RotateCcw className="h-4 w-4" /> Resume
          </Button>
        )}
        {!isTerminal && (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            <XCircle className="h-4 w-4" /> Cancel
          </Button>
        )}
      </PageHeader>

      {/* Phase timeline */}
      <Card>
        <CardContent className="py-5">
          <PhaseTimeline currentPhase={livePhase} status={liveStatus} />
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <StatusBadge status={liveStatus} />
              {progress?.message && (
                <span className="text-sm text-muted-foreground">{progress.message}</span>
              )}
            </div>
            <span className="text-2xl font-bold tabular-nums">{formatPercent(livePercent, 0)}</span>
          </div>
          <Progress value={livePercent} className="h-3" />
          <div className="flex justify-between mt-3 text-xs text-muted-foreground">
            <span>{(progress?.processedItems ?? job.processedItems).toLocaleString()} / {job.totalItems.toLocaleString()} items</span>
            <span>{formatBytes(job.processedBytes)} / {formatBytes(job.totalBytes)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Info + Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Workloads</span>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {job.workloads.map((w) => (
                  <Badge key={w} variant="secondary" className="text-[10px]">
                    {WORKLOAD_META[w as WorkloadType]?.label || w}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Failed Items</span>
              <span className={job.failedItems > 0 ? "text-destructive font-medium" : ""}>{job.failedItems.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b">
              <span className="text-muted-foreground">Skipped Items</span>
              <span>{job.skippedItems.toLocaleString()}</span>
            </div>
            {job.startedAt && (
              <div className="flex justify-between py-1.5 border-b">
                <span className="text-muted-foreground">Started</span>
                <span>{formatRelativeTime(job.startedAt)}</span>
              </div>
            )}
            {job.estimatedEndAt && (
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">ETA</span>
                <span>{formatRelativeTime(job.estimatedEndAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: ROUTES.MIGRATION_MAPPINGS(id), icon: Map, label: "Identity Mappings" },
              { href: ROUTES.MIGRATION_ERRORS(id), icon: FileWarning, label: "Errors" },
              { href: ROUTES.MIGRATION_DEAD_LETTER(id), icon: Trash2, label: "Dead Letter Queue" },
              { href: ROUTES.MIGRATION_REPORT(id), icon: FileText, label: "Report" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
              >
                <link.icon className="h-4 w-4 text-muted-foreground" />
                {link.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel Migration"
        description="This will stop the migration and mark it as cancelled. Items already migrated will remain in the destination."
        confirmLabel="Cancel Migration"
        variant="destructive"
        loading={cancelMut.isPending}
        onConfirm={() => cancelMut.mutate()}
      />
    </div>
  );
}
