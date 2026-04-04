# ============================================================
# PostgreSQL Flexible Server
# ============================================================

resource "azurerm_postgresql_flexible_server" "main" {
  name                          = "${var.project}-${var.environment}-pg"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = "16"
  administrator_login           = var.db_admin_username
  administrator_password        = var.db_admin_password
  zone                          = "1"
  storage_mb                    = var.db_storage_mb
  sku_name                      = var.db_sku
  backup_retention_days         = local.is_production ? 14 : 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true

  tags = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  name      = "m365_migration"
  server_id = azurerm_postgresql_flexible_server.main.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Allow Azure services (Container Apps) to connect
resource "azurerm_postgresql_flexible_server_firewall_rule" "azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
