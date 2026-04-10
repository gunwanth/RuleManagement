export type StockItem = {
  name: string
  quantity: number
}

export type OrderShift = 'unassigned' | 'morning' | 'evening' | 'night'
export type OrderPriority = 'standard' | 'express'

export type OrderState = {
  orderId: string
  created: boolean
  paymentConfirmed: boolean
  packed: boolean
  dispatched: boolean
  status: string
  assignedShift: OrderShift
  itemName: string
  quantity: number
  customerName: string
  priority: OrderPriority
}

export type ShopState = {
  items: Record<string, StockItem>
  order: OrderState
}

export type ShopActionResult = {
  ok: true
  message: string
  next: ShopState
} | {
  ok: false
  message: string
  next: ShopState
}

export type ShopConditionResult = {
  ok: true
  message: string
  value: boolean
}
