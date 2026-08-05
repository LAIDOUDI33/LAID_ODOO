# HASSIBA Suite ERP v2.0.0 - Deployment Guide

## 🚀 Production Deployment Guide

This guide covers deploying **HASSIBA Suite ERP v2.0.0** to production using Docker.

---

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB+ RAM
- 20GB+ disk space
- SSL certificates (Let's Encrypt recommended)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Stack                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐    ┌─────────────┐    ┌──────────┐           │
│   │  Nginx  │───▶│ Next.js App │───▶│ Postgres │           │
│   │  :80/443│    │   :3000     │    │  :5432   │           │
│   └─────────┘    └─────────────┘    └──────────┘           │
│        │                                   │               │
│        │              ┌──────────┐         │               │
│        └─────────────▶│   Redis  │◀────────┘               │
│                       │  :6379   │                         │
│                       └──────────┘                         │
│                              │                              │
│                       ┌──────────┐                         │
│                       │  MinIO   │                         │
│                       │ :9000/1  │                         │
│                       └──────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/LAIDOUDI33/LAID_ODOO.git hassiba-suite
cd hassiba-suite
```

### 2. Configure Environment

```bash
cp .env.production.template .env.production
# Edit .env.production with your values
nano .env.production
```

### 3. Generate SSL Certificates (Optional)

```bash
# Using Let's Encrypt
certbot certonly --standalone -d your-domain.com
mkdir -p ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
```

### 4. Start Services

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f app
```

### 5. Verify Deployment

```bash
# Health check
curl https://your-domain.com/api/health

# Expected response:
# {"status":"healthy","version":"2.0.0",...}
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | Database connection | `file:./data/custom.db` |
| `NEXTAUTH_SECRET` | Auth secret key | Required |
| `NEXTAUTH_URL` | Application URL | Required |
| `POSTGRES_USER` | PostgreSQL user | `hassiba` |
| `POSTGRES_PASSWORD` | PostgreSQL password | Required |
| `POSTGRES_DB` | PostgreSQL database | `hassiba_erp` |
| `MINIO_ROOT_USER` | MinIO admin user | `minioadmin` |
| `MINIO_ROOT_PASSWORD` | MinIO admin password | Required |

---

## 🛡️ Security Checklist

- [ ] Change all default passwords
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules (only open 80, 443)
- [ ] Enable rate limiting in Nginx
- [ ] Configure CSP headers
- [ ] Set up regular backups
- [ ] Enable audit logging
- [ ] Review CORS settings

---

## 💾 Backup & Recovery

### Automated Backups

```bash
# Run backup manually
docker compose run --rm backup

# Schedule with cron (daily at 2 AM)
0 2 * * * cd /opt/hassiba-suite && docker compose run --rm backup >> /var/log/hassiba-backup.log 2>&1
```

### Recovery from Backup

```bash
# Stop application
docker compose down

# Restore database
gunzip -c backups/hassiba_postgres_YYYYMMDD.sql.gz | docker exec -i hassiba-postgres psql -U hassiba hassiba_erp

# Restart services
docker compose up -d
```

---

## 📊 Monitoring

### Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-05T13:00:00Z",
  "uptime": 86400,
  "version": "2.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "up", "latency_ms": 5 },
    "memory": { "status": "ok", "percent": 65 }
  }
}
```

### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f nginx
```

---

## 🔧 Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Clean up old images
docker image prune -f
```

### Database Migrations

```bash
# For SQLite
docker exec hassiba-app bun run db:push

# For PostgreSQL (if using Prisma migrations)
docker exec hassiba-app bun run db:migrate deploy
```

---

## 🐛 Troubleshooting

### Application Won't Start

```bash
# Check container status
docker compose ps

# View application logs
docker compose logs app

# Check port conflicts
netstat -tlnp | grep -E "(3000|80|443)"
```

### Database Connection Issues

```bash
# Test database connection
docker exec hassiba-postgres psql -U hassiba -d hassiba_erp -c "SELECT 1"

# Check database volume
docker volume inspect hassiba-suite_postgres_data
```

### High Memory Usage

```bash
# Monitor resource usage
docker stats

# Adjust Node.js memory limit
# Add to docker-compose.yml:
# environment:
#   - NODE_OPTIONS=--max-old-space-size=512
```

---

## 📞 Support

For issues or questions:
- Documentation: /docs
- Issues: GitHub Issues
- Emergency: Check logs first!

---

**Version:** 2.0.0 Enterprise  
**Last Updated:** August 2025  
**Algerian SCF Compliant:** ✅ Yes
