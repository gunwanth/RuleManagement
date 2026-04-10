import type { RuleRecord } from './types'
import { NODE_TEMPLATES, createWorkflowNode } from '../workflow/nodeFactory'
import type { FunctionDef } from '../functions/types'

import { createSweetShopSeedFunctions, createSweetShopSeedWorkflow } from './seed'
import { createEligibilitySeedFunctions, createEligibilitySeedWorkflow } from './eligibilitySeed'
import { createOrderProcessingSeedFunctions, createOrderProcessingSeedWorkflow } from './orderProcessingSeed'
import { createSupportSeedFunctions, createSupportSeedWorkflow } from './supportSeed'

function createTemplateWorkflow(title: string): RuleRecord['workflow'] {
  const start = createWorkflowNode({ template: NODE_TEMPLATES.start, position: { x: 100, y: 100 } })
  const condition = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 400, y: 100 } })
  condition.data.title = title
  const endPass = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 700, y: 50 } })
  endPass.data.title = 'Approved (Success)'
  const endFail = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 700, y: 150 } })
  endFail.data.title = 'Rejected (Fail)'

  return {
    nodes: [start, condition, endPass, endFail],
    edges: [
      { id: 'e1', source: start.id, target: condition.id },
      { id: 'e2', source: condition.id, target: endPass.id, sourceHandle: 'true' },
      { id: 'e3', source: condition.id, target: endFail.id, sourceHandle: 'false' },
    ],
  }
}

export function createFraudTemplate(): RuleRecord {
  const functions: FunctionDef[] = [
    {
      id: 'fraud:high_value',
      kind: 'condition',
      name: 'Is High Value Transaction',
      description: 'Checks if transaction amount exceeds threshold.',
      operationName: 'high_value',
      operation: 'transaction_amount_gt',
      params: [{ key: 'amount', label: 'Threshold', type: 'number', required: true, placeholder: '1000' }],
    }
  ]
  const workflow = createTemplateWorkflow('Is High Value?')
  workflow.nodes[1].data.config = { functionId: 'fraud:high_value', params: { amount: 5000 } }

  return {
    id: 'fraud_template',
    name: 'Fraud Detection Template',
    type: 'fraud',
    workflow,
    functions,
    updatedAt: new Date().toISOString(),
  }
}

export function createFinanceTemplate(): RuleRecord {
  const functions: FunctionDef[] = [
    {
      id: 'finance:budget_exceeded',
      kind: 'condition',
      name: 'Budget Exceeded',
      description: 'Checks if department budget is exceeded.',
      operationName: 'budget_exceeded',
      operation: 'budget_check',
      params: [{ key: 'dept', label: 'Department', type: 'string', required: true, placeholder: 'IT' }],
    }
  ]
  const workflow = createTemplateWorkflow('Over Budget?')
  workflow.nodes[1].data.config = { functionId: 'finance:budget_exceeded', params: { dept: 'Sales' } }

  return {
    id: 'finance_template',
    name: 'Finance Management Template',
    type: 'finance',
    workflow,
    functions,
    updatedAt: new Date().toISOString(),
  }
}

export function createAlertsTemplate(): RuleRecord {
  const functions: FunctionDef[] = [
    {
      id: 'alerts:is_critical',
      kind: 'condition',
      name: 'Is Critical Alert',
      description: 'Checks if alert level is critical.',
      operationName: 'is_critical',
      operation: 'alert_level_is',
      params: [{ key: 'level', label: 'Level', type: 'string', required: true, placeholder: 'critical' }],
    }
  ]
  const workflow = createTemplateWorkflow('Is Critical?')
  workflow.nodes[1].data.config = { functionId: 'alerts:is_critical', params: { level: 'critical' } }

  return {
    id: 'alerts_template',
    name: 'Alerts & Notifications Template',
    type: 'alerts',
    workflow,
    functions,
    updatedAt: new Date().toISOString(),
  }
}

export function createTransactionsTemplate(): RuleRecord {
  const functions: FunctionDef[] = [
    {
      id: 'trans:is_international',
      kind: 'condition',
      name: 'Is International',
      description: 'Checks if transaction is international.',
      operationName: 'is_international',
      operation: 'transaction_location_is',
      params: [{ key: 'country', label: 'Country', type: 'string', required: true, placeholder: 'US' }],
    }
  ]
  const workflow = createTemplateWorkflow('International?')
  workflow.nodes[1].data.config = { functionId: 'trans:is_international', params: { country: 'IN' } }

  return {
    id: 'transactions_template',
    name: 'Transactions Template',
    type: 'transactions',
    workflow,
    functions,
    updatedAt: new Date().toISOString(),
  }
}

export function createSweetShopTemplate(): RuleRecord {
  return {
    id: 'sweetshop_template',
    name: 'Sweet Shop Management Template',
    type: 'sweetshop',
    workflow: createSweetShopSeedWorkflow(),
    functions: createSweetShopSeedFunctions(),
    updatedAt: new Date().toISOString(),
  }
}

export function createEligibilityTemplate(): RuleRecord {
  return {
    id: 'eligibility_template',
    name: 'Eligibility Criteria Template',
    type: 'eligibility',
    workflow: createEligibilitySeedWorkflow(),
    functions: createEligibilitySeedFunctions(),
    updatedAt: new Date().toISOString(),
  }
}

export function createOrderProcessingTemplate(): RuleRecord {
  return {
    id: 'order_template',
    name: 'Order Processing Template',
    type: 'order',
    workflow: createOrderProcessingSeedWorkflow(),
    functions: createOrderProcessingSeedFunctions(),
    updatedAt: new Date().toISOString(),
  }
}

export function createSupportTemplate(): RuleRecord {
  return {
    id: 'support_template',
    name: 'CRM Support Operations Template',
    type: 'support',
    workflow: createSupportSeedWorkflow(),
    functions: createSupportSeedFunctions(),
    updatedAt: new Date().toISOString(),
  }
}

export const RULE_TEMPLATES: RuleRecord[] = [
  createFraudTemplate(),
  createFinanceTemplate(),
  createAlertsTemplate(),
  createTransactionsTemplate(),
]

export const SYSTEM_RULE_TEMPLATES: RuleRecord[] = [
  createSweetShopTemplate(),
  createEligibilityTemplate(),
  createOrderProcessingTemplate(),
  createSupportTemplate(),
]
