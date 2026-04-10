import type { WorkflowState } from './types'
import { NODE_TEMPLATES, createWorkflowNode } from './nodeFactory'

export function createInitialWorkflow(): WorkflowState {
  const start = createWorkflowNode({
    template: NODE_TEMPLATES.start,
    position: { x: 80, y: 120 },
  })
  const buySweet = createWorkflowNode({
    template: NODE_TEMPLATES.action,
    position: { x: 340, y: 120 },
  })
  buySweet.data.title = 'Buy Sweet'
  buySweet.data.icon = undefined
  buySweet.data.config = {
    functionId: 'fn:buy_sweet',
    params: { sweetName: 'Gulab Jamun', quantity: 2 },
  }
  const checkStock = createWorkflowNode({
    template: NODE_TEMPLATES.condition,
    position: { x: 600, y: 120 },
  })
  checkStock.data.title = 'Check Stock'
  checkStock.data.icon = undefined
  checkStock.data.config = {
    functionId: 'fn:stock_below',
    params: { sweetName: 'Gulab Jamun', threshold: 10 },
  }
  const updateStock = createWorkflowNode({
    template: NODE_TEMPLATES.action,
    position: { x: 860, y: 120 },
  })
  updateStock.data.title = 'Update Stock'
  updateStock.data.icon = undefined
  updateStock.data.config = {
    functionId: 'fn:add_stock',
    params: { sweetName: 'Gulab Jamun', quantity: 10 },
  }
  const end = createWorkflowNode({
    template: NODE_TEMPLATES.end,
    position: { x: 1120, y: 120 },
  })

  const edges = [
    { id: 'e1', source: start.id, target: buySweet.id, type: 'smoothstep' },
    { id: 'e2', source: buySweet.id, target: checkStock.id, type: 'smoothstep' },
    {
      id: 'e3',
      source: checkStock.id,
      target: updateStock.id,
      sourceHandle: 'true',
      type: 'smoothstep',
    },
    {
      id: 'e3b',
      source: checkStock.id,
      target: end.id,
      sourceHandle: 'false',
      type: 'smoothstep',
    },
    { id: 'e4', source: updateStock.id, target: end.id, type: 'smoothstep' },
  ]

  return { nodes: [start, buySweet, checkStock, updateStock, end], edges }
}
