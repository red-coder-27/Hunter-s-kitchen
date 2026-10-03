# Hunter's Kitchen — PostgreSQL Production Operations Runbook

## 1. Production Architecture Overview

The Hunter’s Kitchen application runs on **PostgreSQL 18.x** with a high-throughput connection pool (`pg.Pool`), Redis L1/L2 caching, optimistic concurrency control (OCC), and cryptographic SHA-256 audit log hash chaining.

---

## 2. Key Database Health & Diagnostic Queries

Execute these queries via `psql` or an admin console to inspect system health:

### A. Active Connections & Pool Utilization
```sql
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_queries,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_trans
FROM pg_stat_activity 
WHERE datname = 'hunters_kitchen';
```
> [!WARNING]
> If `idle_in_trans` $> 5$ for longer than 30 seconds, investigate uncommitted client transactions.

### B. Buffer Cache Hit Ratio (Target: > 99%)
```sql
SELECT 
    datname,
    round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2) as cache_hit_ratio
FROM pg_stat_database 
WHERE datname = 'hunters_kitchen';
```

### C. Slow Query Identification
```sql
SELECT 
    pid, 
    now() - query_start AS duration, 
    query, 
    state 
FROM pg_stat_activity 
WHERE datname = 'hunters_kitchen' 
  AND state != 'idle' 
  AND now() - query_start > interval '500 milliseconds'
ORDER BY duration DESC;
```

### D. Table Size & Row Count Summary
```sql
SELECT
    relname AS table_name,
    n_live_tup AS estimated_rows,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

---

## 3. Connection Pool Configuration & Tuning

The application uses `pg.Pool` managed in [`src/server/db/postgres.ts`](file:///d:/xampp/htdocs/hunter's-kitchen/src/server/db/postgres.ts).

### Recommended Production Settings (`.env`):
```ini
DB_POOL_MIN=4
DB_POOL_MAX=25
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=10000
```

### Formula for Pool Sizing:
$$\text{Max Connections} = ((\text{CPU Cores} \times 2) + \text{Spindle/SSD Count})$$
For standard 4-core cloud VM: $4 \times 2 + 1 = 9 \text{ to } 25 \text{ max pool size}$.

---

## 4. Routine Maintenance Schedule

| Maintenance Task | Frequency | Command / Tool | Purpose |
| :--- | :--- | :--- | :--- |
| **`VACUUM ANALYZE`** | Daily at 03:30 AM | `VACUUM (ANALYZE, VERBOSE);` | Reclaims dead tuples, updates query planner statistics |
| **Index Rebuilding** | Monthly (off-peak) | `REINDEX DATABASE CONCURRENTLY hunters_kitchen;` | Eliminates B-Tree index bloat without locking writes |
| **Audit Chain Integrity Check** | Hourly | `auditService.verifyIntegrity()` | Validates SHA-256 tamper-evidence sequence |
| **Outbox Lease Cleanup** | Every 60 seconds | `outboxRepository.recoverStaleProcessing(60000)` | Recovers crashed worker leases |

---

## 5. Troubleshooting Scenarios & Remediation

### Scenario 1: Deadlock Detected (`40P01`)
- **Root Cause**: Two concurrent transactions locking rows in opposing orders (e.g., updating multiple orders simultaneously).
- **Remediation**:
  1. Inspect Postgres logs for `DETAIL: Process X waits for ExclusiveLock...`.
  2. The application includes retry logic and row-level locks sorted by primary key (`ORDER BY id ASC FOR UPDATE`).
  3. Ensure batch operations always sort row IDs before locking.

### Scenario 2: Connection Exhaustion (`too many clients already`)
- **Remediation**:
  1. Terminate orphaned idle sessions:
     ```sql
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE datname = 'hunters_kitchen' 
       AND state = 'idle' 
       AND now() - state_change > interval '5 minutes';
     ```
  2. Increase `max_connections` in `postgresql.conf` (e.g., `max_connections = 100`).
  3. Verify application instances are not leaking connections outside `postgresDb.transaction()`.

### Scenario 3: Broken SHA-256 Audit Log Chain Alert
- **Root Cause**: Manual row modification in `audit_logs` table bypassing application cryptographic hashing.
- **Remediation**:
  1. Run `const check = await auditService.verifyIntegrity()`.
  2. Pinpoint `check.brokenAt` sequence number.
  3. Query `SELECT * FROM audit_logs WHERE sequence_number >= check.brokenAt`.
  4. Compare with external write-ahead logs or replica to identify unauthorized tampering.
