# Administrator Guide

**HASSIBA Suite ERP v2.0.0 - Guide de l'Administrateur**  
**System Administration & Configuration Manual**

---

## Overview

This guide is for system administrators responsible for installing, configuring, and maintaining HASSIBA Suite ERP. It covers deployment, user management, security configuration, and troubleshooting.

### Administrator Responsibilities

- System installation and updates
- User and role management
- Company configuration
- Security settings
- Database maintenance
- Backup and recovery
- Performance monitoring
- Troubleshooting

---

## Installation

### System Requirements

#### Minimum Requirements (10 users)

| Component | Specification |
|-----------|---------------|
| **CPU** | 2 cores, 1.5 GHz+ |
| **Memory (RAM)** | 4 GB |
| **Storage** | 20 GB SSD |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 |
| **Runtime** | Node.js 18+ or Bun 1.x |
| **Database** | SQLite (included) or PostgreSQL 14+ |

#### Recommended Requirements (50+ users)

| Component | Specification |
|-----------|---------------|
| **CPU** | 4 cores, 2.5 GHz+ |
| **Memory (RAM)** | 8 GB |
| **Storage** | 50 GB SSD |
| **Database** | PostgreSQL 14+ (recommended) |
| **Redis** | For caching/sessions (recommended) |
| **Reverse Proxy** | Nginx or Caddy |

### Installation Steps

#### 1. Prepare Environment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if using Node)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Or install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Verify installation
node --version   # or bun --version
npm --version    # or bun --version
```

#### 2. Get Application Code

```bash
# Clone repository (or extract release archive)
git clone https://github.com/your-org/hassiba-erp.git
cd hassiba-erp

# Install dependencies
npm install   # or bun install
```

#### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

#### 4. Set Up Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# OR run migrations (production)
npx prisma migrate deploy

# Seed initial data (optional)
npx tsx src/lib/seed.ts
```

#### 5. Build Application

```bash
# Build for production
npm run build
```

#### 6. Start Application

```bash
# Start production server
npm start

# Server runs on port 3000 by default
# Access at http://your-server:3000
```

### Docker Deployment (Recommended)

Using Docker Compose for easier management:

```yaml
# docker-compose.yml (simplified)
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/prod.db
      - NEXTAUTH_SECRET=your-super-secret-key
    volumes:
      - ./data:/app/data
    restart: unless-stopped
  
  # Optional: Nginx reverse proxy
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
```

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app
```

---

## Configuration

### Environment Variables

Create/edit `.env` file in project root:

```bash
# ============================================================
# HASSIBA Suite ERP - Environment Configuration
# ============================================================

# --- Application ---
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_NAME="HASSIBA Suite ERP"
NEXT_PUBLIC_APP_VERSION=2.0.0

# --- Authentication (REQUIRED) ---
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://localhost:3000

# --- Database ---
# SQLite (default, good for <50 users)
DATABASE_URL="file:./data/prod.db"

# PostgreSQL (recommended for production)
# DATABASE_URL="postgresql://user:password@localhost:5432/hassiba_erp"

# --- Redis (optional, for caching) ---
# REDIS_URL="redis://localhost:6379"

# --- Company Default ---
DEFAULT_COMPANY_NAME="Votre Entreprise"
DEFAULT_COMPANY_NIF="000000000000000"
DEFAULT_COMPANY_RC="00-00-0000000"
DEFAULT_COMPANY_NIS="0000000000"
DEFAULT_COMPANY_AI="0000"
DEFAULT_COMPANY_WILAYA="16"  # Alger

# --- Email (optional) ---
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASS=your-smtp-password
EMAIL_FROM="HASSIBA ERP <noreply@yourcompany.com>"

# --- File Upload ---
MAX_UPLOAD_SIZE=10485760  # 10MB
UPLOAD_DIR=./uploads

# --- Rate Limiting ---
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000

# --- Allowed Origins (for CSRF) ---
ALLOWED_ORIGINS=yourcompany.com,erp.yourcompany.com
```

### Company Setup

After first login as admin:

1. Navigate to **Paramètres** → **Entreprise**
2. Enter company information:

| Field | Description | Example |
|-------|-------------|---------|
| **Nom** | Legal company name | SARL Example Algérie |
| **NIF** | Numéro Identification Fiscale | 15 digits |
| **RC** | Registre de Commerce | Format varies |
| **NIS** | Numéro Identification Statistique | 10 digits |
| **AI** | Article d'Imposition | Tax office code |
| **Adresse** | Registered address | 123 Rue X, Alger |
| **Code Postal** | Postal code | 16000 |
| **Wilaya** | Province code | 16 (Alger) |
| **Téléphone** | Main phone | +213 555 123456 |
| **Email** | Contact email | contact@example.dz |
| **Site Web** | Website | www.example.dz |
| **Logo** | Company logo | Upload image |

3. Configure fiscal settings:
   - TVA rates (default: 19%, 9%, 7%, 0%)
   - Fiscal year start date
   - Chart of accounts type (PCN standard)

### User Management

#### Creating Users

1. Go to **Paramètres** → **Utilisateurs**
2. Click **Nouvel Utilisateur**
3. Enter user details:

| Field | Required | Description |
|-------|----------|-------------|
| **Email** | ✅ | Login email (unique) |
| **Name** | ✅ | Full name |
| **Password** | ✅ | Initial password (min 8 chars) |
| **Role** | ✅ | Access level (see roles below) |
| **Company** | For multi-company | Assign to company |
| **Phone** | Optional | Contact number |
| **Active** | ✅ | Enable/disable account |

4. Click **Créer**

#### Roles and Permissions

| Role | Description | Typical Users |
|------|-------------|---------------|
| `super_admin` | Full system access | System owner, IT admin |
| `admin` | Full business access (no sys admin) | Business administrator |
| `manager` | Department oversight | Dept managers, directors |
| `accountant` | Finance module full access | Accountant, CFO |
| `hr_manager` | HR module + approvals | HR director |
| `hr_staff` | HR view + basic create | HR assistant |
| `sales_manager` | Sales + approvals | Sales director |
| `salesperson` | Sales operations | Sales rep |
| `warehouse_manager` | Inventory + purchases | Warehouse manager |
| `user` | Own data only | Regular employee |

#### Modifying Users

From user list:
- **Edit:** Click user → Update fields → Save
- **Disable:** Toggle "Actif" off (preserves data)
- **Reset Password:** Click "Réinitialiser" → User gets email with new password
- **Change Role:** Select new role → Save

#### Managing Sessions

As admin, you can:
- View active sessions (**Paramètres** → **Sessions actives**)
- Force logout (terminate session)
- View last login times

### Chart of Accounts Setup

The system uses PCN (Plan Comptable National) compliant accounts:

1. **Paramètres** → **Plan Comptable**
2. Review default chart (PCN Algeria)
3. Customize if needed:
   - Add custom accounts within valid ranges
   - Disable unused accounts
   - Set default accounts for auto-posting

**Main Account Classes:**

| Class | Range | Description |
|-------|-------|-------------|
| 1 | 100-199 | Comptes de capitaux (Capital/Equity) |
| 2 | 200-299 | Immobilisations (Fixed Assets) |
| 3 | 300-397 | Stocks (Inventory) |
| 4 | 400-488 | Tiers (Third Parties: Customers/Suppliers) |
| 5 | 500-586 | Financiers (Financial) |
| 6 | 600-698 | Charges (Expenses) |
| 7 | 700-797 | Produits (Revenue) |
| 8 | 800-889 | Autres (Other) |

### Fiscal Year Configuration

1. **Paramètres** → **Exercices Fiscaux**
2. Create fiscal year:
   - Start date (usually January 1)
   - End date (usually December 31)
   - Status: Open/Closed
3. Only one year should be "Open" for transactions
4. Close year only after:
   - All transactions entered
   - Trial balance verified
   - Annual reports generated
   - Backup created

---

## Maintenance

### Database Backups

#### Automated Backup Script

The project includes a backup script:

```bash
# View the script
cat scripts/backup-database.sh

# Run manually
./scripts/backup-database.sh

# Output: backups/hassiba-erp-YYYYMMDD-HHMMSS.db
```

#### Schedule Automatic Backups (cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/hassiba-erp/scripts/backup-database.sh

# Add weekly full backup (Sunday 3 AM)
0 3 * * 0 /path/to/hassiba-erp/scripts/backup-database.sh --full
```

#### Backup Retention Policy

| Type | Frequency | Retention |
|------|-----------|-----------|
| Incremental | Daily | 30 days |
| Full | Weekly | 12 weeks |
| Archive | Monthly | 12 months |

#### Restore from Backup

```bash
# Stop application
sudo systemctl stop hassiba-erp

# Backup current database (just in case)
cp data/prod.db data/prod.db.broken

# Restore from backup
cp backups/hassiba-erp-20260824-020000.db data/prod.db

# Restart application
sudo systemctl start hassiba-erp
```

### System Updates

#### Updating Application

```bash
# 1. Backup current version
cp -r . ../hassiba-erp-backup-$(date +%Y%m%d)

# 2. Get latest code
git pull origin main

# 3. Update dependencies
npm install

# 4. Run database migrations
npx prisma migrate deploy

# 5. Rebuild application
npm run build

# 6. Restart service
sudo systemctl restart hassiba-erp
```

#### Update Checklist

Before updating:
- [ ] Create full backup
- [ ] Notify users of maintenance window
- [ ] Test update in staging environment
- [ ] Review changelog for breaking changes

After updating:
- [ ] Verify application starts correctly
- [ ] Test critical functions (login, create invoice)
- [ ] Check database integrity
- [ ] Monitor error logs
- [ ] Notify users of completion

### Log Management

#### Log Locations

| Log Type | Location | Description |
|----------|----------|-------------|
| Application logs | `server.log` | Main application output |
| Dev logs | `dev.log` | Development server output |
| Audit logs | Database table | All user actions |
| System logs | `/var/log/syslog` | OS-level events |

#### Viewing Logs

```bash
# Real-time log tailing
tail -f server.log

# Filter for errors
grep -i error server.log

# Filter for specific endpoints
grep "/api/invoices" server.log

# View recent entries
tail -100 server.log
```

#### Log Rotation

Configure logrotate:

```bash
# Create config: /etc/logrotate.d/hassiba-erp
/path/to/hassiba-erp/server.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### Database Maintenance

#### SQLite Maintenance

```bash
# For SQLite databases, run periodic maintenance:

# Check integrity
sqlite3 data/prod.db "PRAGMA integrity_check;"

# Analyze query planner stats
sqlite3 data/prod.db "ANALYZE;"

# Reclaim space (run during low usage)
sqlite3 data/prod.db "VACUUM;"

# Export backup with integrity check
sqlite3 data/prod.db ".backup 'backups/integrity-check.db'"
```

#### PostgreSQL Maintenance (if using)

```sql
-- Update statistics
ANALYZE;

-- Reindex if needed
REINDEX TABLE CONCURRENTLY audit_logs;
REINDEX TABLE CONCURRENTLY invoices;
```

---

## Monitoring

### Health Check Interpretation

Access health endpoint: `GET /api/health`

```json
{
  "status": "healthy",       // healthy, degraded, unhealthy
  "timestamp": "2026-08-24T...",
  "uptime": 86400,           // Seconds since start
  "version": "2.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "up",        // up, down
      "latency_ms": 3        // Query response time
    },
    "memory": {
      "status": "ok",        // ok, warning, critical
      "used_mb": 128,
      "total_mb": 512,
      "percent": 25          // <75 ok, 75-90 warn, >90 critical
    }
  }
}
```

**Status Actions:**

| Overall Status | Action Required |
|----------------|-----------------|
| `healthy` | None - normal operation |
| `degraded` | Investigate warnings - memory high? |
| `unhealthy` | Immediate attention required - database down? |

### Setting Up Monitoring Alerts

#### Simple Monitoring Script

```bash
#!/bin/bash
# health-check.sh - Basic monitoring

HEALTH=$(curl -sf http://localhost:3000/api/health)
STATUS=$(echo $HEALTH | jq -r '.status')

if [ "$STATUS" = "unhealthy" ]; then
    # Send alert (email, Slack, etc.)
    echo "CRITICAL: HASSIBA ERP is unhealthy!" | mail -s "ERP Alert" admin@company.dz
elif [ "$STATUS" = "degraded" ]; then
    echo "WARNING: HASSIBA ERP is degraded" | mail -s "ERP Warning" admin@company.dz
fi
```

#### Recommended Monitoring Tools

| Tool | Type | Use Case |
|------|------|----------|
| **UptimeRobot** | External | Availability monitoring |
| **Prometheus + Grafana** | Self-hosted | Metrics and dashboards |
| **DataDog/New Relic** | Cloud APM | Application performance |
| **Sentry** | Error tracking | Error alerts |
| **LogRocket** | Session replay | UX issues |

### Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Response time P95 | >500ms | >1000ms |
| Error rate | >1% | >5% |
| Memory usage | >75% | >90% |
| CPU usage | >70% | >90% |
| Disk usage | >80% | >95% |
| Database connections | >70% pool | >90% pool |

---

## Troubleshooting Common Issues

### Application Won't Start

**Symptoms:** Server fails to start, error in console

**Solutions:**

```bash
# 1. Check Node/Bun version
node --version   # Need 18+
bun --version    # Need 1+

# 2. Check .env file exists
ls -la .env

# 3. Check required variables
grep NEXTAUTH_SECRET .env
grep DATABASE_URL .env

# 4. Check database connection
npx prisma db push --accept-data-loss

# 5. Check port availability
lsof -i :3000

# 6. Check build
npm run build
```

### Database Connection Errors

**Symptoms:** "Database unavailable", connection refused

**Solutions:**

```bash
# 1. Verify database file exists
ls -la data/prod.db

# 2. Check permissions
chmod 644 data/prod.db

# 3. Test connection
npx prisma db execute --sql "SELECT 1"

# 4. For PostgreSQL: check service status
sudo systemctl status postgresql
```

### Authentication Issues

**Symptoms:** Login fails, sessions not working

**Solutions:**

```bash
# 1. Verify NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET

# 2. Check NEXTAUTH_URL matches actual URL
echo $NEXTAUTH_URL

# 3. Ensure secret is long enough (32+ chars)
# Generate new: openssl rand -base64 32

# 4. Clear sessions (force re-login)
# This happens automatically on secret change
```

### Slow Performance

**Symptoms:** Pages load slowly, API responses slow

**Solutions:**

```bash
# 1. Check resource usage
top
free -h

# 2. Check database size
ls -lh data/prod.db

# 3. Run VACUUM on SQLite
sqlite3 data/prod.db "VACUUM;"

# 4. Check for long-running queries
# Enable query logging in Prisma if needed

# 5. Restart application
sudo systemctl restart hassiba-erp
```

### Permission Errors

**Symptoms:** "Accès refusé", features missing

**Solutions:**

1. Verify user role assignment
2. Check role has required permission
3. Ensure user account is active
4. Check company assignment (multi-tenant)

### Memory Issues

**Symptoms:** OOM crashes, "degraded" health status

**Solutions:**

```bash
# 1. Increase container/memory limit
# Docker: Update docker-compose.yml memory limit
# System: Increase available RAM

# 2. Reduce Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=512"

# 3. Restart service
sudo systemctl restart hassiba-erp
```

---

## Security Administration

### Security Best Practices

| Practice | Implementation |
|----------|----------------|
| **Strong passwords** | Enforce policy (8+ chars, mixed types) |
| **Regular updates** | Apply security patches monthly |
| **Backup encryption** | Encrypt backup files |
| **HTTPS only** | Use SSL/TLS in production |
| **Network firewall** | Restrict port 3000 to internal |
| **Audit logs** | Review weekly |
| **User access reviews** | Quarterly |
| **Account disablement** | When employees leave immediately |

### Managing Locked Accounts

When users get locked out (5 failed attempts):

**Option 1: Wait** - Lockout expires after 15 minutes

**Option 2: Admin unlock** - Clear lockout via database:
```sql
-- Not directly possible; lockout is in-memory
-- Simply restart server to clear all lockouts
-- Or wait for automatic expiry
```

**Option 3: User self-service** - After lockout expires, they can retry

### Security Headers Verification

Test your security headers:

```bash
# Using curl
curl -I https://erp.yourcompany.com

# Look for these headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: default-src 'self'
```

---

## Support & Resources

### Getting Help

| Resource | Location |
|----------|----------|
| **Documentation** | This guide, User Guide |
| **Issue Tracker** | Your internal GitLab/GitHub |
| **Community** | (If applicable) |
| **Vendor Support** | Contact information |

### Emergency Contacts

| Issue Type | Contact |
|------------|---------|
| System down | IT Infrastructure team |
| Security incident | CISO / Security team |
| Data loss | Database admin |
| User access issues | HR / Manager approval |

---

*Administrator Guide v2.0.0 - HASSIBA Suite ERP*  
*Last updated: 2026-08-24*
*For technical support, consult your system documentation or contact IT*
