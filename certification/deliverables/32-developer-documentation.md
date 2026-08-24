# HASSIBA Suite ERP - Developer Documentation

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D32)  
**Date:** January 2025  
**Target Audience:** Software Developers

---

## 1. Getting Started

### 1.1 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Bun | 1.3+ | Package manager (recommended) |
| Git | Latest | Version control |
| VS Code | Latest | Recommended IDE |

### 1.2 Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd my-project

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
bun run db:generate

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### 1.3 Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional: External services
# AI_SDK_API_KEY="your-ai-key"
```

---

## 2. Project Structure

### 2.1 Directory Layout

```
my-project/
├── prisma/
│   ├── schema.prisma          # Database schema (64+ models)
│   └── migrations/            # Database migrations
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── (dashboard)/       # Dashboard route group (with layout)
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   ├── finance/       # Finance module
│   │   │   ├── hr/            # HR module
│   │   │   ├── inventory/     # Inventory module
│   │   │   ├── sales/         # Sales module
│   │   │   ├── purchases/     # Purchases module
│   │   │   ├── production/    # Production module
│   │   │   ├── bi/            # Business Intelligence
│   │   │   ├── documents/     # Document management
│   │   │   ├── workflows/     # Workflow management
│   │   │   ├── settings/      # Settings
│   │   │   ├── calendar/      # Calendar
│   │   │   ├── import/        # Data import
│   │   │   └── maintenance/   # Maintenance
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── employees/     # Employee CRUD
│   │   │   ├── payroll/       # Payroll processing
│   │   │   ├── invoices/      # Invoice management
│   │   │   ├── analytics/     # BI data
│   │   │   ├── ai/chat/       # AI assistant
│   │   │   └── ...            # Other API routes
│   │   ├── login/             # Login page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (50+)
│   │   ├── layout/            # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── dashboard-layout.tsx
│   │   ├── dashboard/         # Dashboard-specific components
│   │   ├── ai/                # AI assistant component
│   │   ├── reports/           # Report components
│   │   ├── workflows/         # Workflow builder
│   │   └── import/            # Import wizard
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-toast.ts
│   │   ├── use-mobile.ts
│   │   ├── use-pwa.ts
│   │   ├── use-ai-chat.ts
│   │   └── use-notifications.ts
│   └── lib/                   # Core utilities
│       ├── db.ts              # Prisma client singleton
│       ├── auth.ts            # NextAuth configuration
│       ├── auth-utils.ts      # Auth helper functions
│       ├── algerian-taxes.ts  # Tax calculation engine
│       ├── auto-posting.ts    # Accounting auto-posting
│       ├── workflow-engine.ts # Workflow engine
│       ├── validation.ts      # Input validation
│       ├── security.ts        # Security utilities
│       ├── cache.ts           # Caching layer
│       ├── audit.ts           # Audit logging
│       ├── logger.ts          # Logging utility
│       ├── socket.ts          # Socket.io config
│       ├── notifications.ts   # Notification service
│       ├── utils.ts           # General utilities
│       └── seed*.ts           # Data seeding scripts
├── certification/             # Certification deliverables
│   └── deliverables/          # Documentation files
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
├── package.json               # Dependencies
└── bun.lock                   # Lock file
```

### 2.2 Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/db.ts` | Database connection | ~30 |
| `src/lib/auth.ts` | Auth configuration | ~100 |
| `src/lib/algerian-taxes.ts` | Tax engine | ~922 |
| `src/lib/workflow-engine.ts` | Workflow engine | ~400 |
| `src/lib/validation.ts` | Validation schemas | ~200 |
| `prisma/schema.prisma` | Data model | ~2500 |

---

## 3. Technology Stack

### 3.1 Core Dependencies

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Framework** | Next.js | 16.x | React framework with App Router |
| **UI Library** | React | 19.x | Component library |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Components** | shadcn/ui | Latest | Accessible UI components (Radix) |
| **ORM** | Prisma | 6.x | Type-safe database access |
| **Auth** | NextAuth.js | v4 | Authentication |
| **State** | Zustand | 5.x | Client state management |
| **Forms** | React Hook Form | 7.x | Form handling |
| **Validation** | Zod | 4.x | Schema validation |
| **Charts** | Recharts | 2.x | Data visualization |
| **Tables** | TanStack Table | 8.x | Data tables |
| **Date** | date-fns | 4.x | Date manipulation |
| **Icons** | Lucide React | Latest | Icon library |
| **AI** | z-ai-web-dev-sdk | 0.0.x | AI integration |

### 3.2 Dev Dependencies

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety |
| ESLint | Code linting |
| Tailwind CSS PostCSS | CSS processing |
| Bun Types | Bun type definitions |

---

## 4. Development Patterns

### 4.1 API Route Pattern

All API routes follow a consistent pattern:

```typescript
// src/app/api/[resource]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-utils';

export async function GET(request: Request) {
  // 1. Authenticate
  const authError = await requireAuth(request);
  if (authError) return authError;
  
  // 2. Parse query params
  const { searchParams } = new URL(request.url);
  
  try {
    // 3. Execute query
    const data = await db.resource.findMany({...});
    
    // 4. Return response
    return NextResponse.json({ success: true, data });
  } catch (error) {
    // 5. Handle errors
    return NextResponse.json(
      { success: false, error: 'Error message' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Similar pattern for mutations
}
```

### 4.2 Response Format Standard

**Success Response:**
```json
{
  "success": true,
  "data": {...},
  "pagination"?: {...},
  "message"?: "Optional message"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Human-readable error message",
  "code"?: "ERROR_CODE"
}
```

### 4.3 Component Pattern

```typescript
// src/components/example-component.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExampleComponentProps {
  title: string;
  data?: DataType;
}

export function ExampleComponent({ title, data }: ExampleComponentProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
}
```

### 4.4 Custom Hook Pattern

```typescript
// src/hooks/use-example.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseExampleReturn {
  data: DataType | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useExample(id?: string): UseExampleReturn {
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/resource/${id}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [id]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, isLoading, error, refetch: fetchData };
}
```

---

## 5. Database Operations

### 5.1 Prisma Client Usage

```typescript
// Import the singleton instance
import { db } from '@/lib/db';

// Find single record
const employee = await db.employee.findUnique({
  where: { id: employeeId },
  include: { department: true }
});

// Find multiple with filters
const employees = await db.employee.findMany({
  where: {
    status: 'active',
    department: { contains: 'IT' }
  },
  orderBy: { lastName: 'asc' },
  take: 50,
  skip: page * 50
});

// Create record
const newEmployee = await db.employee.create({
  data: {
    firstName: 'Ahmed',
    lastName: 'BENALI',
    email: 'a.benali@company.dz'
  }
});

// Update record
const updated = await db.employee.update({
  where: { id },
  data: { status: 'inactive' }
});

// Aggregation
const stats = await db.employee.aggregate({
  _count: { id: true },
  _avg: { baseSalary: true }
});

// Transaction
await db.$transaction(async (tx) => {
  await tx.invoice.create({ ... });
  await tx.accountingEntry.create({ ... });
});
```

### 5.2 Common Query Patterns

**Pagination:**
```typescript
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '20');
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  db.resource.findMany({ skip, take: limit }),
  db.resource.count({ where })
]);

return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
```

**Search:**
```typescript
if (search) {
  where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { description: { contains: search, mode: 'insensitive' } }
  ];
}
```

---

## 6. Authentication & Authorization

### 6.1 Using Auth Utilities

```typescript
import { 
  requireAuth, 
  requireRole, 
  getAuthenticatedUser,
  ROLES 
} from '@/lib/auth-utils';

// Require any authenticated user
const authError = await requireAuth(request);
if (authError) return authError;

// Require specific roles
const roleError = await requireRole(request, [ROLES.ADMIN, ROLES.MANAGER]);
if (roleError) return roleError;

// Get current user info
const user = await getAuthenticatedUser();
```

### 6.2 Available Roles

```typescript
enum ROLES {
  ADMIN = 'admin',
  MANAGER = 'manager',
  HR = 'hr',
  HR_MANAGER = 'hr_manager',
  ACCOUNTANT = 'accountant',
  EMPLOYEE = 'employee'
}
```

### 6.3 Client-Side Auth Check

```typescript
import { useSession } from 'next-auth/react';

function MyComponent() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') return <Skeleton />;
  if (!session) return <LoginPrompt />;
  
  // User is authenticated
  return <ProtectedContent />;
}
```

---

## 7. Tax Engine Integration

### 7.1 Importing Tax Functions

```typescript
import {
  // TVA
  calculateTVA,
  calculateTVACollectee,
  isValidTVARate,
  
  // IRG
  calculateIRGMensuel,
  calculateIRGAnnuel,
  
  // Social Contributions
  calculateCotisations,
  
  // Payroll Helpers
  calculatePrimeAncienete,
  getAllocationsFamiliales,
  calculateHeuresSupp,
  
  // TAP
  calculateTAP,
  
  // IBS
  calculateIBS,
  
  // Tax-Exempt Primes (H-19)
  PRIME_TYPES,
  calculateIRGAvecPrimes,
} from '@/lib/algerian-taxes';
```

### 7.2 Common Calculation Examples

**Invoice TVA:**
```typescript
const tvaResult = calculateTVA(100000, 0.19);
// => { montantHT: 100000, montantTVA: 19000, montantTTC: 119000 }
```

**Payroll IRG:**
```typescript
const irgResult = calculateIRGMensuel(50000, 4); // 4 family parts
// => { irgNet: 4500, revenuImposable: 38000, ... }
```

**Full Payroll:**
```typescript
const cotisations = calculateCotisations(baseSalary, { irgParts: 4 });
const seniorityBonus = calculatePrimeAncienete(baseSalary, yearsOfService);
const familyAllowances = getAllocationsFamiliales(childrenCount);
```

---

## 8. Error Handling

### 8.1 API Error Pattern

```typescript
try {
  // Operation that might fail
  const result = await dangerousOperation();
  return NextResponse.json({ success: true, data: result });
} catch (error) {
  console.error('Operation failed:', error);
  
  // Handle specific errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Record already exists', code: 'DUPLICATE' },
        { status: 409 }
      );
    }
  }
  
  // Generic error
  return NextResponse.json(
    { success: false, error: 'Operation failed' },
    { status: 500 }
  );
}
```

### 8.2 Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `DUPLICATE` | 409 | Unique constraint violation |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMITED` | 429 | Too many requests |

---

## 9. Testing Guide

### 9.1 Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test payroll.test.ts

# Run tests with coverage
bun test --coverage
```

### 9.2 Test Patterns

**API Route Test:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/payroll/route';

describe('Payroll API', () => {
  it('should require authentication', async () => {
    const request = new Request('http://localhost/api/payroll');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

**Tax Calculation Test:**
```typescript
import { calculateTVA, calculateIRGMensuel } from '@/lib/algerian-taxes';

describe('Tax Calculations', () => {
  it('should calculate TVA correctly', () => {
    const result = calculateTVA(100000, 0.19);
    expect(result.montantTVA).toBe(19000);
    expect(result.montantTTC).toBe(119000);
  });
});
```

---

## 10. Build & Deployment

### 10.1 Local Development

```bash
# Start dev server with hot reload
bun run dev
# → http://localhost:3000
```

### 10.2 Production Build

```bash
# Type-check and build
bun run build

# Start production server
bun run start
# → http://localhost:3000
```

### 10.3 Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN corepack enable && bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 11. Coding Standards

### 11.1 TypeScript Rules

- Enable strict mode
- Use interfaces for object shapes
- Avoid `any` type
- Use proper null checks

### 11.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `algerian-taxes.ts` |
| Components | PascalCase | `EmployeeTable.tsx` |
| Functions | camelCase | `calculateTVA()` |
| Constants | UPPER_SNAKE_CASE | `TVA_RATES` |
| Interfaces | PascalCase | `TVACalculResult` |
| DB Models | PascalCase | `Employee`, `Invoice` |
| API Routes | kebab-case | `/api/payroll` |

### 11.3 Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance

Example: `feat(payroll): add overtime calculation support`

---

## 12. Debugging Tips

### 12.1 Console Logging

```typescript
// Use structured logging
console.log('[MODULE] Description:', { key: value });
console.warn('[MODULE] Warning:', { details });
console.error('[MODULE] Error:', error);
```

### 12.2 Common Issues

| Issue | Solution |
|-------|----------|
| Prisma client not generated | Run `bun run db:generate` |
| Auth errors in dev | Check NEXTAUTH_SECRET and URL |
| Port already in use | Kill process on port 3000 |
| Build type errors | Check `tsconfig.json` strict mode |

---

## 13. Resources

### 13.1 Internal Documentation

| Document | Location |
|----------|-----------|
| Enterprise Architecture | `certification/deliverables/01-enterprise-architecture.md` |
| Database Architecture | `certification/deliverables/02-database-architecture.md` |
| Tax Engine Docs | `certification/deliverables/05-tax-engine.md` |
| Payroll Engine Docs | `certification/deliverables/06-payroll-engine.md` |
| API Documentation | `certification/deliverables/19-api-documentation.md` |
| Algerian Localization | `certification/deliverables/04-algerian-localization-model.md` |

### 13.2 External Resources

| Resource | URL |
|----------|-----|
| Next.js Documentation | https://nextjs.org/docs |
| Prisma Documentation | https://www.prisma.io/docs |
| shadcn/ui Components | https://ui.shadcn.com |
| Radix UI | https://www.radix-ui.com |
| Tailwind CSS | https://tailwindcss.com/docs |

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
