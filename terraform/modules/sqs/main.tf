resource "aws_sqs_queue" "this" {
  name                      = var.name
  delay_seconds             = var.delay_seconds
  max_message_size          = 262144
  message_retention_seconds = 86400 # 1 día
  receive_wait_time_seconds = 10    # Long polling
  
  # Redrive policy para conectar con la DLQ
  redrive_policy = var.dlq_arn != "" ? jsonencode({
    deadLetterTargetArn = var.dlq_arn
    maxReceiveCount     = 3 # Reintenta 3 veces antes de ir a DLQ
  }) : null

  tags = var.tags
}

