import type { RuleRecord } from './types'
import type { WorkflowState } from '../workflow/types'
import type { FunctionDef } from '../functions/types'

export function upsertRule(
  rules: RuleRecord[],
  next: {
    id: string
    name: string
    type: RuleRecord['type']
    workflow: WorkflowState
    functions: FunctionDef[]
    eligibilityTestCases?: RuleRecord['eligibilityTestCases']
    shopTestCases?: RuleRecord['shopTestCases']
  },
): RuleRecord[] {
  const record: RuleRecord = {
    id: next.id,
    name: next.name,
    type: next.type,
    workflow: next.workflow,
    functions: next.functions,
    eligibilityTestCases: next.eligibilityTestCases,
    shopTestCases: next.shopTestCases,
    updatedAt: new Date().toISOString(),
  }

  const idx = rules.findIndex((r) => r.id === next.id)
  if (idx === -1) return [record, ...rules]

  const copy = rules.slice()
  copy[idx] = record
  return [record, ...copy.filter((r) => r.id !== next.id)]
}

export function deleteRule(rules: RuleRecord[], id: string) {
  return rules.filter((r) => r.id !== id)
}
