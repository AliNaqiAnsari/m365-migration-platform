# ============================================================
# Container Apps Environment + API, Worker, Web containers
# ============================================================

# ---------- Log Analytics ----------

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project}-${var.environment}-logs"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = local.is_production ? 90 : 30

  tags = local.common_tags
}

# ---------- Container App Environment ----------

resource "azurerm_container_app_environment" "main" {
  name                       = "cae-${var.project}-${var.environment}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = local.common_tags
}

# ---------- API Container App ----------

resource "azurerm_container_app" "api" {
  name                         = "ca-${var.project}-api-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  tags = local.common_tags

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "database-url"
    value = local.database_url
  }

  secret {
    name  = "redis-password"
    value = local.redis_password
  }

  secret {
    name  = "jwt-secret"
    value = var.jwt_secret
  }

  secret {
    name  = "encryption-key"
    value = var.encryption_key
  }

  secret {
    name  = "stripe-secret-key"
    value = var.stripe_secret_key
  }

  secret {
    name  = "stripe-webhook-secret"
    value = var.stripe_webhook_secret
  }

  ingress {
    external_enabled = true
    target_port      = 3001
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.api_min_replicas
    max_replicas = var.api_max_replicas

    container {
      name   = "api"
      image  = "${azurerm_container_registry.main.login_server}/m365-api:${var.environment}-latest"
      cpu    = local.is_production ? 1.0 : 0.5
      memory = local.is_production ? "2Gi" : "1Gi"

      env {
        name  = "NODE_ENV"
        value = local.is_production ? "production" : "staging"
      }
      env {
        name  = "PORT"
        value = "3001"
      }
      env {
        name  = "LOG_LEVEL"
        value = local.is_production ? "info" : "debug"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name  = "REDIS_HOST"
        value = local.redis_host
      }
      env {
        name  = "REDIS_PORT"
        value = local.redis_port
      }
      env {
        name        = "REDIS_PASSWORD"
        secret_name = "redis-password"
      }
      env {
        name  = "REDIS_TLS"
        value = "true"
      }
      env {
        name        = "JWT_SECRET"
        secret_name = "jwt-secret"
      }
      env {
        name        = "ENCRYPTION_KEY"
        secret_name = "encryption-key"
      }
      env {
        name        = "STRIPE_SECRET_KEY"
        secret_name = "stripe-secret-key"
      }
      env {
        name        = "STRIPE_WEBHOOK_SECRET"
        secret_name = "stripe-webhook-secret"
      }
      env {
        name  = "FRONTEND_URL"
        value = "https://${local.web_hostname}"
      }
      env {
        name  = "CLERK_ISSUER_URL"
        value = var.clerk_issuer_url
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/api/v1/health/live"
        port      = 3001
        initial_delay    = 10
        interval_seconds = 30
        timeout          = 5
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/api/v1/health/ready"
        port      = 3001
        initial_delay    = 10
        interval_seconds = 15
        timeout          = 5
      }

      startup_probe {
        transport = "HTTP"
        path      = "/api/v1/health/startup"
        port      = 3001
        initial_delay    = 5
        interval_seconds = 10
        timeout          = 5
        failure_count_threshold = 10
      }
    }
  }
}

# ---------- Worker Container App ----------

resource "azurerm_container_app" "worker" {
  name                         = "ca-${var.project}-worker-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  tags = local.common_tags

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "database-url"
    value = local.database_url
  }

  secret {
    name  = "redis-password"
    value = local.redis_password
  }

  secret {
    name  = "encryption-key"
    value = var.encryption_key
  }

  # Worker has internal health endpoint only (no external ingress)
  ingress {
    external_enabled = false
    target_port      = 8080
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.worker_min_replicas
    max_replicas = var.worker_max_replicas

    container {
      name   = "worker"
      image  = "${azurerm_container_registry.main.login_server}/m365-worker:${var.environment}-latest"
      cpu    = local.is_production ? 1.0 : 0.5
      memory = local.is_production ? "2Gi" : "1Gi"

      env {
        name  = "NODE_ENV"
        value = local.is_production ? "production" : "staging"
      }
      env {
        name  = "HEALTH_PORT"
        value = "8080"
      }
      env {
        name        = "DATABASE_URL"
        secret_name = "database-url"
      }
      env {
        name  = "REDIS_HOST"
        value = local.redis_host
      }
      env {
        name  = "REDIS_PORT"
        value = local.redis_port
      }
      env {
        name        = "REDIS_PASSWORD"
        secret_name = "redis-password"
      }
      env {
        name  = "REDIS_TLS"
        value = "true"
      }
      env {
        name        = "ENCRYPTION_KEY"
        secret_name = "encryption-key"
      }

      liveness_probe {
        transport = "HTTP"
        path      = "/health/live"
        port      = 8080
        initial_delay    = 15
        interval_seconds = 30
        timeout          = 5
      }

      readiness_probe {
        transport = "HTTP"
        path      = "/health/ready"
        port      = 8080
        initial_delay    = 15
        interval_seconds = 15
        timeout          = 5
      }
    }
  }
}

# ---------- Web (Frontend) Container App ----------

resource "azurerm_container_app" "web" {
  name                         = "ca-${var.project}-web-${var.environment}"
  resource_group_name          = azurerm_resource_group.main.name
  container_app_environment_id = azurerm_container_app_environment.main.id
  revision_mode                = "Single"

  tags = local.common_tags

  registry {
    server               = azurerm_container_registry.main.login_server
    username             = azurerm_container_registry.main.admin_username
    password_secret_name = "acr-password"
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.main.admin_password
  }

  secret {
    name  = "clerk-secret-key"
    value = var.clerk_secret_key
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  template {
    min_replicas = var.web_min_replicas
    max_replicas = var.web_max_replicas

    container {
      name   = "web"
      image  = "${azurerm_container_registry.main.login_server}/m365-web:${var.environment}-latest"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "NODE_ENV"
        value = local.is_production ? "production" : "staging"
      }
      env {
        name  = "PORT"
        value = "3000"
      }
      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "https://${local.api_hostname}/api/v1"
      }
      env {
        name  = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        value = var.clerk_publishable_key
      }
      env {
        name        = "CLERK_SECRET_KEY"
        secret_name = "clerk-secret-key"
      }

      liveness_probe {
        transport        = "HTTP"
        path             = "/api/health"
        port             = 3000
        initial_delay    = 10
        interval_seconds = 30
        timeout          = 5
      }
    }
  }
}
