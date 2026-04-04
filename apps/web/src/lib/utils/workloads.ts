import type { WorkloadType } from "@m365-migration/types";

export interface WorkloadMeta {
  label: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
}

export const WORKLOAD_META: Record<WorkloadType, WorkloadMeta> = {
  ENTRA_ID: {
    label: "Entra ID",
    description: "Users, groups, licenses, and directory objects",
    icon: "ShieldCheck",
    color: "#0078D4",
  },
  EXCHANGE: {
    label: "Exchange Online",
    description: "Mailboxes, calendars, contacts, and mail rules",
    icon: "Mail",
    color: "#0078D4",
  },
  ONEDRIVE: {
    label: "OneDrive",
    description: "Personal files, folders, and sharing settings",
    icon: "Cloud",
    color: "#094AB2",
  },
  SHAREPOINT: {
    label: "SharePoint",
    description: "Sites, document libraries, lists, and permissions",
    icon: "Globe",
    color: "#038387",
  },
  TEAMS: {
    label: "Microsoft Teams",
    description: "Teams, channels, messages, and files",
    icon: "MessageSquare",
    color: "#6264A7",
  },
  GROUPS: {
    label: "Groups",
    description: "Security groups, distribution lists, and M365 groups",
    icon: "Users",
    color: "#0078D4",
  },
  PLANNER: {
    label: "Planner",
    description: "Plans, buckets, and tasks",
    icon: "CheckSquare",
    color: "#31752F",
  },
};

export const WORKLOAD_LIST: WorkloadType[] = [
  "ENTRA_ID",
  "GROUPS",
  "EXCHANGE",
  "ONEDRIVE",
  "SHAREPOINT",
  "TEAMS",
  "PLANNER",
];

export const PROVIDER_LABELS: Record<string, string> = {
  MICROSOFT_365: "Microsoft 365",
  GOOGLE_WORKSPACE: "Google Workspace",
};

export const CONNECTION_TYPE_LABELS: Record<string, string> = {
  SOURCE: "Source",
  DESTINATION: "Destination",
};
