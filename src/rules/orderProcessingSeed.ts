import type { FunctionDef } from '../functions/types'
import type { ShopTestCase } from './types'
import type { WorkflowState } from '../workflow/types'
import { NODE_TEMPLATES, createWorkflowNode } from '../workflow/nodeFactory'
import { createDefaultShopState } from '../shop/defaultState'

export function createOrderProcessingSeedFunctions(): FunctionDef[] {
  return [
    {
      id: 'order:is_created',
      kind: 'condition',
      name: 'Trigger: Order Created',
      description: 'Checks whether a new order has entered the system.',
      operationName: 'order_created',
      operation: 'order_is_created',
      params: [],
    },
    {
      id: 'order:payment_confirmed',
      kind: 'condition',
      name: 'Payment Confirmed?',
      description: 'Checks if the order payment has been completed.',
      operationName: 'payment_confirmed',
      operation: 'payment_is_confirmed',
      params: [],
    },
    {
      id: 'order:stock_available',
      kind: 'condition',
      name: 'Stock Available?',
      description: 'Checks if stock is available for the current order quantity.',
      operationName: 'order_stock_available',
      operation: 'order_stock_available',
      params: [
        { key: 'itemName', label: 'Item name', type: 'string', required: true, placeholder: 'Gulab Jamun' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '4' },
      ],
    },
    {
      id: 'order:shift_is',
      kind: 'condition',
      name: 'Shift Assigned?',
      description: 'Checks if the order was assigned to the expected shift.',
      operationName: 'shift_is',
      operation: 'shift_is',
      params: [{ key: 'shift', label: 'Shift', type: 'string', required: true, placeholder: 'morning' }],
    },
    {
      id: 'order:create',
      kind: 'action',
      name: 'Create Order',
      description: 'Creates or refreshes the order details.',
      operationName: 'create_order',
      operation: 'create_order',
      params: [
        { key: 'itemName', label: 'Item name', type: 'string', required: true, placeholder: 'Gulab Jamun' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '4' },
        { key: 'customerName', label: 'Customer name', type: 'string', required: true, placeholder: 'Priya' },
        { key: 'priority', label: 'Priority', type: 'string', required: true, placeholder: 'express' },
      ],
    },
    {
      id: 'order:confirm_payment',
      kind: 'action',
      name: 'Confirm Payment',
      description: 'Marks payment as complete.',
      operationName: 'confirm_payment',
      operation: 'confirm_payment',
      params: [],
    },
    {
      id: 'order:assign_shift',
      kind: 'action',
      name: 'Assign Shift',
      description: 'Assigns the packing team shift.',
      operationName: 'assign_shift',
      operation: 'assign_shift',
      params: [{ key: 'shift', label: 'Shift', type: 'string', required: true, placeholder: 'morning' }],
    },
    {
      id: 'order:reserve_stock',
      kind: 'action',
      name: 'Reserve Stock',
      description: 'Reserves stock for the order.',
      operationName: 'reserve_stock',
      operation: 'reserve_stock',
      params: [
        { key: 'itemName', label: 'Item name', type: 'string', required: true, placeholder: 'Gulab Jamun' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '4' },
      ],
    },
    {
      id: 'order:pack_order',
      kind: 'action',
      name: 'Pack Order',
      description: 'Marks the order as packed.',
      operationName: 'pack_order',
      operation: 'pack_order',
      params: [],
    },
    {
      id: 'order:dispatch_order',
      kind: 'action',
      name: 'Dispatch Order',
      description: 'Marks the order as dispatched.',
      operationName: 'dispatch_order',
      operation: 'dispatch_order',
      params: [],
    },
    {
      id: 'order:update_status',
      kind: 'action',
      name: 'Update Status',
      description: 'Updates the human-readable order status.',
      operationName: 'update_order_status',
      operation: 'update_order_status',
      params: [{ key: 'status', label: 'Status', type: 'string', required: true, placeholder: 'on_hold' }],
    },
  ]
}

export function createOrderProcessingSeedWorkflow(): WorkflowState {
  const start = createWorkflowNode({ template: NODE_TEMPLATES.start, position: { x: 80, y: 180 } })

  const trigger = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 320, y: 180 } })
  trigger.data.title = 'Trigger: Order Created'
  trigger.data.config = { functionId: 'order:is_created', params: {} }

  const payment = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 600, y: 180 } })
  payment.data.title = 'Payment Confirmed?'
  payment.data.config = { functionId: 'order:payment_confirmed', params: {} }

  const stock = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 880, y: 180 } })
  stock.data.title = 'Stock Available?'
  stock.data.config = { functionId: 'order:stock_available', params: { itemName: 'Gulab Jamun', quantity: 4 } }

  const shift = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1160, y: 180 } })
  shift.data.title = 'Assign Shift'
  shift.data.config = { functionId: 'order:assign_shift', params: { shift: 'morning' } }

  const shiftCheck = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1440, y: 180 } })
  shiftCheck.data.title = 'Shift Assigned?'
  shiftCheck.data.config = { functionId: 'order:shift_is', params: { shift: 'morning' } }

  const reserve = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1720, y: 180 } })
  reserve.data.title = 'Reserve Stock'
  reserve.data.config = { functionId: 'order:reserve_stock', params: { itemName: 'Gulab Jamun', quantity: 4 } }

  const pack = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 2000, y: 120 } })
  pack.data.title = 'Pack Order'
  pack.data.config = { functionId: 'order:pack_order', params: {} }

  const dispatch = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 2280, y: 120 } })
  dispatch.data.title = 'Dispatch Order'
  dispatch.data.config = { functionId: 'order:dispatch_order', params: {} }

  const hold = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 2000, y: 260 } })
  hold.data.title = 'Update Status'
  hold.data.config = { functionId: 'order:update_status', params: { status: 'on_hold' } }

  const cancel = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1720, y: 320 } })
  cancel.data.title = 'Cancel Order'
  cancel.data.config = { functionId: 'order:update_status', params: { status: 'cancelled' } }

  const done = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2560, y: 120 } })
  done.data.title = 'Order Completed'

  const failed = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2280, y: 300 } })
  failed.data.title = 'Order On Hold'

  const cancelled = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2000, y: 420 } })
  cancelled.data.title = 'Order Cancelled'

  const edges = [
    { id: 'o1', source: start.id, target: trigger.id, type: 'smoothstep' },
    { id: 'o2', source: trigger.id, target: payment.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'o2b', source: trigger.id, target: failed.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'o3', source: payment.id, target: stock.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'o3b', source: payment.id, target: hold.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'o4', source: stock.id, target: shift.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'o4b', source: stock.id, target: cancel.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'o5', source: shift.id, target: shiftCheck.id, type: 'smoothstep' },
    { id: 'o6', source: shiftCheck.id, target: reserve.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 'o6b', source: shiftCheck.id, target: hold.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 'o7', source: reserve.id, target: pack.id, type: 'smoothstep' },
    { id: 'o8', source: pack.id, target: dispatch.id, type: 'smoothstep' },
    { id: 'o9', source: dispatch.id, target: done.id, type: 'smoothstep' },
    { id: 'o10', source: hold.id, target: failed.id, type: 'smoothstep' },
    { id: 'o11', source: cancel.id, target: cancelled.id, type: 'smoothstep' },
  ]

  return { nodes: [start, trigger, payment, stock, shift, shiftCheck, reserve, pack, dispatch, hold, cancel, done, failed, cancelled], edges }
}

export function createOrderProcessingTestCases(): ShopTestCase[] {
  const success = createDefaultShopState()
  success.order = {
    ...success.order,
    created: true,
    paymentConfirmed: true,
    status: 'created',
    assignedShift: 'unassigned',
    itemName: 'Gulab Jamun',
    quantity: 4,
    customerName: 'Asha',
    priority: 'express',
  }

  const paymentPending = createDefaultShopState()
  paymentPending.order = {
    ...paymentPending.order,
    created: true,
    paymentConfirmed: false,
    status: 'payment_failed',
    itemName: 'Jalebi',
    quantity: 3,
    customerName: 'Ravi',
  }

  const lowStock = createDefaultShopState()
  lowStock.items['Gulab Jamun'] = { name: 'Gulab Jamun', quantity: 1 }
  lowStock.order = {
    ...lowStock.order,
    created: true,
    paymentConfirmed: true,
    itemName: 'Gulab Jamun',
    quantity: 4,
    customerName: 'Meena',
  }

  const wrongItem = createDefaultShopState()
  wrongItem.order = {
    ...wrongItem.order,
    created: true,
    paymentConfirmed: true,
    itemName: 'Kaju Katli',
    quantity: 2,
    customerName: 'Sonal',
    priority: 'standard',
  }

  const noSelectedItem = createDefaultShopState()
  noSelectedItem.order = {
    ...noSelectedItem.order,
    created: true,
    paymentConfirmed: true,
    itemName: '',
    quantity: 2,
    customerName: 'Vikram',
    priority: 'standard',
  }

  return [
    {
      id: crypto.randomUUID(),
      name: 'Express order - completes successfully',
      expected: 'pass',
      shop: success,
    },
    {
      id: crypto.randomUUID(),
      name: 'Payment pending - hold order',
      expected: 'fail',
      shop: paymentPending,
    },
    {
      id: crypto.randomUUID(),
      name: 'Payment failed - trigger fail path',
      expected: 'fail',
      shop: paymentPending,
    },
    {
      id: crypto.randomUUID(),
      name: 'Low stock - hold order',
      expected: 'fail',
      shop: lowStock,
    },
    {
      id: crypto.randomUUID(),
      name: 'Wrong item selected - fail order',
      expected: 'fail',
      shop: wrongItem,
    },
    {
      id: crypto.randomUUID(),
      name: 'No selected item available - fail order',
      expected: 'fail',
      shop: noSelectedItem,
    },
  ]
}
