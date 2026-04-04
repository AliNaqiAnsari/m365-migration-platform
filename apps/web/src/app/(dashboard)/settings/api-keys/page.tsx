"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Key, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { createApiKey } from "@/lib/api/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function ApiKeysPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createApiKey(keyName),
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      setKeyName("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const copyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="API Keys" description="Manage API keys for programmatic access">
        <Button variant="brand" onClick={() => { setCreateOpen(true); setGeneratedKey(null); }}>
          <Plus className="h-4 w-4" /> Create Key
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="py-10 flex flex-col items-center text-center">
          <Key className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            API keys allow external applications to authenticate with the migration platform.
          </p>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{generatedKey ? "API Key Created" : "Create API Key"}</DialogTitle></DialogHeader>
          {generatedKey ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Copy this key now. You won&apos;t be able to see it again.
              </p>
              <div className="flex gap-2">
                <Input value={generatedKey} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={copyKey}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. CI/CD Pipeline" />
              </div>
            </div>
          )}
          <DialogFooter>
            {generatedKey ? (
              <Button variant="brand" onClick={() => setCreateOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button variant="brand" onClick={() => mutation.mutate()} disabled={!keyName || mutation.isPending}>
                  {mutation.isPending ? "Creating..." : "Create"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
