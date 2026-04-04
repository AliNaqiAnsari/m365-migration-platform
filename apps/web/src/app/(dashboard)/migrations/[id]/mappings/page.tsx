"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, AlertTriangle, SkipForward, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { listMappings, getMappingSummary, updateMapping } from "@/lib/api/mappings";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function MappingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editMapping, setEditMapping] = useState<any>(null);
  const [destId, setDestId] = useState("");
  const [destIdentifier, setDestIdentifier] = useState("");

  const { data: mappings, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MAPPINGS(id),
    queryFn: () => listMappings(id),
  });

  const { data: summary } = useQuery({
    queryKey: QUERY_KEYS.MAPPING_SUMMARY(id),
    queryFn: () => getMappingSummary(id),
  });

  const updateMut = useMutation({
    mutationFn: ({ mappingId, data }: { mappingId: string; data: { destinationId: string; destIdentifier?: string } }) =>
      updateMapping(mappingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAPPINGS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAPPING_SUMMARY(id) });
      toast.success("Mapping updated");
      setEditMapping(null);
    },
    onError: (err: any) => toast.error(err.message || "Update failed"),
  });

  const summaryCards = summary
    ? [
        { label: "Total", value: summary.total, color: "text-foreground" },
        { label: "Matched", value: summary.matched, color: "text-success" },
        { label: "Pending", value: summary.pending, color: "text-warning" },
        { label: "Skipped", value: summary.skipped, color: "text-muted-foreground" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Identity Mappings" description="Map source identities to destination accounts">
        <Button variant="ghost" onClick={() => router.push(ROUTES.MIGRATION_DETAIL(id))}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Mapping table */}
      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destination</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings?.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">{m.objectType}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{m.sourceIdentifier || m.sourceId.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        {m.destIdentifier || m.destinationId ? (
                          <span className="text-success">{m.destIdentifier || m.destinationId?.slice(0, 8)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not mapped</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditMapping(m);
                            setDestId(m.destinationId || "");
                            setDestIdentifier(m.destIdentifier || "");
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Map
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit mapping dialog */}
      <Dialog open={!!editMapping} onOpenChange={(open) => !open && setEditMapping(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map Identity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">Source</p>
              <p className="font-medium">{editMapping?.sourceIdentifier || editMapping?.sourceId}</p>
            </div>
            <div className="space-y-2">
              <Label>Destination ID</Label>
              <Input value={destId} onChange={(e) => setDestId(e.target.value)} placeholder="Destination object ID" />
            </div>
            <div className="space-y-2">
              <Label>Destination Identifier (optional)</Label>
              <Input value={destIdentifier} onChange={(e) => setDestIdentifier(e.target.value)} placeholder="e.g. user@destination.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMapping(null)}>Cancel</Button>
            <Button
              variant="brand"
              disabled={!destId || updateMut.isPending}
              onClick={() =>
                editMapping &&
                updateMut.mutate({
                  mappingId: editMapping.id,
                  data: { destinationId: destId, destIdentifier: destIdentifier || undefined },
                })
              }
            >
              {updateMut.isPending ? "Saving..." : "Save Mapping"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
