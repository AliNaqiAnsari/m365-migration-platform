"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Inbox, ChevronRight } from "lucide-react";
import { getDeadLetterItems } from "@/lib/api/migrations";
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

export default function DeadLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [selected, setSelected] = useState<any>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MIGRATION_DEAD_LETTER(id),
    queryFn: () => getDeadLetterItems(id),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Dead Letter Queue" description="Items that failed after maximum retries">
        <Button variant="ghost" onClick={() => router.push(ROUTES.MIGRATION_DETAIL(id))}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !items?.length ? (
        <EmptyState
          icon={Inbox}
          title="Queue is empty"
          description="No items in the dead letter queue. This is a good thing!"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {items.map((item: any) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setSelected(item)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{item.queue || "Unknown queue"}</span>
                      <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      Attempt {item.retryCount} &middot; {item.errorMessage?.slice(0, 60)} &middot; {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dead Letter Item</DialogTitle>
          </DialogHeader>
          {selected && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Queue</p>
                  <p className="font-medium">{selected.queue}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Error</p>
                  <p className="text-destructive">{selected.errorMessage}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Retries</p>
                  <p>{selected.retryCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Payload</p>
                  <pre className="rounded-lg bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(selected.payload || selected, null, 2)}
                  </pre>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
