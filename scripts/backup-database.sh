#!/bin/bash
# ============================================================
# HASSIBA Suite ERP v2.0.0 - Database Backup Script
# Supports SQLite and PostgreSQL
# ============================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_TYPE="${DB_TYPE:-sqlite}"
RETENTION_DAYS=${RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${S3_BUCKET:-}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     HASSIBA Suite ERP - Database Backup                    ║"
echo "║     Time: $(date)                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# SQLite Backup
backup_sqlite() {
    local DB_PATH="${SQLITE_DB_PATH:-./db/custom.db}"
    
    if [ ! -f "$DB_PATH" ]; then
        echo "❌ SQLite database not found at: $DB_PATH"
        exit 1
    fi
    
    local BACKUP_FILE="$BACKUP_DIR/hassiba_sqlite_$TIMESTAMP.db"
    
    echo "📦 Creating SQLite backup..."
    cp "$DB_PATH" "$BACKUP_FILE"
    gzip "$BACKUP_FILE"
    
    echo "✅ SQLite backup created: $BACKUP_FILE.gz"
    echo "📊 Size: $(du -h "$BACKUP_FILE.gz" | cut -f1)"
}

# PostgreSQL Backup
backup_postgres() {
    local PG_HOST="${PG_HOST:-localhost}"
    local PG_PORT="${PG_PORT:-5432}"
    local PG_USER="${PG_USER:-hassiba}"
    local PG_DB="${PG_DB:-hassiba_erp}"
    
    local BACKUP_FILE="$BACKUP_DIR/hassiba_postgres_$TIMESTAMP.sql.gz"
    
    echo "📦 Creating PostgreSQL backup..."
    PGPASSWORD="$PG_PASSWORD" pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" | gzip > "$BACKUP_FILE"
    
    echo "✅ PostgreSQL backup created: $BACKUP_FILE"
    echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
}

# Upload to S3 (optional)
upload_s3() {
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        echo "☁️ Uploading to S3..."
        aws s3 sync "$BACKUP_DIR/" "s3://$S3_BUCKET/hassiba-backups/" --delete
        echo "✅ Upload to S3 complete"
    fi
}

# Cleanup old backups
cleanup_old() {
    echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "*.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find "$BACKUP_DIR" -name "*.db" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    echo "✅ Cleanup complete"
}

# Main execution
case "$DB_TYPE" in
    sqlite) backup_sqlite ;;
    postgres) backup_postgres ;;
    *)
        echo "❌ Invalid DB_TYPE. Use 'sqlite' or 'postgres'"
        exit 1
esac

upload_s3
cleanup_old

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ Backup completed successfully!"
echo "📂 Location: $BACKUP_DIR"
echo "══════════════════════════════════════════════════════════════"
