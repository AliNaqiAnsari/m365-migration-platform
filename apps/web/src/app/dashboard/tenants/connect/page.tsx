'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

type Platform = 'microsoft' | 'google';
type TenantType = 'source' | 'destination';
type Step = 'select-platform' | 'select-type' | 'consent' | 'connecting' | 'success';

const microsoftPermissions = [
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

const googlePermissions = [
  { name: 'gmail.readonly', description: 'Read all Gmail messages and settings' },
  { name: 'gmail.modify', description: 'Read, compose, send, and modify emails' },
  { name: 'drive.readonly', description: 'Read all files in Google Drive' },
  { name: 'drive.file', description: 'Create and modify files in Google Drive' },
  { name: 'calendar.readonly', description: 'Read calendar events' },
  { name: 'calendar.events', description: 'Create and modify calendar events' },
  { name: 'contacts.readonly', description: 'Read contacts' },
  { name: 'contacts', description: 'Read and modify contacts' },
  { name: 'admin.directory.user.readonly', description: 'Read user directory' },
  { name: 'admin.directory.group.readonly', description: 'Read group directory' },
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
  const [step, setStep] = useState<Step>('select-platform');
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [tenantType, setTenantType] = useState<TenantType | null>(null);
  const router = useRouter();

  const handlePlatformSelect = (selectedPlatform: Platform) => {
    setPlatform(selectedPlatform);
    setStep('select-type');
  };

  const handleTypeSelect = (type: TenantType) => {
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

  const handleBack = () => {
    if (step === 'select-type') {
      setStep('select-platform');
      setPlatform(null);
    } else if (step === 'consent') {
      setStep('select-type');
      setTenantType(null);
    }
  };

  const getSteps = () => {
    return [
      { id: 'select-platform', label: 'Platform' },
      { id: 'select-type', label: 'Type' },
      { id: 'consent', label: 'Grant Access' },
      { id: 'connecting', label: 'Connecting' },
      { id: 'success', label: 'Complete' },
    ];
  };

  const permissions = platform === 'google' ? googlePermissions : microsoftPermissions;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-3xl space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Connect Tenant</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your cloud tenant to start migrating data
        </p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div variants={itemVariants} className="flex justify-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {getSteps().map((s, index) => {
            const stepOrder = getSteps().map(st => st.id);
            const isActive = s.id === step;
            const isPast = stepOrder.indexOf(step) > stepOrder.indexOf(s.id);
            return (
              <div key={s.id} className="flex items-center gap-2 sm:gap-4">
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
                      'hidden text-sm font-medium sm:block',
                      isActive && 'text-foreground',
                      !isActive && 'text-muted-foreground',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {index < getSteps().length - 1 && (
                  <div
                    className={cn(
                      'h-px w-6 sm:w-12',
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
        {step === 'select-platform' && (
          <motion.div
            key="select-platform"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-4 md:grid-cols-2"
          >
            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                platform === 'microsoft' && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handlePlatformSelect('microsoft')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                  <Icons.microsoft className="h-10 w-10" />
                </div>
                <CardTitle>Microsoft 365</CardTitle>
                <CardDescription>
                  Exchange, SharePoint, OneDrive, Teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Icons.mail className="h-4 w-4 text-blue-500" />
                    Exchange Online mailboxes
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.database className="h-4 w-4 text-blue-500" />
                    SharePoint sites & lists
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.drive className="h-4 w-4 text-blue-500" />
                    OneDrive for Business
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.teams className="h-4 w-4 text-blue-500" />
                    Microsoft Teams
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={cn(
                'cursor-pointer transition-all hover:border-primary hover:shadow-md',
                platform === 'google' && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handlePlatformSelect('google')}
            >
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-yellow-500 to-green-500">
                  <Icons.googleWorkspace className="h-10 w-10" />
                </div>
                <CardTitle>Google Workspace</CardTitle>
                <CardDescription>
                  Gmail, Drive, Calendar, Contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Icons.gmail className="h-4 w-4" />
                    Gmail mailboxes
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.googleDrive className="h-4 w-4" />
                    Google Drive files
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.googleCalendar className="h-4 w-4" />
                    Google Calendar events
                  </li>
                  <li className="flex items-center gap-2">
                    <Icons.googleContacts className="h-4 w-4" />
                    Google Contacts
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'select-type' && (
          <motion.div
            key="select-type"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              {platform === 'microsoft' ? (
                <Icons.microsoft className="h-6 w-6" />
              ) : (
                <Icons.googleWorkspace className="h-6 w-6" />
              )}
              <span className="font-medium">
                {platform === 'microsoft' ? 'Microsoft 365' : 'Google Workspace'}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
            </div>

            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleBack}>
                <Icons.chevronRight className="mr-2 h-4 w-4 rotate-180" />
                Back to Platform Selection
              </Button>
            </div>
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
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    platform === 'microsoft' ? 'bg-blue-100' : 'bg-red-100'
                  )}>
                    {platform === 'microsoft' ? (
                      <Icons.microsoft className="h-6 w-6" />
                    ) : (
                      <Icons.googleWorkspace className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <CardTitle>Grant Application Access</CardTitle>
                    <CardDescription>
                      The following permissions will be requested from your{' '}
                      {tenantType === 'source' ? 'source' : 'destination'}{' '}
                      {platform === 'microsoft' ? 'Microsoft 365' : 'Google Workspace'} tenant
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
                      <Badge variant="secondary">
                        {platform === 'microsoft' ? 'Application' : 'OAuth'}
                      </Badge>
                    </div>
                  ))}
                </div>

                <div className={cn(
                  'rounded-lg border p-4',
                  platform === 'microsoft'
                    ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950'
                    : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
                )}>
                  <div className="flex items-start gap-3">
                    <Icons.alert className={cn(
                      'mt-0.5 h-5 w-5',
                      platform === 'microsoft' ? 'text-yellow-600' : 'text-blue-600'
                    )} />
                    <div>
                      <p className={cn(
                        'font-medium',
                        platform === 'microsoft'
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : 'text-blue-800 dark:text-blue-200'
                      )}>
                        {platform === 'microsoft' ? 'Admin Consent Required' : 'Super Admin Required'}
                      </p>
                      <p className={cn(
                        'text-sm',
                        platform === 'microsoft'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-blue-700 dark:text-blue-300'
                      )}>
                        {platform === 'microsoft'
                          ? 'A Global Administrator of the tenant must approve these permissions. You will be redirected to Microsoft\'s consent page.'
                          : 'A Super Admin of the Google Workspace domain must approve these permissions. You will be redirected to Google\'s consent page.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={handleConnect}>
                    {platform === 'microsoft' ? (
                      <>
                        <Icons.microsoft className="mr-2 h-4 w-4" />
                        Connect with Microsoft
                      </>
                    ) : (
                      <>
                        <Icons.google className="mr-2 h-4 w-4" />
                        Connect with Google
                      </>
                    )}
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
                <h3 className="text-xl font-semibold">
                  Connecting to {platform === 'microsoft' ? 'Microsoft 365' : 'Google Workspace'}
                </h3>
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
                    {platform === 'microsoft' ? (
                      <Icons.microsoft className="h-8 w-8" />
                    ) : (
                      <Icons.googleWorkspace className="h-8 w-8" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">
                        {platform === 'microsoft' ? 'Contoso Corporation' : 'Acme Inc'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {platform === 'microsoft' ? 'contoso.onmicrosoft.com' : 'acme.com'}
                      </p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <Badge variant="outline" className={cn(
                        platform === 'microsoft' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                      )}>
                        {platform === 'microsoft' ? 'M365' : 'Google'}
                      </Badge>
                      <Badge className="capitalize">{tenantType}</Badge>
                    </div>
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
