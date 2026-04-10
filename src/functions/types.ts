export type FunctionKind = 'action' | 'condition'

export type FunctionParamType = 'string' | 'number' | 'boolean'

export type FunctionParamDef = {
  key: string
  label: string
  type: FunctionParamType
  required?: boolean
  placeholder?: string
}

export type FunctionDef = {
  id: string
  kind: FunctionKind
  name: string
  description?: string
  icon?: string
  params: FunctionParamDef[]
  operationName?: string
  operation:
    | 'buy_sweet'
    | 'add_stock'
    | 'delete_sweet'
    | 'view_stocks'
    | 'stock_below'
    | 'stock_above_or_equal'
    | 'order_is_created'
    | 'payment_is_confirmed'
    | 'order_stock_available'
    | 'shift_is'
    | 'order_is_packed'
    | 'order_priority_is'
    | 'create_order'
    | 'confirm_payment'
    | 'assign_shift'
    | 'reserve_stock'
    | 'pack_order'
    | 'dispatch_order'
    | 'update_order_status'
    | 'ticket_is_raised'
    | 'support_state_is'
    | 'raised_tickets_at_least'
    | 'undergoing_tickets_at_least'
    | 'solved_tickets_at_least'
    | 'revoked_tickets_at_least'
    | 'stable_tickets_at_least'
    | 'raise_ticket'
    | 'mark_ticket_undergoing'
    | 'resolve_ticket'
    | 'revoke_ticket'
    | 'stabilize_ticket'
    | 'update_support_state'
    | 'candidate_is_experienced'
    | 'candidate_stream_is'
    | 'candidate_exp_at_least'
    | 'candidate_react_projects_at_least'
    | 'candidate_degree_is'
    | 'candidate_cgpa_at_least'
    | 'candidate_has_skill'
}
