# HASSIBA Suite ERP - ECM (Enterprise Content Management) Module

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D16)  
**Date:** January 2025  
**Source File:** `src/app/api/documents/route.ts`

---

## 1. Overview

The **ECM Module** provides document management capabilities for HASSIBA Suite ERP, enabling organizations to:

- 📁 **Document Storage** - Centralized repository for all business documents
- 🔍 **Search & Discovery** - Full-text search across metadata
- 🏷️ **Categorization** - Flexible tagging and categorization
- 🔒 **Access Control** - Role-based and user-level permissions
- 📎 **Entity Linking** - Associate documents with business entities
- 📊 **Versioning** - Document version tracking

---

## 2. Document Categories

### 2.1 Supported Categories

| Category | Code | Description | Typical Documents |
|----------|------|-------------|-------------------|
| Human Resources | `hr` | Employee & HR documents | Contracts, CVs, evaluations |
| Finance | `finance` | Financial documents | Invoices, receipts, statements |
| Legal | `legal` | Legal documents | Contracts, agreements, compliance |
| Administrative | `administrative` | Admin documents | Memos, policies, procedures |
| Technical | `technical` | Technical docs | Specs, manuals, diagrams |
| Commercial | `commercial` | Sales/purchase docs | Orders, quotations, proposals |
| Inventory | `inventory` | Stock/warehouse docs | Receiving notes, stock reports |
| Payroll | `payroll` | Salary documents | Payslips, tax forms |
| Other | `other` | Uncategorized | Miscellaneous |

---

## 3. API Reference

### 3.1 GET /api/documents

List and search documents with filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| category | string | all | Filter by category |
| entityType | string | - | Filter by linked entity type |
| entityId | string | - | Filter by linked entity ID |
| tags | string | - | Comma-separated tags to search |
| search | string | - | Text search in name/description/filename |
| status | string | active | Filter by status |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| includeDeleted | boolean | false | Include deleted documents |

**Authorization:** Authentication required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "doc_id",
      "name": "Contract de travail - Ahmed BENALI",
      "description": "CDI signé le 15 janvier 2024",
      "fileName": "CTR-2024-001-BENALI.pdf",
      "fileSize": 245000,
      "mimeType": "application/pdf",
      "category": "hr",
      "fileUrl": "/uploads/documents/CTR-2024-001-BENALI.pdf",
      "storageProvider": "local",
      "version": 1,
      "isConfidential": true,
      "status": "active",
      "entityType": "contract",
      "entityId": "contract_123",
      "tags": ["contract", "cdi", "2024", "it-department"],
      "allowedRoles": ["admin", "manager", "hr"],
      "allowedUserIds": null,
      "uploadedBy": {
        "id": "user_id",
        "name": "Fatima ZERHOUNI",
        "email": "f.zerhouni@company.dz",
        "avatar": "/avatars/fatima.jpg"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

#### Search Behavior

The `search` parameter performs text matching on:
- Document name (`name`)
- Description (`description`)
- Original filename (`fileName`)

The `tags` parameter finds documents containing **any** of the specified tags:
```
?tags=contract,hr → Returns documents with "contract" OR "hr" tag
```

### 3.2 POST /api/documents

Upload document metadata (actual file handled separately).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✅ | Display name for the document |
| fileName | string | ✅ | Original file name |
| fileUrl | string | ✅ | URL/path to stored file |
| uploadedById | string | ✅ | User ID who uploaded |
| description | string | ❌ | Document description |
| fileSize | number | ❌ | File size in bytes |
| mimeType | string | ❌ | MIME type |
| category | string | ❌ | Document category (default: other) |
| thumbnailUrl | string | ❌ | URL to thumbnail image |
| storageProvider | string | ❌ | Storage backend (default: local) |
| version | number | ❌ | Version number (default: 1) |
| parentVersionId | string | ❌ | Parent version ID for versioning |
| isConfidential | boolean | ❌ | Mark as confidential (default: false) |
| allowedRoles | string[] | ❌ | Roles with access |
| allowedUserIds | string[] | ❌ | Specific users with access |
| status | string | ❌ | Status (default: active) |
| entityType | string | ❌ | Linked entity type |
| entityId | string | ❌ | Linked entity ID |
| generateUniqueName | boolean | ❌ | Generate unique filename |

**Authorization:** ADMIN, MANAGER, or HR role

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "new_doc_id",
    "name": "Facture F2025-001",
    "fileName": "a1b2c3d4_1705312345678.pdf",
    "description": "Facture client ALGERIE TELECOM",
    "category": "commercial",
    "tags": [],
    "allowedRoles": null,
    "allowedUserIds": null,
    "uploadedBy": {
      "id": "user_id",
      "name": "Ahmed BENALI",
      "email": "a.benali@company.dz"
    },
    "status": "active",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "message": "Document \"Facture F2025-001\" enregistré avec succès"
}
```

---

## 4. Access Control System

### 4.1 Permission Model

Documents support two levels of access control:

```typescript
interface AccessControl {
  isConfidential: boolean;     // Marks document as sensitive
  allowedRoles: string[] | null;  // Roles that can access
  allowedUserIds: string[] | null; // Specific users that can access
}
```

### 4.2 Access Matrix

| Scenario | isConfidential | allowedRoles | allowedUserIds | Result |
|----------|----------------|--------------|----------------|--------|
| Public document | false | null | null | All authenticated users |
| Role-restricted | false | ["hr", "admin"] | null | Only HR and Admin |
| User-specific | false | null | ["user_1", "user_2"] | Only specified users |
| Combined | true | ["admin"] | ["user_1"] | Admin + User 1 only |

### 4.3 Entity Linking

Documents can be linked to business entities:

| entityType | Example entityId | Use Case |
|------------|------------------|----------|
| contract | contract_123 | Employment contract PDF |
| invoice | inv_456 | Scanned invoice |
| employee | emp_789 | Employee CV |
| product | prod_101 | Product specification |
| purchase_order | po_202 | Purchase order scan |

---

## 5. Versioning Support

### 5.1 Version Fields

| Field | Description |
|-------|-------------|
| version | Integer version number (starts at 1) |
| parentVersionId | ID of previous version |
| createdAt | Timestamp of this version |

### 5.2 Version Workflow

```
Original Document (v1)
├── id: doc_001
├── version: 1
└── parentVersionId: null

        │ Update
        ▼

Updated Document (v2)
├── id: doc_002 (NEW record)
├── version: 2
└── parentVersionId: doc_001
```

---

## 6. Storage Architecture

### 6.1 Storage Providers

| Provider | Code | Description |
|----------|------|-------------|
| Local filesystem | `local` | Server local storage (dev/default) |
| S3-compatible | `s3` | AWS S3 or compatible (MinIO, etc.) |
| Azure Blob | `azure` | Azure Blob Storage |
| GCS | `gcs` | Google Cloud Storage |

### 6.2 File Naming

When `generateUniqueName: true`, files are renamed:

```
Format: {uuid}_{timestamp}.{extension}
Example: a1b2c3d4_1705312345678.pdf
```

### 6.3 Recommended Directory Structure

```
/uploads/
├── documents/
│   ├── hr/
│   │   ├── contracts/
│   │   └── employees/
│   ├── finance/
│   │   ├── invoices/
│   │   └── bills/
│   ├── commercial/
│   └── ...
└── thumbnails/
```

---

## 7. Database Schema (Document Model)

```typescript
model Document {
  id                String    @id @default(cuid())
  
  // Identification
  name              String                          // Display name
  description       String?
  fileName          String                          // Stored filename
  fileSize          Int                             // Size in bytes
  mimeType          String?
  
  // Classification
  category          String    @default("other")     // Document category
  tags              String?                         // JSON array of tags
  
  // Storage
  fileUrl           String                          // URL/path to file
  thumbnailUrl      String?                         // Thumbnail URL
  storageProvider   String    @default("local")     // Storage backend
  
  // Versioning
  version           Int       @default(1)
  parentVersionId   String?                         // Previous version
  
  // Access Control
  isConfidential    Boolean   @default(false)
  allowedRoles      String?                         // JSON array
  allowedUserIds    String?                         // JSON array
  
  // Status
  status            String    @default("active")    // active, archived, deleted
  
  // Entity Linking
  entityType        String?                         // Linked entity type
  entityId          String?                         // Linked entity ID
  
  // Relations
  uploadedById      String
  uploadedBy        User      @relation(fields: [uploadedById], references: [id])
  companyId         String
  company           Company   @relation(fields: [companyId], references: [id])
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([category])
  @@index([entityType, entityId])
  @@index([status])
  @@index([uploadedById])
}
```

---

## 8. Search & Query Patterns

### 8.1 Common Search Queries

```typescript
// Find all HR contracts
GET /api/documents?category=hr&search=contract

// Find documents for specific employee
GET /api/documents?entityType=employee&entityId=emp_123

// Find tagged documents
GET /api/documents?tags=invoice,paid,2025

// Full-text search
GET /api/documents?search=benali

// Combine filters
GET /api/documents?category=finance&status=active&search=facture&page=1&limit=50
```

### 8.2 Pagination

Always use pagination for large result sets:

```typescript
// Response includes pagination metadata
{
  "pagination": {
    "page": 1,        // Current page
    "limit": 20,      // Items per page
    "total": 156,     // Total matching records
    "totalPages": 8   // Total pages
  }
}
```

---

## 9. Security Considerations

### 9.1 File Upload Security

1. **Validate MIME types** - Reject executable files
2. **Limit file sizes** - Configure max upload size
3. **Scan for malware** - Integrate antivirus scanning
4. **Use secure storage** - Prevent direct URL access
5. **Generate unique names** - Prevent path traversal

### 9.2 Data Protection

- Confidential documents require explicit access grants
- Audit trail for all document access
- PII documents should use `isConfidential: true`
- Regular cleanup of deleted documents

---

## 10. Integration Points

### 10.1 Document Sources

| Module | Typical Documents |
|--------|-------------------|
| Contracts | Signed employment contracts |
| Invoices | Scanned supplier invoices |
| Bills | Utility bills, receipts |
| Employees | IDs, diplomas, CVs |
| Products | Specifications, images |
| Accounting | Financial statements, tax returns |

### 10.2 Downstream Consumers

| Consumer | Usage |
|----------|-------|
| Reporting | Attach documents to reports |
| Workflow | Route documents for approval |
| Portal | Employee document self-service |
| Backup | Archive documents for DR |

---

## 11. Best Practices

### 11.1 For Users

1. **Use descriptive names** - Include date, type, subject
2. **Apply consistent tags** - Enable better search
3. **Set appropriate categories** - Organize by department
4. **Mark confidential items** - Protect sensitive data
5. **Link to entities** - Connect to related records

### 11.2 For Developers

1. **Handle file uploads separately** - Use multipart form handling
2. **Generate thumbnails** - For PDF/image preview
3. **Implement soft delete** - Preserve audit trail
4. **Cache search results** - Improve performance
5. **Log all access** - Compliance requirements

---

## 12. Future Enhancements (Planned)

- [ ] Full-text content indexing (PDF/DOCX parsing)
- [ ] Document workflow/approval routing
- [ ] OCR for scanned documents
- [ ] Digital signature integration
- [ ] Retention policy automation
- [ ] Document templates
- [ ] Bulk operations (upload, delete, tag)
- [ ] Integration with external DMS (SharePoint, etc.)

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
