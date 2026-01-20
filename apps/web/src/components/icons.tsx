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

  // Gmail icon - official colors
  gmail: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
    </svg>
  ),

  // Google Drive icon - official tricolor
  googleDrive: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z" fill="#0066DA"/>
      <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 52.35c-.8 1.4-1.2 2.95-1.2 4.5h27.45L43.65 25z" fill="#00AC47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.9l5.1 8.75 8.55 15.05z" fill="#EA4335"/>
      <path d="M43.65 25L57.4 1.2c-1.35-.8-2.9-1.2-4.5-1.2H34.4c-1.6 0-3.15.45-4.5 1.2L43.65 25z" fill="#00832D"/>
      <path d="M59.9 56.85H27.45l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.9c1.6 0 3.15-.45 4.5-1.2L59.9 56.85z" fill="#2684FC"/>
      <path d="M73.4 26.5L60.65 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.6 25l16.3 28.35h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
    </svg>
  ),

  // Google Calendar icon - official
  googleCalendar: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path fill="#fff" d="M152.637 200H47.363C21.221 200 0 178.779 0 152.637V47.363C0 21.221 21.221 0 47.363 0h105.274C178.779 0 200 21.221 200 47.363v105.274C200 178.779 178.779 200 152.637 200z"/>
      <path fill="#1A73E8" d="M152.637 200H47.363C21.221 200 0 178.779 0 152.637V47.363C0 21.221 21.221 0 47.363 0h105.274C178.779 0 200 21.221 200 47.363v105.274C200 178.779 178.779 200 152.637 200z"/>
      <path fill="#fff" d="M152.637 23.684H47.363c-13.088 0-23.679 10.591-23.679 23.679v105.274c0 13.088 10.591 23.679 23.679 23.679h105.274c13.088 0 23.679-10.591 23.679-23.679V47.363c0-13.088-10.591-23.679-23.679-23.679z"/>
      <path fill="#1A73E8" d="M130.789 71.053h-15.789V55.263h-30v15.79H69.211v30H85v15.789h30v-15.79h15.789z"/>
    </svg>
  ),

  // Google Contacts icon
  googleContacts: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M20.267 20.5h1.916a.817.817 0 0 0 .816-.834v-3.24c0-2.07-1.6-3.76-3.584-3.76h-1.357a5.425 5.425 0 0 0 2.209-4.334A5.37 5.37 0 0 0 14.933 3a5.37 5.37 0 0 0-5.333 5.333c0 1.738.843 3.289 2.133 4.278l-.066.056H10.4c-1.984 0-3.584 1.69-3.584 3.76v3.24c0 .463.354.833.816.833h12.635z" fill="#1A73E8"/>
      <path d="M3 19.667v-3.24c0-2.07 1.6-3.76 3.584-3.76h1.082c-.066-.056-.132-.113-.197-.169a5.37 5.37 0 0 1-2.136-4.166c0-2.947 2.386-5.333 5.334-5.333.4 0 .792.047 1.166.131A5.333 5.333 0 0 0 7.5 8.333c0 1.738.843 3.289 2.133 4.278l-.066.056H8.2c-1.984 0-3.584 1.69-3.584 3.76v3.24c0 .463.354.833.816.833H3.817A.817.817 0 0 1 3 19.667z" fill="#1A73E8" opacity="0.4"/>
    </svg>
  ),

  // Google Groups icon
  googleGroups: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#5F6368"/>
    </svg>
  ),

  // Google Workspace icon - official multicolor dots
  googleWorkspace: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path fill="none" d="M0 0h192v192H0z"/>
      <circle cx="63.6" cy="54" r="18" fill="#EA4335"/>
      <circle cx="128.4" cy="54" r="18" fill="#FBBC05"/>
      <circle cx="63.6" cy="138" r="18" fill="#34A853"/>
      <circle cx="128.4" cy="138" r="18" fill="#4285F4"/>
      <path d="M96 72c19.9 0 36 16.1 36 36s-16.1 36-36 36-36-16.1-36-36 16.1-36 36-36" fill="#4285F4"/>
      <path d="M96 90c9.9 0 18 8.1 18 18s-8.1 18-18 18-18-8.1-18-18 8.1-18 18-18" fill="#fff"/>
    </svg>
  ),

  // Platform comparison icon
  crossPlatform: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  ),

  // Assessment icon
  assessment: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
    </svg>
  ),

  // User mapping icon
  userMapping: ({ className, ...props }: React.ComponentProps<'svg'>) => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="6" cy="6" r="3"/>
      <circle cx="18" cy="18" r="3"/>
      <path d="M6 21v-2a4 4 0 014-4h.5M18 3v2a4 4 0 01-4 4h-.5M13 7l2-2-2-2M11 17l-2 2 2 2"/>
    </svg>
  ),
};
