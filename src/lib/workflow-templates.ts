// ============================================================
// HASSIBA SUITE ERP - Pre-built Workflow Templates
// Algerian Business-Specific Automation Templates
// ============================================================

import { WorkflowTemplate, WorkflowTrigger, WorkflowStep, WorkflowVariable } from '@/lib/types/workflow';

export const workflowTemplates: WorkflowTemplate[] = [
  // ============================================================
  // FINANCE TEMPLATES
  // ============================================================
  
  // Template 1: Invoice Approval (DZD > 500K needs DG approval)
  {
    id: 'invoice-approval-dzd',
    name: 'Approbation Facture Client',
    nameAr: 'موافقة فاتورة العميل',
    category: 'finance',
    description: 'Approuver automatiquement les factures selon le montant. Les factures > 500,000 DZD nécessitent l\'approbation du DG.',
    descriptionAr: 'الموافقة التلقائية على الفواتير حسب المبلغ. الفواتير التي تزيد عن 500,000 دج تتطلب موافقة المدير العام',
    icon: 'Receipt',
    difficulty: 'beginner',
    estimatedTime: '10 min',
    tags: ['facture', 'approbation', 'finance', 'DZD', 'DG'],
    popular: true,
    featured: true,
    trigger: {
      type: 'event',
      config: {
        event: 'invoice.created',
        filters: { status: { eq: 'draft' } }
      }
    },
    steps: [
      {
        type: 'condition',
        name: 'Vérifier le montant',
        description: 'Le montant dépasse-t-il 500,000 DZD ?',
        position: { x: 400, y: 100 },
        config: {
          conditionType: 'simple',
          conditions: [{
            logic: 'AND',
            conditions: [{
              field: 'amountTotal',
              operator: 'gt',
              value: 500000,
              valueType: 'number'
            }]
          }]
        }
      },
      {
        type: 'approval',
        name: 'Approbation Directeur',
        description: 'Approbation requise du DG pour les montants élevés',
        position: { x: 200, y: 280 },
        config: {
          approvalType: 'single',
          approvers: [{ roleId: 'dg', required: true }],
          timeoutHours: 48,
          reminderIntervalHours: 24
        }
      },
      {
        type: 'action',
        name: 'Approuver Facture',
        description: 'Marquer la facture comme approuvée',
        position: { x: 600, y: 280 },
        config: {
          actionType: 'update_record',
          actionParams: {
            entity: 'Invoice',
            data: { status: 'approved' }
          }
        }
      },
      {
        type: 'action',
        name: 'Notification Email',
        description: 'Envoyer la facture approuvée par email au client',
        position: { x: 400, y: 460 },
        config: {
          actionType: 'send_email',
          actionParams: {
            to: '{{client.email}}',
            subject: 'Votre facture {{invoice.reference}} a été approuvée',
            body: 'Bonjour {{client.name}},\n\nNous vous confirmons l\'approbation de votre facture N°{{invoice.reference}} d\'un montant de {{invoice.amountTotal}} DZD.\n\nCordialement,\nL\'équipe financière'
          }
        }
      },
      {
        type: 'action',
        name: 'Générer PDF Facture',
        description: 'Générer le document PDF de la facture',
        position: { x: 200, y: 460 },
        config: {
          actionType: 'generate_pdf',
          actionParams: {
            template: 'invoice_standard',
            data: {}
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Montant Facture', key: 'amountTotal', type: 'number', isInput: true, isOutput: false },
      { id: 'v2', name: 'Référence Facture', key: 'invoice.reference', type: 'string', isInput: true, isOutput: true },
      { id: 'v3', name: 'Email Client', key: 'client.email', type: 'string', isInput: true, isOutput: false },
      { id: 'v4', name: 'Nom Client', key: 'client.name', type: 'string', isInput: true, isOutput: false }
    ]
  },

  // Template 2: TVA G50 Declaration Reminder
  {
    id: 'tva-g50-reminder',
    name: 'Rappel Déclaration TVA G50',
    nameAr: 'تذكير بيان TVA G50',
    category: 'fiscal',
    description: 'Rappel automatique avant la date limite de déclaration TVA (G50) avec notification aux comptables.',
    descriptionAr: 'تذكير تلقائي قبل الموعد النهائي لإقرار ضريبة القيمة المضافة مع إشعار للمحاسبين',
    icon: 'Calculator',
    difficulty: 'beginner',
    estimatedTime: '5 min',
    tags: ['TVA', 'G50', 'fiscal', 'déclaration', 'DGI', 'impôt'],
    popular: true,
    featured: true,
    trigger: {
      type: 'schedule',
      config: {
        cron: '0 9 19 * *', // 19th of each month at 9 AM
        timezone: 'Africa/Algiers'
      }
    },
    steps: [
      {
        type: 'condition',
        name: 'Vérifier Période',
        description: 'Est-ce le bon mois pour la déclaration ?',
        position: { x: 400, y: 100 },
        config: {
          conditionType: 'expression',
          expression: '{{month}} !== "exempt"'
        }
      },
      {
        type: 'action',
        name: 'Calculer TVA du Mois',
        description: 'Calculer le total de la TVA collectée et déductible',
        position: { x: 400, y: 260 },
        config: {
          actionType: 'call_api',
          actionParams: {
            method: 'GET',
            url: '/api/taxes/calculate?tva_period={{currentMonth}}'
          }
        }
      },
      {
        type: 'action',
        name: 'Notifier Comptable',
        description: 'Envoyer un rappel avec le résumé TVA',
        position: { x: 400, y: 420 },
        config: {
          actionType: 'send_notification',
          actionParams: {
            users: '[role:accountant]',
            title: '📊 Rappel Déclaration TVA G50',
            message: 'La déclaration TVA G50 est due dans 10 jours.\n\nTVA Collectée: {{tva.collected}} DZD\nTVA Déductible: {{tva.deductible}} DZD\nNet à payer: {{tva.net}} DZD',
            priority: 'high'
          }
        }
      },
      {
        type: 'action',
        name: 'Email Direction',
        description: 'Copie à la direction financière',
        position: { x: 400, y: 580 },
        config: {
          actionType: 'send_email',
          actionParams: {
            to: 'direction.finance@entreprise.dz',
            subject: 'Rappel - Déclaration TVA G50 - {{currentMonth}}',
            body: 'Madame, Monsieur,\n\nCeci est un rappel automatique concernant la déclaration TVA G50 du mois de {{currentMonth}}.\n\nMerci de vérifier que la déclaration sera déposée dans les délais.\n\nCordialement,\nSystème HASSIBA ERP'
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Mois Actuel', key: 'currentMonth', type: 'string', isInput: true, isOutput: true },
      { id: 'v2', name: 'TVA Collectée', key: 'tva.collected', type: 'number', isOutput: true },
      { id: 'v3', name: 'TVA Déductible', key: 'tva.deductible', type: 'number', isOutput: true },
      { id: 'v4', name: 'Net TVA', key: 'tva.net', type: 'number', isOutput: true }
    ]
  },

  // ============================================================
  // INVENTORY TEMPLATES
  // ============================================================

  // Template 3: Low Stock Alert + Auto PO
  {
    id: 'low-stock-auto-po',
    name: 'Alerte Stock Faible + Auto BC',
    nameAr: 'تنبيه مخزون منخفض + طلب شراء تلقائي',
    category: 'inventory',
    description: 'Détecte les stocks en dessous du seuil minimum et crée automatiquement un bon de commande fournisseur.',
    descriptionAr: 'كشف المخزون أقل من الحد الأدنى وإنشاء أمر شراء تلقائياً',
    icon: 'Package',
    difficulty: 'intermediate',
    estimatedTime: '15 min',
    tags: ['stock', 'inventaire', 'achat', 'réapprovisionnement', 'alerte'],
    popular: true,
    featured: true,
    trigger: {
      type: 'schedule',
      config: {
        cron: '0 8 * * *', // Every day at 8 AM
        timezone: 'Africa/Algiers'
      }
    },
    steps: [
      {
        type: 'action',
        name: 'Vérifier Stocks',
        description: 'Récupérer tous les produits en dessous du seuil',
        position: { x: 400, y: 100 },
        config: {
          actionType: 'call_api',
          actionParams: {
            method: 'GET',
            url: '/api/inventory/stock-levels?filter=below_minimum'
          }
        }
      },
      {
        type: 'condition',
        name: 'Stocks Critiques?',
        description: 'Y a-t-il des produits en stock critique ?',
        position: { x: 400, y: 260 },
        config: {
          conditionType: 'simple',
          conditions: [{
            logic: 'AND',
            conditions: [{
              field: 'lowStockProducts.length',
              operator: 'gt',
              value: 0,
              valueType: 'number'
            }]
          }]
        }
      },
      {
        type: 'loop',
        name: 'Parcourir Produits',
        description: 'Traiter chaque produit en stock faible',
        position: { x: 400, y: 420 },
        config: {
          loopType: 'for_each',
          iterateOver: 'lowStockProducts',
          loopVariable: 'product'
        }
      },
      {
        type: 'action',
        name: 'Créer Bon Commande',
        description: 'Créer une ligne de commande pour ce produit',
        position: { x: 250, y: 580 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'PurchaseOrderLine',
            data: {
              productId: '{{product.id}}',
              quantity: '{{product.suggestedOrderQty}}',
              unitPrice: '{{product.lastPurchasePrice}}'
            }
          }
        }
      },
      {
        type: 'action',
        name: 'Notifier Acheteur',
        description: 'Alerte email pour les produits critiques',
        position: { x: 550, y: 580 },
        config: {
          actionType: 'send_notification',
          actionParams: {
            users: '[role:purchaser]',
            title: '📦 Alertes Stock Critique',
            message: '{{lowStockProducts.length}} produit(s) nécessitent un réapprovisionnement urgent:\n\n{{#each lowStockProducts}}\n- {{name}}: {{currentQty}}/{{minThreshold}} ({{unit}})\n{{/each}}',
            priority: 'urgent'
          }
        }
      },
      {
        type: 'delay',
        name: 'Attente Validation',
        description: 'Attendre 1 heure avant envoi définitif',
        position: { x: 400, y: 740 },
        config: {
          delayType: 'fixed',
          duration: 1,
          delayUnit: 'hours'
        }
      },
      {
        type: 'approval',
        name: 'Validation BC',
        description: 'Approbation du bon de commande par l\'acheteur',
        position: { x: 400, y: 900 },
        config: {
          approvalType: 'single',
          approvers: [{ roleId: 'purchaser', required: true }],
          timeoutHours: 24
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Produits Stock Faible', key: 'lowStockProducts', type: 'array', isOutput: true },
      { id: 'v2', name: 'Produit Courant', key: 'product', type: 'object', isOutput: true },
      { id: 'v3', name: 'ID Bon Commande', key: 'purchaseOrderId', type: 'string', isOutput: true }
    ]
  },

  // ============================================================
  // HR TEMPLATES
  // ============================================================

  // Template 4: Employee Onboarding Process
  {
    id: 'employee-onboarding',
    name: 'Processus Intégration Employé',
    nameAr: 'عملية دمج الموظف',
    category: 'hr',
    description: 'Automatisation complète de l\'intégration d\'un nouvel employé: création compte, équipement, formations.',
    descriptionAr: 'أتمتة كاملة لدمج موظف جديد: إنشاء حساب، معدات، تدريب',
    icon: 'Users',
    difficulty: 'intermediate',
    estimatedTime: '20 min',
    tags: ['RH', 'employé', 'intégration', 'onboarding', 'recrutement'],
    popular: true,
    featured: false,
    trigger: {
      type: 'event',
      config: {
        event: 'employee.created',
        filters: { status: { eq: 'hired' } }
      }
    },
    steps: [
      {
        type: 'action',
        name: 'Créer Compte IT',
        description: 'Créer les accès système pour le nouvel employé',
        position: { x: 400, y: 100 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'UserAccount',
            data: {
              employeeId: '{{employee.id}}',
              email: '{{employee.workEmail}}',
              role: '{{employee.initialRole}}'
            }
          }
        }
      },
      {
        type: 'action',
        name: 'Notifier IT',
        description: 'Demander la préparation du matériel informatique',
        position: { x: 400, y: 260 },
        config: {
          actionType: 'send_notification',
          actionParams: {
            users: '[department:IT]',
            title: '🖥️ Nouvel Employé - Préparation Matériel',
            message: 'Nouvel employé à intégrer:\n\nNom: {{employee.fullName}}\nDépartement: {{employee.department}}\nPoste: {{employee.position}}\nDate début: {{employee.startDate}}\n\nMatériel nécessaire:\n- Ordinateur {{employee.needsComputer ? \'Oui\' : \'Non\'}}\n- Téléphone {{employee.needsPhone ? \'Oui\' : \'Non\'}}',
            priority: 'high'
          }
        }
      },
      {
        type: 'parallel',
        name: 'Tâches Parallèles',
        description: 'Exécuter plusieurs tâches d\'intégration en parallèle',
        position: { x: 400, y: 420 },
        config: {
          branches: [
            { id: 'b1', name: 'RH', firstStepId: '' },
            { id: 'b2', name: 'Formation', firstStepId: '' },
            { id: 'b3', name: 'Équipement', firstStepId: '' }
          ],
          waitAll: true
        }
      },
      {
        type: 'action',
        name: 'Préparer Dossier RH',
        description: 'Créer le dossier administratif',
        position: { x: 150, y: 560 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'EmployeeFile',
            data: {
              employeeId: '{{employee.id}}',
              type: 'onboarding'
            }
          }
        }
      },
      {
        type: 'action',
        name: 'Planifier Formations',
        description: 'Inscrire aux formations obligatoires',
        position: { x: 400, y: 560 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'TrainingEnrollment',
            data: {
              employeeId: '{{employee.id}}',
              trainingIds: ['safety', 'company-policies', 'it-security']
            }
          }
        }
      },
      {
        type: 'action',
        name: 'Commander Équipement',
        description: 'Passer les commandes de matériel',
        position: { x: 650, y: 560 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'EquipmentRequest',
            data: {
              employeeId: '{{employee.id}}',
              items: '{{employee.equipmentList}}'
            }
          }
        }
      },
      {
        type: 'delay',
        name: 'Période Essai',
        description: 'Attendre avant évaluation fin essai',
        position: { x: 400, y: 720 },
        config: {
          delayType: 'until_date',
          untilDate: '{{employee.trialEndDate}}'
        }
      },
      {
        type: 'approval',
        name: 'Validation Fin Essai',
        description: 'Approbation manager + RH pour confirmation',
        position: { x: 400, y: 880 },
        config: {
          approvalType: 'sequential',
          approvers: [
            { fieldPath: 'employee.managerId', required: true },
            { roleId: 'hr_manager', required: true }
          ],
          timeoutHours: 72
        }
      },
      {
        type: 'action',
        name: 'Confirmer Employé',
        description: 'Mettre à jour le statut employé confirmé',
        position: { x: 400, y: 1040 },
        config: {
          actionType: 'update_record',
          actionParams: {
            entity: 'Employee',
            recordId: '{{employee.id}}',
            data: { status: 'confirmed' }
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Employé', key: 'employee', type: 'object', isInput: true, isOutput: true },
      { id: 'v2', name: 'ID Compte', key: 'userAccountId', type: 'string', isOutput: true },
      { id: 'v3', name: 'ID Dossier', key: 'fileId', type: 'string', isOutput: true }
    ]
  },

  // ============================================================
  // SALES TEMPLATES
  // ============================================================

  // Template 5: Sales Order to Invoice Automation
  {
    id: 'sales-order-to-invoice',
    name: 'Commande vers Facturation Auto',
    nameAr: 'أمر البيع للفاتورة التلقائية',
    category: 'sales',
    description: 'Transformer automatiquement une commande client validée en facture.',
    descriptionAr: 'تحويل أمر المبيعات المعتمد إلى فاتورة تلقائياً',
    icon: 'ShoppingCart',
    difficulty: 'intermediate',
    estimatedTime: '12 min',
    tags: ['vente', 'commande', 'facturation', 'client', 'automatisation'],
    popular: true,
    featured: false,
    trigger: {
      type: 'event',
      config: {
        event: 'sales_order.approved',
        filters: {}
      }
    },
    steps: [
      {
        type: 'condition',
        name: 'Vérifier Crédit Client',
        description: 'Le client a-t-il atteint son plafond de crédit ?',
        position: { x: 400, y: 100 },
        config: {
          conditionType: 'simple',
          conditions: [{
            logic: 'AND',
            conditions: [{
              field: 'customer.currentCredit',
              operator: 'lte',
              value: '{{customer.creditLimit}}',
              valueType: 'number'
            }]
          }]
        }
      },
      {
        type: 'action',
        name: 'Créer Facture',
        description: 'Générer la facture depuis la commande',
        position: { x: 400, y: 260 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'Invoice',
            data: {
              customerId: '{{order.customerId}}',
              orderReference: '{{order.reference}}',
              lines: '{{order.lines}}',
              paymentTerms: '{{customer.paymentTerms}}'
            }
          }
        }
      },
      {
        type: 'action',
        name: 'Réserver Stock',
        description: 'Réserver les articles en stock',
        position: { x: 400, y: 420 },
        config: {
          actionType: 'call_api',
          actionParams: {
            method: 'POST',
            url: '/api/inventory/reserve',
            body: { orderId: '{{order.id}}' }
          }
        }
      },
      {
        type: 'action',
        name: 'Email Confirmation',
        description: 'Envoyer la confirmation au client',
        position: { x: 400, y: 580 },
        config: {
          actionType: 'send_email',
          actionParams: {
            to: '{{customer.email}}',
            subject: 'Confirmation de commande {{order.reference}}',
            body: 'Bonjour {{customer.contactName}},\n\nNous confirmons la réception de votre commande {{order.reference}}.\n\nTotal: {{order.totalTTC}} DZT\nDélai estimé: {{order.estimatedDelivery}}\n\nCordialement'
          }
        }
      },
      {
        type: 'action',
        name: 'Notifier Équipe Vente',
        description: 'Notifier le commercial responsable',
        position: { x: 400, y: 740 },
        config: {
          actionType: 'send_notification',
          actionParams: {
            users: '{{order.salesRepId}}',
            title: '✅ Commande {{order.reference}} transformée en facture',
            message: 'La facture {{invoice.reference}} a été créée.\nMontant: {{invoice.totalTTC}} DZD',
            priority: 'normal'
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Commande', key: 'order', type: 'object', isInput: true, isOutput: true },
      { id: 'v2', name: 'Client', key: 'customer', type: 'object', isInput: true, isOutput: false },
      { id: 'v3', name: 'Facture Créée', key: 'invoice', type: 'object', isOutput: true }
    ]
  },

  // ============================================================
  // PURCHASES TEMPLATES
  // ============================================================

  // Template 6: Purchase Order Approval (3 levels)
  {
    id: 'po-approval-3levels',
    name: 'Approbation BC 3 Niveaux',
    nameAr: 'موافقة طلب الشراء 3 مستويات',
    category: 'purchases',
    description: 'Circuit d\'approbation des bons de commande selon le montant: Chef < 100K, DAF < 500K, DG > 500K.',
    descriptionAr: 'مسار موافقة أوامر الشراء حسب المبلغ',
    icon: 'ShoppingCart',
    difficulty: 'advanced',
    estimatedTime: '25 min',
    tags: ['achat', 'approbation', 'DAF', 'DG', 'budget'],
    popular: false,
    featured: false,
    trigger: {
      type: 'event',
      config: {
        event: 'purchase_order.created',
        filters: { status: { eq: 'draft' } }
      }
    },
    steps: [
      {
        type: 'condition',
        name: 'Vérifier Montant BC',
        description: 'Déterminer le niveau d\'approbation requis',
        position: { x: 400, y: 100 },
        config: {
          conditionType: 'switch',
          cases: [
            { value: 'level1', stepId: '', condition: { field: 'po.totalTTC', operator: 'lte', value: 100000 } },
            { value: 'level2', stepId: '', condition: { field: 'po.totalTTC', operator: 'lte', value: 500000 } },
            { value: 'level3', stepId: '' }
          ]
        }
      },
      {
        type: 'approval',
        name: 'Approbation Chef Dept',
        description: 'Validation par le chef de département (< 100K DZD)',
        position: { x: 200, y: 260 },
        config: {
          approvalType: 'single',
          approvers: [{ fieldPath: 'po.departmentManagerId', required: true }],
          timeoutHours: 24
        }
      },
      {
        type: 'approval',
        name: 'Approbation DAF',
        description: 'Validation par le Directeur Administratif et Financier',
        position: { x: 400, y: 260 },
        config: {
          approvalType: 'single',
          approvers: [{ roleId: 'daf', required: true }],
          timeoutHours: 48
        }
      },
      {
        type: 'approval',
        name: 'Approbation DG',
        description: 'Validation par le Directeur Général (> 500K DZD)',
        position: { x: 600, y: 260 },
        config: {
          approvalType: 'single',
          approvers: [{ roleId: 'dg', required: true }],
          timeoutHours: 72
        }
      },
      {
        type: 'action',
        name: 'Valider BC',
        description: 'Marquer le bon de commande comme approuvé',
        position: { x: 400, y: 440 },
        config: {
          actionType: 'update_record',
          actionParams: {
            entity: 'PurchaseOrder',
            recordId: '{{po.id}}',
            data: { status: 'approved' }
          }
        }
      },
      {
        type: 'action',
        name: 'Notifier Fournisseur',
        description: 'Envoyer le BC au fournisseur par email',
        position: { x: 400, y: 600 },
        config: {
          actionType: 'send_email',
          actionParams: {
            to: '{{supplier.email}}',
            subject: 'Bon de Commande N°{{po.reference}} - {{company.name}}',
            body: 'Bonjour,\n\nVeuillez trouver ci-joint notre bon de commande N°{{po.reference}}.\n\nTotal: {{po.totalTTC}} DZD\nDate livraison souhaitée: {{po.requestedDeliveryDate}}\n\nCordialement'
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Bon Commande', key: 'po', type: 'object', isInput: true, isOutput: true },
      { id: 'v2', name: 'Fournisseur', key: 'supplier', type: 'object', isInput: true, isOutput: false },
      { id: 'v3', name: 'Niveau Approbation', key: 'approvalLevel', type: 'string', isOutput: true }
    ]
  },

  // ============================================================
  // PRODUCTION TEMPLATES
  // ============================================================

  // Template 7: Production Order Completion
  {
    id: 'production-completion',
    name: 'Fin Production & Stock',
    nameAr: 'إنتاج المخزون',
    category: 'production',
    description: 'À la fin d\'un ordre de production: mettre à jour le stock, notifier qualité et logistique.',
    descriptionAr: 'عند انتهاء أمر الإنتاج: تحديث المخزون، إشعار الجودة واللوجستيات',
    icon: 'Settings',
    difficulty: 'advanced',
    estimatedTime: '18 min',
    tags: ['production', 'stock', 'qualité', 'manufacturing'],
    popular: false,
    featured: false,
    trigger: {
      type: 'event',
      config: {
        event: 'production_order.completed',
        filters: {}
      }
    },
    steps: [
      {
        type: 'action',
        name: 'Mettre à jour Stock',
        description: 'Entrer les produits finis en stock',
        position: { x: 400, y: 100 },
        config: {
          actionType: 'call_api',
          actionParams: {
            method: 'POST',
            url: '/api/inventory/movements',
            body: {
              type: 'production_in',
              productionOrderId: '{{productionOrder.id}}',
              items: '{{productionOrder.outputItems}}'
            }
          }
        }
      },
      {
        type: 'action',
        name: 'Conso Matières Premières',
        description: 'Déduire les matières premières consommées',
        position: { x: 400, y: 260 },
        config: {
          actionType: 'call_api',
          actionParams: {
            method: 'POST',
            url: '/api/inventory/movements',
            body: {
              type: 'production_out',
              productionOrderId: '{{productionOrder.id}}',
              items: '{{productionOrder.consumedMaterials}}'
            }
          }
        }
      },
      {
        type: 'condition',
        name: 'Contrôle Qualité Requis?',
        description: 'Le produit nécessite-t-il un contrôle qualité?',
        position: { x: 400, y: 420 },
        config: {
          conditionType: 'simple',
          conditions: [{
            logic: 'AND',
            conditions: [{
              field: 'product.requiresQualityCheck',
              operator: 'eq',
              value: true,
              valueType: 'boolean'
            }]
          }]
        }
      },
      {
        type: 'approval',
        name: 'Validation Qualité',
        description: 'Contrôle qualité obligatoire avant mise en stock',
        position: { x: 250, y: 580 },
        config: {
          approvalType: 'single',
          approvers: [{ roleId: 'quality_controller', required: true }],
          timeoutHours: 24
        }
      },
      {
        type: 'action',
        name: 'Notifier Logistique',
        description: 'Informer le service logistique pour expédition',
        position: { x: 550, y: 580 },
        config: {
          actionType: 'send_notification',
          actionParams: {
            users: '[department:logistics]',
            title: '🏭 Production Terminée - {{product.name}}',
            message: 'Ordre de production {{productionOrder.reference}} terminé.\nQuantité: {{productionOrder.actualQuantity}} {{product.unit}}\nPrêt pour expédition.',
            priority: 'normal'
          }
        }
      },
      {
        type: 'action',
        name: 'Rapport Production',
        description: 'Générer le rapport de production PDF',
        position: { x: 400, y: 740 },
        config: {
          actionType: 'generate_pdf',
          actionParams: {
            template: 'production_report',
            data: {
              productionOrderId: '{{productionOrder.id}}'
            }
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Ordre Production', key: 'productionOrder', type: 'object', isInput: true, isOutput: true },
      { id: 'v2', name: 'Produit', key: 'product', type: 'object', isInput: true, isOutput: false },
      { id: 'v3', name: 'Quantité Réelle', key: 'actualQuantity', type: 'number', isOutput: true }
    ]
  },

  // ============================================================
  // CUSTOM / GENERAL TEMPLATES
  // ============================================================

  // Template 8: Document Approval Flow
  {
    id: 'document-approval',
    name: 'Circuit Approbation Document',
    nameAr: 'موافقة المستند',
    category: 'custom',
    description: 'Workflow générique d\'approbation de documents avec notifications et historique.',
    descriptionAr: 'سير عمل عام لموافقة المستندات مع الإشعارات وسجل',
    icon: 'FileText',
    difficulty: 'beginner',
    estimatedTime: '8 min',
    tags: ['document', 'approbation', 'validation', 'générique'],
    popular: true,
    featured: false,
    trigger: {
      type: 'manual',
      config: {}
    },
    steps: [
      {
        type: 'action',
        name: 'Soumettre Document',
        description: 'Initialiser la demande d\'approbation',
        position: { x: 400, y: 100 },
        config: {
          actionType: 'create_record',
          actionParams: {
            entity: 'DocumentApproval',
            data: {
              documentId: '{{document.id}}',
              requestedBy: '{{currentUser.id}}',
              status: 'pending'
            }
          }
        }
      },
      {
        type: 'approval',
        name: 'Approbation Niveau 1',
        description: 'Premier niveau d\'approbation',
        position: { x: 400, y: 260 },
        config: {
          approvalType: 'single',
          approvers: [
            { fieldPath: 'document.approver1', required: true }
          ],
          timeoutHours: 48
        }
      },
      {
        type: 'condition',
        name: 'Deuxième Niveau?',
        description: 'Une deuxième approbation est-elle nécessaire?',
        position: { x: 400, y: 420 },
        config: {
          conditionType: 'simple',
          conditions: [{
            logic: 'AND',
            conditions: [{
              field: 'document.requiresSecondApproval',
              operator: 'eq',
              value: true,
              valueType: 'boolean'
            }]
          }]
        }
      },
      {
        type: 'approval',
        name: 'Approbation Niveau 2',
        description: 'Deuxième niveau d\'approbation',
        position: { x: 400, y: 580 },
        config: {
          approvalType: 'single',
          approvers: [
            { fieldPath: 'document.approver2', required: true }
          ],
          timeoutHours: 48
        }
      },
      {
        type: 'action',
        name: 'Finaliser',
        description: 'Marquer le document comme approuvé',
        position: { x: 400, y: 740 },
        config: {
          actionType: 'update_record',
          actionParams: {
            entity: 'DocumentApproval',
            recordId: '{{approval.id}}',
            data: { status: 'approved' }
          }
        }
      },
      {
        type: 'action',
        name: 'Notifier Demandeur',
        description: 'Informer que le document est approuvé',
        position: { x: 400, y: 900 },
        config: {
          actionType: 'send_notification',
          actionParams: {
            users: '{{requestedBy}}',
            title: '✅ Document Approuvé',
            message: 'Votre document "{{document.name}}" a été approuvé.',
            priority: 'normal'
          }
        }
      }
    ],
    variables: [
      { id: 'v1', name: 'Document', key: 'document', type: 'object', isInput: true, isOutput: true },
      { id: 'v2', name: 'Demandeur', key: 'currentUser', type: 'object', isInput: true, isOutput: false },
      { id: 'v3', name: 'ID Approbation', key: 'approval.id', type: 'string', isOutput: true }
    ]
  }
];

// ============================================================
// Helper Functions
// ============================================================

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.category === category);
}

export function getFeaturedTemplates(): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.featured);
}

export function getPopularTemplates(): WorkflowTemplate[] {
  return workflowTemplates.filter(t => t.popular);
}

export function searchTemplates(query: string): WorkflowTemplate[] {
  const q = query.toLowerCase();
  return workflowTemplates.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)) ||
    t.category.toLowerCase().includes(q)
  );
}
