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

  return { ok: true, value: false, message: `Unsupported condition: ${fn.operation}` }
}

function nextBool(value: boolean) {
  return !!value
}
