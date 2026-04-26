output "arn" {
  value = aws_sqs_queue.this.arn
}

output "url" {
  value = aws_sqs_queue.this.id
}

# modules/sqs/outputs.tf
output "invoice_queue_arn" {
  value = aws_sqs_queue.your_queue_name.arn
}