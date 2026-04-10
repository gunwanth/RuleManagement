import type { NodeConfig, WorkflowNode } from './types'
import type { CreateNodeArgs, NewNodeTemplate } from './types'

export const NODE_TEMPLATES: Record<string, NewNodeTemplate> = {
  start: { kind: 'start', title: 'Start' },
  end: { kind: 'end', title: 'End' },
  action: { kind: 'action', title: 'Action' },
  condition: { kind: 'condition', title: 'Condition' },
}

export function createWorkflowNode({ template, position }: CreateNodeArgs) {
  const config: NodeConfig =
    template.kind === 'action' || template.kind === 'condition'
      ? { functionId: '', params: {} }
      : null

  const node: WorkflowNode = {
    id: crypto.randomUUID(),
    type: 'workflow',
    position,
    data: {
      kind: template.kind,
      title: template.title,
      icon: template.icon,
      config,
    },
  }
  return node
}

export function inferTemplateFromDragPayload(payload: string | undefined) {
  if (!payload) return null
  const template = NODE_TEMPLATES[payload]
  return template ?? null
}
