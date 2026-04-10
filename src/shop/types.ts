export type StockItem = {
  name: string
  quantity: number
}

export type OrderShift = 'unassigned' | 'morning' | 'evening' | 'night'
export type OrderPriority = 'standard' | 'express'
export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent'
export type SupportStateStatus =
  | 'new'
  | 'open'
  | 'undergoing'
  | 'pending_customer'
  | 'resolved'
  | 'revoked'
  | 'stable'

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

export type SupportState = {
  ticketId: string
  customerName: string
  issueType: string
  priority: SupportPriority
  state: SupportStateStatus
  raised: boolean
  solved: boolean
  revoked: boolean
  stable: boolean
  ticketsRaised: number
  solvedTickets: number
  revokedTickets: number
  stableTickets: number
  undergoingTickets: number
}

export type ShopState = {
  items: Record<string, StockItem>
  order: OrderState
  support: SupportState
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
