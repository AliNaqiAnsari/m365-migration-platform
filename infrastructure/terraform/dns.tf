# ============================================================
# Cloudflare DNS — Custom domains for Container Apps
# ============================================================

# ---------- API DNS ----------

resource "cloudflare_record" "api_cname" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "prd" ? var.api_subdomain : "${var.api_subdomain}-${var.environment}"
  content = azurerm_container_app.api.ingress[0].fqdn
  type    = "CNAME"
  proxied = false
  comment = "Azure Container Apps: M365 Migration API ${var.environment} (${var.location})"
}

resource "cloudflare_record" "api_txt_verification" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "prd" ? "asuid.${var.api_subdomain}" : "asuid.${var.api_subdomain}-${var.environment}"
  content = azurerm_container_app.api.custom_domain_verification_id
  type    = "TXT"
  comment = "Azure Container Apps: domain verification for M365 API ${var.environment}"
}

# ---------- Web DNS ----------

resource "cloudflare_record" "web_cname" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "prd" ? var.web_subdomain : "${var.web_subdomain}-${var.environment}"
  content = azurerm_container_app.web.ingress[0].fqdn
  type    = "CNAME"
  proxied = false
  comment = "Azure Container Apps: M365 Migration frontend ${var.environment} (${var.location})"
}

resource "cloudflare_record" "web_txt_verification" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "prd" ? "asuid.${var.web_subdomain}" : "asuid.${var.web_subdomain}-${var.environment}"
  content = azurerm_container_app.web.custom_domain_verification_id
  type    = "TXT"
  comment = "Azure Container Apps: domain verification for M365 frontend ${var.environment}"
}
