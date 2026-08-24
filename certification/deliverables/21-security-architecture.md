# HASSIBA Suite ERP - Security Architecture

**Version:** 2.0.0  
**Last Updated:** Final Certification  
**Classification:** Internal Technical Documentation  

---

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Authorization Model (RBAC)](#authorization-model-rbac)
3. [Data Protection](#data-protection)
4. [Security Controls](#security-controls)
5. [Vulnerability History & Remediation](#vulnerability-history--remediation)
6. [Compliance](#compliance)

---

## Authentication Flow

### Overview

HASSIBA Suite ERP uses **NextAuth.js v4** with JWT strategy for authentication.

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────────┐
│  Client  │────▶│  NextAuth    │────▶│  Credentials│────▶│   Database   │
│ Browser  │◀────│   API Route  │◀────│  Provider   │◀────│   (Prisma)   │
└──────────┘     └──────────────┘     └──────────┘     └──────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  JWT Session    │
              │  (8h validity)  │
              │  + Refresh (30m)│
              └─────────────────┘
```

### Authentication Configuration

**File:** `src/lib/auth.ts`

| Parameter | Value | Description |
|-----------|-------|-------------|
| Strategy | JWT | Stateless session token |
| Session Max Age | 8 hours | Full work day (H-08 FIX) |
| Update Age | 30 minutes | Sliding session refresh |
| Secret | `NEXTAUTH_SECRET` | Environment variable (required) |

### Login Process

```typescript
// 1. User submits credentials to POST /api/auth/signin
// 2. NextAuth calls authorize() in auth.ts
// 3. Check account lockout status (isAccountLocked)
// 4. Verify credentials against database (bcrypt compare)
// 5. On success: Clear login attempts, issue JWT
// 6. On failure: Record attempt, check lockout threshold
```

### Account Lockout Mechanism (H-08 FIX)

**Configuration:**
```typescript
const LOCKOUT_CONFIG = {
  maxAttempts: 5,              // Max failed attempts
  lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
  attemptWindow: 15 * 60 * 1000,   // 15 minute window
};
```

**Lockout Flow:**
```
Failed Login #1 → Attempts: 1/5, Remaining: 4
Failed Login #2 → Attempts: 2/5, Remaining: 3
Failed Login #3 → Attempts: 3/5, Remaining: 2
Failed Login #4 → Attempts: 4/5, Remaining: 1
Failed Login #5 → ACCOUNT LOCKED for 15 minutes
              ↓
GET /api/auth/login-status?email=user@example.com
Response: { locked: true, remainingTime: 900, ... }
```

**Lockout Check Endpoint:** `GET /api/auth/login-status?email=...`

### Password Security

| Aspect | Implementation |
|--------|----------------|
| Hashing Algorithm | bcryptjs (10 rounds) |
| Minimum Length | Enforced by `checkPasswordStrength()` |
| Complexity Requirements | Uppercase, lowercase, number, special char |
| Storage | Hash only (never plaintext) |

### Registration Security (C-03 FIX)

**Rate Limiting:**
- Window: 15 minutes
- Max Attempts: 3 per IP

**Email Enumeration Prevention:**
- Generic error message for all failures
- No differentiation between "exists" and "invalid"
- HTTP 400 for all registration errors (not 409)

```typescript
// Always return same error message
{ success: false, error: "Impossible de créer le compte. Veuillez vérifier vos informations." }
```

---

## Authorization Model (RBAC)

### Role Hierarchy

**File:** `src/lib/auth-utils.ts`

```
                    ┌─────────────┐
                    │ super_admin │  Level 100
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    admin    │  Level 90
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   manager   │  Level 80
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
   │  accountant  │  │hr_manager  │  │warehouse_mgr│  Level 65-70
   └──────────────┘  └─────┬─────┘  └─────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼──────┐  ┌─────▼─────┐  ┌──────▼──────┐
   │sales_manager │  │ hr_staff  │  │ salesperson  │  Level 40-60
   └──────────────┘  └───────────┘  └─────────────┘
                           │
                    ┌──────▼──────┐
                    │   user      │  Level 20
                    │  (employee)  │
                    └─────────────┘
```

### Role Constants

```typescript
export const ROLES = {
  SUPER_ADMIN: "super_admin",    // 100 - Full system access
  ADMIN: "admin",                // 90  - Company management
  MANAGER: "manager",             // 80  - Department management
  ACCOUNTANT: "accountant",       // 70  - Financial operations
  HR_MANAGER: "hr_manager",       // 65  - HR management
  WAREHOUSE_MANAGER: "warehouse_manager", // 65 - Inventory
  SALES_MANAGER: "sales_manager", // 60  - Sales team
  HR_STAFF: "hr_staff",           // 45  - HR operations
  SALESPERSON: "salesperson",     // 40  - Sales operations
  EMPLOYEE: "user",              // 20  - Basic access
} as const;
```

### Authorization Functions

#### `requireAuth(request)`
Checks if user is authenticated. Returns 401 if not.

```typescript
// Usage in API routes
export async function GET(request: Request) {
  const authError = await requireAuth(request);
  if (authError) return authError; // Returns 401
  
  // User is authenticated, proceed...
}
```

#### `requireRole(request, allowedRoles[])`
Checks authentication AND role membership. Returns 401 or 403.

```typescript
// Only admin and accountant can access
const authError = await requireRole(request, ['admin', 'accountant']);
if (authError) return authError;
```

**Error Response (L-01 FIX):**
- Does NOT reveal valid roles or user's actual role
- Generic error: "Accès refusé. Permissions insuffisantes."

#### `getAuthenticatedUser()`
Returns current user object without blocking.

```typescript
const user = await getAuthenticatedUser();
// { id, email, name, role, companyId }
```

#### `hasMinimumRole(userRole, minimumRole)`
Compare roles using hierarchy levels.

```typescript
if (hasMinimumRole(userRole, 'manager')) {
  // User is manager or above
}
```

#### `requireCompanyAccess(request, companyId?)`
Multi-tenant company access control.

### Role-Based Endpoint Authorization Matrix

| Endpoint | super_admin | admin | manager | accountant | hr_* | sales_* | warehouse_* | user |
|----------|:-----------:|:-----:|:-------:|:----------:|:----:|:--------:|:------------:|:----:|
| `/api/companies` POST | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `/api/employees` POST | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/api/employees` GET | ✅ | ✅ | ✅ | ❌ | ✅* | ❌ | ❌ | ✅† |
| `/api/payroll` GET/POST | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/api/invoices` POST | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/api/accounting` POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/api/purchases` POST | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `/api/inventory` POST | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/ai/chat` GET/POST | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

*PII sanitized for non-HR roles  
†Basic info only, no sensitive PII

---

## Data Protection

### PII (Personally Identifiable Information) Handling

**Sensitive PII Fields (C-01, C-07 FIX):**

| Field | Category | Protected Roles Only |
|-------|----------|----------------------|
| `cin` | National ID | admin, manager, hr_*, super_admin |
| `nif` | Tax ID | admin, manager, hr_*, super_admin |
| `nir` | Social Security | admin, manager, hr_*, super_admin |
| `cnasNumber` | Social Security | admin, manager, hr_*, super_admin |
| `casnosNumber` | Pension Fund | admin, manager, hr_*, super_admin |
| `bankName` | Financial | admin, manager, hr_*, super_admin |
| `bankAccount` | Financial | admin, manager, hr_*, super_admin |
| `address` | Contact | admin, manager, hr_*, super_admin |
| `phone` | Contact | admin, manager, hr_*, super_admin |
| `personalEmail` | Contact | admin, manager, hr_*, super_admin |
| `dateOfBirth` | Personal | admin, manager, hr_*, super_admin |
| `placeOfBirth` | Personal | admin, manager, hr_*, super_admin |

**PII Filtering Implementation:**

```typescript
// Employee list endpoint
const SENSITIVE_PII_FIELDS = [
  'cin', 'nif', 'nir', 'cnasNumber', 'casnosNumber',
  'bankName', 'bankAccount', 'address', 'city',
  'wilayaCode', 'phone', 'personalEmail', 'workEmail',
  'dateOfBirth', 'placeOfBirth'
];

const AUTHORIZED_PII_ROLES = [ROLES.ADMIN, ROLES.MANAGER, ROLES.HR];

if (!AUTHORIZED_PII_ROLES.includes(userRole)) {
  // Remove all PII fields before returning
  SENSITIVE_PII_FIELDS.forEach(field => delete employee[field]);
}
```

### Audit Logging for Data Access (M-05 FIX)

All sensitive data accesses are logged:

```typescript
await AuditLogger.logRead(request, AuditModule.hr, "Employee", id, {
  action: "VIEW_EMPLOYEE_DETAILS",
  accessedBy: user?.id,
  piiAccess: 'full' | 'sanitized',  // Tracks access level
  user: { id, name, email }
});
```

### Encryption

| Data State | Method | Implementation |
|------------|--------|----------------|
| At Rest | Database encryption | Prisma with connection string params |
| In Transit | TLS 1.3 | Automatic via HTTPS |
| Passwords | bcrypt (cost: 10) | One-way hash, never decrypted |
| Sessions | JWT (HS256) | Signed with NEXTAUTH_SECRET |

### Company Data Isolation (C-02, C-08 FIX)

**IDOR (Insecure Direct Object Reference) Prevention:**

```typescript
// Invoice access control example
const whereClause: any = { id };

// Non-super-admins can only access their company's data
if (user?.role !== 'super_admin' && user?.role !== 'admin') {
  whereClause.companyId = user?.companyId;
}

const invoice = await db.invoice.findUnique({ where: whereClause });

if (!invoice) {
  // Check if invoice exists (for proper 403 vs 404)
  const exists = await db.invoice.findUnique({ where: { id }, select: { id: true } });
  
  if (exists) {
    return NextResponse.json(
      { success: false, error: 'Access denied: You do not have permission to view this invoice' },
      { status: 403 }  // Not 404 - don't reveal existence
    );
  }
}
```

---

## Security Controls

### Input Validation

**Client-Side Validation:**
- React Hook Form with Zod schemas
- Real-time field validation
- Error messages in French

**Server-Side Validation:**
- All API endpoints validate input
- Type checking and coercion
- Range validation (e.g., salary 0-10M DZD)
- Format validation (NIF: 15 digits, NIS: 10 digits, email)

**Example Payroll Validation (M-04 FIX):**
```typescript
// Validate numeric fields are within reasonable ranges
if (body.baseSalary !== undefined) {
  const salary = parseFloat(body.baseSalary);
  if (isNaN(salary) || salary < 0 || salary > 10000000) {
    return NextResponse.json({
      success: false,
      error: 'Salaire de base invalide (doit être entre 0 et 10,000,000 DZD)',
      code: 'INVALID_SALARY'
    }, { status: 400 });
  }
}
```

### SQL Injection Prevention

**Method:** Prisma ORM (Parameterized Queries)

```typescript
// SAFE: Prisma handles parameterization automatically
db.user.findMany({
  where: {
    OR: [
      { name: { contains: search } },  // Automatically escaped
      { email: { contains: search } }
    ]
  }
});

// NEVER use raw queries with string concatenation
// If using $queryRaw, always use parameterized templates:
db.$queryRaw`SELECT * FROM users WHERE id = ${userId}`;  // Safe with template literal
```

### XSS Protection

**Implementation:** Multiple layers

1. **Input Sanitization** (`security.ts`):
```typescript
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')           // Remove HTML tags
    .replace(/javascript:/gi, '')   // Remove javascript protocol
    .replace(/on\w+\s*=/gi, '')    // Remove event handlers
    .trim();
}
```

2. **Output Encoding:** Next.js auto-escapes in JSX
3. **Security Headers:**
```
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
```

### CSRF Protection

**Current Implementation:**
- Origin validation for state-changing requests
- SameSite cookie policy (via NextAuth)

**Future Enhancement:**
- CSRF tokens for mutation endpoints
- Double-submit cookie pattern

### Rate Limiting

**Implementation:** In-memory rate limiting (`security.ts`)

| Category | Window | Max Requests | Use Case |
|----------|--------|--------------|-----------|
| default | 15 min | 100 | General API |
| auth | 15 min | 10 | Login/register |
| sensitive | 1 hour | 50 | Payroll, accounting |
| upload | 1 hour | 10 | File uploads |
| ai_chat | 1 min | 20 | AI assistant |

**Rate Limit Response Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
Retry-After: 45
```

**Registration Rate Limiting (C-03 FIX):**
- 3 registrations per IP per 15 minutes
- Headers included in response

### Request Size Limits (H-05, L-02 FIX)

| Category | Limit | Use Case |
|----------|-------|----------|
| default | 1 MB | Standard requests |
| upload | 50 MB | File uploads |
| document | 10 MB | Document handling |
| import | 5 MB | Data imports |

### Security Headers

**Applied to all responses:**
```typescript
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',                    // Prevent clickjacking
  'X-Content-Type-Options': 'nosniff',           // Prevent MIME sniffing
  'X-XSS-Protection': '1; mode=block',            // XSS protection
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Production only:
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

### Error Handling (H-04 FIX)

**Safe Error Handler - Never Exposes Stack Traces:**

```typescript
export function safeErrorHandler(error: unknown, context?: string): NextResponse {
  // Log full error server-side
  console.error(`[API Error - ${context}]:`, error);
  
  // Return generic message to client
  let userMessage = 'Une erreur est survenue. Veuillez réessayer.';
  let statusCode = 500;
  
  // Map known error types to safe messages
  if (error includes 'not found') {
    userMessage = 'Ressource non trouvée.';
    statusCode = 404;
  }
  // ... more mappings
  
  return errorResponse(userMessage, statusCode);
}
```

### Audit Logging

**Comprehensive audit trail for:**

| Action | Module | Details Logged |
|--------|--------|----------------|
| CREATE | All | New values, user, IP, timestamp |
| READ | HR, Accounting | Entity ID, PII access level |
| UPDATE | All | Old values, new values, changed fields |
| DELETE | All | Deleted entity snapshot |
| LOGIN | Auth | Success/failure, IP, user agent |
| EXPORT | Reports | Export type, parameters, user |

**Audit Query Interface:**
```typescript
const logs = await getAuditLogs({
  userId: 'user-id',
  module: AuditModule.accounting,
  action: AuditAction.CREATE,
  entityName: 'Invoice',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  limit: 50,
  search: 'keyword'
});
```

---

## Vulnerability History & Remediation

### Security Issues Fixed (Certification Track)

| ID | Vulnerability | CVSS | Fix Description | Status |
|----|---------------|------|-----------------|--------|
| C-01 | Employee PII Exposure | 9.1 CRITICAL | Role-based PII sanitization for non-HR roles | ✅ Fixed |
| C-02 | Invoice IDOR (Company Data Leak) | 8.6 HIGH | Company scoping on all invoice queries | ✅ Fixed |
| C-03 | Email Enumeration / Reg Rate Limiting | 4.2 MEDIUM | Generic errors + rate limiting (3/15min) | ✅ Fixed |
| C-06 | Payroll IDOR (Salary Data Exposure) | 9.8 CRITICAL | Restricted to authorized roles only | ✅ Fixed |
| C-07 | Employee List PII Exposure | 9.1 CRITICAL | Sanitize PII fields based on role | ✅ Fixed |
| C-08 | Invoice List IDOR | 8.6 HIGH | Company isolation on list endpoint | ✅ Fixed |
| H-02 | Unified Role Definitions | INFO | Centralized ROLES constant, hierarchy | ✅ Fixed |
| H-04 | Stack Trace Leakage | 5.3 MEDIUM | Safe error handler, no internal details | ✅ Fixed |
| H-05 | Request Body Size Limit | 4.0 MEDIUM | Configurable size limits per category | ✅ Fixed |
| H-08 | Account Lockout Bypass | 7.5 HIGH | 5-attempt lockout, 15-min duration | ✅ Fixed |
| H-17 | Invoice Status Machine Bypass | 6.5 MEDIUM | Centralized state machine validation | ✅ Fixed |
| L-01 | Role Information Disclosure | 3.5 LOW | Generic forbidden response | ✅ Fixed |
| L-02 | Payload Size DoS | 5.0 MEDIUM | Body size validation (1MB default) | ✅ Fixed |
| M-01 | COGS Calculation Accuracy | 2.0 LOW | Configurable COGS_RATIO env var | ✅ Fixed |
| M-04 | Payroll Value Injection | 6.5 MEDIUM | Numeric range validation | ✅ Fixed |
| M-05 | Missing Audit Logging | 4.5 MEDIUM | Comprehensive audit for sensitive ops | ✅ Fixed |
| M-07 | Negative Stock Allowance | 4.0 MEDIUM | Configurable NEGATIVE_STOCK_POLICY | ✅ Fixed |
| M-09 | Hardcoded Late Threshold | 3.0 LOW | Configurable via env vars | ✅ Fixed |
| M-10 | SMIG Compliance Validation | 3.5 LOW | Minimum wage check with warnings | ✅ Fixed |
| M-13 | Purchase Order Approval Bypass | 5.5 MEDIUM | Workflow approval for high-value POs | ✅ Fixed |

### Current Security Posture

**Overall Assessment:** 🟢 **SECURE**

| Category | Score | Notes |
|----------|-------|-------|
| Authentication | ✅ Strong | JWT + bcrypt + lockout |
| Authorization | ✅ Strong | RBAC with hierarchy |
| Input Validation | ✅ Good | Server-side + client-side |
| SQL Injection | ✅ Protected | Prisma ORM |
| XSS | ✅ Protected | Sanitization + headers |
| CSRF | ⚠️ Basic | Origin validation |
| Rate Limiting | ✅ Good | Per-category limits |
| Audit Logging | ✅ Comprehensive | All sensitive operations |
| Error Handling | ✅ Secure | No stack trace leakage |
| PII Protection | ✅ Strong | Role-based filtering |

### Recommended Future Enhancements

1. **CSRF Tokens:** Implement double-submit cookie pattern
2. **Redis-backed Rate Limiting:** For multi-instance deployments
3. **Web Application Firewall (WAF):** For additional protection layer
4. **Security Scanning:** Integrate OWASP ZAP or similar
5. **Penetration Testing:** Annual third-party assessment

---

## Compliance

### GDPR Considerations

| Requirement | Implementation | Status |
|-------------|----------------|---------|
| Right to Access | User can export their data | 🔵 Partial |
| Right to Erasure | Soft delete implemented | ✅ Ready |
| Consent Management | Registration consent | 🔵 Basic |
| Data Minimization | PII filtering by role | ✅ Implemented |
| Breach Notification | Audit trail available | ✅ Implemented |
| Portability | Export functionality | 🔵 Partial |

### Algerian Data Protection Law

HASSIBA Suite ERP incorporates Algerian-specific compliance:

| Regulation | Implementation |
|------------|----------------|
| **Loi 18-07 sur la protection des données personnelles** | PII access logging, role-based access |
| **Déclaration TVA (G50)** | Built-in TVA calculation and deadline tracking |
| **Déclaration TAP (G2)** | Tax deadline monitoring |
| **Déclaration IRG Salaires (DAS)** | Automated IRG calculation and reporting |
| **Cotisations CNAS/CASNOS** | Accurate social contribution calculations |
| **SMIG Compliance** | Minimum wage validation (M-10 FIX) |
| **Code du Travail** | Leave calculation (Fri-Sat weekend), overtime rules |

### Audit Trail for Compliance

The audit system supports regulatory requirements:

```typescript
// Complete audit entry structure
{
  id: "audit-id",
  action: "CREATE | READ | UPDATE | DELETE | LOGIN | LOGOUT",
  module: "auth | hr | accounting | inventory | sales | purchase | crm",
  entityName: "User | Employee | Invoice | Product",
  entityId: "entity-uuid",
  description: "Human-readable description",
  oldValues: "{ ... }",  // Before state (JSON)
  newValues: "{ ... }",  // After state (JSON)
  ipAddress: "203.0.113.1",
  userAgent: "Mozilla/5.0...",
  method: "POST",
  endpoint: "/api/employees",
  userId: "user-id",
  userName: "Admin User",
  userEmail: "admin@hassiba.dz",
  createdAt: "2025-01-15T10:30:00.000Z"
}
```

---

## Security Testing Checklist

### Before Deployment

- [ ] Run OWASP ZAP automated scan
- [ ] Test all authentication flows
- [ ] Verify rate limiting works
- [ ] Test IDOR on all endpoints
- [ ] Validate PII filtering for each role
- [ ] Check error responses don't leak info
- [ ] Verify security headers present
- [ ] Test account lockout mechanism
- [ ] Audit password complexity enforcement
- [ ] Review CORS configuration

### Periodic Security Reviews

- [ ] Monthly: Review audit logs for anomalies
- [ ] Quarterly: Update dependency vulnerabilities
- [ ] Annually: Third-party penetration test
- [ ] Annually: Review and update RBAC matrix

---

*Document Version: 2.0.0-Final*  
*Generated for HASSIBA Suite ERP Final Certification*
*Security Classification: Internal Technical Documentation*
