"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { WORKLOAD_DEPENDENCIES } from "@m365-migration/types";
import type { WorkloadType } from "@m365-migration/types";
import { createMigrationSchema, type CreateMigrationFormData } from "@/lib/validations/migration";
import { createMigration } from "@/lib/api/migrations";
import { listTenants } from "@/lib/api/tenants";
import { QUERY_KEYS, ROUTES } from "@/lib/utils/constants";
import { WORKLOAD_META, WORKLOAD_LIST } from "@/lib/utils/workloads";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Basics", "Tenants", "Workloads", "Options", "Review"];

export default function NewMigrationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const { data: tenants } = useQuery({
    queryKey: QUERY_KEYS.TENANTS,
    queryFn: () => listTenants(),
  });

  const form = useForm<CreateMigrationFormData>({
    resolver: zodResolver(createMigrationSchema),
    defaultValues: {
      name: "",
      description: "",
      sourceTenantId: "",
      destTenantId: "",
      workloads: [],
      options: {
        concurrentTasks: 5,
        batchSize: 100,
        skipExisting: true,
        includePermissions: true,
        includeVersionHistory: false,
        deltaSync: false,
      },
    },
  });

  const mutation = useMutation({
    mutationFn: createMigration,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MIGRATIONS });
      toast.success("Migration created");
      router.push(ROUTES.MIGRATION_DETAIL(data.id));
    },
    onError: (err: any) => toast.error(err.message || "Failed to create migration"),
  });

  const selectedWorkloads = form.watch("workloads");

  const toggleWorkload = (workload: WorkloadType) => {
    const current = new Set(form.getValues("workloads"));
    if (current.has(workload)) {
      current.delete(workload);
    } else {
      current.add(workload);
      // Auto-add dependencies
      const addDeps = (w: WorkloadType) => {
        for (const dep of WORKLOAD_DEPENDENCIES[w] || []) {
          if (!current.has(dep)) {
            current.add(dep);
            addDeps(dep);
          }
        }
      };
      addDeps(workload);
    }
    form.setValue("workloads", Array.from(current), { shouldValidate: true });
  };

  const sourceTenants = tenants?.filter((t) => t.connectionType === "SOURCE") ?? [];
  const destTenants = tenants?.filter((t) => t.connectionType === "DESTINATION") ?? [];
  const values = form.watch();

  const canNext = () => {
    switch (step) {
      case 0: return !!values.name;
      case 1: return !!values.sourceTenantId && !!values.destTenantId;
      case 2: return values.workloads.length > 0;
      default: return true;
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs />
      <PageHeader title="New Migration" description="Create a new migration job">
        <Button variant="ghost" onClick={() => router.push(ROUTES.MIGRATIONS)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </PageHeader>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < step
                  ? "bg-brand text-white"
                  : i === step
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </button>
            <span className={cn("text-sm hidden sm:inline", i === step ? "font-medium" : "text-muted-foreground")}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6 space-y-5">
          {/* Step 0: Basics */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Migration Name</Label>
                <Input placeholder="e.g. Q1 2026 Email Migration" {...form.register("name")} />
                {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input placeholder="Brief description of this migration" {...form.register("description")} />
              </div>
            </>
          )}

          {/* Step 1: Tenants */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Source Tenant</Label>
                <Controller
                  control={form.control}
                  name="sourceTenantId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select source tenant" /></SelectTrigger>
                      <SelectContent>
                        {sourceTenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.domain})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Destination Tenant</Label>
                <Controller
                  control={form.control}
                  name="destTenantId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Select destination tenant" /></SelectTrigger>
                      <SelectContent>
                        {destTenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.domain})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </>
          )}

          {/* Step 2: Workloads */}
          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {WORKLOAD_LIST.map((w) => {
                const meta = WORKLOAD_META[w];
                const selected = selectedWorkloads.includes(w);
                const isDep = selectedWorkloads.some(
                  (sw) => sw !== w && (WORKLOAD_DEPENDENCIES[sw as WorkloadType] || []).includes(w)
                );
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => !isDep && toggleWorkload(w)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      selected ? "border-brand bg-brand-50/50 dark:bg-brand-950/20" : "hover:border-brand/30",
                      isDep && "opacity-70"
                    )}
                  >
                    <Checkbox checked={selected} className="mt-0.5" tabIndex={-1} />
                    <div>
                      <p className="text-sm font-medium">{meta.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      {isDep && <p className="text-[10px] text-brand mt-1">Required dependency</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 3: Options */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Concurrent Tasks</Label>
                  <Input type="number" {...form.register("options.concurrentTasks", { valueAsNumber: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Input type="number" {...form.register("options.batchSize", { valueAsNumber: true })} />
                </div>
              </div>
              {[
                { key: "options.skipExisting" as const, label: "Skip Existing Items", desc: "Skip items that already exist in the destination" },
                { key: "options.includePermissions" as const, label: "Include Permissions", desc: "Migrate sharing settings and permissions" },
                { key: "options.includeVersionHistory" as const, label: "Version History", desc: "Migrate file version history (slower)" },
                { key: "options.deltaSync" as const, label: "Delta Sync", desc: "Only sync changes since last migration" },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  <Controller
                    control={form.control}
                    name={opt.key}
                    render={({ field }) => (
                      <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{values.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{sourceTenants.find((t) => t.id === values.sourceTenantId)?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Destination</span>
                <span className="font-medium">{destTenants.find((t) => t.id === values.destTenantId)?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Workloads</span>
                <span className="font-medium">
                  {values.workloads.map((w) => WORKLOAD_META[w as WorkloadType]?.label || w).join(", ")}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Skip Existing</span>
                <span className="font-medium">{values.options?.skipExisting ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Include Permissions</span>
                <span className="font-medium">{values.options?.includePermissions ? "Yes" : "No"}</span>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.push(ROUTES.MIGRATIONS)}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="brand" onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="brand"
              onClick={form.handleSubmit((data) => mutation.mutate(data))}
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Migration
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
