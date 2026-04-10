import type { WorkflowState } from './types'

export function createBlankWorkflow(): WorkflowState {
  return { nodes: [], edges: [] }
}
