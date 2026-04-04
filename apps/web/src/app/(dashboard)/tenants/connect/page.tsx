"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { connectTenantSchema, type ConnectTenantFormData } from "@/lib/validations/tenant";
import { connectTenant } from "@/lib/api/tenants";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ConnectTenantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ConnectTenantFormData>({
    resolver: zodResolver(connectTenantSchema),
    defaultValues: {
      provider: "MICROSOFT_365",
      connectionType: "SOURCE",
    },
  });

  const mutation = useMutation({
    mutationFn: connectTenant,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANTS });
      toast.success("Tenant connected successfully");
      router.push(ROUTES.TENANT_DETAIL(data.id));
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to connect tenant");
    },
  });

  const provider = watch("provider");

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="Connect Tenant" description="Add a Microsoft 365 or Google Workspace tenant">
        <Button variant="ghost" onClick={() => router.push(ROUTES.TENANTS)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </PageHeader>

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <CardContent className="pt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => setValue("provider", v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MICROSOFT_365">Microsoft 365</SelectItem>
                    <SelectItem value="GOOGLE_WORKSPACE">Google Workspace</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Connection Type</Label>
                <Select
                  value={watch("connectionType")}
                  onValueChange={(v) => setValue("connectionType", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOURCE">Source (migrate from)</SelectItem>
                    <SelectItem value="DESTINATION">Destination (migrate to)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Tenant Name</Label>
              <Input id="name" placeholder="e.g. Contoso Production" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">
                {provider === "MICROSOFT_365" ? "Tenant ID (Directory ID)" : "Google Workspace Domain"}
              </Label>
              <Input
                id="tenantId"
                placeholder={provider === "MICROSOFT_365" ? "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" : "company.com"}
                {...register("tenantId")}
              />
              {errors.tenantId && <p className="text-xs text-destructive">{errors.tenantId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">
                {provider === "MICROSOFT_365" ? "Application (Client) ID" : "Service Account Client ID"}
              </Label>
              <Input id="clientId" placeholder="Application ID from Azure AD / GCP" {...register("clientId")} />
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input id="clientSecret" type="password" placeholder="Client secret value" {...register("clientSecret")} />
              {errors.clientSecret && <p className="text-xs text-destructive">{errors.clientSecret.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="button" variant="outline" onClick={() => router.push(ROUTES.TENANTS)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Connect Tenant
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
