variable "project_name" {}
variable "index_document" { default = "index.html" }
variable "error_document" { default = "error.html" }
variable "extra_tags" { 
    type = map(string) 
    default = {} 
}