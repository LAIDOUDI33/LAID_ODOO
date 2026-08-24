# HASSIBA Suite ERP - Known Limitations

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D34)  
**Date:** January 2025  
**Status:** Active - Subject to Change

---

## 1. Overview

This document catalogs **known limitations** and **constraints** in HASSIBA Suite ERP v2.0.0. These are issues that are understood but not yet resolved, categorized by severity and module.

### Limitation Categories

| Category | Count | Description |
|----------|-------|-------------|
| Critical | 2 | Must be addressed before production |
| High | 8 | Significant impact on functionality |
| Medium | 12 | Workarounds available |
| Low | 6 | Minor inconveniences |
| **Total** | **28** | |

---

## 2. Critical Limitations

### C-01: No Database Migration System
- **Module:** Core / Database
- **Description:** Uses `prisma db push` instead of proper migrations
- **Impact:** Cannot track schema changes, risky for production data
- **Workaround:** Use `prisma migrate dev` for development
- **Status:** Planned for v2.1
- **Resolution:** Implement proper migration workflow

### C-02: In-Memory Rate Limiting Only
- **Module:** AI Chat API
- **Description:** Rate limiting uses in-memory Map, not Redis/distributed store
- **Impact:** Rate limits don't work across multiple instances
- **Workaround:** Single-instance deployment only
- **Status:** Planned for v2.1
- **Resolution:** Implement Redis-backed rate limiting

---

## 3. High Severity Limitations

### H-01: No File Upload Handling in Documents API
- **Module:** ECM (Documents)
- **Description:** POST `/api/documents` only stores metadata; actual file upload not implemented
- **Impact:** Users cannot upload files through the API
- **Workaround:** Manual file placement + URL reference
- **Status:** In Progress
- **Resolution:** Implement multipart form handling

### H-02: AI Context Cache Not Invalidated
- **Module:** AI Assistant
- **Description:** 5-minute cache for company context isn't invalidated on data changes
- **Impact:** AI may show stale data for up to 5 minutes
- **Workaround:** Acceptable delay for most use cases
- **Status:** Planned
- **Resolution:** Implement cache invalidation hooks

### H-03: No Multi-Tenancy Isolation
- **Module:** Core Architecture
- **Description:** All data visible to authenticated users regardless of company
- **Impact:** Cannot host multiple companies securely
- **Workaround:** Single-company deployment
- **Status:** Planned for v3.0
- **Resolution:** Add company_id scoping to all queries

### H-04: OEE Calculation Uses Hardcoded Values
- **Module:** Production / BI
- **Description:** Availability hardcoded to 95%, no real machine data
- **Impact:** OEE metrics may be inaccurate
- **Workaround:** Manual adjustment of values
- **Status:** Planned
- **Resolution:** Integrate with equipment monitoring

### H-05: No Audit Trail for Data Modifications
- **Module:** Security
- **Description:** Some CRUD operations lack audit logging
- **Impact:** Cannot track who changed what and when
- **Workaround:** Database triggers or application-level logging
- **Status:** In Progress
- **Resolution:** Comprehensive audit middleware

### H-06: Tax Rates Not Configurable via UI
- **Module:** Tax Engine
- **Description:** All tax rates are hardcoded in source code
- **Impact:** Requires code deployment for rate changes
- **Workaround:** Developer intervention needed
- **Status:** Planned
- **Resolution:** Admin panel for tax configuration

### H-07: No Batch Operations Support
- **Module:** Multiple (Payroll, Invoices, etc.)
- **Description:** Most operations are single-record only
- **Impact:** Time-consuming for bulk actions
- **Workaround:** Script-based bulk processing
- **Status:** Planned
- **Resolution:** Add batch endpoints with progress tracking

### H-08: Limited Error Recovery
- **Module:** Workflow Engine
- **Description:** Failed workflows may leave system in inconsistent state
- **Impact:** Manual intervention required to recover
- **Workaround:** Database rollback + retry
- **Status:** In Progress
- **Resolution:** Implement saga pattern for workflows

---

## 4. Medium Severity Limitations

### M-01: French-Only Interface
- **Module:** UI / Localization
- **Description:** Full Arabic interface not implemented
- **Impact:** Arabic-speaking users have reduced UX
- **Workaround:** Browser translation
- **Status:** Planned for v2.2
- **Resolution:** Complete i18n implementation

### M-02: No Offline Mode for Mobile
- **Module:** PWA
- **Description:** PWA manifest exists but offline functionality limited
- **Impact:** App unusable without connectivity
- **Workaround:** Always-online requirement
- **Status:** Low Priority
- **Resolution:** Service worker with data caching

### M-03: Reports Only Viewable, Not Exportable
- **Module:** Reporting
- **Description:** Reports display in browser but PDF/Excel export limited
- **Impact:** Users cannot easily share reports
- **Workaround:** Print to PDF
- **Status:** In Progress
- **Resolution:** Enhanced export functionality

### M-04: No Notification Preferences
- **Module:** Notifications
- **Description:** Users cannot configure notification types/channels
- **Impact:** May receive unwanted notifications
- **Workaround:** Manual dismissal
- **Status:** Planned
- **Resolution:** User notification settings

### M-05: Inventory No FIFO/LIFO Selection
- **Module:** Inventory
- **Description:** Cost calculation method not configurable
- **Impact:** May not match accounting requirements
- **Workaround:** Default average cost method
- **Status:** Planned
- **Resolution:** Multiple costing method support

### M-06: No Approval Workflow Configuration
- **Module:** Workflows
- **Description:** Workflow templates are hardcoded
- **Impact:** Cannot customize approval chains
- **Workaround:** Modify source code
- **Status:** Planned
- **Resolution:** Visual workflow builder

### M-07: Dashboard Not Customizable
- **Module:** Dashboard
- **Description:** Dashboard layout is fixed, users cannot rearrange
- **Impact:** Different roles see same layout
- **Workaround:** Accept default layout
- **Status**: Planned
- **Resolution:** Drag-drop dashboard customization

### M-08: Search Limited to Metadata
- **Module:** ECM
- **Description:** Document search only checks metadata, not content
- **Impact:** Cannot find documents by content
- **Workaround:** Good naming conventions
- **Status:** Planned
- **Resolution:** Full-text indexing (Elasticsearch/Meilisearch)

### M-09: No Data Import Validation Preview
- **Module:** Import
- **Description:** Imports execute without preview/validation step
- **Impact:** Bad data can enter system
- **Workaround:** Test imports on staging
- **Status:** In Progress
- **Resolution:** Two-step import with preview

### M-10: Currency Conversion Not Supported
- **Module:** Finance
- **Description:** Only DZD supported, no multi-currency
- **Impact:** Cannot handle foreign transactions natively
- **Workaround:** Manual conversion
- **Status:** Low Priority
- **Resolution:** Multi-currency with exchange rates

### M-11: No Role-Based UI Hiding
- **Module:** UI / Authorization
- **Description:** All menu items visible, access denied on action
- **Impact:** Confusing user experience
- **Workaround:** User training
- **Status:** In Progress
- **Resolution:** Conditional menu rendering

### M-12: No Scheduled Report Delivery
- **Module:** Reporting
- **Description:** Reports must be generated manually
- **Impact:** No automated report distribution
- **Workaround:** Manual generation and email
- **Status:** Planned
- **Resolution:** Cron-based scheduled reports

---

## 5. Low Severity Limitations

### L-01: Date Picker Shows Gregorian Calendar Only
- **Module:** UI
- **Description:** No Hijri calendar option
- **Impact:** Minor inconvenience for some users
- **Workaround:** Mental conversion
- **Status:** Nice-to-have

### L-02: No Dark Mode
- **Module:** UI
- **Description:** Only light theme available
- **Impact:** Eye strain in low-light conditions
- **Workaround:** OS-level dark mode (partial)
- **Status:** Planned for v2.2

### L-03: Pagination Not Remembered
- **Module:** UI
- **Description:** Page position lost on navigation
- **Impact:** Minor annoyance
- **Workaround:** Re-navigate to page
- **Status:** Low Priority

### L-04: No Keyboard Shortcuts
- **Module:** UI
- **Description:** All actions require mouse
- **Impact:** Reduced efficiency for power users
- **Workaround:** Mouse usage
- **Status:** Nice-to-have

### L-05: Toast Notifications Auto-Dismiss Quickly
- **Module:** UI
- **Description:** Notifications disappear after few seconds
- **Impact:** May miss important messages
- **Workaround:** Check notification center
- **Status:** Configurable in future

### L-06: No Undo Functionality
- **Module:** Multiple
- **Description:** Destructive actions cannot be undone
- **Impact:** Risk of accidental data loss
- **Workaround:** Careful user behavior
- **Status:** Planned (soft delete already implemented)

---

## 6. Technical Constraints

### 6.1 Performance Constraints

| Constraint | Limit | Impact |
|------------|-------|--------|
| Max records per query | 10,000 (implicit) | Large exports need pagination |
| File upload size | Server-dependent | Large files may fail |
| Concurrent users | ~100 (estimated) | Beyond needs testing |
| AI chat history | 10 messages | Longer context lost |
| Rate limit window | 1 minute | Fixed interval |

### 6.2 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |
| IE 11 | - | ❌ Not supported |
| Mobile Chrome | Latest | ✅ Supported |
| Mobile Safari | Latest | ✅ Supported |

### 6.3 Database Constraints

| Constraint | SQLite (Dev) | PostgreSQL (Prod) |
|------------|--------------|-------------------|
| Max connections | 1 | 100 (configurable) |
| Concurrent writes | Limited | Full support |
| JSON queries | Basic | Advanced |
| Full-text search | Partial | Excellent |
| Row size limit | 1GB | 1GB |

---

## 7. Regulatory Limitations

### 7.1 Algerian Compliance Gaps

| Requirement | Status | Notes |
|-------------|--------|-------|
| TVA declaration (G50) format | ⚠️ Partial | Data available, format may need adjustment |
| CNAS electronic declaration | ❌ Not implemented | Manual export required |
| Electronic invoicing | ❌ Not implemented | Pending government portal |
| Archival requirements | ⚠️ Partial | Retention period configurable |
| Data localization | ✅ Compliant | Self-hosted option |

---

## 8. Mitigation Strategies

### 8.1 For Critical Issues

1. **Database Migrations:** Use `prisma migrate dev` in development; plan migration strategy before production
2. **Rate Limiting:** Deploy as single instance; add load balancer sticky sessions if needed

### 8.2 For High Issues

1. **File Uploads:** Use external storage (S3) with pre-signed URLs
2. **Cache Invalidation:** Restart AI service after major data changes
3. **Multi-tenancy:** Database-level row security as interim solution

### 8.3 For Medium Issues

1. **Arabic UI:** Prioritize key screens first (login, dashboard)
2. **Report Export:** Implement PDF first, then Excel
3. **Notification Settings:** Email notifications as priority

---

## 9. Limitation Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Identified│───▶│ Assessed │───▶│ Planned  │───▶│ Resolved │
│          │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     ↓              ↓               ↓               ↓
  Logged         Priority        Sprint          Closed
  in this       Assigned        Assigned        in release
  document      & Triage        to Dev          notes
```

---

## 10. Reporting New Limitations

To report a new limitation:

1. Check existing list to avoid duplicates
2. Assess severity (Critical/High/Medium/Low)
3. Document impact and workaround
4. Submit via issue tracker with tag `limitation`
5. Include:
   - Module affected
   - Steps to reproduce
   - Expected vs actual behavior
   - Suggested resolution (if any)

---

## 11. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2025 | Initial documentation of 28 known limitations |

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
*Next review: April 2025*
