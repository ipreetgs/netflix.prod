# ==========================================
# Primary Region VPC Setup (us-east-1)
# ==========================================

resource "aws_vpc" "primary" {
  provider             = aws.primary
  cidr_block           = var.primary_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "${var.project_name}-primary-vpc"
  }
}

resource "aws_subnet" "primary_public_1" {
  provider                = aws.primary
  vpc_id                  = aws_vpc.primary.id
  cidr_block              = "10.100.1.0/24"
  availability_zone       = "${var.primary_region}a"
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.project_name}-primary-public-1a"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "primary_public_2" {
  provider                = aws.primary
  vpc_id                  = aws_vpc.primary.id
  cidr_block              = "10.100.2.0/24"
  availability_zone       = "${var.primary_region}b"
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.project_name}-primary-public-1b"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "primary_private_1" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary.id
  cidr_block        = "10.100.10.0/24"
  availability_zone = "${var.primary_region}a"
  tags = {
    Name = "${var.project_name}-primary-private-1a"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "primary_private_2" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary.id
  cidr_block        = "10.100.20.0/24"
  availability_zone = "${var.primary_region}b"
  tags = {
    Name = "${var.project_name}-primary-private-1b"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_internet_gateway" "primary" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id
  tags = {
    Name = "${var.project_name}-primary-igw"
  }
}

resource "aws_eip" "primary_nat" {
  provider = aws.primary
  domain   = "vpc"
}

resource "aws_nat_gateway" "primary" {
  provider      = aws.primary
  allocation_id = aws_eip.primary_nat.id
  subnet_id     = aws_subnet.primary_public_1.id
  tags = {
    Name = "${var.project_name}-primary-nat-gw"
  }
}

resource "aws_route_table" "primary_public" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.primary.id
  }
  tags = {
    Name = "${var.project_name}-primary-public-rt"
  }
}

resource "aws_route_table_association" "primary_public_1" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_public_1.id
  route_table_id = aws_route_table.primary_public.id
}

resource "aws_route_table_association" "primary_public_2" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_public_2.id
  route_table_id = aws_route_table.primary_public.id
}

resource "aws_route_table" "primary_private" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.primary.id
  }
  tags = {
    Name = "${var.project_name}-primary-private-rt"
  }
}

resource "aws_route_table_association" "primary_private_1" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_private_1.id
  route_table_id = aws_route_table.primary_private.id
}

resource "aws_route_table_association" "primary_private_2" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_private_2.id
  route_table_id = aws_route_table.primary_private.id
}


# ==========================================
# Secondary Region VPC Setup (us-west-2)
# ==========================================

resource "aws_vpc" "secondary" {
  provider             = aws.secondary
  cidr_block           = var.secondary_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name = "${var.project_name}-secondary-vpc"
  }
}

resource "aws_subnet" "secondary_public_1" {
  provider                = aws.secondary
  vpc_id                  = aws_vpc.secondary.id
  cidr_block              = "10.200.1.0/24"
  availability_zone       = "${var.secondary_region}a"
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.project_name}-secondary-public-1a"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "secondary_public_2" {
  provider                = aws.secondary
  vpc_id                  = aws_vpc.secondary.id
  cidr_block              = "10.200.2.0/24"
  availability_zone       = "${var.secondary_region}b"
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.project_name}-secondary-public-1b"
    "kubernetes.io/role/elb" = "1"
  }
}

resource "aws_subnet" "secondary_private_1" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = "10.200.10.0/24"
  availability_zone = "${var.secondary_region}a"
  tags = {
    Name = "${var.project_name}-secondary-private-1a"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_subnet" "secondary_private_2" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = "10.200.20.0/24"
  availability_zone = "${var.secondary_region}b"
  tags = {
    Name = "${var.project_name}-secondary-private-1b"
    "kubernetes.io/role/internal-elb" = "1"
  }
}

resource "aws_internet_gateway" "secondary" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id
  tags = {
    Name = "${var.project_name}-secondary-igw"
  }
}

resource "aws_eip" "secondary_nat" {
  provider = aws.secondary
  domain   = "vpc"
}

resource "aws_nat_gateway" "secondary" {
  provider      = aws.secondary
  allocation_id = aws_eip.secondary_nat.id
  subnet_id     = aws_subnet.secondary_public_1.id
  tags = {
    Name = "${var.project_name}-secondary-nat-gw"
  }
}

resource "aws_route_table" "secondary_public" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.secondary.id
  }
  tags = {
    Name = "${var.project_name}-secondary-public-rt"
  }
}

resource "aws_route_table_association" "secondary_public_1" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_public_1.id
  route_table_id = aws_route_table.secondary_public.id
}

resource "aws_route_table_association" "secondary_public_2" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_public_2.id
  route_table_id = aws_route_table.secondary_public.id
}

resource "aws_route_table" "secondary_private" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.secondary.id
  }
  tags = {
    Name = "${var.project_name}-secondary-private-rt"
  }
}

resource "aws_route_table_association" "secondary_private_1" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_private_1.id
  route_table_id = aws_route_table.secondary_private.id
}

resource "aws_route_table_association" "secondary_private_2" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_private_2.id
  route_table_id = aws_route_table.secondary_private.id
}
