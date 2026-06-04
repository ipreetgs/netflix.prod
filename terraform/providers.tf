terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Primary Region
provider "aws" {
  alias  = "primary"
  region = var.primary_region
}

# Secondary Region
provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
}
