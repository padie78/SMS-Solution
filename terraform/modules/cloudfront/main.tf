# Origin Access Control (OAC) para que solo CloudFront pueda leer el S3
resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "${var.project_name}-${var.environment}-oac"
  description                       = "OAC para el acceso al bucket de frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Política de Cabeceras de Respuesta (Aquí va el fix del CSP)
resource "aws_cloudfront_response_headers_policy" "csp_policy" {
  name = "${var.project_name}-${var.environment}-csp-policy"

  security_headers_config {
    content_security_policy {
      override = true
      # 'unsafe-eval' es necesario para el motor de renderizado de ng2-pdf-viewer
      # 'unsafe-inline' es necesario para los estilos de PrimeNG/Tailwind
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.amazonaws.com https://*.appsync-api.us-east-1.amazonaws.com;"
    }
    
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
      preload                    = true
    }

    xss_protection {
      mode_block = true
      override   = true
      protection = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    content_type_options {
      override = true
    }
  }
}

# Distribución de CloudFront
resource "aws_cloudfront_distribution" "s3_distribution" {
  origin {
    domain_name              = var.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
    origin_id                = "S3-${var.bucket_name}"
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront para ${var.project_name} - ${var.environment}"
  default_root_object = "index.html"

  # Para aplicaciones Angular (SPA), manejamos los errores 403/404 redirigiendo al index.html
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${var.bucket_name}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy     = "redirect-to-https"
    min_ttl                    = 0
    default_ttl                = 3600
    max_ttl                    = 86400
    
    # ASOCIACIÓN DE LA POLÍTICA CSP
    response_headers_policy_id = aws_cloudfront_response_headers_policy.csp_policy.id
  }

  price_class = "PriceClass_100" # Usa solo nodos de NA y Europa para optimizar costos

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # Si tienes un certificado en ACM, úsalo aquí:
    # acm_certificate_arn = var.acm_certificate_arn
    # ssl_support_method  = "sni-only"
  }

  tags = var.tags
}