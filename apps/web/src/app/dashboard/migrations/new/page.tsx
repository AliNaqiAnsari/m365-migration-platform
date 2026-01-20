'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type Step = 'name' | 'tenants' | 'workloads' | 'scope' | 'review';

const workloads = [
  {
    id: 'exchange',
    name: 'Exchange',
    description: 'Mailboxes, calendars, contacts, tasks',
    icon: Icons.mail,
    price: 5,
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Personal files and folders',
    icon: Icons.drive,
    price: 3,
  },
  {
    id: 'sharepoint',
    name: 'SharePoint',
    description: 'Sites, document libraries, lists',
    icon: Icons.database,
    price: 2,
    perSite: true,
  },
  {
    id: 'teams',
    name: 'Teams',
    description: 'Teams, channels, messages, files',
    icon: Icons.teams,
    price: 4,
  },
];

const mockTenants = [
  { id: '1', name: 'Contoso Corporation', domain: 'contoso.onmicrosoft.com', type: 'source' },
  { id: '2', name: 'Fabrikam Inc', domain: 'fabrikam.onmicrosoft.com', type: 'destination' },
  { id: '3', name: 'Northwind Traders', domain: 'northwind.onmicrosoft.com', type: 'source' },
  { id: '4', name: 'Adventure Works', domain: 'adventureworks.onmicrosoft.com', type: 'destination' },
];

const steps: { id: Step; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'workloads', label: 'Workloads' },
  { id: 'scope', label: 'Scope' },
  { id: 'review', label: 'Review' },
];

export default function NewMigrationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('name');
  const [migrationName, setMigrationName] = useState('');
  const [sourceTenant, setSourceTenant] = useState<string | null>(null);
  const [destTenant, setDestTenant] = useState<string | null>(null);
  const [selectedWorkloads, setSelectedWorkloads] = useState<string[]>([]);
  const [userCount, setUserCount] = useState(50);
  const [siteCount, setSiteCount] = useState(10);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const toggleWorkload = (id: string) => {
    setSelectedWorkloads((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const calculateCost = () => {
    let total = 0;
    for (const w of selectedWorkloads) {
      const workload = workloads.find((wl) => wl.id === w);
      if (workload) {
        if (workload.perSite) {
          total += workload.price * siteCount;
        } else {
          total += workload.price * userCount;
        }
      }
    }

    // Volume discount
    let discount = 0;
    if (userCount >= 1000) discount = 0.2;
    else if (userCount >= 500) discount = 0.15;
    else if (userCount >= 100) discount = 0.1;

    return {
      subtotal: total,
      discount: total * discount,
      discountPercent: discount * 100,
      total: total - total * discount,
    };
  };

  const cost = calculateCost();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Migration</h1>
        <p className="text-muted-foreground">
          Set up a new tenant-to-tenant migration job
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2">
          {steps.map((s, index) => {
            const isActive = s.id === currentStep;
            const isPast = currentStepIndex > index;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isActive && 'bg-primary text-primary-foreground',
                    isPast && 'bg-green-500 text-white',
                    !isActive && !isPast && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isPast ? <Icons.check className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'text-foreground',
                    !isActive && 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-px w-8',
                      isPast ? 'bg-green-500' : 'bg-muted',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'name' && (
          <StepCard
            key="name"
            title="Migration Name"
            description="Give your migration job a descriptive name"
          >
            <Input
              placeholder="e.g., Full Migration - Contoso to Fabrikam"
              value={migrationName}
              onChange={(e) => setMigrationName(e.target.value)}
              className="text-lg"
            />
            <div className="flex justify-end">
              <Button onClick={goNext} disabled={!migrationName.trim()}>
                Continue
                <Icons.chevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {currentStep === 'tenants' && (
          <StepCard
            key="tenants"
            title="Select Tenants"
            description="Choose the source and destination tenants for this migration"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-medium">Source Tenant</h3>
                <div className="space-y-2">
                  {mockTenants
                    .filter((t) => t.type === 'source')
                    .map((tenant) => (
                      <Card
                        key={tenant.id}
                        className={cn(
                          'cursor-pointer transition-all hover:border-primary',
                          sourceTenant === tenant.id && 'border-primary ring-2 ring-primary/20',
                        )}
                        onClick={() => setSourceTenant(tenant.id)}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <Icons.microsoft className="h-8 w-8" />
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                          </div>
                          {sourceTenant === tenant.id && (
                            <Icons.check className="ml-auto h-5 w-5 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Destination Tenant</h3>
                <div className="space-y-2">
                  {mockTenants
                    .filter((t) => t.type === 'destination')
                    .map((tenant) => (
                      <Card
                        key={tenant.id}
                        className={cn(
                          'cursor-pointer transition-all hover:border-primary',
                          destTenant === tenant.id && 'border-primary ring-2 ring-primary/20',
                        )}
                        onClick={() => setDestTenant(tenant.id)}
                      >
                        <CardContent className="flex items-center gap-3 p-4">
                          <Icons.microsoft className="h-8 w-8" />
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-sm text-muted-foreground">{tenant.domain}</p>
                          </div>
                          {destTenant === tenant.id && (
                            <Icons.check className="ml-auto h-5 w-5 text-primary" />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </Button>
              <Button onClick={goNext} disabled={!sourceTenant || !destTenant}>
                Continue
                <Icons.chevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {currentStep === 'workloads' && (
          <StepCard
            key="workloads"
            title="Select Workloads"
            description="Choose which workloads to migrate"
          >
            <div className="grid gap-4 md:grid-cols-2">
              {workloads.map((workload) => {
                const isSelected = selectedWorkloads.includes(workload.id);
                return (
                  <Card
                    key={workload.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary',
                      isSelected && 'border-primary ring-2 ring-primary/20',
                    )}
                    onClick={() => toggleWorkload(workload.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-lg',
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          )}
                        >
                          <workload.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{workload.name}</h4>
                            <Badge variant="secondary">
                              ${workload.price}/{workload.perSite ? 'site' : 'user'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {workload.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </Button>
              <Button onClick={goNext} disabled={selectedWorkloads.length === 0}>
                Continue
                <Icons.chevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {currentStep === 'scope' && (
          <StepCard
            key="scope"
            title="Migration Scope"
            description="Define how many users and sites to migrate"
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Number of Users</label>
                <Input
                  type="number"
                  value={userCount}
                  onChange={(e) => setUserCount(parseInt(e.target.value) || 0)}
                  min={1}
                  className="mt-1.5"
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  Users to migrate from source tenant
                </p>
              </div>
              {selectedWorkloads.includes('sharepoint') && (
                <div>
                  <label className="text-sm font-medium">Number of SharePoint Sites</label>
                  <Input
                    type="number"
                    value={siteCount}
                    onChange={(e) => setSiteCount(parseInt(e.target.value) || 0)}
                    min={1}
                    className="mt-1.5"
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sites to migrate from source tenant
                  </p>
                </div>
              )}
            </div>

            {/* Cost Preview */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <h4 className="mb-3 font-medium">Estimated Cost</h4>
                <div className="space-y-2">
                  {selectedWorkloads.map((w) => {
                    const workload = workloads.find((wl) => wl.id === w)!;
                    const count = workload.perSite ? siteCount : userCount;
                    return (
                      <div key={w} className="flex justify-between text-sm">
                        <span>
                          {workload.name} ({count} {workload.perSite ? 'sites' : 'users'} x ${workload.price})
                        </span>
                        <span>${(count * workload.price).toFixed(2)}</span>
                      </div>
                    );
                  })}
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${cost.subtotal.toFixed(2)}</span>
                    </div>
                    {cost.discountPercent > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Volume Discount ({cost.discountPercent}%)</span>
                        <span>-${cost.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${cost.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </Button>
              <Button onClick={goNext}>
                Continue
                <Icons.chevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}

        {currentStep === 'review' && (
          <StepCard
            key="review"
            title="Review & Create"
            description="Review your migration configuration before starting"
          >
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Migration Name</p>
                  <p className="font-medium">{migrationName}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Users to Migrate</p>
                  <p className="font-medium">{userCount}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Source Tenant</p>
                  <p className="font-medium">
                    {mockTenants.find((t) => t.id === sourceTenant)?.name}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Destination Tenant</p>
                  <p className="font-medium">
                    {mockTenants.find((t) => t.id === destTenant)?.name}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm text-muted-foreground">Workloads</p>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkloads.map((w) => (
                    <Badge key={w} variant="secondary" className="capitalize">
                      {w}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Total Cost</p>
                    <p className="text-sm text-muted-foreground">One-time payment</p>
                  </div>
                  <p className="text-2xl font-bold">${cost.total.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back
              </Button>
              <Button onClick={() => router.push('/dashboard/migrations')}>
                Create Migration
                <Icons.check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </StepCard>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">{children}</CardContent>
      </Card>
    </motion.div>
  );
}
