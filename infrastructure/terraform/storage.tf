# ============================================================
# Azure Storage — Migration file staging
# ============================================================

resource "azurerm_storage_account" "main" {
  name                     = "m365migr${var.environment}sa"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

  tags = local.common_tags
}

resource "azurerm_storage_container" "migration_staging" {
  name                  = "migration-staging"
  storage_account_id    = azurerm_storage_account.main.id
  container_access_type = "private"
}
