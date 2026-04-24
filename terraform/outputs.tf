output "upload_bucket_name" { value = module.storage.bucket_id }
output "dynamo_table_name"  { value = module.database.table_name }
output "api_endpoint"       { value = module.api.appsync_url }
output "s3_bucket_name" {
  value = module.frontend.s3_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}