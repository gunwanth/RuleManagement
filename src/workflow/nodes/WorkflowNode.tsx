import { Handle, Position, type NodeProps } from 'reactflow'
import type { WorkflowNodeData } from '../types'
import './WorkflowNode.css'

const KIND_LABEL: Record<WorkflowNodeData['kind'], string> = {
  start: 'Start',
  action: 'Action',
  condition: 'Condition',
  end: 'End',
}

export function WorkflowNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const showTarget = data.kind !== 'start'
  const showSource = data.kind !== 'end'

  return (
    <div className={`wfNode ${selected ? 'wfNodeSelected' : ''}`}>
      {showTarget ? (
        <Handle type="target" position={Position.Left} className="wfHandle" />
      ) : null}
      {showSource ? (
        data.kind === 'condition' ? (
          <>
            <Handle
              id="true"
              type="source"
              position={Position.Right}
              className="wfHandle wfHandleTrue"
              style={{ top: '35%' }}
            />
            <Handle
              id="false"
              type="source"
              position={Position.Right}
              className="wfHandle wfHandleFalse"
              style={{ top: '65%' }}
            />
          </>
        ) : (
          <Handle type="source" position={Position.Right} className="wfHandle" />
        )
      ) : null}

      <div className="wfNodeTop">
        <div className={`wfIcon wfIcon_${data.kind}`}>
          <span aria-hidden="true">{data.icon ?? 'N'}</span>
        </div>
        <div className="wfTitleWrap">
          <div className="wfTitle" title={data.title}>
            {data.title}
          </div>
          <div className="wfMeta">
            <span className="wfKind">{KIND_LABEL[data.kind]}</span>
            {data.kind === 'condition' ? (
              <>
                <span className="wfBranch wfBranchTrue">TRUE</span>
                <span className="wfBranch wfBranchFalse">FALSE</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
