import type { ShopState } from './types'

export function createDefaultShopState(): ShopState {
  return {
    items: {
      'Gulab Jamun': { name: 'Gulab Jamun', quantity: 24 },
      'Jalebi': { name: 'Jalebi', quantity: 18 },
      'Rasgulla': { name: 'Rasgulla', quantity: 12 },
    },
    order: {
      orderId: 'ORD-1001',
      created: true,
      paymentConfirmed: false,
      packed: false,
      dispatched: false,
      status: 'created',
      assignedShift: 'unassigned',
      itemName: 'Gulab Jamun',
      quantity: 4,
      customerName: 'Walk-in Customer',
      priority: 'standard',
    },
  }
}
