# ---------------------------------------------------------------------------
# swrl-list.com: a Cloud DNS zone, and (once var.map_domain is true) Cloud Run
# domain mappings for the apex and www, which also issue the HTTPS
# certificates.
# ---------------------------------------------------------------------------

resource "google_dns_managed_zone" "this" {
  project     = var.project
  name        = var.dns_zone
  dns_name    = "${var.domain_name}."
  description = "Swrl List"
  visibility  = "public"

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_domain_mapping" "apex" {
  count    = var.map_domain ? 1 : 0
  project  = var.project
  location = var.region
  name     = var.domain_name

  metadata {
    namespace = var.project
  }

  spec {
    route_name = google_cloud_run_v2_service.this.name
  }
}

resource "google_dns_record_set" "apex_a" {
  count        = var.map_domain ? 1 : 0
  project      = var.project
  name         = "${var.domain_name}."
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.this.name

  rrdatas = distinct([
    for r in google_cloud_run_domain_mapping.apex[0].status[0].resource_records :
    r.rrdata if r.type == "A"
  ])
}

resource "google_dns_record_set" "apex_aaaa" {
  count        = var.map_domain ? 1 : 0
  project      = var.project
  name         = "${var.domain_name}."
  type         = "AAAA"
  ttl          = 300
  managed_zone = google_dns_managed_zone.this.name

  rrdatas = distinct([
    for r in google_cloud_run_domain_mapping.apex[0].status[0].resource_records :
    r.rrdata if r.type == "AAAA"
  ])
}

resource "google_cloud_run_domain_mapping" "www" {
  count    = var.map_domain ? 1 : 0
  project  = var.project
  location = var.region
  name     = "www.${var.domain_name}"

  metadata {
    namespace = var.project
  }

  spec {
    route_name = google_cloud_run_v2_service.this.name
  }
}

# Subdomain mappings are always served through ghs.googlehosted.com.
resource "google_dns_record_set" "www_cname" {
  count        = var.map_domain ? 1 : 0
  project      = var.project
  name         = "www.${var.domain_name}."
  type         = "CNAME"
  ttl          = 300
  managed_zone = google_dns_managed_zone.this.name
  rrdatas      = ["ghs.googlehosted.com."]
}
