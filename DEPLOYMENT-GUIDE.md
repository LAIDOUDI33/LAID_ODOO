# HASSIBA Suite ERP - Production Deployment Guide

**Version:** 2.0.0  
**Last Updated:** 2025  
**Framework:** Next.js 16 + Bun + Prisma ORM

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker)](#quick-start-docker)
3. [Manual Deployment](#manual-deployment)
4. [Docker Configuration](#docker-configuration)
5. [Nginx Configuration](#nginx-configuration)
6. [Caddy Reverse Proxy (Alternative)](#caddy-reverse-proxy-alternative)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Backup Strategy](#backup-strategy)
9. [Monitoring & Health Checks](#monitoring--health-checks)
10. [Scaling Considerations](#scaling-considerations)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 2 GB | 4-8 GB |
| **Storage** | 20 GB SSD | 50+ GB SSD |
| **OS** | Ubuntu 22.04+, Debian 12, RHEL 9 | Ubuntu 22.04 LTS |

### Software Requirements

```bash
# Runtime
- Node.js 18+ / Bun 1.x
- SQLite 3.x (development) or PostgreSQL 14+ (production)

# Containerization (Docker deployment)
- Docker 24.0+
- Docker Compose 2.20+

# Reverse Proxy
- Nginx 1.25+ OR Caddy 2.6+

# SSL
- Let's Encrypt certbot (for automatic certificates)
```

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Application
NODE_ENV=production
NEXTAUTH_SECRET=<your-random-secret-min-32-chars>
NEXTAUTH_URL=https://erp.yourcompany.com

# Database (SQLite - default for development)
DATABASE_URL="file:./data/custom.db"

# Database (PostgreSQL - recommended for production)
# DATABASE_URL="postgresql://hassiba:password@postgres:5432/hassiba_erp?schema=public"

# PostgreSQL (if using Docker postgres service)
POSTGRES_USER=hassiba
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=hassiba_erp

# Redis Cache (optional but recommended)
REDIS_URL=redis://redis:6379

# MinIO Object Storage (for document uploads)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minio_secure_password

# Algerian Tax Configuration
COGS_RATIO=0.6
NEGATIVE_STOCK_POLICY=prevent
```

---

## Quick Start (Docker)

### 1. Clone Repository & Environment Setup

```bash
git clone https://github.com/your-org/hassiba-suite-erp.git
cd hassiba-suite-erp

# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

### 2. Build and Start Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Check service status
docker-compose ps
```

### 3. Initialize Database

```bash
# Push database schema
docker-compose exec app bun run db:push

# (Optional) Seed with demo data
docker-compose exec app bun run seed
```

### 4. Access Application

```
http://your-server-ip:3000
```

Default credentials after seeding:
- **Email:** admin@hassiba.dz
- **Password:** admin123

---

## Manual Deployment

### 1. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 2. Build Application

```bash
# Production build (creates standalone output)
bun run build

# The build outputs to:
# - .next/standalone/  (self-contained server)
# - .next/static/     (static assets)
# - public/           (public assets)
```

### 3. Configure Environment

```bash
# Set all required environment variables
export NODE_ENV=production
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_URL=https://erp.yourcompany.com
export DATABASE_URL="file:./data/custom.db"
# ... other variables
```

### 4. Initialize Database

```bash
# Push schema to database
bun run db:push

# Generate Prisma client
bun run db:generate

# (Optional) Seed initial data
bun run seed
```

### 5. Start Production Server

```bash
# Using Bun (recommended for performance)
bun start

# Or using Node.js directly
NODE_ENV=production node .next/standalone/server.js

# Server runs on port 3000 by default
```

### 6. Process Manager (PM2)

For production, use PM2 for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start .next/standalone/server.js --name "hassiba-erp"

# Save process list
pm2 save

# Setup startup script
pm2 startup
```

PM2 ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'hassiba-erp',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    max_memory_restart: '512M',
    error_log: './logs/err.log',
    out_log: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

---

## Docker Configuration

### Dockerfile Analysis

The project uses a **multi-stage Dockerfile** optimized for production:

```dockerfile
# Stage 1: Dependencies (cache-optimized)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json bun.lockb* ./
RUN npm install -g bun && bun install --frozen-lockfile

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Stage 3: Production (minimal image)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 hassiba && \
    adduser --system --uid 1001 hassiba

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER hassiba
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

**Key Features:**
- Multi-stage build reduces final image size
- Runs as non-root user (`hassiba`)
- Uses `output: 'standalone'` for self-contained deployment
- Telemetry disabled for privacy

### Docker Compose Stack

The `docker-compose.yml` orchestrates 6 services:

#### Service: `app` (Main Application)
- **Image:** Built from local Dockerfile
- **Ports:** 3000
- **Health Check:** `GET /api/health` every 30s
- **Depends on:** postgres, redis
- **Volumes:** `./data:/app/data` (persistent data)

#### Service: `postgres` (Database)
- **Image:** `postgres:16-alpine`
- **Ports:** 5432
- **Environment:**
  - `POSTGRES_USER`: hassiba (configurable)
  - `POSTGRES_PASSWORD`: (set in .env)
  - `POSTGRES_DB`: hassiba_erp
- **Volumes:** `postgres_data:/var/lib/postgresql/data`
- **Init Script:** `./scripts/init.sql`

#### Service: `redis` (Cache)
- **Image:** `redis:7-alpine`
- **Ports:** 6379
- **Configuration:**
  - AOF persistence enabled
  - Max memory: 256MB
  - Eviction policy: allkeys-lru

#### Service: `minio` (Object Storage)
- **Image:** `minio/minio:latest`
- **Ports:** 9000 (API), 9001 (Console)
- **Purpose:** Document/file storage

#### Service: `nginx` (Reverse Proxy)
- **Image:** `nginx:alpine`
- **Ports:** 80, 443
- **Configuration:** Mounted from `./nginx/`

#### Service: `backup` (Backup Utility)
- **Image:** `alpine:latest`
- **Purpose:** On-demand database backups
- **Command:** Creates timestamped tar.gz of postgres data

### Docker Compose Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs for specific service
docker-compose logs -f app

# Restart specific service
docker-compose restart app

# Scale (if needed)
docker-compose up -d --scale app=2

# Run backup manually
docker-compose run --rm backup

# Cleanup volumes (destructive!)
docker-compose down -v
```

---

## Nginx Configuration

### Main Configuration (`nginx/nginx.conf`)

The Nginx configuration includes:

**Performance Settings:**
- Worker processes: auto
- Worker connections: 2048
- epoll event model
- Multi-accept enabled

**Security Headers:**
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; ..." always;
```

**Rate Limiting Zones:**
| Zone | Rate Limit |
|------|------------|
| `general` | 10 req/s |
| `api` | 5 req/s |
| `auth` | 3 req/min |

**Gzip Compression:**
- Enabled for text, CSS, JSON, JavaScript, SVG
- Compression level: 6

**Body Size Limit:** 50MB (for file uploads)

### Site Configuration (`nginx/confd/hassiba.conf`)

```nginx
upstream hassiba_app {
    server app:3000;
}

# HTTP -> HTTPS Redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name _;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Main Location (general rate limit)
    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://hassiba_app;
        # ... headers
    }

    # API Endpoints (stricter rate limit)
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://hassiba_app;
    }

    # Auth Endpoints (very strict)
    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://hassiba_app;
    }

    # Health Endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://hassiba_app;
        access_log off;
    }

    # Static Files (long cache)
    location /_next/static/ {
        proxy_pass http://hassiba_app;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Caddy Reverse Proxy (Alternative)

If you prefer Caddy over Nginx, a `Caddyfile` is included:

```caddyfile
:81 {
    # Dynamic port forwarding (for development/testing)
    @transform_port_query {
        query XTransformPort=*
    }
    
    handle @transform_port_query {
        reverse_proxy localhost:{query.XTransformPort} {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }

    handle {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up X-Real-IP {remote_host}
        }
    }
}
```

**Caddy advantages:**
- Automatic HTTPS with Let's Encrypt
- Simpler configuration
- HTTP/3 support out of the box

Production Caddy example:
```
erp.yourcompany.com {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
    
    # Rate limiting
    rate_limit {
        zone static {
            key {remote_host}
            events 20
            window 1s
        }
    }
}
```

---

## SSL/TLS Setup

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (Nginx plugin)
sudo certbot --nginx -d erp.yourcompany.com -d www.erp.yourcompany.com

# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically configures Nginx SSL settings
```

### Manual Certificate Installation

```bash
# Create SSL directory
mkdir -p ssl

# Copy your certificates
cp /path/to/cert.pem ssl/cert.pem
cp /path/to/key.pem ssl/key.pem
cp /path/to/ca.pem ssl/ca.pem  # if using chain

# Set permissions
chmod 600 ssl/*
```

### SSL Configuration Best Practices

From the Nginx config:
- **Protocols:** TLSv1.2, TLSv1.3 (TLSv1.0/1.1 disabled)
- **Ciphers:** ECDHE suites only (forward secrecy)
- **HSTS:** Enabled with 1-year max-age
- **Session Cache:** Shared 10MB cache

---

## Backup Strategy

### Automated Backup Script

The project includes `scripts/backup-database.sh`:

```bash
#!/bin/bash
# Supports both SQLite and PostgreSQL

# Configuration via environment variables:
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_TYPE="${DB_TYPE:-sqlite}"          # sqlite or postgres
RETENTION_DAYS=${RETENTION_DAYS:-30}   # Days to keep backups
S3_BUCKET="${S3_BUCKET:-}"             # Optional S3 upload
```

### Setting Up Cron Jobs

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * cd /opt/hassiba-suite-erp && ./scripts/backup-database.sh >> /var/log/hassiba-backup.log 2>&1

# Hourly backup for critical data (optional)
0 * * * * cd /opt/hassiba-suite-erp && DB_TYPE=sqlite ./scripts/backup-database.sh
```

### Docker Backup Commands

```bash
# Create on-demand backup
docker-compose run --rm backup

# List backups
ls -la backups/

# Restore PostgreSQL backup
gunzip -c backups/hassiba_postgres_YYYYMMDD_HHMMSS.sql.gz | docker exec -i hassiba-postgres psql -U hassiba hassiba_erp

# Restore SQLite backup
gunzip -c backups/hassiba_sqlite_YYYYMMDD_HHMMSS.db.gz > data/custom.db
```

### Backup Retention Policy

- **Default retention:** 30 days
- **Configurable:** Set `RETENTION_DAYS` environment variable
- **S3 sync:** Optional automatic upload to AWS S3

---

## Monitoring & Health Checks

### Health Check Endpoint

```
GET /api/health
```

**Response Format:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "2.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "up",
      "latency_ms": 5
    },
    "memory": {
      "status": "ok",
      "used_mb": 128,
      "total_mb": 512,
      "percent": 25
    }
  }
}
```

**Status Values:**
| Status | HTTP Code | Meaning |
|--------|-----------|---------|
| `healthy` | 200 | All systems operational |
| `degraded` | 200 | Working but warnings (e.g., high memory) |
| `unhealthy` | 503 | Critical issues (e.g., database down) |

**HEAD Request (lightweight):**
```bash
curl -I http://localhost:3000/api/health
# Returns: X-App-Version: 2.0.0, X-Status: ok
```

### Docker Health Check

From `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Monitoring Integration

**Prometheus metrics endpoint (future):**
```bash
# Can be added via next.config.ts or middleware
GET /api/metrics
```

**Log aggregation:**
- Application logs: `server.log` (when using bun start)
- Error logs: Console output + structured JSON
- Access logs: Nginx access.log

### Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Response time (p95) | > 2s | Warning |
| Memory usage | > 75% | Warning |
| Memory usage | > 90% | Critical |
| Database latency | > 100ms | Warning |
| Error rate | > 1% | Critical |
| Disk usage | > 85% | Warning |

---

## Scaling Considerations

### Horizontal Scaling

The application supports horizontal scaling with these considerations:

**Stateless Design:**
- Session state stored in database (NextAuth JWT)
- Redis can be used for caching
- File storage externalized to MinIO/S3

**Scaling Steps:**

1. **Multiple App Instances:**
```yaml
# docker-compose.yml modification
services:
  app:
    deploy:
      replicas: 2
```

2. **Load Balancer:**
```nginx
upstream hassiba_app {
    server app1:3000;
    server app2:3000;
    server app3:3000;
    
    # Least connections load balancing
    least_conn;
}
```

3. **Database Scaling:**
   - For PostgreSQL: Use connection pooling (PgBouncer)
   - Read replicas for reporting queries
   - Consider managed database (RDS, Cloud SQL)

### Performance Optimization

**From `next.config.ts`:**
```typescript
const nextConfig = {
  // Standalone output for Docker
  output: "standalone",
  
  // React Strict Mode
  reactStrictMode: true,
  
  // TypeScript strict checking
  typescript: { ignoreBuildErrors: false },
  
  // Security
  poweredByHeader: false,
  
  // Gzip compression
  compress: true,
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  
  // Package optimization
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};
```

**Database Optimization:**
- Add indexes for frequent queries
- Use connection pooling
- Enable query caching (Redis)
- Monitor slow queries

### Resource Planning

| Concurrent Users | RAM | CPU | Database |
|-----------------|-----|-----|----------|
| 1-10 | 2 GB | 2 cores | SQLite OK |
| 10-50 | 4 GB | 4 cores | PostgreSQL |
| 50-200 | 8 GB | 8 cores | PostgreSQL + Redis |
| 200+ | 16+ GB | 8+ cores | Cluster setup |

---

## Troubleshooting

### Common Issues

**1. Port already in use**
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

**2. Database connection failed**
```bash
# Check database is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres psql -U hassiba -d hassiba_erp -c "SELECT 1"

# Check DATABASE_URL format
echo $DATABASE_URL
```

**3. Build fails with memory error**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
bun run build
```

**4. Permission denied on data directory**
```bash
# Fix permissions for Docker volume
chown -R 1001:1001 ./data
```

**5. Health check failing**
```bash
# Test health endpoint directly
curl -v http://localhost:3000/api/health

# Check logs
docker-compose logs app --tail 100
```

### Log Locations

| Component | Log Location |
|-----------|--------------|
| Application | `server.log` or Docker logs |
| Nginx | `/var/log/nginx/` |
| PostgreSQL | Docker logs or `/var/lib/postgresql/data/log/` |
| Backups | `/var/log/hassiba-backup.log` |

### Support & Resources

- **Documentation:** See `API-DOCUMENTATION.md` for API reference
- **Issues:** GitHub Issues
- **Security:** Report security issues privately

---

## Appendix: Complete docker-compose.yml Reference

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: hassiba-suite
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/custom.db
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    volumes:
      - ./data:/app/data
    depends_on:
      - postgres
      - redis
    networks:
      - hassiba-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    container_name: hassiba-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-hassiba}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-hassiba_secure_2024}
      POSTGRES_DB: ${POSTGRES_DB:-hassiba_erp}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - hassiba-network

  redis:
    image: redis:7-alpine
    container_name: hassiba-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - hassiba-network

  minio:
    image: minio/minio:latest
    container_name: hassiba-minio
    restart: unless-stopped
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin123}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    networks:
      - hassiba-network

  nginx:
    image: nginx:alpine
    container_name: hassiba-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - hassiba-network

  backup:
    image: alpine:latest
    container_name: hassiba-backup
    restart: "no"
    volumes:
      - postgres_data:/data/postgres:ro
      - ./backups:/backups
    entrypoint:
      - sh
      - -c
      - |
        tar czf /backups/hassiba-db-$(date +%Y%m%d_%H%M%S).tar.gz -C /data/postgres . &&
        echo 'Backup completed successfully'
    networks:
      - hassiba-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local

networks:
  hassiba-network:
    driver: bridge
```

---

*This documentation is generated from the actual codebase configuration files.*
