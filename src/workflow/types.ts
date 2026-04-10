import type { Edge, Node, XYPosition } from 'reactflow'

export type NodeKind = 'start' | 'action' | 'condition' | 'end'

export type NodeConfig =
  | {
      functionId: string
      params?: Record<string, unknown>
    }
  | null

export type WorkflowNodeData = {
  title: string
  icon?: string
  kind: NodeKind
  config?: NodeConfig
}

export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>
export type WorkflowEdge = Edge

export type WorkflowState = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type NewNodeTemplate = {
  kind: NodeKind
  title: string
  icon?: string
}

export type CreateNodeArgs = {
  template: NewNodeTemplate
  position: XYPosition
}
