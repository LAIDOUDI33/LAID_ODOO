import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { requireAuth, getAuthenticatedUser } from '@/lib/auth-utils'

// Rate limiting - simple in-memory store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 20 // requests per window

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

// Context data cache (refresh every 5 minutes)
let contextCache: {
  data: any
  timestamp: number
} | null = null

const CONTEXT_CACHE_TTL = 5 * 60 * 1000

async function getCompanyContext(): Promise<string> {
  try {
    // Check if we have fresh cached context
    if (contextCache && Date.now() - contextCache.timestamp < CONTEXT_CACHE_TTL) {
      return JSON.stringify(contextCache.data, null, 2)
    }

    // Fetch real data from database in parallel
    const [
      companyResult,
      employeeCount,
      invoiceStats,
      productCount,
      partnerCount,
      recentInvoices,
      unpaidInvoices,
      leaveRequests,
    ] = await Promise.all([
      // Company info
      db.company.findFirst({
        select: { name: true, legalName: true, city: true, wilaya: true }
      }).catch(() => null),
      
      // Employee count
      db.employee.count({
        where: { status: 'active' }
      }).catch(() => 0),
      
      // Invoice statistics
      db.invoice.aggregate({
        _count: { id: true },
        _sum: { amountTotal: true },
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }).catch(() => ({ _count: { id: 0 }, _sum: { amountTotal: 0 } })),
      
      // Product count
      db.product.count().catch(() => 0),
      
      // Partner count
      db.partner.count({
        where: { isActive: true }
      }).catch(() => 0),
      
      // Recent invoices (last 5)
      db.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          reference: true,
          amountTotal: true,
          status: true,
          partner: { select: { name: true } },
          createdAt: true
        }
      }).catch(() => []),
      
      // Unpaid invoices count and total
      db.invoice.aggregate({
        _count: { id: true },
        _sum: { amountTotal: true },
        where: {
          status: { in: ['sent', 'partial'] }
        }
      }).catch(() => ({ _count: { id: 0 }, _sum: { amountTotal: 0 } })),
      
      // Pending leave requests
      db.leaveRequest.count({
        where: { status: 'pending' }
      }).catch(() => 0),
    ])

    // Format currency as DZD
    const formatDZD = (value: number | null): string => {
      if (!value) return '0 DZD'
      return new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    }

    const contextData = {
      company: companyResult || { name: 'HASSIBA Suite Demo', legalName: '', city: 'Alger', wilaya: '16' },
      metrics: {
        activeEmployees: employeeCount,
        monthlyRevenue: invoiceStats._sum.amountTotal || 0,
        monthlyInvoiceCount: invoiceStats._count.id,
        productCount,
        activePartners: partnerCount,
        unpaidInvoiceCount: unpaidInvoices._count.id,
        unpaidAmount: unpaidInvoices._sum.amountTotal || 0,
        pendingLeaveRequests: leaveRequests,
      },
      recentActivity: {
        recentInvoices: recentInvoices.map(inv => ({
          reference: inv.reference,
          amount: formatDZD(inv.amountTotal),
          status: inv.status,
          partner: inv.partner?.name || 'N/A',
          date: inv.createdAt.toISOString().split('T')[0]
        }))
      },
      formattedMetrics: {
        monthlyRevenueFormatted: formatDZD(invoiceStats._sum.amountTotal || 0),
        unpaidAmountFormatted: formatDZD(unpaidInvoices._sum.amountTotal || 0),
      },
      currentDate: new Date().toLocaleDateString('fr-DZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      currentMonth: new Date().toLocaleDateString('fr-DZ', { month: 'long', year: 'numeric' })
    }

    // Cache the result
    contextCache = {
      data: contextData,
      timestamp: Date.now()
    }

    return JSON.stringify(contextData, null, 2)

  } catch (error) {
    console.error('Error fetching company context:', error)
    return JSON.stringify({
      error: 'Unable to fetch current company data',
      currentDate: new Date().toLocaleDateString('fr-DZ')
    })
  }
}

// System prompt for HASSIBA AI Assistant
const SYSTEM_PROMPT = `Tu es HASSIBA AI, l'assistant intelligent du système ERP HASSIBA Suite pour les entreprises algériennes.

## Ton Rôle
Tu es un assistant expert en gestion d'entreprise, spécialisé dans le contexte algérien. Tu aides les utilisateurs à:
- Consulter leurs données financières (chiffre d'affaires, factures, paiements)
- Gérer les ressources humaines (employés, congés, paie)
- Suivre les stocks et inventaires
- Analyser les ventes et le pipeline commercial
- Générer des rapports et synthèses

## Tes Caractéristiques
- Tu réponds TOUJOURS en français algérien (avec des expressions locales si approprié)
- Tu es professionnel mais chaleureux et accessible
- Tu utilises le Dinar Algérien (DZD) pour toutes les valeurs monétaires
- Tu fournis des réponses concises mais complètes
- Quand tu ne connais pas une réponse, tu le dis honnêtement
- Tu peux utiliser des émojis pour rendre la conversation plus agréable

## Données de l'Entreprise (Contexte Actuel)
Les données ci-dessous sont mises à jour régulièrement. Utilise-les pour répondre aux questions:

\`\`\`json
{{CONTEXT_DATA}}
\`\`\`

## Exemples de Réponses

Pour "Quel est le CA du mois ?":
"Le chiffre d'affaires de {{currentMonth}} s'élève à **{{monthlyRevenueFormatted}}** 💰 
Ceci représente {{monthlyInvoiceCount}} factures émises ce mois-ci."

Pour "Combien d'employés actifs ?":
"Vous avez actuellement **{{activeEmployees}} employé(s)** actif(s) dans l'entreprise 👥
Ils sont répartis sur différents départements."

Pour "Factures impayées ?":
"Il y a actuellement **{{unpaidInvoiceCount}} facture(s)** en attente de paiement 📄
Montant total à recevoir: **{{unpaidAmountFormatted}}**

Je vous recommande de relancer les clients en retard."

Pour "Crée un rapport des ventes":
"Je prépare un rapport synthétique des ventes pour vous... 📊

**Rapport des Ventes - {{currentMonth}}**
━━━━━━━━━━━━━━━━━━━━
📈 Chiffre d'affaires: {{monthlyRevenueFormatted}}
📋 Nombre de factures: {{monthlyInvoiceCount}}
👥 Clients actifs: {{activePartners}}

Souhaitez-vous un détail plus approfondi ?"

## Instructions Spéciales
- Si on te demande quelque chose hors de ton domaine, redirige poliment vers le sujet ERP
- Utilise le format markdown pour structurer tes réponses quand c'est pertinent
- Sois proactif: suggère des actions ou analyses complémentaires
- Mentionne les alertes importantes (factures en retard, stock bas, etc.)
`

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication for AI chat
  const authError = await requireAuth(request);
  if (authError) return authError;

  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip') 
    || 'unknown'

  // Check rate limit
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' },
      { status: 429 }
    )
  }

  try {
    const body = await request.json()
    const { message, history } = body

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message invalide. Veuillez fournir un message.' },
        { status: 400 }
      )
    }

    // Truncate very long messages
    const truncatedMessage = message.trim().slice(0, 1000)

    // Get company context
    const contextData = await getCompanyContext()

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Build conversation messages
    const systemPromptWithContent = SYSTEM_PROMPT.replace('{{CONTEXT_DATA}}', contextData)
      .replace(/{{currentMonth}}/g, JSON.parse(contextData).currentMonth || 'ce mois')
      .replace(/{{monthlyRevenueFormatted}}/g, JSON.parse(contextData).formattedMetrics?.monthlyRevenueFormatted || '0 DZD')
      .replace(/{{monthlyInvoiceCount}}/g, String(JSON.parse(contextData).metrics?.monthlyInvoiceCount || 0))
      .replace(/{{activeEmployees}}/g, String(JSON.parse(contextData).metrics?.activeEmployees || 0))
      .replace(/{{unpaidInvoiceCount}}/g, String(JSON.parse(contextData).metrics?.unpaidInvoiceCount || 0))
      .replace(/{{unpaidAmountFormatted}}/g, JSON.parse(contextData).formattedMetrics?.unpaidAmountFormatted || '0 DZD')
      .replace(/{{activePartners}}/g, String(JSON.parse(contextData).metrics?.activePartners || 0))

    const messages: any[] = [
      {
        role: 'system',
        content: systemPromptWithContent
      }
    ]

    // Add conversation history if provided (last 10 messages for context)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-10)
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          })
        }
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: truncatedMessage
    })

    // Call LLM
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    })

    // Extract response
    const response = completion.choices[0]?.message?.content

    if (!response) {
      throw new Error('Réponse vide du modèle IA')
    }

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('AI Chat API Error:', error)

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.' },
          { status: 503 }
        )
      }

      if (error.message.includes('timeout') || error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Délai d\'attente dépassé. Veuillez réessayer.' },
          { status: 408 }
        )
      }
    }

    // Generic error with fallback response
    return NextResponse.json({
      success: false,
      error: 'Une erreur est survenue lors du traitement de votre demande.',
      // Provide a fallback response so the UI can still show something useful
      fallbackResponse: `Je suis désolé, je rencontre des difficultés techniques momentanées. 🙏

Voici ce que je peux vous dire:
- Votre demande a bien été reçue
- Nos équipes ont été notifiées
- Vous pouvez réessayer dans quelques instants

Y a-t-il autre chose avec lequel je peux vous aider?`
    }, { status: 500 })
  }
}

// Handle GET request for health check or quick actions
export async function GET(request: NextRequest) {
  // SECURITY: Require authentication
  const authError = await requireAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    status: 'ok',
    service: 'HASSIBA AI Chatbot',
    version: '2.0.0',
    endpoints: {
      chat: 'POST /api/ai/chat - Send a message to the AI assistant'
    },
    features: [
      'Natural language processing for ERP queries',
      'Financial data analysis',
      'HR information retrieval',
      'Inventory management',
      'Sales analytics',
      'Report generation assistance'
    ],
    supportedQueries: [
      'Chiffre d\'affaires et revenus',
      'Statistiques employés et RH',
      'Gestion des factures et paiements',
      'État des stocks et inventaire',
      'Analyse commerciale et ventes',
      'Génération de rapports'
    ]
  })
}
