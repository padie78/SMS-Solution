output "arn" {
  value = aws_sqs_queue.this.arn
}

output "url" {
  value = aws_sqs_queue.this.id
}

output "invoice_queue_arn" {
  value = aws_sqs_queue.this.arn # <--- Debe coincidir con el nombre de arriba
}