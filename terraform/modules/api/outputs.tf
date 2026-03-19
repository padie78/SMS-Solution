output "query_endpoint" {
  value = "GET ${var.query_route_path}"
}

output "signer_endpoint" {
  value = "POST ${var.signer_route_path}"
}