"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { getCurrentOrganization, updateOrganization } from "@/lib/api/organizations";
import { QUERY_KEYS } from "@/lib/utils/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: org, isLoading } = useQuery({ queryKey: QUERY_KEYS.ORGANIZATION, queryFn: getCurrentOrganization });

  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: "" } });

  useEffect(() => {
    if (org) reset({ name: org.name });
  }, [org, reset]);

  const mutation = useMutation({
    mutationFn: (data: { name: string }) => updateOrganization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORGANIZATION });
      toast.success("Settings updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Settings" description="Organization settings" />

      {isLoading ? (
        <Skeleton className="h-48 rounded-xl" />
      ) : (
        <Card className="max-w-2xl">
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input {...register("name")} />
              </div>
              {org && (
                <div className="space-y-2">
                  <Label>Organization ID</Label>
                  <Input value={org.id} disabled className="font-mono text-xs" />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="brand" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
