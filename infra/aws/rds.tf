resource "aws_db_subnet_group" "postgres" {
  name       = "${var.cluster_name}-db-subnet"
  subnet_ids = module.vpc.private_subnets

  tags = {
    Project = "mecanica-pos-soat"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.cluster_name}-rds-sg"
  description = "Allow PostgreSQL traffic from EKS nodes"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  tags = {
    Project = "mecanica-pos-soat"
  }
}

resource "aws_db_instance" "postgres" {
  identifier        = "${var.cluster_name}-postgres"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.micro"
  allocated_storage = 20

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = false
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Project = "mecanica-pos-soat"
  }
}
