import {
  Loader2,
  Mail,
  Lock,
  User,
  Building2,
  Cloud,
  HardDrive,
  Users,
  MessageSquare,
  FolderKanban,
  ArrowLeftRight,
  Shield,
  Database,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  AlertCircle,
  Info,
  Search,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  Pause,
  Play,
  Square,
  ExternalLink,
  Download,
  Upload,
  Calendar,
  Clock,
  TrendingUp,
  Bell,
  Sun,
  Moon,
  HelpCircle,
  MoreVertical,
  Archive,
  FileText,
  BarChart3,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type Icon = LucideIcon;

export const Icons = {
  spinner: Loader2,
  mail: Mail,
  lock: Lock,
  user: User,
  building: Building2,
  cloud: Cloud,
  drive: HardDrive,
  users: Users,
  teams: MessageSquare,
  planner: FolderKanban,
  migration: ArrowLeftRight,
  security: Shield,
  database: Database,
  settings: Settings,
  logout: LogOut,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  check: Check,
  close: X,
  alert: AlertCircle,
  info: Info,
  search: Search,
  add: Plus,
  delete: Trash2,
  edit: Edit,
  refresh: RefreshCw,
  pause: Pause,
  play: Play,
  stop: Square,
  external: ExternalLink,
  download: Download,
  upload: Upload,
  calendar: Calendar,
  clock: Clock,
  trending: TrendingUp,
  bell: Bell,
  sun: Sun,
  moon: Moon,
  help: HelpCircle,
  moreVertical: MoreVertical,
  archive: Archive,
  file: FileText,
  chart: BarChart3,
  zap: Zap,
  alertCircle: AlertCircle,

  // Brand icons
  microsoft: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  ),

  google: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),

  workspace: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="currentColor"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  ),
};
