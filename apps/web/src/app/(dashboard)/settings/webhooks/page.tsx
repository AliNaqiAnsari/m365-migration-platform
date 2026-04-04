"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Webhook, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { listWebhooks, createWebhook, deleteWebhook, updateWebhook } from "@/lib/api/webhooks";
import { QUERY_KEYS } from "@/lib/utils/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

const EVENT_OPTIONS = [
  "migration.started",
  "migration.completed",
  "migration.failed",
  "migration.paused",
  "migration.progress",
  "tenant.connected",
  "tenant.disconnected",
];

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  const { data: webhooks, isLoading } = useQuery({ queryKey: QUERY_KEYS.WEBHOOKS, queryFn: listWebhooks });

  const createMut = useMutation({
    mutationFn: () => createWebhook({ url, events }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEBHOOKS });
      toast.success("Webhook created");
      setCreateOpen(false);
      setUrl("");
      setEvents([]);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEBHOOKS });
      toast.success("Webhook deleted");
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateWebhook(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WEBHOOKS }),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Webhooks" description="Send real-time notifications to external services">
        <Button variant="brand" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Webhook
        </Button>
      </PageHeader>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : !webhooks?.length ? (
        <EmptyState icon={Webhook} title="No webhooks" description="Add a webhook to receive real-time migration events." action={{ label: "Add Webhook", onClick: () => setCreateOpen(true) }} />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <Card key={wh.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-mono truncate">{wh.url}</p>
                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                    {wh.events.map((e) => (
                      <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                    ))}
                  </div>
                </div>
                <Switch
                  checked={wh.active}
                  onCheckedChange={(active) => toggleActive.mutate({ id: wh.id, active })}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(wh.id)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/webhook" />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid gap-2">
                {EVENT_OPTIONS.map((event) => (
                  <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={events.includes(event)}
                      onChange={(e) =>
                        setEvents(e.target.checked ? [...events, event] : events.filter((ev) => ev !== event))
                      }
                      className="rounded"
                    />
                    {event}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="brand" onClick={() => createMut.mutate()} disabled={!url || !events.length || createMut.isPending}>
              {createMut.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Webhook"
        description="This webhook will stop receiving events."
        confirmLabel="Delete"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
      />
    </div>
  );
}
