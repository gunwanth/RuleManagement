import type { FunctionDef } from '../functions/types'
import type { ShopTestCase } from './types'
import type { WorkflowState } from '../workflow/types'
import { NODE_TEMPLATES, createWorkflowNode } from '../workflow/nodeFactory'
import { createDefaultShopState } from '../shop/defaultState'

export function createSupportSeedFunctions(): FunctionDef[] {
  return [
    {
      id: 'support:ticket_raised',
      kind: 'condition',
      name: 'Ticket Raised?',
      description: 'Checks whether a support ticket has been raised.',
      operationName: 'ticket_raised',
      operation: 'ticket_is_raised',
      params: [],
    },
    {
      id: 'support:state_is_open',
      kind: 'condition',
      name: 'Support State Is',
      description: 'Checks the current support state.',
      operationName: 'support_state_is',
      operation: 'support_state_is',
      params: [{ key: 'state', label: 'State', type: 'string', required: true, placeholder: 'open' }],
    },
    {
      id: 'support:undergoing_threshold',
      kind: 'condition',
      name: 'Undergoing Tickets Healthy?',
      description: 'Checks if undergoing tickets are above the expected operating threshold.',
      operationName: 'undergoing_tickets_at_least',
      operation: 'undergoing_tickets_at_least',
      params: [{ key: 'count', label: 'Minimum count', type: 'number', required: true, placeholder: '1' }],
    },
    {
      id: 'support:stable_threshold',
      kind: 'condition',
      name: 'Stable Tickets Healthy?',
      description: 'Checks if stable tickets have reached the target count.',
      operationName: 'stable_tickets_at_least',
      operation: 'stable_tickets_at_least',
      params: [{ key: 'count', label: 'Minimum count', type: 'number', required: true, placeholder: '8' }],
    },
    {
      id: 'support:raise',
      kind: 'action',
      name: 'Raise Ticket',
      description: 'Creates a CRM/support ticket entry.',
      operationName: 'raise_ticket',
      operation: 'raise_ticket',
      params: [
        { key: 'ticketId', label: 'Ticket ID', type: 'string', required: true, placeholder: 'TCK-1001' },
        { key: 'customerName', label: 'Customer', type: 'string', required: true, placeholder: 'Anita' },
        { key: 'issueType', label: 'Issue type', type: 'string', required: true, placeholder: 'login_issue' },
        { key: 'priority', label: 'Priority', type: 'string', required: true, placeholder: 'normal' },
      ],
    },
    {
      id: 'support:mark_undergoing',
      kind: 'action',
      name: 'Mark Undergoing',
      description: 'Moves a ticket into active support handling.',
      operationName: 'mark_ticket_undergoing',
      operation: 'mark_ticket_undergoing',
      params: [],
    },
    {
      id: 'support:resolve',
      kind: 'action',
      name: 'Resolve Ticket',
      description: 'Marks the ticket as solved.',
      operationName: 'resolve_ticket',
      operation: 'resolve_ticket',
      params: [],
    },
    {
      id: 'support:stabilize',
      kind: 'action',
      name: 'Mark Stable',
      description: 'Marks the solved ticket as stable after follow-up.',
      operationName: 'stabilize_ticket',
      operation: 'stabilize_ticket',
      params: [],
    },
    {
      id: 'support:revoke',
      kind: 'action',
      name: 'Revoke Ticket',
      description: 'Revokes the ticket when the request is invalid or withdrawn.',
      operationName: 'revoke_ticket',
      operation: 'revoke_ticket',
      params: [],
    },
    {
      id: 'support:update_state',
      kind: 'action',
      name: 'Update Support State',
      description: 'Moves the support state to a specific value.',
      operationName: 'update_support_state',
      operation: 'update_support_state',
      params: [{ key: 'state', label: 'State', type: 'string', required: true, placeholder: 'pending_customer' }],
    },
  ]
}

export function createSupportSeedWorkflow(): WorkflowState {
  const start = createWorkflowNode({ template: NODE_TEMPLATES.start, position: { x: 80, y: 180 } })

  const raised = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 320, y: 180 } })
  raised.data.title = 'Ticket Raised?'
  raised.data.config = { functionId: 'support:ticket_raised', params: {} }

  const openState = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 600, y: 180 } })
  openState.data.title = 'State Is Open'
  openState.data.config = { functionId: 'support:state_is_open', params: { state: 'open' } }

  const undergoing = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 880, y: 180 } })
  undergoing.data.title = 'Mark Undergoing'
  undergoing.data.config = { functionId: 'support:mark_undergoing', params: {} }

  const activeLoad = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 1160, y: 180 } })
  activeLoad.data.title = 'Undergoing Tickets Healthy?'
  activeLoad.data.config = { functionId: 'support:undergoing_threshold', params: { count: 1 } }

  const resolve = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1440, y: 120 } })
  resolve.data.title = 'Resolve Ticket'
  resolve.data.config = { functionId: 'support:resolve', params: {} }

  const stabilize = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1720, y: 120 } })
  stabilize.data.title = 'Mark Stable'
  stabilize.data.config = { functionId: 'support:stabilize', params: {} }

  const stableCheck = createWorkflowNode({ template: NODE_TEMPLATES.condition, position: { x: 2000, y: 120 } })
  stableCheck.data.title = 'Stable Tickets Healthy?'
  stableCheck.data.config = { functionId: 'support:stable_threshold', params: { count: 8 } }

  const pending = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1440, y: 280 } })
  pending.data.title = 'Pending Customer'
  pending.data.config = { functionId: 'support:update_state', params: { state: 'pending_customer' } }

  const revoke = createWorkflowNode({ template: NODE_TEMPLATES.action, position: { x: 1720, y: 320 } })
  revoke.data.title = 'Revoke Ticket'
  revoke.data.config = { functionId: 'support:revoke', params: {} }

  const stableDone = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2280, y: 120 } })
  stableDone.data.title = 'Support Stable (Success)'

  const manualFollowup = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2000, y: 280 } })
  manualFollowup.data.title = 'Follow-up Needed (Hold)'

  const revoked = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 2000, y: 420 } })
  revoked.data.title = 'Ticket Revoked (Reject)'

  const noTicket = createWorkflowNode({ template: NODE_TEMPLATES.end, position: { x: 600, y: 360 } })
  noTicket.data.title = 'No Ticket Raised (Fail)'

  const edges = [
    { id: 's1', source: start.id, target: raised.id, type: 'smoothstep' },
    { id: 's2', source: raised.id, target: openState.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 's2b', source: raised.id, target: noTicket.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 's3', source: openState.id, target: undergoing.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 's3b', source: openState.id, target: pending.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 's4', source: undergoing.id, target: activeLoad.id, type: 'smoothstep' },
    { id: 's5', source: activeLoad.id, target: resolve.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 's5b', source: activeLoad.id, target: revoke.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 's6', source: resolve.id, target: stabilize.id, type: 'smoothstep' },
    { id: 's7', source: stabilize.id, target: stableCheck.id, type: 'smoothstep' },
    { id: 's8', source: stableCheck.id, target: stableDone.id, sourceHandle: 'true', type: 'smoothstep' },
    { id: 's8b', source: stableCheck.id, target: manualFollowup.id, sourceHandle: 'false', type: 'smoothstep' },
    { id: 's9', source: pending.id, target: manualFollowup.id, type: 'smoothstep' },
    { id: 's10', source: revoke.id, target: revoked.id, type: 'smoothstep' },
  ]

  return {
    nodes: [start, raised, openState, undergoing, activeLoad, resolve, stabilize, stableCheck, pending, revoke, stableDone, manualFollowup, revoked, noTicket],
    edges,
  }
}

export function createSupportTestCases(): ShopTestCase[] {
  const stable = createDefaultShopState()
  stable.support = {
    ...stable.support,
    ticketId: 'TCK-2001',
    customerName: 'Asha',
    issueType: 'billing_mismatch',
    priority: 'high',
    state: 'open',
    raised: true,
    solved: false,
    revoked: false,
    stable: false,
    ticketsRaised: 15,
    solvedTickets: 9,
    revokedTickets: 1,
    stableTickets: 7,
    undergoingTickets: 1,
  }

  const noTicket = createDefaultShopState()
  noTicket.support = {
    ...noTicket.support,
    ticketId: 'TCK-2002',
    raised: false,
    state: 'new',
    solved: false,
    revoked: false,
    stable: false,
    undergoingTickets: 0,
  }

  const pendingCustomer = createDefaultShopState()
  pendingCustomer.support = {
    ...pendingCustomer.support,
    ticketId: 'TCK-2003',
    customerName: 'Meera',
    issueType: 'kyc_pending',
    priority: 'normal',
    state: 'pending_customer',
    raised: true,
    solved: false,
    revoked: false,
    stable: false,
    ticketsRaised: 11,
    solvedTickets: 5,
    revokedTickets: 1,
    stableTickets: 4,
    undergoingTickets: 0,
  }

  const overloaded = createDefaultShopState()
  overloaded.support = {
    ...overloaded.support,
    ticketId: 'TCK-2004',
    customerName: 'Rohan',
    issueType: 'refund_delay',
    priority: 'urgent',
    state: 'open',
    raised: true,
    solved: false,
    revoked: false,
    stable: false,
    ticketsRaised: 18,
    solvedTickets: 10,
    revokedTickets: 2,
    stableTickets: 6,
    undergoingTickets: 0,
  }

  const revoked = createDefaultShopState()
  revoked.support = {
    ...revoked.support,
    ticketId: 'TCK-2005',
    customerName: 'Nisha',
    issueType: 'duplicate_ticket',
    priority: 'low',
    state: 'open',
    raised: true,
    solved: false,
    revoked: false,
    stable: false,
    ticketsRaised: 10,
    solvedTickets: 8,
    revokedTickets: 2,
    stableTickets: 7,
    undergoingTickets: 0,
  }

  return [
    { id: crypto.randomUUID(), name: 'Raised ticket - resolve to stable', expected: 'pass', shop: stable },
    { id: crypto.randomUUID(), name: 'No raised ticket - fail fast', expected: 'fail', shop: noTicket },
    { id: crypto.randomUUID(), name: 'Pending customer response - follow up', expected: 'fail', shop: pendingCustomer },
    { id: crypto.randomUUID(), name: 'Undergoing volume too low - revoke', expected: 'fail', shop: overloaded },
    { id: crypto.randomUUID(), name: 'Invalid request - revoke ticket', expected: 'fail', shop: revoked },
  ]
}
