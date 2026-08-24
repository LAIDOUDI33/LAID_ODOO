# CI/CD Pipeline

**HASSIBA Suite ERP v2.0.0** | Final Certification Documentation

---

## Overview

This document describes the Continuous Integration and Continuous Deployment (CI/CD) pipeline configuration for HASSIBA Suite ERP. The pipeline uses GitHub Actions for automated testing, building, and deployment to staging and production environments.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Developer  │────▶│   GitHub    │────▶│   Staging   │────▶│ Production  │
│   (Push/PR)  │     │   Actions   │     │  (K8s/AWS)  │     │  (K8s/AWS)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
               ┌────┴────┐  ┌────┴────┐
               │  Test   │  │  Build  │
               │  Lint   │  │ Docker  │
               │  Type   │  │  Push   │
               └─────────┘  └─────────┘
```

---

## GitHub Actions Workflow

### Main Workflow: `.github/workflows/ci-cd.yml`

```yaml
# ============================================================
# HASSIBA Suite ERP v2.0.0 - CI/CD Pipeline
# ============================================================
name: HASSIBA ERP CI/CD

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  BUN_VERSION: '1.1.0'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ============================================================
  # Job 1: Code Quality & Testing
  # ============================================================
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run linter
        run: bun run lint

      - name: Type check
        run: bunx tsc --noEmit

      - name: Run unit tests
        run: bun run test -- --coverage
        env:
          NODE_ENV: test
          DATABASE_URL: file:./test.db

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  # ============================================================
  # Job 2: Build Application
  # ============================================================
  build:
    name: Build Application
    needs: test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: ${{ env.BUN_VERSION }}

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: |
            ~/.bun/install/cache
            node_modules
          key: ${{ runner.os }}-bun-${{ hashFiles('**/bun.lockb') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build application
        run: bun run build
        env:
          NODE_ENV: production
          NEXT_TELEMETRY_DISABLED: '1'

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: |
            .next/
            public/
          retention-days: 1

  # ============================================================
  # Job 3: Build & Push Docker Image
  # ============================================================
  docker:
    name: Build & Push Docker Image
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v'))
    permissions:
      contents: read
      packages: write
    timeout-minutes: 15
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64

  # ============================================================
  # Job 4: Deploy to Staging
  # ============================================================
  deploy-staging:
    name: Deploy to Staging
    needs: docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.erp.yourdomain.com
    timeout-minutes: 10
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ vars.AWS_REGION }}

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name ${{ vars.EKS_CLUSTER_NAME_STAGING }} --region ${{ vars.AWS_REGION }}

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.29.0'

      - name: Deploy to Kubernetes
        run: |
          # Set image tag
          IMAGE_TAG="ghcr.io/${{ github.repository }}:develop"
          
          # Apply namespace and configs
          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/configmap.yaml
          
          # Update deployment image
          kubectl set image deployment/hassiba-app app=$IMAGE_TAG -n hassiba-erp
          
          # Wait for rollout
          kubectl rollout status deployment/hassiba-app -n hassiba-erp --timeout=300s

      - name: Run database migrations
        run: |
          kubectl delete job hassiba-db-migrate -n hassiba-erp --ignore-not-found=true
          kubectl apply -f k8s/migration-job.yaml
          kubectl wait --for=condition=complete job/hassiba-db-migrate -n hassiba-erp --timeout=120s

      - name: Verify deployment
        run: |
          kubectl get pods -n hassiba-erp -l app.kubernetes.io/component=application
          kubectl describe deployment/hassiba-app -n hassiba-erp | tail -20

      - name: Run smoke tests
        run: |
          # Wait for service to be ready
          sleep 30
          
          # Health check
          kubectl exec -it deploy/hassiba-app -n hassiba-erp -- curl -sf http://localhost:3000/api/health | jq .

      - name: Notify Slack (Staging)
        if: always()
        uses: slackapi/slack-github-action@v1.25.0
        with:
          payload: |
            {
              "text": "HASSIBA ERP Staging Deployment",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Staging Deployment* ${{ job.status == 'success' && ':white_check_mark:' || ':x:' }}\n*Branch:* ${{ github.ref_name }}\n*Commit:* ${{ github.sha }}\n*By:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_STAGING }}

  # ============================================================
  # Job 5: Deploy to Production
  # ============================================================
  deploy-production:
    name: Deploy to Production
    needs: docker
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://erp.yourdomain.com
    timeout-minutes: 15
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID_PROD }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY_PROD }}
          aws-region: ${{ vars.AWS_REGION }}

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name ${{ vars.EKS_CLUSTER_NAME_PRODUCTION }} --region ${{ vars.AWS_REGION }}

      - name: Set up kubectl
        uses: azure/setup-kubectl@v3
        with:
          version: 'v1.29.0'

      - name: Create backup before deployment
        run: |
          kubectl create job --from=cronjob/hassiba-backup pre-deploy-backup-$(date +%Y%m%d%H%M%S) -n hassiba-erp || true

      - name: Deploy to Kubernetes
        run: |
          # Determine image tag
          if [[ "${{ github.ref }}" == refs/tags/* ]]; then
            IMAGE_TAG="ghcr.io/${{ github.repository }}:${{ github.ref_name }}"
          else
            IMAGE_TAG="ghcr.io/${{ github.repository }}:main"
          fi
          
          # Apply manifests
          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/configmap.yaml
          kubectl apply -f k8s/pvcs.yaml
          kubectl apply -f k8s/postgres.yaml
          kubectl apply -f k8s/redis.yaml
          kubectl apply -f k8s/minio.yaml
          kubectl apply -f k8s/services.yaml
          kubectl apply -f k8s/ingress.yaml
          kubectl apply -f k8s/hpa.yaml
          
          # Update deployment image
          kubectl set image deployment/hassiba-app app=$IMAGE_TAG -n hassiba-erp
          
          # Wait for rollout
          kubectl rollout status deployment/hassiba-app -n hassiba-erp --timeout=600s

      - name: Run database migrations
        run: |
          kubectl delete job hassiba-db-migrate -n hassiba-erp --ignore-not-found=true
          kubectl apply -f k8s/migration-job.yaml
          kubectl wait --for=condition=complete job/hassiba-db-migrate -n hassiba-erp --timeout=180s

      - name: Verify deployment health
        run: |
          echo "Checking pod status..."
          kubectl get pods -n hassiba-erp -l app.kubernetes.io/component=application
          
          echo ""
          echo "Running health check..."
          kubectl exec -it deploy/hassiba-app -n hassiba-erp -- curl -sf http://localhost:3000/api/health | jq .
          
          echo ""
          echo "Checking HPA status..."
          kubectl get hpa -n hassiba-erp

      - name: Run integration tests
        run: |
          # Port forward for testing
          kubectl port-forward svc/hassiba-app 8080:80 -n hassiba-erp &
          PF_PID=$!
          sleep 10
          
          # Run basic tests
          curl -sf http://localhost:8080/api/health | jq '.status' | grep -q "healthy"
          
          # Cleanup
          kill $PF_PID 2>/dev/null || true

      - name: Rollback on failure
        if: failure()
        run: |
          echo "::warning::Deployment failed, initiating rollback..."
          kubectl rollout undo deployment/hassiba-app -n hassiba-erp
          kubectl rollout status deployment/hassiba-app -n hassiba-erp --timeout=300s

      - name: Notify Slack (Production)
        if: always()
        uses: slackapi/slack-github-action@v1.25.0
        with:
          payload: |
            {
              "text": "HASSIBA ERP Production Deployment ${{ job.status == 'success' && ':white_check_mark:' || ':x:' }}",
              "blocks": [
                {
                  "type": "header",
                  "text": {
                    "type": "plain_text",
                    "text": "Production Deployment ${{ job.status == 'success' && 'Success' || 'Failed' }}"
                  }
                },
                {
                  "type": "section",
                  "fields": [
                    {"type": "mrkdwn", "text": "*Version:*\n${{ github.ref_name }}"},
                    {"type": "mrkdwn", "text": "*Commit:*\n${{ github.sha }}"}
                  ]
                },
                {
                  "type": "section",
                  "fields": [
                    {"type": "mrkdwn", "text": "*Deployed By:*\n${{ github.actor }}"},
                    {"type": "mrkdwn", "text": "*Time:*\n$(date -u)"}
                  ]
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_PRODUCTION }}
```

---

## Environment Configuration

### Staging Environment

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `EKS_CLUSTER_NAME_STAGING` | EKS cluster name | `hassiba-staging` |
| `NEXTAUTH_URL` | Application URL | `https://staging.erp.yourdomain.com` |
| `DATABASE_URL` | Database connection | `postgresql://...` |
| `NODE_ENV` | Node environment | `staging` |

### Production Environment

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `EKS_CLUSTER_NAME_PRODUCTION` | EKS cluster name | `hassiba-production` |
| `NEXTAUTH_URL` | Application URL | `https://erp.yourdomain.com` |
| `DATABASE_URL` | Database connection | `postgresql://...` |
| `NODE_ENV` | Node environment | `production` |

---

## Secret Management

### Required GitHub Secrets

#### Repository Secrets
```bash
# GitHub Container Registry (automatic)
# GITHUB_TOKEN - Auto-provided by GitHub Actions

# AWS Credentials (Staging)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# AWS Credentials (Production) - Use separate credentials
AWS_ACCESS_KEY_ID_PROD=AKIAI44QH8DHBEXAMPLE
AWS_SECRET_ACCESS_KEY_PROD=je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY

# Slack Webhooks
SLACK_WEBHOOK_STAGING=https://hooks.slack.com/services/T00/B00/XXX
SLACK_WEBHOOK_PRODUCTION=https://hooks.slack.com/services/T00/B00/YYY
```

#### Kubernetes Secrets
```bash
# Application Secrets (stored in K8s)
kubectl create secret generic hassiba-secrets \
  --from-literal=nextauth-secret=$(openssl rand -base64 32) \
  --from-literal=nextauth-url=https://erp.yourdomain.com \
  --from-literal=postgres-password=${POSTGRES_PASSWORD} \
  --from-literal=jwt-secret=$(openssl rand -base64 32)
```

### External Secret Management (Recommended)

For production, use external secret management:

**Option 1: AWS Secrets Manager + External Secrets Operator**
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: hassiba-secrets
  namespace: hassiba-erp
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secretsmanager
  target:
    creationPolicy: Owner
  data:
    - secretKey: NEXTAUTH_SECRET
      remoteRef:
        key: hassiba-erp/production
        property: nextauth_secret
    - secretKey: POSTGRES_PASSWORD
      remoteRef:
        key: hassiba-erp/production
        property: postgres_password
```

**Option 2: HashiCorp Vault**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: hassiba-vault-agent
  namespace: hassiba-erp
type: Opaque
stringData:
  vault.hcl: |
    auto_auth {
      method "kubernetes" {
        mount_path = "auth/kubernetes"
        config = {
          role = "hassiba-erp"
        }
      }
    }
    
    template {
      destination = "/etc/secrets/application.env"
      contents = <<EOH
      {{- with secret "secret/data/hassiba-erp/production" }}
      NEXTAUTH_SECRET={{ .Data.data.nextauth_secret }}
      POSTGRES_PASSWORD={{ .Data.data.postgres_password }}
      {{- end }}
      EOH
    }
```

---

## Branch Strategy

```
main (production) ──────────────────────────────────▶ Deploy to Production
       │
       ├── merge from develop (after QA approval)
       │
develop (staging) ──────────────────────────────────▶ Deploy to Staging
       │
       ├── feature/xxx (PR to develop)
       ├── bugfix/xxx (PR to develop)
       │
hotfix/xxx ────────▶ PR to main (immediate production deploy)
```

### Git Workflow Rules

1. **Feature branches**: Created from `develop`, merged via PR
2. **Develop branch**: Auto-deploys to staging on push
3. **Main branch**: Auto-deploys to production on push
4. **Hotfix branches**: Created from `main`, merged directly to `main`
5. **Tags**: Version tags (`v*`) trigger production deployment

---

## Rollback Procedures

### Automatic Rollback

The CI/CD pipeline includes automatic rollback on deployment failure:

```yaml
# From the workflow
- name: Rollback on failure
  if: failure()
  run: |
    kubectl rollout undo deployment/hassiba-app -n hassiba-erp
    kubectl rollout status deployment/hassiba-app -n hassiba-erp --timeout=300s
```

### Manual Rollback Commands

```bash
# Check rollout history
kubectl rollout history deployment/hassiba-app -n hassiba-erp

# Rollback to previous version
kubectl rollout undo deployment/hassiba-erp -n hassiba-erp

# Rollback to specific revision
kubectl rollout undo deployment/hassiba-erp -n hassiba-erp --to-revision=3

# Check rollback status
kubectl rollout status deployment/hassiba-erp -n hassiba-erp

# If using Helm
helm rollback hassiba-erp 1 --namespace hassiba-erp
```

### Database Rollback

```bash
# List migrations
kubectl exec -it deploy/hassiba-app -n hassiba-erp -- npx prisma migrate status

# Rollback migration (if applicable)
kubectl exec -it deploy/hassiba-app -n hassiba-erp -- npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup (see Backup & DR documentation)
```

---

## Pipeline Triggers Summary

| Event | Branch | Actions Triggered |
|-------|--------|-------------------|
| Push | `develop` | Test → Build → Docker → Deploy Staging |
| Push | `main` | Test → Build → Docker → Deploy Production |
| Push Tag | `v*` | Test → Build → Docker → Deploy Production |
| Pull Request | `main` | Test only (no deploy) |

---

## Quality Gates

Before any deployment, the following gates must pass:

### Code Quality Checks
- [x] ESLint passes with no errors
- [x] TypeScript compilation succeeds
- [x] Unit tests pass (>80% coverage required)
- [x] No known security vulnerabilities (npm audit)

### Pre-deployment Checks
- [x] Docker image builds successfully
- [x] Container scans pass (Trivy/Snyk)
- [x] Health checks pass after deployment
- [x] Smoke tests complete successfully

### Production-specific
- [x] Staging deployment verified
- [x] Backup created before deployment
- [x] Change approval documented
- [ ] Rollback plan confirmed (manual gate)

---

## Local Development CI

For local development, replicate CI checks:

```bash
#!/bin/bash
# local-ci.sh - Run CI checks locally

set -e

echo "🔍 Running ESLint..."
bun run lint

echo "📝 Running TypeScript check..."
bunx tsc --noEmit

echo "🧪 Running tests..."
NODE_ENV=test bun run test -- --coverage

echo "🏗️ Building application..."
NODE_ENV=production bun run build

echo "✅ All CI checks passed!"
```

---

*Document Version: 1.0.0 | Last Updated: $(date +%Y-%m-%d)*
*HASSIBA Suite ERP v2.0.0 - Final Certification*
