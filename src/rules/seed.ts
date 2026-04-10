import type { FunctionDef } from '../functions/types'
import type { WorkflowState } from '../workflow/types'
import { NODE_TEMPLATES, createWorkflowNode } from '../workflow/nodeFactory'

export function createSweetShopSeedFunctions(): FunctionDef[] {
  return [
    {
      id: 'fn:buy_sweet',
      kind: 'action',
      name: 'Buy Sweet',
      icon: undefined,
      description: 'Reduces stock when a customer buys sweets.',
      operationName: 'buy_sweet',
      operation: 'buy_sweet',
      params: [
        {
          key: 'sweetName',
          label: 'Sweet name',
          type: 'string',
          required: true,
          placeholder: 'Gulab Jamun',
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number',
          required: true,
          placeholder: '1',
        },
      ],
    },
    {
      id: 'fn:add_stock',
      kind: 'action',
      name: 'Add Stock',
      icon: undefined,
      description: 'Adds inventory (restock).',
      operationName: 'add_stock',
      operation: 'add_stock',
      params: [
        {
          key: 'sweetName',
          label: 'Sweet name',
          type: 'string',
          required: true,
          placeholder: 'Jalebi',
        },
        {
          key: 'quantity',
          label: 'Quantity',
          type: 'number',
          required: true,
          placeholder: '10',
        },
      ],
    },
    {
      id: 'fn:delete_sweet',
      kind: 'action',
      name: 'Delete Sweet',
      icon: undefined,
      description: 'Removes a sweet from the shop.',
      operationName: 'delete_sweet',
      operation: 'delete_sweet',
      params: [
        {
          key: 'sweetName',
          label: 'Sweet name',
          type: 'string',
          required: true,
          placeholder: 'Rasgulla',
        },
      ],
    },
    {
      id: 'fn:view_stocks',
      kind: 'action',
      name: 'View Stocks',
      icon: undefined,
      description: 'Shows the current inventory snapshot.',
      operationName: 'view_stocks',
      operation: 'view_stocks',
      params: [],
    },
    {
      id: 'fn:stock_below',
      kind: 'condition',
      name: 'Stock Below',
      icon: undefined,
      description: 'Checks if a sweet stock is below a threshold.',
      operationName: 'stock_below',
      operation: 'stock_below',
      params: [
        {
          key: 'sweetName',
          label: 'Sweet name',
          type: 'string',
          required: true,
          placeholder: 'Gulab Jamun',
        },
        {
          key: 'threshold',
          label: 'Threshold',
          type: 'number',
          required: true,
          placeholder: '10',
        },
      ],
    },
    {
      id: 'fn:stock_above_or_equal',
      kind: 'condition',
      name: 'Stock Above/Equal',
      icon: undefined,
      description: 'Checks if a sweet stock is above or equal to a threshold.',
      operationName: 'stock_above_or_equal',
      operation: 'stock_above_or_equal',
      params: [
        {
          key: 'sweetName',
          label: 'Sweet name',
          type: 'string',
          required: true,
          placeholder: 'Gulab Jamun',
        },
        {
          key: 'threshold',
          label: 'Threshold',
          type: 'number',
          required: true,
          placeholder: '10',
        },
      ],
    },
  ]
}

export function createSweetShopSeedWorkflow(): WorkflowState {
  const start = createWorkflowNode({
    template: NODE_TEMPLATES.start,
    position: { x: 80, y: 180 },
  })

  const buySweet = createWorkflowNode({
    template: NODE_TEMPLATES.action,
    position: { x: 340, y: 180 },
  })
  buySweet.data.title = 'Buy Sweet'
  buySweet.data.config = { functionId: 'fn:buy_sweet', params: { sweetName: 'Gulab Jamun', quantity: 2 } }

  const checkStock = createWorkflowNode({
    template: NODE_TEMPLATES.condition,
    position: { x: 620, y: 180 },
  })
  checkStock.data.title = 'Check Stock'
  checkStock.data.config = { functionId: 'fn:stock_below', params: { sweetName: 'Gulab Jamun', threshold: 10 } }

  const updateStock = createWorkflowNode({
    template: NODE_TEMPLATES.action,
    position: { x: 900, y: 90 },
  })
  updateStock.data.title = 'Update Stock'
  updateStock.data.config = { functionId: 'fn:add_stock', params: { sweetName: 'Gulab Jamun', quantity: 12 } }

  const end = createWorkflowNode({
    template: NODE_TEMPLATES.end,
    position: { x: 1180, y: 180 },
  })
  end.data.title = 'End'

  const edges = [
    { id: 'e1', source: start.id, target: buySweet.id, type: 'smoothstep' },
    { id: 'e2', source: buySweet.id, target: checkStock.id, type: 'smoothstep' },
    { id: 'e3', source: checkStock.id, target: updateStock.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e4', source: checkStock.id, target: end.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'e5', source: updateStock.id, target: end.id, type: 'smoothstep' },
  ]

  return { nodes: [start, buySweet, checkStock, updateStock, end], edges }
}
