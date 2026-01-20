# M365 Migration Platform

A comprehensive SaaS platform for Microsoft 365 tenant-to-tenant migrations with backup and archiving capabilities.

## Features

- **Tenant-to-Tenant Migration**: Migrate users, emails, calendars, contacts, OneDrive, SharePoint, and Teams between M365 tenants
- **Backup & Restore**: Scheduled backups with point-in-time recovery
- **Real-time Monitoring**: Live progress tracking via WebSocket
- **Modern Dashboard**: Beautiful, animated UI built with Next.js and Tailwind CSS
- **Per-User Pricing**: Flexible pricing with volume discounts
- **Multi-tenant Architecture**: Secure data isolation with PostgreSQL RLS

## Tech Stack

### Backend
- **Framework**: NestJS 10 with TypeScript
- **Database**: PostgreSQL 16 with Prisma ORM
- **Queue**: BullMQ with Redis
- **Auth**: JWT + MFA, Microsoft SSO, Google SSO

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand + TanStack Query

### Infrastructure
- **Container**: Docker + Docker Compose
- **Cloud**: AWS (EC2/ECS, RDS, ElastiCache, S3)

## Project Structure

```
m365-migration/
├── apps/
│   ├── api/          # NestJS Backend
│   ├── web/          # Next.js Frontend
│   └── worker/       # BullMQ Workers
├── packages/
│   ├── database/     # Prisma schema and client
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
└── infrastructure/
    └── docker/       # Docker configuration
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker and Docker Compose

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd m365-migration
```

2. Install dependencies:
```bash
pnpm install
```

3. Start infrastructure services:
```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

4. Setup environment variables:
```bash
cp apps/api/.env.example apps/api/.env
# Edit .env with your configuration
```

5. Generate Prisma client and run migrations:
```bash
pnpm --filter @m365-migration/database generate
pnpm --filter @m365-migration/database db:push
```

6. Start development servers:
```bash
pnpm dev
```

### Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| API Docs | http://localhost:3001/api/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| MailHog | http://localhost:8025 |

## Development

### Running Individual Apps

```bash
# API only
pnpm --filter @m365-migration/api dev

# Frontend only
pnpm --filter @m365-migration/web dev

# Worker only
pnpm --filter @m365-migration/worker dev
```

### Building

```bash
# Build all
pnpm build

# Build specific package
pnpm --filter @m365-migration/api build
```

### Database

```bash
# Generate Prisma client
pnpm --filter @m365-migration/database generate

# Push schema changes
pnpm --filter @m365-migration/database db:push

# Open Prisma Studio
pnpm --filter @m365-migration/database studio
```

## Microsoft 365 Setup

### Azure AD App Registration

1. Go to Azure Portal > Azure Active Directory > App registrations
2. Create a new registration
3. Add the following API permissions:
   - User.Read.All
   - Mail.ReadWrite
   - Calendars.ReadWrite
   - Contacts.ReadWrite
   - Files.ReadWrite.All
   - Sites.ReadWrite.All
   - Team.ReadBasic.All
   - Group.ReadWrite.All
4. Grant admin consent for the permissions
5. Copy the Application (client) ID and create a client secret
6. Add credentials to your `.env` file

## Pricing

### Migration (One-time)
| Workload | Price |
|----------|-------|
| Exchange | $5/user |
| OneDrive | $3/user |
| SharePoint | $2/site |
| Teams | $4/user |

### Volume Discounts
- 100-499 users: 10% off
- 500-999 users: 15% off
- 1000+ users: 20% off

## Future Plans

- **Google Workspace Migration** - Coming Soon!
- Advanced eDiscovery integration
- Custom retention policies
- SSO with additional providers

## License

Private - All rights reserved
