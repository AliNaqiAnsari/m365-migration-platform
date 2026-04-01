// Microsoft Graph API related types

export interface GraphClientConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  scopes?: string[];
}

export interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  ext_expires_in?: number;
}

export interface GraphBatchRequest {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface GraphBatchResponse {
  id: string;
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface GraphPagedResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
  '@odata.count'?: number;
}

// Rate limit tracking
export interface RateLimitState {
  service: string;
  tenantId: string;
  remaining: number;
  limit: number;
  resetAtMs: number;
  retryAfterMs?: number;
}

// Graph API resource types (simplified, commonly used fields)
export interface GraphUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail?: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  accountEnabled?: boolean;
  assignedLicenses?: Array<{ skuId: string; disabledPlans?: string[] }>;
  proxyAddresses?: string[];
}

export interface GraphGroup {
  id: string;
  displayName: string;
  description?: string;
  mail?: string;
  mailEnabled: boolean;
  securityEnabled: boolean;
  groupTypes: string[];
  membershipRule?: string;
  members?: GraphUser[];
  owners?: GraphUser[];
}

export interface GraphSite {
  id: string;
  displayName?: string;
  name: string;
  webUrl: string;
  siteCollection?: { hostname: string };
  root?: Record<string, unknown>;
}

export interface GraphDrive {
  id: string;
  name: string;
  driveType: string;
  owner?: { user?: GraphUser; group?: GraphGroup };
  quota?: {
    total: number;
    used: number;
    remaining: number;
    deleted: number;
    state: string;
  };
}

export interface GraphDriveItem {
  id: string;
  name: string;
  size?: number;
  file?: { mimeType: string; hashes?: Record<string, string> };
  folder?: { childCount: number };
  parentReference?: { id?: string; path?: string; driveId?: string };
  webUrl?: string;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  '@microsoft.graph.downloadUrl'?: string;
}

export interface GraphTeam {
  id: string;
  displayName: string;
  description?: string;
  isArchived?: boolean;
  memberSettings?: Record<string, unknown>;
  messagingSettings?: Record<string, unknown>;
  funSettings?: Record<string, unknown>;
}

export interface GraphChannel {
  id: string;
  displayName: string;
  description?: string;
  membershipType?: 'standard' | 'private' | 'shared';
  email?: string;
}

export interface GraphMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType: string; content: string };
  from?: { emailAddress: { address: string; name: string } };
  toRecipients?: Array<{ emailAddress: { address: string; name: string } }>;
  receivedDateTime?: string;
  sentDateTime?: string;
  hasAttachments?: boolean;
  importance?: string;
  conversationId?: string;
  parentFolderId?: string;
}

export interface GraphMailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  totalItemCount: number;
  unreadItemCount: number;
}

export interface GraphEvent {
  id: string;
  subject: string;
  body?: { contentType: string; content: string };
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer?: { emailAddress: { address: string; name: string } };
  attendees?: Array<{
    emailAddress: { address: string; name: string };
    type: string;
    status?: { response: string };
  }>;
  isAllDay?: boolean;
  recurrence?: Record<string, unknown>;
}

export interface GraphContact {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: Array<{ address: string; name?: string }>;
  businessPhones?: string[];
  mobilePhone?: string;
  companyName?: string;
  jobTitle?: string;
}

// Upload session for large files
export interface GraphUploadSession {
  uploadUrl: string;
  expirationDateTime: string;
  nextExpectedRanges?: string[];
}
