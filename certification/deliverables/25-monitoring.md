# Monitoring & Observability

**HASSIBA Suite ERP v2.0.0** | Final Certification Documentation

---

## Overview

This document outlines the monitoring, logging, and observability strategy for HASSIBA Suite ERP. The system implements comprehensive health checks, metrics collection, structured logging, and alerting to ensure reliable operation and quick issue resolution.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Monitoring Stack                             │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌───────────────┐  │
│  │ Prometheus │──▶| Grafana  │   │   Loki    │   │ Alertmanager  │  │
│  │ (Metrics) │   │ (Dashboards)│  │ (Logs)   │   │ (Alerting)    │  │
│  └───────────┘   └───────────┘   └───────────┘   └───────────────┘  │
│         ▲               ▲               ▲               ▲          │
│         │               │               │               │          │
│  ┌──────┴──────┐  ┌─────┴─────┐  ┌──────┴──────┐  ┌─────┴──────┐  │
│  │  Node      │  │  App      │  │  Promtail   │  │  Webhook   │  │
│  │  Exporter  │  │  Metrics  │  │  / Fluentd  │  │  Routes    │  │
│  └────────────┘  └───────────┘  └─────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                         ┌──────────┴──────────┐
                         │   HASSIBA ERP App   │
                         │  ┌───────────────┐  │
                         │  │ /api/health   │  │
                         │  │ /api/metrics  │  │
                         │  │ Structured    │  │
                         │  │ Logging       │  │
                         │  └───────────────┘  │
                         └─────────────────────┘
```

---

## Health Checks

### Application Health Endpoint

The application provides a comprehensive health check endpoint at `/api/health`:

**Endpoint**: `GET /api/health`

**Response Format**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
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
      "used_mb": 180,
      "total_mb": 512,
      "percent": 35.16
    }
  }
}
```

**Status Codes**:
- `200` - System is healthy
- `503` - System is unhealthy (database down or critical memory)

**Health Check Implementation** (`src/app/api/health/route.ts`):
```typescript
// Key features:
// - Database connectivity check with latency measurement
// - Memory usage monitoring with thresholds
// - Warning threshold: 75% memory usage
// - Critical threshold: 90% memory usage
// - HEAD request support for lightweight probes
```

### Kubernetes Health Probes

```yaml
# Liveness Probe - Restarts container if unhealthy
livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 15
  timeoutSeconds: 10
  failureThreshold: 3

# Readiness Probe - Removes from service if not ready
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Startup Probe - Gives time for slow starts
startupProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 5
  failureThreshold: 30  # Allows up to 150 seconds for startup
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

---

## Metrics to Track

### Application Metrics

| Metric Name | Type | Description | Thresholds |
|-------------|------|-------------|------------|
| `http_requests_total` | Counter | Total HTTP requests | - |
| `http_request_duration_seconds` | Histogram | Request latency | p95 < 500ms |
| `http_errors_total` | Counter | HTTP error responses | < 1% of total |
| `active_users_gauge` | Gauge | Currently active users | - |
| `db_query_duration_seconds` | Histogram | Database query time | p95 < 100ms |
| `db_connections_active` | Gauge | Active DB connections | < 80% of pool |

### Infrastructure Metrics

| Metric Name | Source | Warning | Critical |
|-------------|--------|---------|----------|
| CPU Usage | Node Exporter | > 70% | > 90% |
| Memory Usage | Container | > 75% | > 90% |
| Disk Usage | Node Exporter | > 80% | > 95% |
| Network I/O | Node Exporter | - | - |
| Pod Restarts | K8s | > 3/hour | > 10/hour |

### Business Metrics

| Metric Name | Description |
|-------------|-------------|
| `login_attempts_total` | Login attempts (success/failure) |
| `invoices_created_total` | Invoices generated |
| `reports_generated_total` | Reports exported |
| `api_calls_by_module` | API usage by module (HR, Finance, etc.) |

### Custom Metrics Endpoint

Create `/api/metrics` for Prometheus scraping:

```typescript
// src/app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import client from 'prom-client';

const register = new client.Registry();

// Define custom metrics
const httpRequestsTotal = new client.Counter({
  name: 'hassiba_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestDuration = new client.Histogram({
  name: 'hassiba_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const dbQueryDuration = new client.Histogram({
  name: 'hassiba_db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1],
});

const activeUsers = new client.Gauge({
  name: 'hassiba_active_users',
  help: 'Number of active users',
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(dbQueryDuration);
register.registerMetric(activeUsers);

export async function GET() {
  return new NextResponse(await register.metrics(), {
    headers: { 'Content-Type': register.contentType },
  });
}
```

---

## Logging Strategy

### Structured Log Format

All logs follow JSON structured format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "User login successful",
  "service": "hassiba-erp",
  "version": "2.0.0",
  "environment": "production",
  "requestId": "abc-123-def",
  "userId": "user_123",
  "module": "auth",
  "duration_ms": 45,
  "metadata": {
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| `error` | Errors requiring attention | Failed DB queries, auth failures |
| `warn` | Potential issues | High latency, deprecated usage |
| `info` | Significant events | User actions, business operations |
| `debug` | Development details | Variable states, flow tracing |
| `trace` | Detailed tracing | Full request/response bodies (dev only) |

### Logger Implementation

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: ['req.headers.authorization', 'req.body.password', 'res.body.token'],
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  // Add custom fields to all logs
  base: {
    service: 'hassiba-erp',
    version: process.env.APP_VERSION || '2.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
});
```

### Sensitive Data Exclusion

**Always Redact**:
- Passwords and tokens (`password`, `token`, `secret`, `key`)
- PII in logs (`ssn`, `credit_card`, `iban`)
- Authorization headers
- Session cookies

**Redaction Configuration**:
```javascript
redact: [
  'req.headers.authorization',
  'req.body.password',
  'req.body.confirmPassword',
  'req.body.currentPassword',
  'req.body.token',
  'res.body.accessToken',
  'res.body.refreshToken',
  '*.apiKey',
  '*.secret',
]
```

### Log Aggregation Options

#### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

```yaml
# Filebeat DaemonSet for log collection
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: filebeat
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: filebeat
  template:
    metadata:
      labels:
        k8s-app: filebeat
    spec:
      containers:
        - name: filebeat
          image: docker.elastic.co/beats/filebeat:8.11.0
          volumeMounts:
            - name: varlog
              mountPath: /var/log
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: config
              mountPath: /usr/share/filebeat/filebeat.yml
              subPath: filebeat.yml
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: config
          configMap:
            name: filebeat-config
```

#### Option 2: Grafana Loki + Promtail

```yaml
# promtail-config.yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki.loki-svc:3100/loki/api/v1/push

scrape_configs:
  - job_name: hassiba-erp
    static_configs:
      - targets:
          - localhost
        labels:
          job: hassiba-erp
          namespace: hassiba-erp
          __path__: /var/log/containers/*hassiba*.log
    pipeline_stages:
      - json:
          expressions:
            timestamp: timestamp
            level: level
            message: message
            service: service
      - timestamp:
          source: timestamp
          format: RFC3339
      - labels:
          level:
          service:
```

#### Option 3: Cloud Provider Solutions

| Provider | Service | Configuration |
|----------|---------|---------------|
| AWS | CloudWatch Logs | Fluent Bit daemonset |
| GCP | Cloud Logging | Default with GKE |
| Azure | Log Analytics | Container Insights |

---

## Alerting

### Alert Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| **P1 - Critical** | Service down, data loss risk | Immediate (15 min) | DB down, all 500 errors |
| **P2 - High** | Major functionality broken | 1 hour | Auth failures, payment errors |
| **P3 - Medium** | Degraded performance | 4 hours | High latency, partial outages |
| **P4 - Low** | Minor issues, warnings | Next business day | Near capacity limits |

### Alert Rules

#### Critical Alerts (P1)

```yaml
# alerts.yml
groups:
  - name: hassiba-critical
    interval: 30s
    rules:
      # Application Down
      - alert: HassibaAppDown
        expr: up{job="hassiba-erp"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "HASSIBA ERP application is down"
          description: "Application has been down for more than 1 minute"
          
      # Database Down
      - alert: HassibaDatabaseDown
        expr: hassiba_database_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"
          description: "Cannot connect to database for over 1 minute"
          
      # All Requests Failing
      - alert: HassibaAllErrors
        expr: |
          (
            sum(rate(hassiba_http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(hassiba_http_requests_total[5m]))
          ) > 0.5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "More than 50% of requests failing"
          description: "Error rate is {{ $value | humanizePercentage }}"
```

#### High Priority Alerts (P2)

```yaml
  - name: hassiba-high
    interval: 1m
    rules:
      # High Error Rate
      - alert: HassibaHighErrorRate
        expr: |
          (
            sum(rate(hassiba_http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(hassiba_http_requests_total[5m]))
          ) > 0.1
        for: 10m
        labels:
          severity: high
        annotations:
          summary: "High error rate detected (>10%)"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Authentication Failures Spike
      - alert: HassibaAuthFailures
        expr: |
          sum(increase(hassiba_login_failures_total[10m])) > 20
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Authentication failure spike"
          description: "{{ $value }} failed login attempts in 10 minutes"

      # Database Connection Pool Exhausted
      - alert: HassibaDBPoolExhausted
        expr: hassiba_db_connections_active / hassiba_db_pool_size > 0.9
        for: 5m
        labels:
          severity: high
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} connections used"
```

#### Warning Alerts (P3/P4)

```yaml
  - name: hassiba-warnings
    interval: 2m
    rules:
      # High Latency
      - alert: HassibaHighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(hassiba_http_request_duration_seconds_bucket[5m])) by (le)
          ) > 1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "High p95 latency (>1s)"
          description: "Current p95: {{ $value }}s"

      # Memory Usage High
      - alert: HassibaMemoryHigh
        expr: |
          container_memory_usage_bytes{container="app"}
          / container_spec_memory_limit_bytes{container="app"} > 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Memory usage above 80%"
          description: "Current usage: {{ $value | humanizePercentage }}"

      # Disk Space Low
      - alert: HassibaDiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes{mountpoint="/"} 
          / node_filesystem_size_bytes{mountpoint="/"}) < 0.2
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 20%"
          description: "Available: {{ $value | humanize1024 }}"
```

### Notification Channels

#### Slack Integration

```yaml
# alertmanager/config.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/T00/B00/XXX'

route:
  receiver: 'default'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      repeat_interval: 15m
      
    - match:
        severity: high
      receiver: 'high-alerts'
      repeat_interval: 1h

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .CommonAnnotations.summary }}'
        text: "{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}"

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#incidents'
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
        title: '🚨 {{ .CommonAnnotations.summary }}'
        text: |
          *Severity:* {{ .CommonLabels.severity }}
          *Status:* {{ .Status }}
          
          {{ range .Alerts }}
          - {{ .Annotations.description }}
          {{ end }}

  - name: 'high-alerts'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        color: '{{ if eq .Status "firing" }}warning{{ else }}good{{ end }}'

  - name: 'email-alerts'
    email_configs:
      - to: ops-team@yourcompany.com
        send_resolved: true
```

#### PagerDuty Integration (for Critical)

```yaml
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - routing_key: '${PAGERDUTY_KEY}'
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.default.instances" . }}'
          labels: '{{ .CommonLabels }}'
          annotations: '{{ .CommonAnnotations }}'
```

---

## Dashboard Examples

### Grafana Dashboard: Application Overview

```json
{
  "dashboard": {
    "title": "HASSIBA ERP - Overview",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(hassiba_http_requests_total[5m])) by (method)",
            "legendFormat": "{{ method }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "gauge",
        "targets": [
          {
            "expr": "sum(rate(hassiba_http_requests_total{status=~\"5..\"}[5m])) / sum(rate(hassiba_http_requests_total[5m])) * 100"
          }
        ],
        "thresholds": [
          { "value": 1, "color": "green" },
          { "value": 5, "color": "yellow" },
          { "value": 10, "color": "red" }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(hassiba_http_request_duration_seconds_bucket[5m])) by (le))"
          }
        ]
      },
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "hassiba_active_users"
          }
        ]
      },
      {
        "title": "Database Query Latency",
        "type": "heatmap",
        "targets": [
          {
            "expr": "sum(rate(hassiba_db_query_duration_seconds_bucket[5m])) by (le)"
          }
        ]
      },
      {
        "title": "Health Status",
        "type": "stat",
        "targets": [
          {
            "expr": "hassiba_health_status",
            "legendFormat": "{{ status }}"
          }
        ],
        "thresholds": [
          { "value": 0, "color": "red", "label": "Unhealthy" },
          { "value": 1, "color": "yellow", "label": "Degraded" },
          { "value": 2, "color": "green", "label": "Healthy" }
        ]
      }
    ]
  }
}
```

### Grafana Dashboard: Infrastructure

```json
{
  "dashboard": {
    "title": "HASSIBA ERP - Infrastructure",
    "rows": [
      {
        "title": "Resource Usage",
        "panels": [
          {
            "title": "CPU Usage %",
            "type": "gauge",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{container=\"app\"}[5m])) by (pod) / sum(kube_pod_container_resource_limits{container=\"app\", resource=\"cpu\"}) by (pod) * 100"
              }
            ]
          },
          {
            "title": "Memory Usage",
            "type": "graph",
            "targets": [
              {
                "expr": "container_memory_usage_bytes{container=\"app"} / 1024 / 1024"
              }
            ]
          },
          {
            "title": "Pod Restarts",
            "type": "stat",
            "targets": [
              {
                "expr": "kube_pod_container_status_restarts_total{pod=~\"hassiba-app.*\"}"
              }
            ]
          }
        ]
      },
      {
        "title": "Database Metrics",
        "panels": [
          {
            "title": "PostgreSQL Connections",
            "type": "graph",
            "targets": [
              {
                "expr": "pg_stat_activity_count{datname=\"hassiba_erp\"}"
              }
            ]
          },
          {
            "title": "Database Size",
            "type": "stat",
            "targets": [
              {
                "expr": "pg_database_size_bytes{datname=\"hassiba_erp\"} / 1024 / 1024 / 1024"
              }
            ],
            "unit": "GB"
          }
        ]
      }
    ]
  }
}
```

### Grafana Dashboard: Business Metrics

```json
{
  "dashboard": {
    "title": "HASSIBA ERP - Business Metrics",
    "panels": [
      {
        "title": "Logins (24h)",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(hassiba_login_success_total[24h])"
          }
        ]
      },
      {
        "title": "Login Failures (24h)",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(hassiba_login_failures_total[24h])"
          }
        ],
        "colorMode": "background"
      },
      {
        "title": "Invoices Created Today",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(hassiba_invoices_created_total[24h])"
          }
        ]
      },
      {
        "title": "Reports Generated (7d)",
        "type": "graph",
        "targets": [
          {
            "expr": "increase(hassiba_reports_generated_total[7d])"
          }
        ]
      },
      {
        "title": "API Calls by Module",
        "type": "piechart",
        "targets": [
          {
            "expr": "topk(10, sum(rate(hassiba_http_requests_total[1h])) by (module))"
          }
        ]
      }
    ]
  }
}
```

---

## Monitoring Stack Deployment

### Helm Chart for Monitoring Stack

```bash
# Add repositories
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add loki https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.retention=30d \
  --set alertmanager.config=...

# Install Loki
helm install loki loki/loki \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=50Gi

# Install Promtail
helm install promtail loki/promtail \
  --namespace monitoring \
  -f promtail-values.yaml

# Install Grafana (if not using kube-prometheus-stack)
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword=${GRAFANA_PASSWORD} \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

### Custom Resources

```yaml
# ServiceMonitor for HASSIBA ERP
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hassiba-erp
  namespace: monitoring
  labels:
    app: hassiba-erp
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
  endpoints:
    - port: http
      path: /api/metrics
      interval: 15s
  namespaceSelector:
    matchNames:
      - hassiba-erp
```

---

## Runbook: Common Issues

### Issue: High Error Rate

```markdown
## Diagnosis
1. Check Grafana Error Rate dashboard
2. Review recent deployments: `kubectl rollout history deployment/hassiba-app`
3. Check application logs: `kubectl logs -f deployment/hassiba-app --since=10m`
4. Check database connectivity

## Resolution
1. If deployment-related: `kubectl rollout undo deployment/hassiba-app`
2. If database: Check PostgreSQL pods and connections
3. If resource exhaustion: Scale up or optimize
```

### Issue: High Latency

```markdown
## Diagnosis
1. Check p95/p99 latency in Grafana
2. Identify slow endpoints: `group by route` in metrics
3. Check database query performance
4. Review resource utilization

## Resolution
1. Optimize slow queries
2. Add database indexes
3. Scale horizontally (increase replicas)
4. Enable caching for frequent queries
```

### Issue: Memory Pressure

```markdown
## Diagnosis
1. Check container memory usage
2. Look for memory leaks in application logs
3. Review recent code changes

## Resolution
1. Restart affected pods
2. Increase memory limits if needed
3. Investigate and fix memory leak
4. Consider adding HPA based on memory
```

---

*Document Version: 1.0.0 | Last Updated: $(date +%Y-%m-%d)*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
