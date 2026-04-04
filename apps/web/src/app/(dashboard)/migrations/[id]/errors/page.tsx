"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, ChevronRight } from "lucide-react";
import { getMigrationErrors } from "@/lib/api/migrations";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { formatRelativeTime } from "@/lib/utils/format";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ErrorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [selectedError, setSelectedError] = useState<any>(null);

  const { data: errors, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MIGRATION_ERRORS(id),
    queryFn: () => getMigrationErrors(id),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Migration Errors" description="Review errors encountered during migration">
        <Button variant="ghost" onClick={() => router.push(ROUTES.MIGRATION_DETAIL(id))}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !errors?.length ? (
        <EmptyState
          icon={AlertTriangle}
          title="No errors"
          description="No errors have been recorded for this migration."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {errors.map((error: any) => (
                <button
                  key={error.id}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setSelectedError(error)}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{error.message || error.code}</span>
                      {error.category && <Badge variant="secondary" className="text-[10px]">{error.category}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {error.objectType} &middot; {error.objectId?.slice(0, 8)} &middot; {formatRelativeTime(error.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error detail drawer */}
      <Dialog open={!!selectedError} onOpenChange={(open) => !open && setSelectedError(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Error Detail</DialogTitle>
          </DialogHeader>
          {selectedError && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Error Code</p>
                  <p className="font-mono text-destructive">{selectedError.code}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Message</p>
                  <p>{selectedError.message}</p>
                </div>
                {selectedError.category && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Category</p>
                    <Badge variant="secondary">{selectedError.category}</Badge>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Object</p>
                  <p className="font-mono text-xs">{selectedError.objectType} / {selectedError.objectId}</p>
                </div>
                {selectedError.stackTrace && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Stack Trace</p>
                    <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                      {selectedError.stackTrace}
                    </pre>
                  </div>
                )}
                {selectedError.metadata && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Metadata</p>
                    <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(selectedError.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
