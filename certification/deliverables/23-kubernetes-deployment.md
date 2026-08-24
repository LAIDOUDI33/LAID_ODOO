# Kubernetes Deployment Guide

**HASSIBA Suite ERP v2.0.0** | Final Certification Documentation

---

## Overview

This guide provides complete Kubernetes deployment manifests for HASSIBA Suite ERP. The deployment includes the Next.js application, PostgreSQL 16 database, Redis 7 cache, and MinIO object storage.

## Prerequisites

- **Kubernetes Cluster**: v1.19+ (tested on v1.28+)
- **kubectl**: Configured and connected to target cluster
- **Helm** (optional): For chart-based deployments
- **Persistent Volumes**: StorageClass provisioned for database persistence
- **Ingress Controller**: NGINX or Traefik with SSL support
- **Certificate Manager**: cert-manager for automatic SSL certificates
- **Container Registry**: Access to push/pull images (Docker Hub, ECR, GCR, or ACR)

### Required Secrets Preparation

Before deploying, create the following secrets:

```bash
# Create namespace
kubectl create namespace hassiba-erp

# Generate and store secrets
kubectl create secret generic hassiba-secrets \
  --namespace=hassiba-erp \
  --from-literal=nextauth-secret=$(openssl rand -base64 32) \
  --from-literal=nextauth-url=https://erp.yourdomain.com \
  --from-literal=postgres-password=YOUR_SECURE_PASSWORD \
  --from-literal=minio-root-password=YOUR_MINIO_PASSWORD \
  --from-literal=jwt-secret=$(openssl rand -base64 32)
```

---

## Deployment Manifests

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: namespace
    environment: production
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hassiba-config
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: config
data:
  NODE_ENV: "production"
  PORT: "3000"
  HOSTNAME: "0.0.0.0"
  NEXT_TELEMETRY_DISABLED: "1"
  POSTGRES_HOST: "hassiba-postgres"
  POSTGRES_PORT: "5432"
  POSTGRES_USER: "hassiba"
  POSTGRES_DB: "hassiba_erp"
  REDIS_HOST: "hassiba-redis"
  REDIS_PORT: "6379"
  MINIO_ENDPOINT: "hassiba-minio:9000"
  MINIO_BUCKET: "hassiba-documents"
```

### Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hassiba-secrets
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: secret
type: Opaque
stringData:
  # Set these values using kubectl create secret or external secret management
  NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
  NEXTAUTH_URL: "https://erp.yourdomain.com"
  POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
  MINIO_ROOT_USER: "minioadmin"
  MINIO_ROOT_PASSWORD: "${MINIO_PASSWORD}"
  JWT_SECRET: "${JWT_SECRET}"
```

### Persistent Volume Claims

```yaml
# PostgreSQL Data PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: database
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: gp3  # Adjust based on your cloud provider

---
# Redis Data PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: cache
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: gp3

---
# MinIO Data PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-data
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: storage
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: gp3
```

### PostgreSQL Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hassiba-postgres
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
      app.kubernetes.io/component: database
  template:
    metadata:
      labels:
        app.kubernetes.io/name: hassiba-erp
        app.kubernetes.io/component: database
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
              protocol: TCP
          envFrom:
            - configMapRef:
                name: hassiba-config
            - secretRef:
                name: hassiba-secrets
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - hassiba
                - -d
                - hassiba_erp
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            exec:
              command:
                - pg_isready
                - -U
                - hassiba
                - -d
                - hassiba_erp
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-data
```

### Redis Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hassiba-redis
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: cache
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
      app.kubernetes.io/component: cache
  template:
    metadata:
      labels:
        app.kubernetes.io/name: hassiba-erp
        app.kubernetes.io/component: cache
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          args:
            - redis-server
            - --appendonly
            - yes
            - --maxmemory
            - 256mb
            - --maxmemory-policy
            - allkeys-lru
          ports:
            - containerPort: 6379
              protocol: TCP
          volumeMounts:
            - name: redis-data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
      volumes:
        - name: redis-data
          persistentVolumeClaim:
            claimName: redis-data
```

### MinIO Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hassiba-minio
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: storage
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
      app.kubernetes.io/component: storage
  template:
    metadata:
      labels:
        app.kubernetes.io/name: hassiba-erp
        app.kubernetes.io/component: storage
    spec:
      containers:
        - name: minio
          image: minio/minio:latest
          args:
            - server
            - /data
            - --console-address
            - ":9001"
          ports:
            - containerPort: 9000
              name: api
              protocol: TCP
            - containerPort: 9001
              name: console
              protocol: TCP
          envFrom:
            - secretRef:
                name: hassiba-secrets
          env:
            - name: MINIO_ROOT_USER
              value: "minioadmin"
          volumeMounts:
            - name: minio-data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /minio/health/live
              port: 9000
            initialDelaySeconds: 10
            periodSeconds: 15
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /minio/health/ready
              port: 9000
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
      volumes:
        - name: minio-data
          persistentVolumeClaim:
            claimName: minio-data
```

### Application Deployment (Next.js)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hassiba-app
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: application
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
      app.kubernetes.io/component: application
  template:
    metadata:
      labels:
        app.kubernetes.io/name: hassiba-erp
        app.kubernetes.io/component: application
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/health"
    spec:
      serviceAccountName: default
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: app
          image: your-registry/hassiba-erp:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
              protocol: TCP
              name: http
          envFrom:
            - configMapRef:
                name: hassiba-config
            - secretRef:
                name: hassiba-secrets
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 15
            timeoutSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /api/health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 5
            failureThreshold: 30
          volumeMounts:
            - name: app-uploads
              mountPath: /app/data/uploads
      volumes:
        - name: app-uploads
          emptyDir: {}
```

### Services

```yaml
# Application Service
apiVersion: v1
kind: Service
metadata:
  name: hassiba-app
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: application
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: application
  ports:
    - name: http
      port: 80
      targetPort: 3000
      protocol: TCP

---
# PostgreSQL Service
apiVersion: v1
kind: Service
metadata:
  name: hassiba-postgres
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: database
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: database
  ports:
    - name: postgres
      port: 5432
      targetPort: 5432
      protocol: TCP

---
# Redis Service
apiVersion: v1
kind: Service
metadata:
  name: hassiba-redis
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: cache
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: cache
  ports:
    - name: redis
      port: 6379
      targetPort: 6379
      protocol: TCP

---
# MinIO Service
apiVersion: v1
kind: Service
metadata:
  name: hassiba-minio
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: storage
spec:
  type: ClusterIP
  selector:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: storage
  ports:
    - name: api
      port: 9000
      targetPort: 9000
      protocol: TCP
    - name: console
      port: 9001
      targetPort: 9001
      protocol: TCP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hassiba-ingress
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: DENY";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
spec:
  tls:
    - hosts:
        - erp.yourdomain.com
      secretName: hassiba-tls-cert
  rules:
    - host: erp.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hassiba-app
                port:
                  number: 80
```

### Database Migration Job

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hassiba-db-migrate
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: migration
spec:
  ttlSecondsAfterFinished: 3600
  backoffLimit: 3
  template:
    metadata:
      labels:
        app.kubernetes.io/name: hassiba-erp
        app.kubernetes.io/component: migration
    spec:
      restartPolicy: Never
      initContainers:
        - name: wait-for-postgres
          image: postgres:16-alpine
          command:
            - sh
            - -c
            - |
              until pg_isready -h hassiba-postgres -p 5432 -U hassiba; do
                echo "Waiting for PostgreSQL..."
                sleep 2
              done
      containers:
        - name: migrate
          image: your-registry/hassiba-erp:latest
          command: ["npx", "prisma", "db", "push", "--accept-data-loss"]
          envFrom:
            - configMapRef:
                name: hassiba-config
            - secretRef:
                name: hassiba-secrets
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

---

## Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hassiba-app-hpa
  namespace: hassiba-erp
  labels:
    app.kubernetes.io/name: hassiba-erp
    app.kubernetes.io/component: autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hassiba-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
```

### Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: hassiba-app-pdb
  namespace: hassiba-erp
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
      app.kubernetes.io/component: application
```

---

## Deployment Commands

### Apply All Manifests

```bash
# Apply in order
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/pvcs.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/app.yaml
kubectl apply -f k8s/services.yaml
kubectl apply -f k8s/ingress.yaml

# Run database migration
kubectl apply -f k8s/migration-job.yaml

# Apply HPA
kubectl apply -f k8s/hpa.yaml
```

### Verify Deployment

```bash
# Check all resources
kubectl get all -n hassiba-erp

# Check pods status
kubectl get pods -n hassiba-erp -w

# View logs
kubectl logs -f deployment/hassiba-app -n hassiba-erp

# Check health endpoint
kubectl exec -it deploy/hassiba-app -n hassiba-erp -- curl -s http://localhost:3000/api/health | jq

# Port forward for testing
kubectl port-forward svc/hassiba-app 8080:80 -n hassiba-erp
```

### Rollout Management

```bash
# Check rollout status
kubectl rollout status deployment/hassiba-app -n hassiba-erp

# View rollout history
kubectl rollout history deployment/hassiba-app -n hassiba-erp

# Rollback to previous version
kubectl rollout undo deployment/hassiba-app -n hassiba-erp

# Rollback to specific revision
kubectl rollout undo deployment/hassiba-app -n hassiba-erp --to-revision=2

# Restart deployment
kubectl rollout restart deployment/hassiba-app -n hassiba-erp
```

---

## Resource Summary

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit | Replicas |
|-----------|-------------|-----------|----------------|--------------|----------|
| App (Next.js) | 250m | 2000m | 512Mi | 2Gi | 2-10 (HPA) |
| PostgreSQL | 250m | 1000m | 256Mi | 1Gi | 1 |
| Redis | 100m | 500m | 128Mi | 512Mi | 1 |
| MinIO | 100m | 1000m | 256Mi | 1Gi | 1 |

---

## Security Considerations

1. **Non-root User**: Application runs as UID 1001 (hassiba user)
2. **Network Policies**: Implement network policies to restrict inter-pod communication
3. **RBAC**: Use dedicated service accounts with minimal permissions
4. **Secrets**: Use external secrets operator or sealed secrets for production
5. **Pod Security Standards**: Enforce restricted PSS at namespace level

### Network Policy Example

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: hassiba-network-policy
  namespace: hassiba-erp
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: hassiba-erp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - port: 3000
          protocol: TCP
  egress:
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/component: database
      ports:
        - port: 5432
          protocol: TCP
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/component: cache
      ports:
        - port: 6379
          protocol: TCP
    - to: []  # DNS resolution
      ports:
        - port: 53
          protocol: UDP
```

---

*Document Version: 1.0.0 | Last Updated: $(date +%Y-%m-%d)*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
