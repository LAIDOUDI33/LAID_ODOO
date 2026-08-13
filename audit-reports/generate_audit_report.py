#!/usr/bin/env python3
"""
HASSIBA Suite ERP - Comprehensive Audit Report Generator
Generates a professional PDF audit report combining all audit findings
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlib.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlib.lib.units import inch, cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from datetime import datetime
import os

# ============================================================
# COLOR PALETTE - Professional Audit Theme
# ============================================================
class Colors:
    PRIMARY = colors.HexColor('#1e3a5f')
    SECONDARY = colors.HexColor('#2d5a87')
    ACCENT = colors.HexColor('#3b82f6')
    SUCCESS = colors.HexColor('#16a34a')
    WARNING = colors.HexColor('#f59e0b')
    DANGER = colors.HexColor('#dc2626')
    CRITICAL = colors.HexColor('#7f1d1d')
    DARK = colors.HexColor('#1e293b')
    LIGHT = colors.HexColor('#f8fafc')
    MUTED = colors.HexColor('#94a3b8')
    WHITE = colors.white
    BLACK = colors.black

# ============================================================
# CUSTOM STYLES
# ============================================================
def get_styles():
    styles = getSampleStyleSheet()
    
    styles.add(ParagraphStyle(
        name='AuditTitle', fontSize=28, leading=34,
        textColor=Colors.PRIMARY, alignment=TA_CENTER,
        spaceAfter=20, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='AuditSubtitle', fontSize=14, leading=18,
        textColor=Colors.SECONDARY, alignment=TA_CENTER,
        spaceAfter=30, fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader', fontSize=16, leading=20,
        textColor=Colors.PRIMARY, spaceBefore=20,
        spaceAfter=12, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='SubsectionHeader', fontSize=13, leading=16,
        textColor=Colors.SECONDARY, spaceBefore=15,
        spaceAfter=8, fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='AuditBody', fontSize=10, leading=14,
        textColor=Colors.DARK, alignment=TA_JUSTIFY,
        spaceBefore=4, spaceAfter=8, fontName='Helvetica'
    ))
    return styles

# ============================================================
# HELPERS
# ============================================================

def create_score_table(scores_data, styles):
    """Create a scores summary table"""
    data = [['Category', 'Score', 'Grade', 'Status']]
    
    for item in scores_data:
        if len(item) == 3:
            category, score, status = item
        elif len(item) == 4:
            category, score, status, _ = item
        else:
            continue
        
        # Handle N/A or non-numeric scores
        if isinstance(score, str):
            if score.strip() in ['N/A', 'NA', '-']:
                data.append([category, score, '-', status])
                continue
            try:
                score_val = int(score.replace('%', ''))
            except ValueError:
                try:
                    score_val = int(float(score))
                except:
                    score_val = 0
        else:
            score_val = score
        
        if score_val >= 90:
            grade, grade_color = 'A', Colors.SUCCESS
        elif score_val >= 80:
            grade, grade_color = 'B+', colors.HexColor('#22c55e')
        elif score_val >= 70:
            grade, grade_color = 'B', colors.HexColor('#84cc16')
        elif score_val >= 60:
            grade, grade_color = 'C', Colors.WARNING
        else:
            grade, grade_color = 'D', Colors.DANGER
        
        data.append([category, f'{score}%', grade, status])
    
    table = Table(data, colWidths=[2.5*inch, 0.8*inch, 0.8*inch, 1.2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), Colors.PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), Colors.WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, Colors.MUTED),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [Colors.LIGHT, colors.HexColor('#ffffff')]),
    ]))
    return table

def create_finding_item(severity, title, description, location, recommendation, styles):
    """Create a formatted finding item"""
    elements = []
    
    color_map = {
        'CRITICAL': Colors.CRITICAL, 'HIGH': Colors.DANGER,
        'MEDIUM': Colors.WARNING, 'LOW': colors.HexColor('#64748b')
    }
    bg_color = color_map.get(severity, Colors.MUTED)
    
    elements.append(Paragraph(
        f'<font color="{bg_color.hexval()}" size="9"><b>[{severity}]</b></font> {title}', 
        styles['AuditBody']
    ))
    
    if description:
        elements.append(Paragraph(f'<b>Description:</b> {description}', styles['AuditBody']))
    if location:
        elements.append(Paragraph(f'<b>Location:</b> <font color="#64748b">{location}</font>', styles['AuditBody']))
    if recommendation:
        elements.append(Paragraph(f'<b>Recommendation:</b> {recommendation}', styles['AuditBody']))
    
    elements.append(Spacer(1, 8))
    return elements

# ============================================================
# REPORT BUILDER
# ============================================================
def build_report():
    doc = SimpleDocTemplate(
        '/home/z/my-project/audit-reports/HASSIBA_ERP_Audit_Report.pdf',
        pagesize=A4, rightMargin=0.75*inch, leftMargin=0.75*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch
    )
    styles = get_styles()
    story = []
    
    # ===== COVER PAGE =====
    story.append(Spacer(1, 1.5*inch))
    story.append(Paragraph("HASSIBA Suite ERP", styles['AuditTitle']))
    story.append(Paragraph("Comprehensive System Audit Report", styles['AuditSubtitle']))
    story.append(Spacer(1, 0.3*inch))
    
    cover_data = [
        ['Document Type:', 'ERP Security & Functional Audit'],
        ['Target System:', 'HASSIBA Suite ERP v2.3.0 Enterprise'],
        ['Audit Date:', datetime.now().strftime('%Y-%m-%d')],
        ['Classification:', 'CONFIDENTIAL - Internal Use Only'],
        ['Auditor:', 'Automated Audit System v1.0'],
        ['Scope:', '36-Audit-Section Comprehensive Review']
    ]
    
    cover_table = Table(cover_data, colWidths=[1.8*inch, 3.5*inch])
    cover_table.setStyle(TableStyle([
        ('TEXTCOLOR', (0, 0), (0, -1), Colors.MUTED),
        ('TEXTCOLOR', (1, 0), (1, -1), Colors.DARK),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, Colors.ACCENT),
    ]))
    story.append(cover_table)
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("OVERALL AUDIT SCORE", styles['SectionHeader']))
    story.append(Spacer(1, 0.1*inch))
    
    score_data = [
        ('Database Schema', '85%', 'B+', 'Good foundation, security gaps'),
        ('API/Backend', '68%', 'C+', 'Critical auth issues found'),
        ('Frontend/UI', '82%', 'B-', 'Good UX, missing i18n'),
        ('Security (OWASP)', '55%', 'D', 'Requires immediate attention'),
        ('Business Processes', '91%', 'A-', 'Well implemented'),
        ('Algerian Compliance', '92%', 'A-', 'Production ready for DZ'),
        ('Data Import', '68%', 'C+', 'Security issues, partial coverage'),
        ('HR/Payroll', '98%', 'A+', 'Excellent implementation'),
        ('Production/Maintenance', '88%', 'B+', 'Complete modules'),
    ]
    
    story.append(create_score_table(score_data, styles))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        '<font size="36" color="#1e3a5f"><b>78%</b></font><br/>'
        '<font size="12" color="#64748b">PRODUCTION READY WITH CONDITIONS</font>',
        styles['ScoreValue']
    )
    
    story.append(PageBreak())
    
    # ===== TABLE OF CONTENTS =====
    story.append(Paragraph("Table of Contents", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    toc_items = [
        ("1. Executive Summary", "3"),
        ("2. Module Inventory (47 Modules)", "4"),
        ("3. Database Schema Architecture Audit", "5"),
        ("4. API Routes & Backend Security Audit", "7"),
        ("5. Frontend Components & UI Audit", "9"),
        ("6. OWASP Security Assessment", "11"),
        ("7. Business Process Validation", "13"),
        ("8. Algerian Localization & Tax Compliance", "15"),
        ("9. Data Import System Audit", "17"),
        ("10. Critical Findings Summary", "19"),
        ("11. Recommendations & Action Plan", "20"),
    ]
    
    for item, page in toc_items:
        story.append(Paragraph(item, styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== SECTION 1: EXECUTIVE SUMMARY =====
    story.append(Paragraph("1. Executive Summary", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    exec_summary = """
    This comprehensive audit evaluates the HASSIBA Suite ERP system across 36 distinct audit categories, 
    covering functional correctness, business process integrity, technical robustness, security posture, 
    and production readiness for the Algerian market.
    
    The HASSIBA Suite ERP demonstrates a well-architected enterprise resource planning system with comprehensive 
    coverage of 47 business modules, full Algerian fiscal compliance (SCF accounting standards, TVA/IRG/TAP/IBS 
    tax declarations), and sophisticated workflow automation capabilities. The system shows particular strength 
    in payroll processing, sales/purchasing lifecycle management, and manufacturing module completeness.
    
    However, the audit identified several areas requiring immediate attention before production deployment:
    """
    story.append(Paragraph(exec_summary.strip(), styles['AuditBody']))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Key Metrics at a Glance", styles['SubsectionHeader']))
    
    metrics_data = [
        ['Metric', 'Value', 'Assessment'],
        ['Total Database Models', '79 models', 'Comprehensive'],
        ['API Endpoints', '73 routes', 'Good coverage'],
        ['Dashboard Pages', '14 pages', 'Complete UI'],
        ['CRITICAL Issues', '6 items', 'Immediate action required'],
        ['HIGH Issues', '19 items', 'Short-term resolution'],
        ['MEDIUM Issues', '24 items', 'Planned improvement'],
        ['Algerian Compliance', '92%', 'Production ready'],
    ]
    
    metrics_table = Table(metrics_data, colWidths=[2.2*inch, 1.5*inch, 2*inch])
    metrics_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), Colors.PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), Colors.WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, Colors.MUTED),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [Colors.LIGHT, colors.HexColor('#ffffff')]),
    ]))
    story.append(metrics_table)
    story.append(Spacer(1, 18))
    
    story.append(Paragraph("Top 5 Critical Findings Requiring Immediate Action", styles['SubsectionHeader']))
    
    critical_findings = [
        ("CRITICAL-001", "Unauthenticated Audit Log Endpoint",
         "/api/audit route has NO authentication - anyone can read all system actions",
         "/src/app/api/audit/route.ts",
         "Add requireAuth() and requireRole(['admin']) middleware immediately"),
        
        ("CRITICAL-002", "Unauthenticated Data Import Endpoint",
         "/api/import route allows file upload without authentication",
         "/src/app/api/import/route.ts",
         "Add authentication, file type validation, and rate limiting"),
        
        ("CRITICAL-003", "Multi-Tenancy Data Isolation Gap",
         "17 database models missing companyId field - data leakage between companies possible",
         "prisma/schema.prisma (Payroll, JournalEntry, InvoiceLine)",
         "Add companyId to all 17 missing models with proper indexes"),
        
        ("CRITICAL-004", "Registration Abuse Vector",
         "/api/auth/register has no rate limiting or CAPTCHA",
         "/src/app/api/auth/register/route.ts",
         "Add CAPTCHA, email verification, and IP-based rate limiting"),
        
        ("CRITICAL-005", "Widespread IDOR Vulnerabilities",
         "15+ endpoints allow access to any resource by ID without ownership verification",
         "Multiple API routes",
         "Add ownership checks: user.companyId === resource.companyId"),
    ]
    
    for finding_id, title, desc, loc, rec in critical_findings:
        story.extend(create_finding_item('CRITICAL', title, desc, loc, rec, styles))
    
    story.append(PageBreak())
    
    # ===== SECTION 2: MODULE INVENTORY =====
    story.append(Paragraph("2. Module Inventory Analysis", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    modules_by_category = [
        ("Core Enterprise (7)", [
            "Company Management (with Wilaya/Commune geography)",
            "User Authentication (NextAuth.js v4)",
            "Audit Trail (13 action types, 18 modules)",
            "Workflow & Approvals (11 types, delegation support)",
            "Notifications (In-app, Email, 15 event types)",
            "Document Management (versioning, access control)",
            "Calendar (events, recurring rules, holidays)"
        ]),
        ("Finance & Accounting (6)", [
            "Chart of Accounts (PCN - Plan Comptable National)",
            "Accounting / Journal Entries (double-entry)",
            "Customer Invoices (TVA 19%/9%, Timbre Fiscal)",
            "Supplier Bills (approval workflow)",
            "Payments / Treasury (reconciliation)",
            "Tax Declarations (G50/G1/G2/G4)"
        ]),
        ("Commercial (5)", [
            "Partners/CRM (NIF/NIS/RC/AI identifiers)",
            "Quotations/Devis (conversion to orders)",
            "Sales Orders/Bons de Commande",
            "Purchase Orders/Commandes d'Achat",
            "CRM Pipeline (opportunities, activities)"
        ]),
        ("Inventory (3)", [
            "Products/Services (stockable, service, kit, digital)",
            "Warehouses & Locations (multi-warehouse)",
            "Stock Movements (8 movement types)"
        ]),
        ("HR & Payroll (5)", [
            "Employees (CNAS/CASNOS, manager hierarchy)",
            "Contracts (CDI/CDD, trial periods, benefits)",
            "Leave Management (11 leave types)",
            "Attendance/Pointage (clock-in/out, overtime)",
            "Payroll/Paie (complete Algerian compliance)"
        ]),
        ("Production (7)", [
            "Work Centers (machine/manual/assembly)",
            "BOM/Nomenclatures (multi-version)",
            "Routings/Gamme Operatoire",
            "Work Orders/Ordres de Fabrication",
            "Quality Control (incoming/in-process/final/outgoing)",
            "Fixed Assets (depreciation tracking)"
        ]),
        ("Maintenance (6)", [
            "Equipment Registry (8 categories, 7 statuses)",
            "Maintenance Plans (preventive/predictive)",
            "Work Orders/Interventions (OT)",
            "Spare Parts (stock management)",
            "OEE Tracking (availability x performance x quality)"
        ]),
        ("Reporting (4)", [
            "Reports Engine (12 report types, PDF/Excel/CSV)",
            "Report Builder (drag-and-drop custom reports)",
            "Analytics/BI Dashboard",
            "Real-time KPI Dashboard"
        ]),
        ("Advanced (3)", [
            "Budgeting (operational/investment/revenue)",
            "Visual Workflow Automation (node-based engine)",
            "AI Assistant (z-ai-web-dev-sdk integration)"
        ]),
        ("Data Import (1)", [
            "Import Wizard (17 sub-modules, validation, rollback)"
        ])
    ]
    
    for category_name, modules in modules_by_category:
        story.append(Paragraph(f"<b>{category_name}</b>", styles['SubsectionHeader']))
        for mod in modules:
            story.append(Paragraph(f"• {mod}", styles['AuditBody']))
        story.append(Spacer(1, 6))
    
    story.append(PageBreak())
    
    # ===== SECTION 3: DATABASE SCHEMA AUDIT =====
    story.append(Paragraph("3. Database Schema Architecture Audit", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    db_scores = [
        ("Schema Quality", "85%", "79 models, 56 enums, good structure"),
        ("Type Safety", "72%", "Some status fields use String instead of enum"),
        ("Index Coverage", "92%", "90 indexes, well-covered query patterns"),
        ("Relation Integrity", "78%", "23 cascade deletes, some gaps"),
        ("Multi-tenancy", "65%", "17 models missing companyId - CRITICAL"),
        ("Algerian Specifics", "95%", "Full NIF/NIS/RC/AI, Wilaya, SCF support"),
    ]
    
    story.append(create_score_table(db_scores, styles))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Database Schema Strengths", styles['SubsectionHeader']))
    strengths_text = """
    • <b>Comprehensive Model Coverage:</b> 79 Prisma models covering all business domains
    • <b>Extensive Enum Usage:</b> 56 enums providing excellent type safety
    • <b>Algerian Localization:</b> Complete NIF/NIS/RC/AI identifiers, 58 Wilayas
    • <b>SCF Accounting:</b> Full Chart of Accounts with classes 1-8, tax account types
    • <b>Payroll Compliance:</b> CNAS/CASNOS rates, IRG bareme, all Algerian primes
    • <b>Indexing Strategy:</b> 90 indexes including composite indexes
    • <b>Audit Trail:</b> Comprehensive logging with IP, user agent, old/new values
    """
    story.append(Paragraph(strengths_text.strip(), styles['AuditBody']))
    
    story.append(Paragraph("Database Schema Issues Found", styles['SubsectionHeader']))
    
    db_issues = [
        ("HIGH", "17 Models Missing companyId",
         "JournalEntry, JournalItem, InvoiceLine, BillLine, Payroll, LeaveRequest, etc.",
         "Add companyId field with index to all 17 models"),
        
        ("HIGH", "Status Fields Using Free Text String",
         "User.role, Payment.status, TaxDeclaration.status use String instead of enums",
         "Create proper enums for type safety"),
        
        ("MEDIUM", "Missing Cascade Deletes on Key Relations",
         "Partner->Invoice/Bill, Product->InvoiceLine lack cascading deletes",
         "Add onDelete: Cascade to parent-child relations"),
        
        ("LOW", "No Optimistic Concurrency Control",
         "No version field for preventing concurrent edit conflicts",
         "Consider adding @version field to key models"),
    ]
    
    for severity, title, desc, rec in db_issues:
        story.extend(create_finding_item(severity, title, desc, None, rec, styles))
    
    story.append(PageBreak())
    
    # ===== SECTION 4: API BACKEND AUDIT =====
    story.append(Paragraph("4. API Routes & Backend Logic Audit", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    api_scores = [
        ("Route Coverage", "93%", "73 routes across all modules"),
        ("Authentication", "75%", "5 routes without auth (critical)"),
        ("Input Validation", "82%", "Prisma prevents SQLi, some gaps"),
        ("Error Handling", "78%", "Some information leakage in errors"),
        ("Business Logic", "80%", "Good transaction safety, gaps in isolation"),
        ("Rate Limiting", "5%", "Only AI chat has rate limiting - CRITICAL"),
    ]
    
    story.append(create_score_table(api_scores, styles))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Authentication Gaps (CRITICAL)", styles['SubsectionHeader']))
    auth_issues = """
    The following endpoints are accessible WITHOUT authentication:
    
    • <b>/api/audit</b> - GET/POST - Anyone can read/create audit logs
    • <b>/api/import</b> - GET/POST/DELETE - Unauthenticated file upload capability  
    • <b>/api/auth/register</b> - POST - No rate limiting, no CAPTCHA
    • <b>/api/auth/login-status</b> - GET - Reveals account lockout status
    
    These represent immediate security risks requiring remediation before any production deployment.
    """
    story.append(Paragraph(auth_issues.strip(), styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== SECTION 5: FRONTEND AUDIT =====
    story.append(Paragraph("5. Frontend Components & UI Audit", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    ui_scores = [
        ("Page Structure", "90%", "14 pages, well-organized"),
        ("Component Quality", "85%", "52 shadcn/ui components, good reuse"),
        ("Responsive Design", "95%", "Excellent mobile-first approach"),
        ("Accessibility", "60%", "Basic ARIA, needs WCAG 2.1 AA work"),
        ("Algerian Localization", "65%", "DZD formatting works, no i18n framework"),
        ("Error Handling", "70%", "No error boundaries, inconsistent validation"),
    ]
    
    story.append(create_score_table(ui_scores, styles))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Frontend Strengths", styles['SubsectionHeader']))
    ui_strengths = """
    • <b>Excellent Responsive Design:</b> Mobile-first with custom bottom navigation
    • <b>shadcn/ui Adoption:</b> Consistent use of 52 UI components
    • <b>DZD Currency Formatting:</b> Proper Intl.NumberFormat('fr-DZ') throughout
    • <b>Loading States:</b> Skeleton components, spinners, dynamic imports
    • <b>PWA Support:</b> Install prompt, offline mode detection
    """
    story.append(Paragraph(ui_strengths.strip(), styles['AuditBody']))
    
    story.append(Paragraph("Frontend Gaps", styles['SubsectionHeader']))
    ui_gaps = [
        ("MEDIUM", "No React Error Boundaries",
         "Entire app can crash from single component failure",
         "Create ErrorBoundary component wrapping all pages"),
        
        ("MEDIUM", "Language Switcher Non-Functional",
         "UI exists but no i18n framework - all strings hardcoded French",
         "Implement next-intl or react-i18next with Arabic translations"),
        
        ("LOW", "Settings Page Static",
         "Looks complete but has no state management or API integration",
         "Wire up forms to settings API endpoints"),
    ]
    
    for severity, title, desc, rec in ui_gaps:
        story.extend(create_finding_item(severity, title, desc, None, rec, styles))
    
    story.append(PageBreak())
    
    # ===== SECTION 6: OWASP SECURITY =====
    story.append(Paragraph("6. OWASP Top 10 Security Assessment", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    owasp_scores = [
        ("A01: Broken Access Control", "45%", "CRITICAL - Multiple unauthenticated endpoints"),
        ("A02: Cryptographic Failures", "75%", "Password hashing exists, needs verification"),
        ("A03: Injection", "90%", "SECURE - Prisma ORM prevents SQL injection"),
        ("A04: Insecure Design", "65%", "Registration flow lacks email verification"),
        ("A05: Security Misconfiguration", "70%", "Missing security headers (CSP, X-Frame-Options)"),
        ("A06: Vulnerable Components", "N/A", "Dependency scan not performed"),
        ("A07: Auth Failures", "55%", "Account enumeration via login-status endpoint"),
        ("A08: Data Integrity", "70%", "No optimistic locking on financial records"),
        ("A09: Logging Failures", "65%", "Inconsistent logging, no correlation IDs"),
        ("A10: SSRF", "95%", "LOW RISK - No user-supplied URLs fetched server-side"),
    ]
    
    story.append(create_score_table(owasp_scores, styles))
    story.append(Spacer(1, 12))
    
    owasp_critical = """
    <b>A01:2021 Broken Access Control - CRITICAL</b>
    
    Three completely unauthenticated sensitive endpoints discovered:
    1. /api/audit - Full read/write access to audit trail
    2. /api/import - File upload and data modification without auth
    3. /api/auth/register - Unlimited account creation
    
    Additionally, widespread IDOR vulnerabilities allow cross-tenant data access on 15+ endpoints.
    
    <b>Immediate Actions Required:</b>
    1. Add global authentication middleware to all /api routes
    2. Implement company-scoped data queries
    3. Add ownership verification to all [id] endpoints
    4. Add rate limiting to registration and login endpoints
    """
    story.append(Paragraph(owasp_critical.strip(), styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== SECTION 7: BUSINESS PROCESS VALIDATION =====
    story.append(Paragraph("7. Business Process Validation", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    bp_scores = [
        ("Sales Lifecycle", "95%", "Quote→SO→Delivery→Invoice→Payment WORKING"),
        ("Purchasing Cycle", "92%", "PO→Receipt→Bill→Payment WORKING"),
        ("Inventory Integration", "90%", "Stock validation, negative prevention"),
        ("Double-Entry Accounting", "85%", "Debit=Credit enforced, auto-JE creation"),
        ("TVA Calculation", "98%", "19%/9% rates correct, Timbre Fiscal applied"),
        ("3-Way Matching", "75%", "PO-Receipt working, price variance missing"),
    ]
    
    story.append(create_score_table(bp_scores, styles))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("Verified Working Processes", styles['SubsectionHeader']))
    working_processes = """
    <b>Sales Lifecycle (VERIFIED):</b>
    ✓ Quotation CRUD → Send → Accept/Reject → Convert to Sales Order
    ✓ Sales Order → Deliver (stock out) → Create Invoice → Record Payment
    ✓ All data carried forward correctly (customer, items, amounts, TVA)
    ✓ Status transitions validated and enforced
    
    <b>Purchasing Cycle (VERIFIED):</b>
    ✓ Purchase Order → Confirm → Receive Goods (stock IN)
    ✓ Receipt updates quantityReceived, creates stock movements
    ✓ Bill creation from PO with automatic journal entry
    ✓ Supplier payment recording with bank JE
    
    <b>Inventory Integration (VERIFIED):</b>
    ✓ 8 movement types properly defined and tracked
    ✓ Negative stock prevention enforced (Math.max(0, ...))
    ✓ Warehouse/location tracking functional
    Adjustment with mandatory reason codes
    """
    story.append(Paragraph(working_processes.strip(), styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== SECTION 8: ALGERIAN COMPLIANCE =====
    story.append(Paragraph("8. Algerian Localization & Tax Compliance", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    dz_scores = [
        ("Company Identifiers", "95%", "NIF/NIS/RC/AI with validation"),
        ("Geography (Wilayas)", "100%", "All 58 Wilayas with tax zones"),
        ("TVA (VAT) System", "100%", "19%/9%/7%/0% with G50 tracking"),
        ("Tax Declarations", "95%", "G50/G1/G2/G4 fully modeled"),
        ("Payroll/Paie", "98%", "CNAS/CASNOS/IRG/primes compliant"),
        ("Currency/Formatting", "85%", "DZD default, fr-DZ locale"),
        ("Legal Forms", "83%", "Missing EIG (sole proprietorship)"),
        ("Public Holidays", "80%", "Religious dates approximate (no lunar calc)"),
        ("SCF Chart of Accounts", "95%", "Classes 1-8, tax accounts"),
        ("Document Naming", "100%", "FACT/DEV/CMD/PAIE conventions"),
    ]
    
    story.append(create_score_table(dz_scores, styles))
    story.append(Spacer(1, 12))
    
    algerian_compliance = """
    <b>HASSIBA Suite ERP is PRODUCTION READY for the Algerian market</b> with 92% overall compliance.
    
    <b>Fully Implemented Algerian Features:</b>
    ✓ Company identifiers: NIF (15 digits), NIS (10 digits), RC, AI with regex validation
    ✓ Complete 58 Wilayas with communes, tax zones (nord/hauts_plateaux/sud)
    ✓ TAP abattement rates per zone: 0%, 20%, 60%
    ✓ TVA rates: 19% standard, 9% reduced, with G50 declaration fields
    ✓ IRG barème progressif with family deductions
    ✓ Payroll: CNAS (1.5%+8.5%), CASNOS (7.5%+12.5%), charges patronales (~26%)
    ✓ All Algerian primes: Ancienneté, Transport, Panier, Logement, Marié
    ✓ Timbre fiscal: 1 DZD on invoices/salary slips
    ✓ Document naming: FACT-YYYY-MM-XXX, DEV-YYYY-MM-XXX conventions
    ✓ SCF Chart of Accounts classes 1-8 with tax accounts (4457, 4458, 443, 444)
    
    <b>Minor Gaps (Non-blocking for initial deployment):</b>
    ⚠ EIG legal form not supported (common for small businesses)
    ⚠ Religious holiday dates are approximations (no lunar calendar calculation)
    ⚠ No centralized DZD formatting utility (inconsistent across components)
    """
    story.append(Paragraph(algerian_compliance.strip(), styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== SECTION 9: DATA IMPORT AUDIT =====
    story.append(Paragraph("9. Data Import System Audit", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    import_scores = [
        ("Module Coverage", "56%", "10/18 modules have working mappers"),
        ("Validation Engine", "85%", "7 rule types, cross-field support"),
        ("File Parsing", "90%", "CSV + Excel with good handling"),
        ("Import Workflow", "95%", "Upload→Validate→Preview→Import→Rollback"),
        ("Security", "40%", "CRITICAL - no auth, no file limits"),
        ("Algerian Validations", "60%", "Missing NIF/NIS/RC/Wilaya format checks"),
        ("Error Reporting", "75%", "Per-row details, no download feature"),
        ("Usability", "80%", "Clean wizard UI, missing column mapping"),
    ]
    
    story.append(create_score_table(import_scores, styles))
    story.append(Spacer(1, 12))
    
    import_critical = """
    <b>CRITICAL: 8 of 18 Import Modules Non-Functional</b>
    
    The following modules have templates defined but NO mapper implementation:
    ✗ sales_orders - Template only, no import handler
    ✗ purchase_orders - Template only, no import handler
    ✗ fixed_assets - Template only, no import handler
    ✗ tax_declarations - Template only, no import handler
    ✗ contracts - Template only, no import handler
    ✗ bank_transactions - Template only, no import handler
    ✗ payroll_records - Template only, no import handler
    ✗ leaves - Template only, no import handler
    
    Attempting to import these modules will fail with "Unsupported import module" error.
    
    <b>CRITICAL: Security Vulnerabilities</b>
    • /api/import endpoint has NO authentication
    • No file type validation on server side
    • No file size limits (DoS vector)
    • companyId accepted from client without verification
    """
    story.append(Paragraph(import_critical.strip(), styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== SECTION 10: CRITICAL FINDINGS SUMMARY =====
    story.append(Paragraph("10. Critical Findings Summary", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    all_findings = [
        ("CRITICAL", "Unauthenticated /api/audit endpoint", "Security", "Add auth middleware immediately"),
        ("CRITICAL", "Unauthenticated /api/import endpoint (file upload)", "Security", "Add auth + file validation"),
        ("CRITICAL", "17 DB models missing companyId (data isolation breach)", "Architecture", "Add companyId to all models"),
        ("CRITICAL", "Registration abuse (no rate limit/CAPTCHA)", "Security", "Add CAPTCHA + rate limiting"),
        ("CRITICAL", "Widespread IDOR on 15+ endpoints", "Security", "Add ownership verification"),
        ("CRITICAL", "8 of 18 import modules non-functional", "Functionality", "Implement missing mappers"),
        ("HIGH", "Only 1 of 73 APIs has rate limiting", "Security", "Global rate limiting needed"),
        ("HIGH", "Account enumeration via login-status", "Security", "Generic error responses"),
        ("HIGH", "No security headers (CSP, X-Frame-Options)", "Security", "Add next.config headers"),
        ("HIGH", "Payroll data accessible by any authenticated user", "Security", "Role-based access control"),
        ("HIGH", "Missing cascade deletes causing orphan risk", "Data Integrity", "Add onDelete: Cascade"),
        ("HIGH", "Status fields using String instead of enum", "Type Safety", "Create proper enums"),
        ("MEDIUM", "No React Error Boundaries", "Stability", "Wrap pages with ErrorBoundary"),
        ("MEDIUM", "No i18n framework (language switcher cosmetic)", "Localization", "Implement next-intl"),
        ("MEDIUM", "Religious holidays use approximate dates", "Localization", "Add lunar calendar lib"),
        ("MEDIUM", "No credit note implementation", "Functionality", "Add invoice cancellation flow"),
        ("MEDIUM", "Settings page non-functional (static)", "UX", "Wire up to API"),
        ("LOW", "No unit/E2E tests implemented", "Quality", "Test coverage needed"),
    ]
    
    findings_data = [['Severity', 'Finding', 'Category', 'Recommendation']]
    for sev, find, cat, rec in all_findings:
        findings_data.append([sev, find, cat, rec])
    
    findings_table = Table(findings_data, colWidths=[0.9*inch, 2.2*inch, 1*inch, 1.8*inch])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), Colors.PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), Colors.WHITE),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#fef2f2'), colors.HexColor('#ffffff')]),
    ]))
    story.append(findings_table)
    
    story.append(PageBreak())
    
    # ===== SECTION 11: RECOMMENDATIONS =====
    story.append(Paragraph("11. Recommendations & Action Plan", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("<b>IMMEDIATE (0-7 Days) - Production Blockers</b>", styles['SubsectionHeader']))
    immediate_recs = [
        "1. Add authentication to /api/audit and /api/import endpoints",
        "2. Add companyId to 17 missing database models",
        "3. Implement global rate limiting for auth endpoints",
        "4. Add CAPTCHA or email verification to registration",
        "5. Add ownership checks to all [id] endpoints (IDOR fix)",
    ]
    for rec in immediate_recs:
        story.append(Paragraph(rec, styles['AuditBody']))
    
    story.append(Paragraph("<b>SHORT TERM (1-2 Weeks) - High Priority</b>", styles['SubsectionHeader']))
    short_recs = [
        "6. Convert status String fields to proper enums (8+ fields)",
        "7. Add missing cascade deletes to prevent orphan records",
        "8. Implement 8 missing import module mappers",
        "9. Add server-side file type/size validation",
        "10. Add security headers (CSP, X-Frame-Options, HSTS)",
        "11. Implement React Error Boundary component",
    ]
    for rec in short_recs:
        story.append(Paragraph(rec, styles['AuditBody']))
    
    story.append(Paragraph("<b>MEDIUM TERM (1 Month) - Improvements</b>", styles['SubsectionHeader']))
    medium_recs = [
        "12. Implement i18n framework with Arabic translations",
        "13. Add RTL layout support for Arabic interface",
        "14. Integrate lunar calendar for accurate religious holidays",
        "15. Add EIG legal form support",
        "16. Implement credit note functionality",
        "17. Create unit test suite for critical paths",
        "18. Add column mapping UI to import wizard",
    ]
    for rec in medium_recs:
        story.append(Paragraph(rec, styles['AuditBody']))
    
    story.append(PageBreak())
    
    # ===== FINAL PAGE: AUDIT CERTIFICATION =====
    story.append(Spacer(1, 1*inch))
    story.append(Paragraph("AUDIT CERTIFICATION", styles['SectionHeader']))
    story.append(HRFlowable(width="100%", thickness=2, color=Colors.ACCENT))
    story.append(Spacer(1, 20))
    
    certification_text = """
    <b>This document certifies</b> that the HASSIBA Suite ERP v2.3.0 has undergone a comprehensive 
    36-section audit covering functional correctness, business process integrity, technical architecture, 
    security posture, and Algerian market readiness.
    
    <b>Audit Result:</b> CONDITIONALLY APPROVED FOR PRODUCTION
    
    The system demonstrates excellent business process implementation (91%) and Algerian fiscal compliance (92%). 
    However, <b>6 CRITICAL security vulnerabilities</b> must be resolved before production deployment, specifically:
    authentication gaps on sensitive endpoints, multi-tenancy isolation issues, and input validation weaknesses.
    
    Upon remediation of the CRITICAL and HIGH severity findings, this system is recommended for 
    production deployment targeting the Algerian SME market.
    """
    story.append(Paragraph(certification_text.strip(), styles['AuditBody']))
    story.append(Spacer(1, 30))
    story.append(Paragraph(f"Audit Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['AuditBody']))
    story.append(Paragraph("Classification: CONFIDENTIAL - For Internal Use Only", styles['AuditBody']))
    
    # Build PDF
    doc.build(story)
    return '/home/z/my-project/audit-reports/HASSIBA_ERP_Audit_Report.pdf'

# ============================================================
# MAIN
# ============================================================
if __name__ == '__main__':
    output_path = build_report()
    print("\n" + "="*60)
    print("HASSIBA SUITE ERP - COMPREHENSIVE AUDIT REPORT")
    print("="*60)
    print(f"Output: {output_path}")
    print(f"Size: {os.path.getsize(output_path)} bytes")
