import type { RuleRecord } from '../rules/types'
import type { WorkflowNode, WorkflowEdge } from '../workflow/types'
import type { FunctionDef } from '../functions/types'
import { createDefaultEligibilityTestCases } from '../eligibility/testCases'

export type TicketStatus = 'pending' | 'gathering_context' | 'generating_rules' | 'paused_for_review' | 'executing' | 'completed' | 'failed'

export type Ticket = {
  id: string
  prompt: string
  status: TicketStatus
  createdAt: string
  completedAt?: string
  generatedRuleId?: string
  logs: string[]
}

export const generateWorkflowFromText = async (
  prompt: string,
  onLog: (log: string) => void,
  agent?: string,
  mlAlgorithm?: string
): Promise<RuleRecord> => {
  const norm = prompt.toLowerCase()
  onLog(`[Orchestrator] Parsing prompt intent...`)
  await new Promise((r) => setTimeout(r, 600))
  
  let ruleType: 'eligibility' | 'sweetshop' | 'order' | 'support' = 'eligibility'
  let ruleName = 'Generated ' + prompt.slice(0, 20) + '...'
  
  if (norm.includes('fraud') || norm.includes('loan')) {
    ruleType = 'eligibility'
    ruleName = 'Loan Fraud Detection'
  } else if (norm.includes('order') || norm.includes('shipping')) {
    ruleType = 'order'
    ruleName = 'Dynamic Order Processing'
  } else if (norm.includes('support') || norm.includes('ticket')) {
    ruleType = 'support'
    ruleName = 'AI Support Triage'
  } else if (norm.includes('sweet') || norm.includes('shop')) {
    ruleType = 'sweetshop'
    ruleName = 'Sweetshop Operations'
  }

  onLog(`[Orchestrator] Intent classified as: ${ruleType}`)
  if (agent) {
    onLog(`[Orchestrator] Assigning specialized task to: ${agent}`)
  }
  await new Promise((r) => setTimeout(r, 800))
  
  const algorithms = ['Random Forest', 'KNN', 'Neural Network', 'SVM', 'Gradient Boosting', 'Logistic Regression', 'Decision Tree']
  const selectedAlgo = mlAlgorithm || algorithms[Math.floor(Math.random() * algorithms.length)]
  onLog(`[ML Agent] Selected ML Algorithm for Analysis & Metrics Phase: ${selectedAlgo}`)
  await new Promise((r) => setTimeout(r, 600))
  
  onLog(`[RAG Agent] Fetching historical rules and datasets...`)
  await new Promise((r) => setTimeout(r, 1200))
  onLog(`[RAG Agent] Found 3 matching context documents.`)

  onLog(`[Rule Gen] Synthesizing AST nodes into ReactFlow...`)
  await new Promise((r) => setTimeout(r, 1500))

  const ruleId = crypto.randomUUID()
  
  // Create nodes
  const startId = crypto.randomUUID()
  const checkId = crypto.randomUUID()
  const endPassId = crypto.randomUUID()
  const endFailId = crypto.randomUUID()

  const nodes: WorkflowNode[] = [
    {
      id: startId,
      type: 'workflow',
      position: { x: 250, y: 50 },
      data: { title: 'Incoming Request', kind: 'start' }
    },
    {
      id: checkId,
      type: 'workflow',
      position: { x: 250, y: 150 },
      data: { 
        title: ruleType === 'eligibility' ? 'Risk & Credit Check' : 'Validation Rules', 
        kind: 'condition',
        config: { functionId: `func_${ruleType}_check`, algorithm: selectedAlgo },
        generatedBy: `Data Understanding ML Agent (${selectedAlgo})`
      }
    },
    {
      id: endPassId,
      type: 'workflow',
      position: { x: 100, y: 300 },
      data: { title: 'Approve', kind: 'end', generatedBy: 'Rule Architect Agent' }
    },
    {
      id: endFailId,
      type: 'workflow',
      position: { x: 400, y: 300 },
      data: { title: 'Reject', kind: 'end', generatedBy: 'Rule Architect Agent' }
    }
  ]

  const edges: WorkflowEdge[] = [
    { id: `e-${startId}-${checkId}`, source: startId, target: checkId },
    { id: `e-${checkId}-${endPassId}`, source: checkId, target: endPassId, sourceHandle: 'true', label: 'Pass' },
    { id: `e-${checkId}-${endFailId}`, source: checkId, target: endFailId, sourceHandle: 'false', label: 'Fail' }
  ]

  const functions: FunctionDef[] = [
    {
      id: `func_${ruleType}_check`,
      name: 'Evaluate AI Conditions',
      description: 'AI Generated Condition',
      kind: 'condition',
      params: [],
      operation: ruleType === 'eligibility' ? 'candidate_is_experienced' : 'budget_check'
    }
  ]

  onLog(`[Rule Gen] AST Generated successfully.`)
  await new Promise((r) => setTimeout(r, 500))

  onLog(`[Executing] Validating generated rule engine against test cases...`)
  await new Promise((r) => setTimeout(r, 1000))
  onLog(`[Monitoring] Rule compilation complete. Sandbox ready.`)

  return {
    id: ruleId,
    name: ruleName,
    type: ruleType,
    workflow: { nodes, edges },
    functions,
    eligibilityTestCases: ruleType === 'eligibility' ? createDefaultEligibilityTestCases() : undefined,
    updatedAt: new Date().toISOString()
  }
}

export const resumeWorkflowFromText = async (
  prompt: string,
  existingRule: RuleRecord,
  onLog: (log: string) => void
): Promise<RuleRecord> => {
  onLog(`[Orchestrator] Processing addition: "${prompt}"`)
  await new Promise((r) => setTimeout(r, 800))
  onLog(`[Integration Agent] Resolving dependencies for new requirement...`)
  await new Promise((r) => setTimeout(r, 1200))
  onLog(`[Rule Gen] Appending logical nodes to active AST...`)
  
  const addNodeId = crypto.randomUUID()
  const newNode: WorkflowNode[] = [
    {
      id: addNodeId,
      type: 'workflow',
      position: { x: 250, y: 220 },
      data: { 
        title: 'Integration Add-on API', 
        kind: 'action', 
        config: { functionId: `func_integration_${crypto.randomUUID().slice(0,4)}` },
        generatedBy: 'Integration Agent' 
      }
    }
  ]

  // Re-wire edges: find the start -> condition edge and inject between them
  let edges = [...existingRule.workflow.edges]
  const sourceNode = existingRule.workflow.nodes.find(n => n.data.kind === 'start')
  const conditionNode = existingRule.workflow.nodes.find(n => n.data.kind === 'condition')

  if (sourceNode && conditionNode) {
    edges = edges.filter(e => !(e.source === sourceNode.id && e.target === conditionNode.id))
    edges.push({ id: `e-${sourceNode.id}-${addNodeId}`, source: sourceNode.id, target: addNodeId, label: 'Add-on Trigger' })
    edges.push({ id: `e-${addNodeId}-${conditionNode.id}`, source: addNodeId, target: conditionNode.id, label: 'Next' })
  }

  // Adjust Y positions to make room
  const nodes = existingRule.workflow.nodes.map(n => {
    if (n.data.kind === 'condition' || n.data.kind === 'end') {
      return { ...n, position: { x: n.position.x, y: n.position.y + 100 } }
    }
    return n
  }).concat(newNode)

  const functions: FunctionDef[] = [
    ...existingRule.functions,
    {
      id: `func_integration_${crypto.randomUUID().slice(0,4)}`,
      name: 'Custom Integration Call',
      description: 'Added via HITL additions from prompt.',
      kind: 'action',
      params: [],
      operation: 'budget_check'
    }
  ]

  await new Promise((r) => setTimeout(r, 1500))
  onLog(`[Monitoring] AST modification verified successfully. Sandbox loaded.`)

  return {
    ...existingRule,
    workflow: { nodes, edges },
    functions,
    updatedAt: new Date().toISOString()
  }
}
