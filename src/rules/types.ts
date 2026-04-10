import type { WorkflowState } from '../workflow/types'
import type { FunctionDef } from '../functions/types'
import type { ShopState } from '../shop/types'

export type RuleType = 'sweetshop' | 'eligibility' | 'order' | 'support' | 'blank'

export type EligibilityTestCase = {
  id: string
  name: string
  expected?: 'pass' | 'fail'
  targetNodeId?: string
  candidate: import('../eligibility/types').CandidateProfile
}

export type ShopTestCase = {
  id: string
  name: string
  expected?: 'pass' | 'fail'
  targetNodeId?: string
  shop: ShopState
}

export type RuleRecord = {
  id: string
  name: string
  type: RuleType
  workflow: WorkflowState
  functions: FunctionDef[]
  eligibilityTestCases?: EligibilityTestCase[]
  shopTestCases?: ShopTestCase[]
  updatedAt: string
}
