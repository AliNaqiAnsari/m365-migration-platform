'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type Step = 'select-type' | 'consent' | 'connecting' | 'success';

const permissions = [
  { name: 'User.Read.All', description: 'Read all user profiles' },
  { name: 'Mail.ReadWrite', description: 'Read and write mail in all mailboxes' },
  { name: 'Calendars.ReadWrite', description: 'Read and write calendars' },
  { name: 'Contacts.ReadWrite', description: 'Read and write contacts' },
  { name: 'Files.ReadWrite.All', description: 'Read and write all files' },
  { name: 'Sites.ReadWrite.All', description: 'Read and write all SharePoint sites' },
  { name: 'Team.ReadBasic.All', description: 'Read Teams information' },
  { name: 'Channel.ReadBasic.All', description: 'Read channel information' },
  { name: 'Group.ReadWrite.All', description: 'Read and write all groups' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
};

export default function ConnectTenantPage() {
  const [step, setStep] = useState<Step>('select-type');
  const [tenantType, setTenantType] = useState<'source' | 'destination' | null>(null);
  const router = useRouter();

  const handleTypeSelect = (type: 'source' | 'destination') => {
    setTenantType(type);
    setStep('consent');
  };

  const handleConnect = () => {
    setStep('connecting');
    // Simulate OAuth flow
    setTimeout(() => {
      setStep('success');
    }, 3000);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-2xl space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Connect Microsoft 365 Tenant</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your tenant to start migrating data
        </p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <div className="flex items-center gap-4">
          {[
            { id: 'select-type', label: 'Select Type' },
            { id: 'consent', label: 'Grant Access' },
            { id: 'connecting', label: 'Connecting' },
            { id: 'success', label: 'Complete' },
          ].map((s, index) => {
            const isActive = s.id === step;
            const isPast =
              ['select-type', 'consent', 'connecting', 'success'].indexOf(step) >
              ['select-type', 'consent', 'connecting', 'success'].indexOf(s.id);
            return (
              <div key={s.id} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
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
                </div>
                {index < 3 && (
                  <div
                    className={cn(
                      'h-px w-12',
                      isPast ? 'bg-green-500' : 'bg-muted',
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {step === 'select-type' && (
          <motion.div
            key="select-type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                tenantType === 'source' && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handleTypeSelect('source')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                  <Icons.upload className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Source Tenant</CardTitle>
                <CardDescription>
                  The tenant you want to migrate data FROM
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Read access to all workloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    User and group enumeration
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Delta sync capabilities
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                tenantType === 'destination' && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handleTypeSelect('destination')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <Icons.download className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Destination Tenant</CardTitle>
                <CardDescription>
                  The tenant you want to migrate data TO
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Write access to all workloads
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    User and group creation
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.check className="h-4 w-4 text-green-500" />
                    Permission mapping
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'consent' && (
          <motion.div
            key="consent"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icons.microsoft className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Grant Application Access</CardTitle>
                    <CardDescription>
                      The following permissions will be requested from your{' '}
                      {tenantType === 'source' ? 'source' : 'destination'} tenant
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-4">
                  {permissions.map((perm) => (
                    <div
                      key={perm.name}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium">{perm.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {perm.description}
                        </p>
                      </div>
                      <Badge variant="secondary">Application</Badge>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950">
                  <div className="flex items-start gap-3">
                    <Icons.alert className="mt-0.5 h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-200">
                        Admin Consent Required
                      </p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        A Global Administrator of the tenant must approve these
                        permissions. You will be redirected to Microsoft's consent page.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep('select-type')}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleConnect}>
                    <Icons.microsoft className="mr-2 h-4 w-4" />
                    Connect with Microsoft
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'connecting' && (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <Card>
              <CardContent className="py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center"
                >
                  <Icons.spinner className="h-12 w-12 text-primary" />
                </motion.div>
                <h3 className="text-xl font-semibold">Connecting to Microsoft 365</h3>
                <p className="mt-2 text-muted-foreground">
                  Please complete the authentication in the popup window...
                </p>
                <div className="mt-6">
                  <motion.div
                    className="mx-auto h-2 w-64 overflow-hidden rounded-full bg-muted"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 3 }}
                    />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center"
          >
            <Card>
              <CardContent className="py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
                >
                  <Icons.check className="h-10 w-10 text-green-600" />
                </motion.div>
                <h3 className="text-xl font-semibold">Tenant Connected Successfully!</h3>
                <p className="mt-2 text-muted-foreground">
                  Your {tenantType} tenant has been connected and is now syncing.
                </p>

                <div className="mx-auto mt-6 max-w-sm rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <Icons.microsoft className="h-8 w-8" />
                    <div className="text-left">
                      <p className="font-medium">Contoso Corporation</p>
                      <p className="text-sm text-muted-foreground">
                        contoso.onmicrosoft.com
                      </p>
                    </div>
                    <Badge className="ml-auto capitalize">{tenantType}</Badge>
                  </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                  <Button variant="outline" onClick={() => router.push('/dashboard/tenants')}>
                    View All Tenants
                  </Button>
                  <Button onClick={() => router.push('/dashboard/migrations/new')}>
                    Start Migration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
