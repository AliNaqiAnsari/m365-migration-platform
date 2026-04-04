# ============================================================
# M365 Migration Platform — Terraform Main
# One-click deployment of all Azure infrastructure
# ============================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  # Remote state in Azure Storage (uncomment after bootstrap)
  # backend "azurerm" {
  #   resource_group_name  = "rg-terraform-state"
  #   storage_account_name = "tfstate3liglobal"
  #   container_name       = "tfstate"
  #   key                  = "m365-migration.tfstate"
  # }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}

provider "cloudflare" {
  # Uses CLOUDFLARE_API_TOKEN environment variable
}

# ---------- Locals ----------

locals {
  env_suffix    = var.environment == "prd" ? "" : "-${var.environment}"
  rg_name       = "rg-${var.project}-${var.environment}"
  acr_name      = "acrm365migr3li" # Globally unique, shared across environments
  is_production = var.environment == "prd"

  # Subdomain naming: m365-api-stg.3li.global (staging), m365-api.3li.global (prod)
  api_hostname = var.environment == "prd" ? "${var.api_subdomain}.${var.domain}" : "${var.api_subdomain}-${var.environment}.${var.domain}"
  web_hostname = var.environment == "prd" ? "${var.web_subdomain}.${var.domain}" : "${var.web_subdomain}-${var.environment}.${var.domain}"

  # Database connection URL
  database_url = "postgresql://${var.db_admin_username}:${var.db_admin_password}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/m365_migration?sslmode=require"

  # Redis connection
  redis_password = azurerm_redis_cache.main.primary_access_key
  redis_host     = azurerm_redis_cache.main.hostname
  redis_port     = "6380"

  common_tags = {
    project     = var.project
    environment = var.environment
    managed_by  = "terraform"
  }
}

# ---------- Resource Group ----------

resource "azurerm_resource_group" "main" {
  name     = local.rg_name
  location = var.location
  tags     = local.common_tags
}
