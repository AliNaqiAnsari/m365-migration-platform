'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { useAuthStore } from '@/stores/auth-store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Icons.trending },
  { name: 'Tenants', href: '/dashboard/tenants', icon: Icons.cloud },
  { name: 'Migrations', href: '/dashboard/migrations', icon: Icons.migration },
  { name: 'Backups', href: '/dashboard/backups', icon: Icons.database },
  { name: 'Settings', href: '/dashboard/settings', icon: Icons.settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Icons.migration className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">M365 Migration</h1>
          <p className="text-xs text-muted-foreground">
            {user?.organization?.name || 'Dashboard'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          // For Dashboard, only match exact path; for others, match path or children
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Google Workspace Support */}
      <div className="mx-4 mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <Icons.googleWorkspace className="h-5 w-5" />
          <div>
            <p className="text-sm font-medium">Google Workspace</p>
            <p className="text-xs text-muted-foreground">Cross-platform Ready</p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Icons.user className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name || user?.email}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Logout"
          >
            <Icons.logout className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
