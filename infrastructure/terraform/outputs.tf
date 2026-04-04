# ============================================================
# Terraform Outputs
# ============================================================

# ---------- Resource Group ----------

output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

# ---------- Database ----------

output "postgresql_host" {
  value = azurerm_postgresql_flexible_server.main.fqdn
}

output "database_url" {
  value     = local.database_url
  sensitive = true
}

# ---------- Redis ----------

output "redis_host" {
  value = azurerm_redis_cache.main.hostname
}

output "redis_port" {
  value = local.redis_port
}

output "redis_password" {
  value     = local.redis_password
  sensitive = true
}

# ---------- ACR ----------

output "acr_login_server" {
  value = azurerm_container_registry.main.login_server
}

output "acr_admin_username" {
  value = azurerm_container_registry.main.admin_username
}

output "acr_admin_password" {
  value     = azurerm_container_registry.main.admin_password
  sensitive = true
}

# ---------- Container Apps ----------

output "api_fqdn" {
  value = azurerm_container_app.api.ingress[0].fqdn
}

output "api_custom_domain" {
  value = local.api_hostname
}

output "web_fqdn" {
  value = azurerm_container_app.web.ingress[0].fqdn
}

output "web_custom_domain" {
  value = local.web_hostname
}

output "container_environment_id" {
  value = azurerm_container_app_environment.main.id
}

# ---------- Storage ----------

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "storage_connection_string" {
  value     = azurerm_storage_account.main.primary_connection_string
  sensitive = true
}
