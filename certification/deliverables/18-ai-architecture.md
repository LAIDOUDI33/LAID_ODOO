# HASSIBA Suite ERP - AI Assistant Architecture

**Document Version:** 1.0  
**Classification:** Technical Deliverable (D18)  
**Date:** January 2025  
**Source File:** `src/app/api/ai/chat/route.ts`  
**SDK:** z-ai-web-dev-sdk

---

## 1. Overview

The **HASSIBA AI Assistant** is an intelligent conversational interface integrated into HASSIBA Suite ERP. It provides:

- 💬 **Natural Language Interface** - Chat with your ERP in French/Arabic
- 📊 **Real-time Data Access** - Live company metrics and data
- 🎯 **Context-Aware Responses** - Personalized to your business
- 🔒 **Secure & Rate-Limited** - Enterprise-grade security

---

## 2. System Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Frontend (useAIChat hook)             │   │
│  └────────────────────────┬────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────┘
                             │ WebSocket / REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              POST /api/ai/chat                          │   │
│  │  • Authentication check                                │   │
│  │  • Rate limiting (20 req/min)                           │   │
│  │  • Input validation & sanitization                     │   │
│  └────────────────────────┬────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI ENGINE LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ Context      │  │ System       │  │ ZAI SDK          │      │
│  │ Aggregator   │  │ Prompt       │  │ (LLM Interface)  │      │
│  │ (5 min cache)│  │ Builder      │  │                  │      │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘      │
│         │                  │                    │               │
│         └──────────────────┼────────────────────┘               │
│                            ▼                                    │
│                 ┌──────────────────┐                            │
│                 │  LLM Provider    │                            │
│                 │  (External)      │                            │
│                 └──────────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   DATA LAYER                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Company  │ Employee  │ Invoice  │ Partner  │ ...     │
│  │ Table    │ Table    │ Table   │ Table   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. API Reference

### 3.1 POST /api/ai/chat

Send a message to the AI assistant.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | ✅ | User message (max 1000 chars) |
| history | Array | ❌ | Conversation history (last 10 used) |

**History Item Format:**
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

**Authorization:** Authentication required

**Response (200 OK):**
```json
{
  "success": true,
  "response": "Le chiffre d'affaires de Janvier 2025 s'élève à **12,500,000 DZD** 💰\n\nCeci représente **89 factures** émises ce mois-ci.",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

**Error Responses:**

| Status | Condition | Response |
|--------|-----------|----------|
| 401 | Not authenticated | Auth required |
| 429 | Rate limit exceeded | "Trop de requêtes..." |
| 400 | Invalid message | Message validation error |
| 503 | Service unavailable | LLM rate limit/quota |
| 408 | Timeout | Request timeout |
| 500 | Other errors | Generic error + fallback response |

### 3.2 GET /api/ai/chat

Health check and service information.

**Response:**
```json
{
  "status": "ok",
  "service": "HASSIBA AI Chatbot",
  "version": "2.0.0",
  "endpoints": {
    "chat": "POST /api/ai/chat - Send a message to the AI assistant"
  },
  "features": [
    "Natural language processing for ERP queries",
    "Financial data analysis",
    "HR information retrieval",
    "Inventory management",
    "Sales analytics",
    "Report generation assistance"
  ],
  "supportedQueries": [
    "Chiffre d'affaires et revenus",
    "Statistiques employés et RH",
    "Gestion des factures et paiements",
    "État des stocks et inventaire",
    "Analyse commerciale et ventes",
    "Génération de rapports"
  ]
}
```

---

## 4. Security Implementation

### 4.1 Rate Limiting

```typescript
// Configuration
const RATE_LIMIT_WINDOW = 60 * 1000;  // 1 minute
const RATE_LIMIT_MAX = 20;            // requests per window

// In-memory store (per IP)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
```

**Rate Limit Logic:**
1. Extract client IP from headers (`x-forwarded-for`, `x-real-ip`)
2. Check if IP has exceeded limit
3. If exceeded → Return 429 Too Many Requests
4. Otherwise → Increment counter and proceed

### 4.2 Input Sanitization

```typescript
// Truncate long messages
const truncatedMessage = message.trim().slice(0, 1000);
```

### 4.3 Authentication

All requests require valid authentication via `requireAuth()`.

---

## 5. Context System

### 5.1 Context Data Structure

The AI assistant maintains real-time context about the company:

```typescript
interface CompanyContext {
  company: {
    name: string;
    legalName: string;
    city: string;
    wilaya: string;
  };
  metrics: {
    activeEmployees: number;
    monthlyRevenue: number;
    monthlyInvoiceCount: number;
    productCount: number;
    activePartners: number;
    unpaidInvoiceCount: number;
    unpaidAmount: number;
    pendingLeaveRequests: number;
  };
  recentActivity: {
    recentInvoices: Array<{
      reference: string;
      amount: string;        // Formatted DZD
      status: string;
      partner: string;
      date: string;
    }>;
  };
  formattedMetrics: {
    monthlyRevenueFormatted: string;
    unpaidAmountFormatted: string;
  };
  currentDate: string;         // Full date in French
  currentMonth: string;        // Month year in French
}
```

### 5.2 Context Caching

```typescript
const CONTEXT_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes
let contextCache: { data: any; timestamp: number } | null = null;
```

**Cache Behavior:**
- Fresh cache (< 5 min old) → Return cached data
- Stale/no cache → Fetch from database, update cache
- Parallel queries using `Promise.all()` for performance

### 5.3 Data Sources for Context

| Data | Source | Query |
|------|--------|-------|
| Company info | `company` table | First active company |
| Employee count | `employee` table | Count active |
| Monthly revenue | `invoice` table | Sum current month |
| Product count | `product` table | Count all |
| Partner count | `partner` table | Count active |
| Recent invoices | `invoice` table | Last 5 by date |
| Unpaid invoices | `invoice` table | Status sent/partial |
| Leave requests | `leaveRequest` table | Count pending |

---

## 6. System Prompt Engineering

### 6.1 Prompt Structure

The system prompt is designed to:

1. **Define the AI persona** - HASSIBA AI, Algerian ERP expert
2. **Specify language** - French Algerian with local expressions
3. **Inject real-time context** - Current company data
4. **Provide response templates** - Example formats
5. **Set behavioral guidelines** - What to do/not do

### 6.2 Key Prompt Sections

```
## Ton Rôle
- Expert en gestion d'entreprise algérienne
- Spécialisé contexte algérien (DZD, réglementation)

## Tes Caractéristiques
- Réponds TOUJOURS en français algérien
- Professionnel mais chaleureux
- Utilise le DZD pour les montants
- Réponses concises mais complètes

## Données de l'Entreprise (Contexte Actuel)
{{CONTEXT_DATA}}  ← Injected dynamically

## Exemples de Réponses
- Formatage des montants
- Style de réponse attendu

## Instructions Spéciales
- Redirige hors-domaine vers l'ERP
- Utilise markdown pour la structure
- Sois proactif dans les suggestions
- Mentionne les alertes importantes
```

### 6.3 Context Variable Replacement

Variables replaced in prompt before sending to LLM:

| Variable | Source | Example Value |
|----------|--------|---------------|
| `{{CONTEXT_DATA}}` | JSON context | Full context object |
| `{{currentMonth}}` | Context.currentMonth | "janvier 2025" |
| `{{monthlyRevenueFormatted}}` | Formatted metric | "12 500 000 DA" |
| `{{monthlyInvoiceCount}}` | Metric | "89" |
| `{{activeEmployees}}` | Metric | "75" |
| `{{unpaidInvoiceCount}}` | Metric | "12" |
| `{{unpaidAmountFormatted}}` | Formatted metric | "2 350 000 DA" |
| `{{activePartners}}` | Metric | "145" |

---

## 7. LLM Configuration

### 7.1 Model Parameters

```typescript
const completion = await zai.chat.completions.create({
  messages,                    // System + history + user message
  temperature: 0.7,            // Creativity (0-1)
  max_tokens: 1000,            // Max response length
  top_p: 0.9,                 // Nucleus sampling
  frequency_penalty: 0.3,     // Reduce repetition
  presence_penalty: 0.3,      // Encourage new topics
});
```

### 7.2 Parameter Rationale

| Parameter | Value | Reason |
|-----------|-------|--------|
| temperature | 0.7 | Balanced creativity/accuracy |
| max_tokens | 1000 | Sufficient for detailed responses |
| top_p | 0.9 | Focus on likely tokens |
| frequency_penalty | 0.3 | Avoid repetitive phrases |
| presence_penalty | 0.3 | Encourage topic diversity |

---

## 8. Conversation Management

### 8.1 History Handling

```typescript
// Last 10 messages preserved for context
if (Array.isArray(history)) {
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
}
```

### 8.2 Message Assembly Order

```
1. System Prompt (with context)
2. History Messages (up to 10)
3. Current User Message
```

---

## 9. Error Handling Strategy

### 9.1 Error Categories

| Error Type | Detection | User Experience |
|------------|-----------|-----------------|
| Rate limit | Error message contains 'rate limit' or 'quota' | 503 + friendly message |
| Timeout | Error is AbortError or contains 'timeout' | 408 + retry suggestion |
| Empty response | No content from LLM | 500 + error |
| Unknown | All other errors | 500 + fallback response |

### 9.2 Fallback Response

When errors occur, a helpful fallback is provided:

```typescript
fallbackResponse: `Je suis désolé, je rencontre des difficultés techniques momentanées. 🙏

Voici ce que je peux vous dire:
- Votre demande a bien été reçue
- Nos équipes ont été notifiées
- Vous pouvez réessayer dans quelques instants`
```

---

## 10. Client Integration

### 10.1 React Hook

```typescript
// src/hooks/use-ai-chat.ts
const { sendMessage, loading, response, error } = useAIChat();

// Usage
await sendMessage("Quel est le CA du mois ?");
```

### 10.2 Sample Conversations

**Q: Quel est le CA du mois ?**
> A: Le chiffre d'affaires de janvier 2025 s'élève à **12,500,000 DZD** 💰
> Ceci représente **89 factures** émises ce mois-ci.

**Q: Combien d'employés actifs ?**
> A: Vous avez actuellement **75 employé(s)** actif(s) dans l'entreprise 👥
> Ils sont répartis sur différents départements.

**Q: Factures impayées ?**
> A: Il y a actuellement **12 facture(s)** en attente de paiement 📄
> Montant total à recevoir: **2,350,000 DZD**
>
> Je vous recommande de relancer les clients en retard.

---

## 11. Performance Considerations

### 11.1 Latency Components

| Component | Typical Latency |
|-----------|-----------------|
| Auth check | < 10ms |
| Rate limit check | < 1ms |
| Context fetch (cached) | < 5ms |
| Context fetch (uncached) | 50-100ms |
| LLM inference | 500-3000ms |
| Total | ~600-3200ms |

### 11.2 Optimization Strategies

1. **Context caching** - 5-minute TTL reduces DB queries
2. **Parallel data fetching** - Promise.all for all metrics
3. **Message truncation** - Prevent excessively long inputs
4. **History limiting** - Only last 10 messages
5. **Async logging** - Non-blocking error handling

---

## 12. Future Enhancements (Planned)

- [ ] Multi-language support (Arabic, English)
- [ ] Voice input/output integration
- [ ] Action execution (create invoice, etc.)
- [ ] Document Q&A (RAG over documents)
- [ ] Predictive insights
- [ ] Custom instructions per user/role
- [ ] Conversation persistence
- [ ] Analytics on AI usage
- [ ] Fine-tuned domain model
- [ ] Local LLM option (privacy)

---

*Document generated for HASSIBA Suite ERP Certification*
*Last updated: January 2025*
