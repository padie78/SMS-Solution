variable "name" { type = string }
variable "delay_seconds" { default = 0 }
variable "dlq_arn" { 
  type = string
  default = ""
}
variable "tags" {
  type = map(string)
  default = {}
}