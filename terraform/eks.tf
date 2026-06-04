# ==============================================================
# IAM Roles for EKS clusters
# ==============================================================

# EKS Cluster Role
resource "aws_iam_role" "cluster" {
  provider = aws.primary
  name     = "${var.project_name}-eks-cluster-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cluster_policy" {
  provider   = aws.primary
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

# Worker Node Role
resource "aws_iam_role" "node" {
  provider = aws.primary
  name     = "${var.project_name}-eks-node-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "node_worker" {
  provider   = aws.primary
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_cni" {
  provider   = aws.primary
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_registry" {
  provider   = aws.primary
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node.name
}


# ==============================================================
# Primary Region EKS (us-east-1)
# ==============================================================

resource "aws_eks_cluster" "primary" {
  provider = aws.primary
  name     = "${var.project_name}-primary-eks"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.primary_private_1.id,
      aws_subnet.primary_private_2.id,
      aws_subnet.primary_public_1.id,
      aws_subnet.primary_public_2.id
    ]
  }

  depends_on = [aws_iam_role_policy_attachment.cluster_policy]
}

resource "aws_eks_node_group" "primary_nodes" {
  provider        = aws.primary
  cluster_name    = aws_eks_cluster.primary.name
  node_group_name = "primary-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = [aws_subnet.primary_private_1.id, aws_subnet.primary_private_2.id]

  scaling_config {
    desired_size = 3
    max_size     = 6
    min_size     = 2
  }

  instance_types = ["m5.large"]

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_registry,
  ]
}


# ==============================================================
# Secondary Region EKS (us-west-2)
# ==============================================================

resource "aws_eks_cluster" "secondary" {
  provider = aws.secondary
  name     = "${var.project_name}-secondary-eks"
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids = [
      aws_subnet.secondary_private_1.id,
      aws_subnet.secondary_private_2.id,
      aws_subnet.secondary_public_1.id,
      aws_subnet.secondary_public_2.id
    ]
  }

  depends_on = [aws_iam_role_policy_attachment.cluster_policy]
}

resource "aws_eks_node_group" "secondary_nodes" {
  provider        = aws.secondary
  cluster_name    = aws_eks_cluster.secondary.name
  node_group_name = "secondary-workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = [aws_subnet.secondary_private_1.id, aws_subnet.secondary_private_2.id]

  scaling_config {
    desired_size = 2
    max_size     = 5
    min_size     = 1
  }

  instance_types = ["m5.large"]

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_registry,
  ]
}
