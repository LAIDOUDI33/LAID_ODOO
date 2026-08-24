# Backup & Disaster Recovery

**HASSIBA Suite ERP v2.0.0** | Final Certification Documentation

---

## Overview

This document outlines the backup strategy, disaster recovery procedures, and business continuity plan for HASSIBA Suite ERP. It ensures data protection, minimal downtime, and quick recovery from various failure scenarios.

## RTO/RPO Objectives

| Objective | Target | Description |
|-----------|--------|-------------|
| **RPO (Recovery Point Objective)** | 1 hour | Maximum acceptable data loss |
| **RTO (Recovery Time Objective)** | 4 hours | Maximum time to restore service |
| **MTTR (Mean Time To Recover)** | 2 hours | Average recovery time |
| **Backup Verification** | Weekly | Automated restore testing |

---

## Backup Strategy

### Data Classification

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA CLASSIFICATION                        │
├─────────────────────┬───────────┬───────────┬───────────────────┤
│ Category           │ Criticality│ Frequency │ Retention         │
├─────────────────────┼───────────┼───────────┼───────────────────┤
│ Database (PostgreSQL)│ CRITICAL │ Hourly    │ 30d daily, 12w     │
│                     │           │ Daily     │ weekly, 7y monthly│
│ SQLite Database     │ HIGH      │ Daily     │ 30 days            │
│ Uploaded Documents  │ HIGH      | Real-time │ 1 year             │
│ (MinIO/S3)          │           | sync      │                    │
│ Application Config  │ MEDIUM    | On change │ 1 year             │
│ Exported Reports    │ LOW       | On demand │ 90 days            │
│ Logs                │ LOW       | Daily     │ 30 days            │
└─────────────────────┴───────────┴───────────┴───────────────────┘
```

### Database Backups

#### PostgreSQL Backups (Production)

Based on `scripts/backup-database.sh`:

```bash
#!/bin/bash
# Production PostgreSQL Backup Configuration

# Environment Variables
export PG_HOST="${PG_HOST:-hassiba-postgres}"
export PG_PORT="${PG_PORT:-5432}"
export PG_USER="${PG_USER:-hassiba}"
export PG_DB="${PG_DB:-hassiba_erp}"
export BACKUP_DIR="/backups/postgresql"
export S3_BUCKET="s3://your-company-backups/hassiba-erp/prod"
export RETENTION_DAYS=30

# Create timestamped backup with compression
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/hassiba_postgres_$TIMESTAMP.sql.gz"

# Execute backup with pg_dump
PGPASSWORD="$PG_PASSWORD" pg_dump \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  -d "$PG_DB" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="$BACKUP_FILE"

echo "✅ PostgreSQL backup created: $BACKUP_FILE"
echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
```

#### SQLite Backups (Development/Staging)

```bash
# From scripts/backup-database.sh - SQLite section
backup_sqlite() {
    local DB_PATH="${SQLITE_DB_PATH:-./data/custom.db}"
    local BACKUP_FILE="$BACKUP_DIR/hassiba_sqlite_$(date +%Y%m%d_%H%M%S).db"
    
    # Use SQLite backup command for consistency
    sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
    
    # Compress
    gzip "$BACKUP_FILE"
    
    echo "✅ SQLite backup created: $BACKUP_FILE.gz"
}
```

#### Backup Schedule

| Backup Type | Frequency | Time | Retention |
|-------------|-----------|------|-----------|
| Full Dump | Hourly | :00 | 24 hours |
| Full Dump | Daily | 02:00 | 30 days |
| Full Dump | Weekly | Sunday 02:00 | 12 weeks |
| Full Dump | Monthly | 1st of month | 7 years |
| WAL Archive | Continuous | - | 7 days |

### Object Storage Backups (MinIO/S3)

#### Cross-Region Replication

```yaml
# MinIO bucket replication configuration
apiVersion: minio.min.io/v2
kind: BucketReplication
metadata:
  name: hassiba-documents-replication
  namespace: hassiba-erp
spec:
  source:
    bucket: hassiba-documents
  target:
    endpoint: backup-minio.backup-svc:9000
    bucket: hassiba-documents-backup
    credentials:
      name: backup-credentials
  replicationRules:
    - ruleID: "replicate-all"
      priority: "1"
      filter:
        prefix: ""
      deleteMarkerReplication: "Disable"
      deleteReplication: "Disable"
```

#### S3 Sync for Documents

```bash
#!/bin/bash
# Sync uploaded documents to backup S3 bucket
aws s3 sync s3://hassiba-prod-documents/ \
  s3://hassiba-backup-documents/ \
  --delete \
  --storage-class STANDARD_IA \
  --no-progress

echo "Document backup completed: $(date)"
```

### Application Configuration Backups

```bash
#!/bin/bash
# Backup Kubernetes configurations and secrets

BACKUP_DIR="/backups/configs"
DATE=$(date +%Y%m%d_%H%M%S)

# Export all resources from namespace
kubectl get all -n hassiba-erp -o yaml > "$BACKUP_DIR/all_resources_$DATE.yaml"
kubectl get configmaps -n hassiba-erp -o yaml > "$BACKUP_DIR/configmaps_$DATE.yaml"
kubectl get secrets -n hassiba-erp -o yaml > "$BACKUP_DIR/secrets_$DATE.enc"  # Encrypted
kubectl get ingress -n hassiba-erp -o yaml > "$BACKUP_DIR/ingress_$DATE.yaml"
kubectl get pvc -n hassiba-erp -o yaml > "$BACKUP_DIR/pvc_$DATE.yaml"

# Encrypt sensitive data
gpg --batch --yes --passphrase="$ENCRYPTION_KEY" \
  --symmetric --cipher-algo AES256 \
  "$BACKUP_DIR/secrets_$DATE.enc"

echo "Configuration backup completed"
```

### Kubernetes Volume Snapshots

```yaml
# VolumeSnapshotClass for AWS EBS
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: ebs-csi-driver
  annotations:
    snapshot.storage.kubernetes.io/is-default-class: "true"
driver: ebs.csi.aws.com
deletionPolicy: Retain

---
# Scheduled Volume Snapshot
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: hassiba-daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
      - hassiba-erp
    storageLocation: aws-backups
    volumeSnapshotLocations:
      - aws-snapshots
    ttl: 720h  # 30 days retention
```

---

## Backup Storage Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       BACKUP STORAGE                               │
│                                                                     │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐  │
│   │   Primary   │     │   Regional  │     │     Cross-Region    │  │
│   │   (S3)      │────▶│   (S3)      │────▶│     (S3/GCS)       │  │
│   │             │     │             │     │                     │  │
│   │ • Hot data  │     • Daily      │     • Weekly             │  │
│   │ • Quick     │   • 30 day      │   • 1 year            │  │
│   │   restore   │     retention   │     retention           │  │
│   └─────────────┘     └─────────────┘     └─────────────────────┘  │
│          │                   │                    │               │
│          ▼                   ▼                    ▼               │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐  │
│   │   Glacier   │     │   Glacier   │     │     Archive         │  │
│   │   (Long-    │     │   (Long-    │     │     (7+ years)      │  │
│   │    term)    │     │    term)    │     │                     │  │
│   └─────────────┘     └─────────────┘     └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Storage Tiers

| Tier | Storage Class | Use Case | Cost (approx) |
|------|---------------|----------|---------------|
| Hot | S3 Standard | Recent backups (<7 days) | $0.023/GB |
| Warm | S3 Standard-IA | Regular backups (7-90 days) | $0.0125/GB |
| Cold | S3 Glacier | Archives (90 days - 7 years) | $0.004/GB |
| Archive | S3 Deep Archive | Long-term (>7 years) | $0.00099/GB |

---

## Recovery Procedures

### Point-in-Time Recovery (PITR)

#### Database Recovery to Specific Time

```bash
#!/bin/bash
# PostgreSQL Point-in-Time Recovery

RECOVERY_TIME="2024-01-15 14:30:00"  # Target recovery time
BACKUP_FILE="/restores/hassiba_postgres_20240115.sql.gz"

# 1. Stop application
kubectl scale deployment hassiba-app --replicas=0 -n hassiba-erp

# 2. Create recovery instance
kubectl run postgres-recovery \
  --image=postgres:16-alpine \
  --namespace=hassiba-erp \
  --env="PGDATA=/var/lib/postgresql/data/recovery" \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "postgres-recovery",
        "command": ["bash", "-c", "
          gunzip -c /backup/$BACKUP_FILE | psql &&
          echo \"Recovery complete\"
        "],
        "volumeMounts": [{
          "name": "backup",
          "mountPath": "/backup"
        }]
      }],
      "volumes": [{
        "name": "backup",
        "persistentVolumeClaim": {
          "claimName": "backup-data"
        }
      }]
    }
  }' \
  --restart=Never

# 3. Verify recovery
kubectl exec -it postgres-recovery -n hassiba-erp -- psql -U hassiba -d hassiba_erp -c "SELECT count(*) FROM users;"

# 4. Swap database (if recovery successful)
# ... proceed with cutover procedure

# 5. Restart application
kubectl scale deployment hassiba-app --replicas=2 -n hassiba-erp
```

#### Step-by-Step Recovery Process

```
┌─────────────────────────────────────────────────────────────────┐
│                  RECOVERY PROCEDURE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ASSESS (0-15 min)                                          │
│     ├─ Identify scope of data loss                             │
│     ├─ Determine target recovery point                         │
│     └─ Notify stakeholders                                     │
│                                                                 │
│  2. PREPARE (15-30 min)                                        │
│     ├─ Stop application writes                                 │
│     ├─ Retrieve backup from storage                            │
│     └─ Prepare recovery environment                            │
│                                                                 │
│  3. RESTORE (30 min - 2 hours)                                 │
│     ├─ Restore database from backup                           │
│     ├─ Apply WAL logs (if PITR)                                │
│     ├─ Verify data integrity                                   │
│     └─ Document recovery actions                               │
│                                                                 │
│  4. VALIDATE (15-30 min)                                       │
│     ├─ Run data consistency checks                             │
│     ├─ Verify application functionality                        │
│     ├─ Test critical user workflows                            │
│     └─ Get QA sign-off                                         │
│                                                                 │
│  5. CUTOVER (15-30 min)                                        │
│     ├─ Switch traffic to recovered system                      │
│     ├─ Monitor for issues                                      │
│     └─ Confirm with stakeholders                               │
│                                                                 │
│  Total Estimated Time: 2-4 hours                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Disaster Recovery

#### DR Site Activation

**Scenario**: Complete primary region failure

```bash
#!/bin/bash
# Disaster Recovery - Failover to DR Site

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     HASSIBA ERP - DISASTER RECOVERY FAILOVER               ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# 1. Update DNS to point to DR site
echo "[1/6] Updating DNS records..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "erp.yourdomain.com",
        "Type": "CNAME",
        "TTL": 60,
        "ResourceRecords": [{"Value": "dr-loadbalancer-$REGION.elb.amazonaws.com"}]
      }
    }]
  }'

# 2. Promote DR database (if using read replica)
echo "[2/6] Promoting DR database..."
aws rds promote-read-replica \
  --db-instance-identifier hassiba-erp-dr

# 3. Wait for promotion
echo "[3/6] Waiting for database promotion..."
aws rds wait db-instance-available \
  --db-instance-identifier hassiba-erp-dr

# 4. Update Kubernetes secrets with new DB endpoint
echo "[4/6] Updating configuration..."
kubectl patch secret hassiba-secrets -n hassiba-erp \
  --type=json \
  -p="[{\"op\": \"replace\", \"/data/DATABASE_URL\": \"$(echo -n 'postgresql://...' | base64)\"}]"

# 5. Restart deployments
echo "[5/6] Restarting applications..."
kubectl rollout restart deployment/hassiba-app -n hassiba-erp
kubectl rollout status deployment/hassiba-app -n hassiba-erp --timeout=300s

# 6. Verify health
echo "[6/6] Verifying system health..."
sleep 30
kubectl exec -it deploy/hassiba-app -n hassiba-erp -- curl -sf http://localhost:3000/api/health

echo ""
echo "✅ Failover complete!"
echo "🌐 Application now running in DR region: $REGION"
```

#### DR Site Components

| Component | Primary Region | DR Region |
|-----------|----------------|-----------|
| Kubernetes Cluster | EKS us-east-1 | EKS eu-west-1 |
| PostgreSQL | RDS Multi-AZ | Read Replica (promoted on failover) |
| Redis | ElastiCache Cluster | ElastiCache Replica Group |
| S3 Storage | Primary + Cross-region replication | Replicated |
| DNS | Route53 (primary) | Route53 failover routing |

#### Failback Procedure

After primary region is restored:

```bash
#!/bin/bash
# Failback to Primary Region

# 1. Ensure primary is healthy
# 2. Sync data from DR to Primary
# 3. Update DNS TTL to high value temporarily
# 4. Switch DNS back to primary
# 5. Monitor primary stability
# 6. Re-establish replication (new read replica in DR)

echo "Initiating failback procedure..."
```

---

## Testing Backups

### Automated Backup Verification

```yaml
# CronJob for automated backup testing
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: hassiba-erp
spec:
  schedule: "0 3 * * 0"  # Every Sunday at 3 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup-test
              image: postgres:16-alpine
              command:
                - bash
                - -c
                - |
                  #!/bin/bash
                  set -e
                  
                  echo "Starting backup verification..."
                  
                  # Find latest backup
                  LATEST_BACKUP=$(ls -t /backups/*.sql.gz | head -1)
                  
                  if [ -z "$LATEST_BACKUP" ]; then
                    echo "ERROR: No backups found!"
                    exit 1
                  fi
                  
                  echo "Testing backup: $LATEST_BACKUP"
                  
                  # Create test database
                  psql -U hassiba -d postgres -c "DROP DATABASE IF EXISTS backup_verify;"
                  psql -U hassiba -d postgres -c "CREATE DATABASE backup_verify;"
                  
                  # Restore backup to test database
                  gunzip -c "$LATEST_BACKUP" | psql -U hassiba -d backup_verify
                  
                  # Run verification queries
                  RESULT=$(psql -U hassiba -d backup_verify -t -c "SELECT count(*) FROM users;")
                  echo "User count in backup: $RESULT"
                  
                  RESULT=$(psql -U hassiba -d backup_verify -t -c "SELECT count(*) FROM invoices;")
                  echo "Invoice count in backup: $RESULT"
                  
                  # Clean up
                  psql -U hassiba -d postgres -c "DROP DATABASE backup_verify;"
                  
                  echo "✅ Backup verification completed successfully!"
                  
                  # Send notification
                  curl -s -X POST "$SLACK_WEBHOOK" \
                    -H 'Content-type: application/json' \
                    -d '{"text":"✅ Backup verification passed for '"$LATEST_BACKUP"'"}'
              env:
                - name: PGPASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: hassiba-secrets
                      key: postgres-password
                - name: SLACK_WEBHOOK
                  valueFrom:
                    secretKeyRef:
                      name: hassiba-secrets
                      key: slack-webhook-ops
          restartPolicy: OnFailure
          volumes:
            - name: backups
              persistentVolumeClaim:
                claimName: backup-data
          volumeMounts:
            - name: backups
              mountPath: /backups
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
```

### Restore Testing Schedule

| Test Type | Frequency | Scope | Owner |
|-----------|-----------|-------|-------|
| Backup Integrity | Daily | Verify backup file exists, not empty | Automated |
| Restore Test | Weekly | Restore to test environment | DevOps |
| PITR Test | Monthly | Recover to specific point in time | DBA |
| Full DR Drill | Quarterly | Complete failover to DR site | All Teams |

### Restore Testing Runbook

```markdown
## Weekly Restore Test Checklist

### Pre-Test
- [ ] Identify backup to test (latest full backup)
- [ ] Notify team of scheduled test
- [ ] Prepare test environment

### Execution
- [ ] Download backup from S3
- [ ] Restore to test database
- [ ] Run data integrity checks
  - [ ] Row counts match production (±1% tolerance)
  - [ ] Foreign keys valid
  - [ ] No corrupted data
- [ ] Run application smoke tests against restored data
  - [ ] Login works
  - [ ] Dashboard loads
  - [ ] Sample invoice accessible

### Post-Test
- [ ] Document results
- [ ] Clean up test environment
- [ ] Report any issues found
- [ ] Update runbook if procedures changed
```

---

## Backup Script Reference

### Main Backup Script (`scripts/backup-database.sh`)

The production backup script supports both SQLite and PostgreSQL:

```bash
# Usage Examples

# SQLite Backup
DB_TYPE=sqlite SQLITE_DB_PATH=./data/custom.db ./scripts/backup-database.sh

# PostgreSQL Backup  
DB_TYPE=postgres PG_HOST=localhost PG_PASSWORD=secret ./scripts/backup-database.sh

# With S3 Upload
S3_BUCKET=my-backups DB_TYPE=postgres ./scripts/backup-database.sh

# Custom Retention
RETENTION_DAYS=60 DB_TYPE=postgres ./scripts/backup-database.sh
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backs` | Local backup directory |
| `DB_TYPE` | `sqlite` | Database type: `sqlite` or `postgres` |
| `RETENTION_DAYS` | `30` | Days to keep local backups |
| `S3_BUCKET` | *(empty)* | S3 bucket for cloud upload |
| `PG_HOST` | `localhost` | PostgreSQL host |
| `PG_PORT` | `5432` | PostgreSQL port |
| `PG_USER` | `hassiba` | PostgreSQL user |
| `PG_DB` | `hassiba_erp` | PostgreSQL database name |
| `PG_PASSWORD` | *(required)* | PostgreSQL password |
| `SQLITE_DB_PATH` | `./db/custom.db` | Path to SQLite database |

### Docker Compose Backup Service

From `docker-compose.yml`:

```yaml
backup:
  image: alpine:latest
  container_name: hassiba-backup
  restart: "no"
  volumes:
    - postgres_data:/data/postgres:ro
    - ./backups:/backups
  entrypoint: |
    sh -c "
      tar czf /backups/hassiba-db-$(date +%Y%m%d_%H%M%S).tar.gz -C /data/postgres . &&
      echo 'Backup completed successfully'
    "
```

Run manual backup:
```bash
docker-compose run backup
```

---

## Incident Response

### Data Loss Incident Response

```
┌─────────────────────────────────────────────────────────────────┐
│              DATA LOSS INCIDENT RESPONSE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DETECTION                                                     │
│  ├── User reports missing data                                 │
│  ├── Monitoring alerts (error rates, data inconsistencies)     │
│  └── Audit log anomalies                                       │
│                                                                 │
│  INITIAL RESPONSE (0-30 min)                                    │
│  ├── Assess impact scope                                       │
│  ├── Contain: Stop affected services if needed                 │
│  ├── Communicate: Notify incident commander                   │
│  └─ Preserve: Don't modify affected systems                    │
│                                                                 │
│  INVESTIGATION (30 min - 2 hours)                               │
│  ├── Identify root cause                                       │
│  ├── Determine data loss extent                                │
│  ├── Find last known good state                                │
│  └── Document findings                                         │
│                                                                 │
│  RECOVERY (2-4 hours)                                           │
│  ├── Select appropriate backup                                 │
│  ├── Execute recovery procedure                                │
│  ├── Validate recovered data                                   │
│  └── Restore service                                           │
│                                                                 │
│  POST-INCIDENT                                                  │
│  ├── Conduct post-mortem                                       │
│  ├── Implement preventive measures                             │
│  └── Update documentation/runbooks                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Escalation Matrix

| Severity | Initial Response | Escalation | Communication |
|----------|------------------|------------|---------------|
| P1 - Critical | Immediate | CTO, VP Engineering | All stakeholders, customers |
| P2 - High | < 15 min | Engineering Manager | Internal teams, affected customers |
| P3 - Medium | < 1 hour | Team Lead | Internal teams |
| P4 - Low | < 4 hours | Individual contributor | Sprint backlog |

### Communication Templates

**Initial Incident Notification**:
```
SUBJECT: [P1] HASSIBA ERP - Data Loss Incident Declared

SUMMARY: 
- Incident detected: [TIME]
- Impact: [DESCRIPTION]
- Current status: INVESTIGATING

NEXT UPDATE: [TIME]

INCIDENT COMMANDER: [NAME]
```

**Recovery Complete**:
```
SUBJECT: [RESOLVED] HASSIBA ERP - Data Loss Incident

RESOLUTION SUMMARY:
- Root cause: [CAUSE]
- Recovery method: [METHOD]
- Data restored to: [POINT IN TIME]
- Downtime duration: [DURATION]
- Data loss (if any): [EXTENT]

PREVENTIVE ACTIONS:
1. [ACTION 1]
2. [ACTION 2]

POST-MORTEM SCHEDULED: [DATE/TIME]
```

---

## Compliance & Auditing

### Backup Audit Requirements

| Requirement | Frequency | Evidence |
|-------------|-----------|----------|
| Backup completion verified | Daily | Automated check logs |
| Restore test successful | Weekly | Test execution logs |
| DR drill completed | Quarterly | Drill report |
| Retention policy compliance | Monthly | Storage audit report |
| Access logs reviewed | Monthly | IAM/CloudTrail logs |

### Backup Inventory Report

Generate monthly backup inventory:

```bash
#!/bin/bash
# Generate backup inventory report

echo "=========================================="
echo "HASSIBA ERP - Backup Inventory Report"
echo "Generated: $(date)"
echo "=========================================="
echo ""

echo "=== PostgreSQL Backups ==="
aws s3 ls s3://hassiba-backups/postgresql/ --recursive --summarize \
  | grep -E "(Total|\.sql\.gz)" | tail -20

echo ""
echo "=== Document Backups ==="
aws s3 ls s3://hassiba-backups/documents/ --recursive --summarize

echo ""
echo "=== Config Backups ==="
ls -lh /backups/configs/ | tail -10

echo ""
echo "=== Last Restore Test ==="
kubectl get jobs -n hassiba-erp | grep backup-verify || echo "No recent tests found"
```

---

*Document Version: 1.0.0 | Last Updated: $(date +%Y-%m-%d)*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
