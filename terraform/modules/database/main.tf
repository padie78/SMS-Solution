resource "aws_dynamodb_table" "emissions_table" {
  name         = "${var.project_name}-${var.environment}-emissions"
  billing_mode = var.billing_mode

  hash_key  = var.hash_key
  range_key = var.range_key 

  # Claves principales
  attribute { 
    name = var.hash_key
    type = "S" 
  }
  
  attribute { 
    name = var.range_key
    type = "S" 
  }

  # Claves para GSI
  attribute { 
    name = var.gsi_hash_key
    type = "S" 
  }
  
  attribute { 
    name = var.gsi_range_key
    type = "S" 
  }

  # Índice secundario global
  global_secondary_index {
    name            = var.gsi_name
    hash_key        = var.gsi_hash_key
    range_key       = var.gsi_range_key
    projection_type = "ALL"
  }

  ttl {
    attribute_name = var.ttl_attribute_name
    enabled        = var.enable_ttl
  }

  server_side_encryption {
    enabled = var.encryption_enabled
  }

  point_in_time_recovery {
    enabled = var.point_in_time_recovery_enabled
  }

  tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
    },
    var.tags
  )
}