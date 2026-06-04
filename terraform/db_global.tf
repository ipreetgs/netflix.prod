# =============================================================
# Aurora Global Database (PostgreSQL Compatible)
# =============================================================

resource "aws_rds_global_cluster" "global_db" {
  provider                  = aws.primary
  global_cluster_identifier = "${var.project_name}-global-db"
  engine                    = "aurora-postgresql"
  engine_version            = "15.4"
  database_name             = "netflix_db"
}

# Subnet Groups for RDS
resource "aws_db_subnet_group" "primary" {
  provider   = aws.primary
  name       = "${var.project_name}-primary-db-subnet-group"
  subnet_ids = [aws_subnet.primary_private_1.id, aws_subnet.primary_private_2.id]
}

resource "aws_db_subnet_group" "secondary" {
  provider   = aws.secondary
  name       = "${var.project_name}-secondary-db-subnet-group"
  subnet_ids = [aws_subnet.secondary_private_1.id, aws_subnet.secondary_private_2.id]
}

# Security Groups for RDS
resource "aws_security_group" "primary_db" {
  provider    = aws.primary
  name        = "${var.project_name}-primary-db-sg"
  description = "Allow EKS pods access to database"
  vpc_id      = aws_vpc.primary.id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.primary_vpc_cidr]
  }
}

resource "aws_security_group" "secondary_db" {
  provider    = aws.secondary
  name        = "${var.project_name}-secondary-db-sg"
  description = "Allow EKS pods access to database"
  vpc_id      = aws_vpc.secondary.id
  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.secondary_vpc_cidr]
  }
}

# RDS Cluster - Primary Region (Writer)
resource "aws_rds_cluster" "primary" {
  provider                  = aws.primary
  cluster_identifier        = "${var.project_name}-primary-cluster"
  engine                    = aws_rds_global_cluster.global_db.engine
  engine_version            = aws_rds_global_cluster.global_db.engine_version
  global_cluster_identifier = aws_rds_global_cluster.global_db.id
  database_name             = "netflix_db"
  master_username           = "netflix_admin"
  master_password           = "Password123!"
  db_subnet_group_name      = aws_db_subnet_group.primary.name
  vpc_security_group_ids    = [aws_security_group.primary_db.id]
  skip_final_snapshot       = true
}

resource "aws_rds_cluster_instance" "primary_instances" {
  provider           = aws.primary
  count              = 2
  identifier         = "${var.project_name}-primary-instance-${count.index}"
  cluster_identifier = aws_rds_cluster.primary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.primary.engine
  engine_version     = aws_rds_cluster.primary.engine_version
}

# RDS Cluster - Secondary Region (Replica Reader)
resource "aws_rds_cluster" "secondary" {
  provider                  = aws.secondary
  cluster_identifier        = "${var.project_name}-secondary-cluster"
  engine                    = aws_rds_global_cluster.global_db.engine
  engine_version            = aws_rds_global_cluster.global_db.engine_version
  global_cluster_identifier = aws_rds_global_cluster.global_db.id
  db_subnet_group_name      = aws_db_subnet_group.secondary.name
  vpc_security_group_ids    = [aws_security_group.secondary_db.id]
  skip_final_snapshot       = true
  depends_on                = [aws_rds_cluster_instance.primary_instances]
}

resource "aws_rds_cluster_instance" "secondary_instances" {
  provider           = aws.secondary
  count              = 1
  identifier         = "${var.project_name}-secondary-instance-${count.index}"
  cluster_identifier = aws_rds_cluster.secondary.id
  instance_class     = "db.r6g.large"
  engine             = aws_rds_cluster.secondary.engine
  engine_version     = aws_rds_cluster.secondary.engine_version
}


# =============================================================
# Redis Global Datastore Setup
# =============================================================

# Redis Subnet Groups
resource "aws_elasticache_subnet_group" "primary" {
  provider   = aws.primary
  name       = "${var.project_name}-primary-redis-subnet-group"
  subnet_ids = [aws_subnet.primary_private_1.id, aws_subnet.primary_private_2.id]
}

resource "aws_elasticache_subnet_group" "secondary" {
  provider   = aws.secondary
  name       = "${var.project_name}-secondary-redis-subnet-group"
  subnet_ids = [aws_subnet.secondary_private_1.id, aws_subnet.secondary_private_2.id]
}

# Redis Security Groups
resource "aws_security_group" "primary_redis" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id
  name     = "${var.project_name}-primary-redis-sg"
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.primary_vpc_cidr]
  }
}

resource "aws_security_group" "secondary_redis" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id
  name     = "${var.project_name}-secondary-redis-sg"
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.secondary_vpc_cidr]
  }
}

# Primary Redis Replication Group (Master Cache)
resource "aws_elasticache_replication_group" "primary" {
  provider                   = aws.primary
  replication_group_id       = "${var.project_name}-redis-primary"
  description                = "Primary Redis cache cluster"
  node_type                  = "cache.m6g.large"
  num_cache_clusters         = 2
  port                       = 6379
  automatic_failover_enabled = true
  subnet_group_name          = aws_elasticache_subnet_group.primary.name
  security_group_ids         = [aws_security_group.primary_redis.id]
}

# Redis Global Replication Group (Global Datastore link)
resource "aws_elasticache_global_replication_group" "global_redis" {
  provider                           = aws.primary
  global_replication_group_id_suffix = "${var.project_name}-global-redis"
  primary_replication_group_id       = aws_elasticache_replication_group.primary.id
}

# Secondary Redis Replication Group (Replica cache)
resource "aws_elasticache_replication_group" "secondary" {
  provider                    = aws.secondary
  replication_group_id        = "${var.project_name}-redis-secondary"
  description                 = "Secondary Redis cache replica cluster"
  global_replication_group_id = aws_elasticache_global_replication_group.global_redis.global_replication_group_id
  num_cache_clusters          = 1
  subnet_group_name           = aws_elasticache_subnet_group.secondary.name
  security_group_ids          = [aws_security_group.secondary_redis.id]
  depends_on                  = [aws_elasticache_global_replication_group.global_redis]
}
