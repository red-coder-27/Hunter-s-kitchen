# Hunter's Kitchen — PostgreSQL Backup & Disaster Recovery Guide

## 1. Overview & Objectives

This document establishes the official backup, retention, and disaster recovery procedures for the **Hunter’s Kitchen** PostgreSQL production database (`hunters_kitchen`).

### Service Level Objectives (SLOs)
- **Recovery Point Objective (RPO)**: $\le 1\text{ minute}$ (with Continuous WAL Archiving enabled) / $\le 6\text{ hours}$ (with automated snapshot dumps).
- **Recovery Time Objective (RTO)**: $\le 15\text{ minutes}$ for complete database restoration.

---

## 2. Backup Architecture

Hunter's Kitchen utilizes a **hybrid dual-tier backup strategy**:

```mermaid
flowchart TD
    PG[(PostgreSQL 18.x\nPrimary Database)] -->|Scheduled Cron| FULL[Full Logical Backup\npg_dump Custom Format]
    PG -->|Continuous Streaming| WAL[WAL Archive Engine\nWrite-Ahead Logs]
    FULL --> GCS[(Encrypted Cloud Storage / GCS Bucket)]
    WAL --> GCS
    GCS --> RET[Retention Lifecycle Policy\n7 Daily | 4 Weekly | 12 Monthly]
```

### Backup Artifacts:
1. **Logical Full Snapshots (`pg_dump`)**: Daily compressed custom format archives (`.dump`) containing complete schema, foreign keys, row data, and sequence states.
2. **Physical WAL Archives (Continuous PITR)**: Write-Ahead Logs streamed continuously to cloud object storage for Point-in-Time Recovery down to the exact second.

---

## 3. Automated Backup Procedures

### A. Daily Full Logical Snapshot
Run via cron at off-peak hours (e.g., 03:00 AM IST):

```bash
#!/bin/bash
set -eo pipefail

BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/hunters_kitchen_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

# Execute parallel compressed pg_dump
PGPASSWORD="${DB_PASSWORD}" pg_dump \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USERNAME:-postgres}" \
  -d "${DB_DATABASE:-hunters_kitchen}" \
  -F c \
  -b \
  -v \
  -f "${BACKUP_FILE}"

# Generate SHA-256 checksum for tamper-evidence
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

echo "Backup completed: ${BACKUP_FILE}"
```

### B. Point-In-Time Recovery (PITR) WAL Configuration
In `postgresql.conf`:

```ini
# Enable WAL Archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /mnt/wal_archive/%f && cp %p /mnt/wal_archive/%f'
archive_timeout = 300 # Force segment switch every 5 minutes
```

---

## 4. Database Restoration Procedures

### Scenario A: Full Restoration from Logical Dump

To restore `hunters_kitchen` on a fresh or repaired PostgreSQL instance:

```bash
# 1. Terminate existing connections and drop corrupted database
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'hunters_kitchen' AND pid <> pg_backend_pid();
"
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS hunters_kitchen;"
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -c "CREATE DATABASE hunters_kitchen WITH OWNER postgres ENCODING 'UTF8';"

# 2. Verify backup checksum integrity
sha256sum -c hunters_kitchen_20261003_030000.dump.sha256

# 3. Restore schema, constraints, and data in parallel
PGPASSWORD="${DB_PASSWORD}" pg_restore \
  -h localhost \
  -U postgres \
  -d hunters_kitchen \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -v \
  hunters_kitchen_20261003_030000.dump

# 4. Analyze restored database for query planner optimization
PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U postgres -d hunters_kitchen -c "VACUUM ANALYZE;"
```

### Scenario B: Point-in-Time Recovery (PITR) to Specific Timestamp

If data was accidentally corrupted or deleted at `2026-10-03 14:15:00 IST`:

1. Stop PostgreSQL service: `systemctl stop postgresql`
2. Restore latest base backup into data directory `$PGDATA`.
3. Create `/var/lib/postgresql/data/recovery.signal`.
4. In `postgresql.conf`, specify:
   ```ini
   restore_command = 'cp /mnt/wal_archive/%f %p'
   recovery_target_time = '2026-10-03 14:14:59+05:30'
   recovery_target_action = 'promote'
   ```
5. Start PostgreSQL service: `systemctl start postgresql`.
6. Monitor recovery progress in PostgreSQL log until promotion occurs.

---

## 5. Post-Restore Verification Drill

After any restoration drill, run the automated verification suite to validate consistency:

```bash
# Run 100% production test suite
npm run build
npx tsx scripts/verify-postgres-production.ts
```

### Checklist for Successful Recovery:
- [x] All 17 tables populated with correct primary and foreign key constraints.
- [x] Bcrypt password verification passes for `hunterkitchen777@gmail.com` and staff users.
- [x] SHA-256 audit log hash chain passes `auditService.verifyIntegrity()`.
- [x] FSM state transitions and optimistic locking succeed with zero error.
- [x] Financial reconciliation audit reports matching revenues.

---

## 6. Backup Retention & Rotation Policy

| Backup Tier | Frequency | Retention Window | Storage Location |
| :--- | :--- | :--- | :--- |
| **Hot Snapshots** | Every 6 hours | 48 hours | Local SSD `/var/backups` |
| **Daily Snapshots** | Once daily (03:00 AM) | 7 days | Cloud Storage Standard |
| **Weekly Snapshots** | Every Sunday | 4 weeks | Cloud Storage Coldline |
| **Monthly Archives** | 1st of each month | 12 months | Cloud Storage Archive |
| **Continuous WAL** | Continuous (5m seg) | 7 days | Cloud Storage Standard |

---

## 7. Monthly Disaster Recovery Drill Schedule

Disaster recovery drills must be executed on the **first Saturday of every month** on staging:
1. Spin up an isolated PostgreSQL container.
2. Restore the latest production backup dump.
3. Execute `npx tsx scripts/verify-postgres-production.ts`.
4. Log RTO, checksum verification, and test results into compliance records.
