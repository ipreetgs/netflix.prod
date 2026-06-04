# ==============================================================
# S3 Video Assets Bucket
# ==============================================================

resource "aws_s3_bucket" "video_bucket" {
  provider = aws.primary
  bucket   = "${var.project_name}-video-assets"
  tags = {
    Name = "Netflix Video Assets"
  }
}

resource "aws_s3_bucket_public_access_block" "block" {
  provider = aws.primary
  bucket   = aws_s3_bucket.video_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control (OAC) to read private S3 assets securely
resource "aws_cloudfront_origin_access_control" "oac" {
  provider                          = aws.primary
  name                              = "${var.project_name}-cloudfront-oac"
  description                       = "CloudFront Access to private S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}


# ==============================================================
# CloudFront Streaming CDN Distribution
# ==============================================================

resource "aws_cloudfront_distribution" "cdn" {
  provider = aws.primary
  origin {
    domain_name              = aws_s3_bucket.video_bucket.bucket_regional_domain_name
    origin_id                = "S3-VideoAssets"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-VideoAssets"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    # In production, require Signed URLs or Signed Cookies for stream routes
    trusted_signers = ["self"] 
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  # In production, attach AWS WAF Web ACL
  web_acl_id = aws_wafv2_web_acl.waf.arn

  tags = {
    Environment = "production"
  }
}


# ==============================================================
# AWS WAF Web ACL Configuration
# ==============================================================

resource "aws_wafv2_web_acl" "waf" {
  provider    = aws.primary
  name        = "${var.project_name}-waf"
  description = "WAF for CloudFront Netflix Distribution"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Core Rule Set protection rule
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "NetflixWAFMetric"
    sampled_requests_enabled   = true
  }
}


# ==============================================================
# Route53 Latency & Geolocation routing
# ==============================================================

resource "aws_route53_zone" "primary" {
  provider = aws.primary
  name     = var.domain_name
}

# Example Latency Routing - Us East EKS Ingress Target
resource "aws_route53_record" "latency_east" {
  provider       = aws.primary
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "app.${var.domain_name}"
  type           = "CNAME"
  ttl            = "60"
  set_identifier = "us-east-ingress"
  
  latency_routing_policy {
    region = var.primary_region
  }

  # Points to ALB Ingress generated in primary EKS
  records = ["primary-alb-ingress-12345.us-east-1.elb.amazonaws.com"] 
}

# Example Latency Routing - Us West EKS Ingress Target
resource "aws_route53_record" "latency_west" {
  provider       = aws.primary
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "app.${var.domain_name}"
  type           = "CNAME"
  ttl            = "60"
  set_identifier = "us-west-ingress"
  
  latency_routing_policy {
    region = var.secondary_region
  }

  # Points to ALB Ingress generated in secondary EKS
  records = ["secondary-alb-ingress-67890.us-west-2.elb.amazonaws.com"] 
}

# Example Geolocation Routing (Backup / Regional restriction logic)
resource "aws_route53_record" "geo_europe" {
  provider       = aws.primary
  zone_id        = aws_route53_zone.primary.zone_id
  name           = "app.${var.domain_name}"
  type           = "CNAME"
  ttl            = "60"
  set_identifier = "europe-geo-route"

  geolocation_routing_policy {
    continent = "EU"
  }

  # Route European traffic explicitly to secondary region, or static region CDN
  records = ["secondary-alb-ingress-67890.us-west-2.elb.amazonaws.com"]
}
