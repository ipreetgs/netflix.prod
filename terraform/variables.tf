variable "project_name" {
  type        = string
  default     = "netflix-clone"
  description = "Name of the project used for tagging and prefixing resources."
}

variable "primary_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Primary region for EKS, Aurora writer, and Redis primary."
}

variable "secondary_region" {
  type        = string
  default     = "us-west-2"
  description = "AWS Secondary region for replica EKS, Aurora reader, and Redis replica."
}

variable "domain_name" {
  type        = string
  default     = "netflixclone.prod"
  description = "Route53 zone domain name for Geo and Latency routing."
}

variable "primary_vpc_cidr" {
  type        = string
  default     = "10.100.0.0/16"
  description = "VPC CIDR for the primary region network."
}

variable "secondary_vpc_cidr" {
  type        = string
  default     = "10.200.0.0/16"
  description = "VPC CIDR for the secondary region network."
}
