import type { FunctionDef } from '../functions/types'
import type { ShopActionResult, ShopConditionResult, ShopState } from './types'

function toNumber(v: unknown, fallback: number) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function toString(v: unknown, fallback: string) {
  return typeof v === 'string' && v.trim().length ? v : fallback
}

function clone(state: ShopState): ShopState {
  return {
    items: Object.fromEntries(
      Object.entries(state.items).map(([name, item]) => [name, { ...item }]),
    ),
    order: { ...state.order },
    support: { ...state.support },
  }
}

export function applyAction(
  state: ShopState,
  fn: FunctionDef,
  params: Record<string, unknown> | undefined,
): ShopActionResult {
  const next = clone(state)

  if (fn.operation === 'view_stocks') {
    const lines = Object.values(next.items)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((i) => `${i.name}: ${i.quantity}`)
    return { ok: true, message: lines.length ? lines.join(', ') : 'No stock items', next }
  }

  if (fn.operation === 'delete_sweet') {
    const sweetName = toString(params?.sweetName, '')
    if (!sweetName) return { ok: false, message: 'Sweet name is required', next }
    if (!next.items[sweetName]) return { ok: false, message: `No such sweet: ${sweetName}`, next }
    delete next.items[sweetName]
    return { ok: true, message: `Deleted ${sweetName}`, next }
  }

  if (fn.operation === 'add_stock') {
    const sweetName = toString(params?.sweetName, '')
    const quantity = Math.max(0, Math.floor(toNumber(params?.quantity, 0)))
    if (!sweetName) return { ok: false, message: 'Sweet name is required', next }
    if (quantity <= 0) return { ok: false, message: 'Quantity must be > 0', next }
    const existing = next.items[sweetName]
    next.items[sweetName] = existing
      ? { ...existing, quantity: existing.quantity + quantity }
      : { name: sweetName, quantity }
    return { ok: true, message: `Added ${quantity} to ${sweetName}`, next }
  }

  if (fn.operation === 'buy_sweet') {
    const sweetName = toString(params?.sweetName, '')
    const quantity = Math.max(0, Math.floor(toNumber(params?.quantity, 1)))
    if (!sweetName) return { ok: false, message: 'Sweet name is required', next }
    if (quantity <= 0) return { ok: false, message: 'Quantity must be > 0', next }

    const existing = next.items[sweetName]
    if (!existing) return { ok: false, message: `Out of stock: ${sweetName}`, next }

    const newQty = existing.quantity - quantity
    if (newQty <= 0) {
      delete next.items[sweetName]
      return { ok: true, message: `Bought ${quantity} ${sweetName} (removed from stock)`, next }
    }

    next.items[sweetName] = { ...existing, quantity: newQty }
    return { ok: true, message: `Bought ${quantity} ${sweetName} (remaining ${newQty})`, next }
  }

  if (fn.operation === 'create_order') {
    next.order = {
      ...next.order,
      created: true,
      status: 'created',
      itemName: next.order.itemName || toString(params?.itemName, next.order.itemName),
      quantity: Math.max(1, Math.floor(toNumber(next.order.quantity, toNumber(params?.quantity, next.order.quantity)))),
      customerName: next.order.customerName || toString(params?.customerName, next.order.customerName),
      priority: (next.order.priority || toString(params?.priority, next.order.priority)) === 'express' ? 'express' : 'standard',
    }
    return { ok: true, message: `Created order ${next.order.orderId}`, next }
  }

  if (fn.operation === 'confirm_payment') {
    next.order.paymentConfirmed = true
    next.order.status = 'payment_confirmed'
    return { ok: true, message: 'Payment confirmed', next }
  }

  if (fn.operation === 'assign_shift') {
    const shift = toString(params?.shift, 'unassigned')
    next.order.assignedShift =
      shift === 'morning' || shift === 'evening' || shift === 'night'
        ? shift
        : 'unassigned'
    next.order.status = next.order.assignedShift === 'unassigned' ? next.order.status : 'shift_assigned'
    return { ok: next.order.assignedShift !== 'unassigned', message: `Shift assigned: ${next.order.assignedShift}`, next }
  }

  if (fn.operation === 'reserve_stock') {
    const itemName = next.order.itemName || toString(params?.itemName, '')
    const quantity = Math.max(1, Math.floor(toNumber(next.order.quantity, toNumber(params?.quantity, next.order.quantity))))
    const existing = next.items[itemName]
    if (!existing || existing.quantity < quantity) {
      return { ok: false, message: `Insufficient stock for ${itemName}`, next }
    }
    next.items[itemName] = { ...existing, quantity: existing.quantity - quantity }
    next.order.itemName = itemName
    next.order.quantity = quantity
    next.order.status = 'stock_reserved'
    return { ok: true, message: `Reserved ${quantity} ${itemName}`, next }
  }

  if (fn.operation === 'pack_order') {
    if (!next.order.paymentConfirmed) {
      return { ok: false, message: 'Cannot pack before payment confirmation', next }
    }
    next.order.packed = true
    next.order.status = 'packed'
    return { ok: true, message: 'Order packed', next }
  }

  if (fn.operation === 'dispatch_order') {
    if (!next.order.packed) {
      return { ok: false, message: 'Cannot dispatch before packing', next }
    }
    next.order.dispatched = true
    next.order.status = 'dispatched'
    return { ok: true, message: 'Order dispatched', next }
  }

  if (fn.operation === 'update_order_status') {
    const status = toString(params?.status, next.order.status)
    next.order.status = status
    return { ok: true, message: `Order status updated to ${status}`, next }
  }

  if (fn.operation === 'raise_ticket') {
    const ticketId = toString(params?.ticketId, next.support.ticketId || 'TCK-NEW')
    const customerName = toString(params?.customerName, next.support.customerName || 'Customer')
    const issueType = toString(params?.issueType, next.support.issueType || 'support_request')
    const priority = toString(params?.priority, next.support.priority)
    const wasRaised = next.support.raised

    next.support = {
      ...next.support,
      ticketId,
      customerName,
      issueType,
      priority:
        priority === 'low' || priority === 'high' || priority === 'urgent' ? priority : 'normal',
      state: 'open',
      raised: true,
      solved: false,
      revoked: false,
      stable: false,
      ticketsRaised: next.support.ticketsRaised + (wasRaised ? 0 : 1),
    }
    return { ok: true, message: `Raised ticket ${ticketId}`, next }
  }

  if (fn.operation === 'mark_ticket_undergoing') {
    if (!next.support.raised) {
      return { ok: false, message: 'Cannot mark undergoing before ticket is raised', next }
    }

    const wasUndergoing = next.support.state === 'undergoing'
    next.support = {
      ...next.support,
      state: 'undergoing',
      undergoingTickets: next.support.undergoingTickets + (wasUndergoing ? 0 : 1),
    }
    return { ok: true, message: 'Ticket moved to undergoing state', next }
  }

  if (fn.operation === 'resolve_ticket') {
    if (!next.support.raised) {
      return { ok: false, message: 'Cannot resolve before ticket is raised', next }
    }

    const wasSolved = next.support.solved
    const nextUndergoing =
      next.support.state === 'undergoing'
        ? Math.max(0, next.support.undergoingTickets - 1)
        : next.support.undergoingTickets

    next.support = {
      ...next.support,
      state: 'resolved',
      solved: true,
      revoked: false,
      stable: false,
      undergoingTickets: nextUndergoing,
      solvedTickets: next.support.solvedTickets + (wasSolved ? 0 : 1),
    }
    return { ok: true, message: `Resolved ticket ${next.support.ticketId}`, next }
  }

  if (fn.operation === 'revoke_ticket') {
    if (!next.support.raised) {
      return { ok: false, message: 'Cannot revoke before ticket is raised', next }
    }

    const wasRevoked = next.support.revoked
    const nextUndergoing =
      next.support.state === 'undergoing'
        ? Math.max(0, next.support.undergoingTickets - 1)
        : next.support.undergoingTickets

    next.support = {
      ...next.support,
      state: 'revoked',
      revoked: true,
      solved: false,
      stable: false,
      undergoingTickets: nextUndergoing,
      revokedTickets: next.support.revokedTickets + (wasRevoked ? 0 : 1),
    }
    return { ok: true, message: `Revoked ticket ${next.support.ticketId}`, next }
  }

  if (fn.operation === 'stabilize_ticket') {
    if (!next.support.solved) {
      return { ok: false, message: 'Cannot stabilize before ticket is solved', next }
    }

    const wasStable = next.support.stable
    next.support = {
      ...next.support,
      state: 'stable',
      stable: true,
      stableTickets: next.support.stableTickets + (wasStable ? 0 : 1),
    }
    return { ok: true, message: `Ticket ${next.support.ticketId} marked stable`, next }
  }

  if (fn.operation === 'update_support_state') {
    const state = toString(params?.state, next.support.state)
    const allowed = ['new', 'open', 'undergoing', 'pending_customer', 'resolved', 'revoked', 'stable']
    const nextState = allowed.includes(state) ? state : next.support.state
    next.support.state = nextState as ShopState['support']['state']
    return { ok: true, message: `Support state updated to ${nextState}`, next }
  }

  return { ok: false, message: `Unsupported action: ${fn.operation}`, next }
}

export function evaluateCondition(
  state: ShopState,
  fn: FunctionDef,
  params: Record<string, unknown> | undefined,
): ShopConditionResult {
  if (fn.operation === 'stock_below' || fn.operation === 'stock_above_or_equal') {
    const sweetName = toString(params?.sweetName, '')
    const threshold = Math.max(0, Math.floor(toNumber(params?.threshold, 0)))
    const qty = sweetName && state.items[sweetName] ? state.items[sweetName].quantity : 0

    const value =
      fn.operation === 'stock_below' ? qty < threshold : qty >= threshold
    const compare = fn.operation === 'stock_below' ? '<' : '>='
    return {
      ok: true,
      value,
      message: `${sweetName || '(missing sweet)'} stock ${qty} ${compare} ${threshold} → ${value ? 'TRUE' : 'FALSE'}`,
    }
  }

  if (fn.operation === 'order_is_created') {
    return { ok: true, value: nextBool(state.order.created), message: `Order created -> ${state.order.created}` }
  }

  if (fn.operation === 'payment_is_confirmed') {
    return {
      ok: true,
      value: nextBool(state.order.paymentConfirmed),
      message: state.order.paymentConfirmed
        ? 'Payment confirmed -> true'
        : `Payment failed or pending -> false${state.order.status ? ` (${state.order.status})` : ''}`,
    }
  }

  if (fn.operation === 'order_stock_available') {
    const itemName = state.order.itemName || toString(params?.itemName, '')
    if (!itemName.trim()) {
      return {
        ok: true,
        value: false,
        message: 'No selected item available -> false',
      }
    }
    const quantity = Math.max(1, Math.floor(toNumber(state.order.quantity, toNumber(params?.quantity, state.order.quantity))))
    const available = (state.items[itemName]?.quantity ?? 0) >= quantity
    return {
      ok: true,
      value: available,
      message: !state.items[itemName]
        ? `Wrong item selected: ${itemName} -> false`
        : `${itemName} stock ${(state.items[itemName]?.quantity ?? 0)} >= ${quantity} -> ${available}`,
    }
  }

  if (fn.operation === 'shift_is') {
    const shift = toString(params?.shift, 'unassigned')
    const value = state.order.assignedShift === shift
    return { ok: true, value, message: `Shift ${state.order.assignedShift} is ${shift} -> ${value}` }
  }

  if (fn.operation === 'order_is_packed') {
    return { ok: true, value: nextBool(state.order.packed), message: `Order packed -> ${state.order.packed}` }
  }

  if (fn.operation === 'order_priority_is') {
    const priority = toString(params?.priority, 'standard')
    const value = state.order.priority === priority
    return { ok: true, value, message: `Priority ${state.order.priority} is ${priority} -> ${value}` }
  }

  if (fn.operation === 'ticket_is_raised') {
    return { ok: true, value: nextBool(state.support.raised), message: `Ticket raised -> ${state.support.raised}` }
  }

  if (fn.operation === 'support_state_is') {
    const expected = toString(params?.state, 'open')
    const value = state.support.state === expected
    return { ok: true, value, message: `Support state ${state.support.state} is ${expected} -> ${value}` }
  }

  if (fn.operation === 'raised_tickets_at_least') {
    const min = Math.max(0, Math.floor(toNumber(params?.count, 0)))
    const value = state.support.ticketsRaised >= min
    return { ok: true, value, message: `Raised tickets ${state.support.ticketsRaised} >= ${min} -> ${value}` }
  }

  if (fn.operation === 'undergoing_tickets_at_least') {
    const min = Math.max(0, Math.floor(toNumber(params?.count, 0)))
    const value = state.support.undergoingTickets >= min
    return { ok: true, value, message: `Undergoing tickets ${state.support.undergoingTickets} >= ${min} -> ${value}` }
  }

  if (fn.operation === 'solved_tickets_at_least') {
    const min = Math.max(0, Math.floor(toNumber(params?.count, 0)))
    const value = state.support.solvedTickets >= min
    return { ok: true, value, message: `Solved tickets ${state.support.solvedTickets} >= ${min} -> ${value}` }
  }

  if (fn.operation === 'revoked_tickets_at_least') {
    const min = Math.max(0, Math.floor(toNumber(params?.count, 0)))
    const value = state.support.revokedTickets >= min
    return { ok: true, value, message: `Revoked tickets ${state.support.revokedTickets} >= ${min} -> ${value}` }
  }

  if (fn.operation === 'stable_tickets_at_least') {
    const min = Math.max(0, Math.floor(toNumber(params?.count, 0)))
    const value = state.support.stableTickets >= min
    return { ok: true, value, message: `Stable tickets ${state.support.stableTickets} >= ${min} -> ${value}` }
  }

  return { ok: true, value: false, message: `Unsupported condition: ${fn.operation}` }
}

function nextBool(value: boolean) {
  return !!value
}
