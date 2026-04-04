# ============================================================
# M365 Migration Platform — Terraform Variables
# ============================================================

variable "project" {
  description = "Project name used in resource naming"
  type        = string
  default     = "m365-migration"
}

variable "environment" {
  description = "Deployment environment (stg or prd)"
  type        = string
  validation {
    condition     = contains(["stg", "prd"], var.environment)
    error_message = "Environment must be 'stg' or 'prd'."
  }
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "northeurope"
}

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = "46f745ed-5e15-4b02-bd50-1d4a64a25e86" # 3LI Global Ltd — Microsoft Azure Sponsorship
}

# ---------- Database ----------

variable "db_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
  default     = "m365admin"
}

variable "db_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "db_sku" {
  description = "PostgreSQL Flexible Server SKU"
  type        = string
  default     = "B_Standard_B1ms" # Burstable — cheapest for staging
}

variable "db_storage_mb" {
  description = "PostgreSQL storage in MB"
  type        = number
  default     = 32768 # 32 GB
}

# ---------- Redis ----------

variable "redis_sku" {
  description = "Redis Cache SKU (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "redis_capacity" {
  description = "Redis Cache capacity (0-6 for Basic/Standard, 1-5 for Premium)"
  type        = number
  default     = 0 # 250 MB
}

# ---------- Container Apps ----------

variable "api_min_replicas" {
  description = "Minimum replicas for API container"
  type        = number
  default     = 0
}

variable "api_max_replicas" {
  description = "Maximum replicas for API container"
  type        = number
  default     = 3
}

variable "worker_min_replicas" {
  description = "Minimum replicas for Worker container"
  type        = number
  default     = 0
}

variable "worker_max_replicas" {
  description = "Maximum replicas for Worker container"
  type        = number
  default     = 3
}

variable "web_min_replicas" {
  description = "Minimum replicas for Web (frontend) container"
  type        = number
  default     = 0
}

variable "web_max_replicas" {
  description = "Maximum replicas for Web (frontend) container"
  type        = number
  default     = 3
}

# ---------- Secrets (passed at apply time) ----------

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "encryption_key" {
  description = "32-char encryption key for tenant secrets at rest"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

# ---------- Clerk Auth ----------

variable "clerk_publishable_key" {
  description = "Clerk publishable key (NEXT_PUBLIC)"
  type        = string
  default     = ""
}

variable "clerk_secret_key" {
  description = "Clerk secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "clerk_issuer_url" {
  description = "Clerk JWKS issuer URL (e.g. https://sound-muskox-31.clerk.accounts.dev)"
  type        = string
  default     = ""
}

# ---------- DNS ----------

variable "domain" {
  description = "Base domain for the application"
  type        = string
  default     = "3li.global"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain"
  type        = string
  default     = "e694eb8362f72263dd6b8ce851382968" # 3li.global
}

# ---------- Custom domain subdomains ----------

variable "api_subdomain" {
  description = "Subdomain for API (auto-suffixed with -stg for staging)"
  type        = string
  default     = "m365-api"
}

variable "web_subdomain" {
  description = "Subdomain for Web frontend (auto-suffixed with -stg for staging)"
  type        = string
  default     = "m365"
}
