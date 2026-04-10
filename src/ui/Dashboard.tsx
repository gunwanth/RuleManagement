import './Dashboard.css'
import type { RuleRecord } from '../rules/types'
import type { WorkflowNodeData } from '../workflow/types'

type DashboardProps = {
  onOpenExampleRule: () => void
  rules: RuleRecord[]
  onOpenRule: (id: string) => void
  onDeleteRule: (id: string) => void
}

export function Dashboard({
  onOpenExampleRule,
  rules,
  onOpenRule,
  onDeleteRule,
}: DashboardProps) {
  return (
    <div className="dashRoot">
      <header className="dashHeader">
        <div className="dashHeaderLeft">
            <div className="dashTitleRow">
              <div className="dashLogo" aria-hidden="true">
              SS
              </div>
              <div>
                <div className="dashTitle">Sweet Shop Management</div>
                <div className="dashSubtitle">
                  Build automation rules with a Figma-style workflow canvas.
                </div>
              </div>
            </div>
        </div>
      </header>

      <main className="dashMain">
        <section className="dashHero">
          <div className="dashHeroCard">
            <div className="dashHeroTop">
              <div className="dashHeroHeading">Design rules visually</div>
              <div className="badge">Pan · Zoom · Connect · Drag</div>
            </div>
            <p className="dashHeroText">
              Example rule: <strong>Start</strong> → <strong>Buy Sweet</strong>{' '}
              → <strong>Check Stock</strong> → <strong>Update Stock</strong> →{' '}
              <strong>End</strong>
            </p>

            <div className="dashPreview">
              <div className="dashPreviewNode">
                <span className="dashPreviewIcon">S</span> Start
              </div>
              <div className="dashPreviewArrow" aria-hidden="true">
                →
              </div>
              <div className="dashPreviewNode">
                <span className="dashPreviewIcon">A</span> Buy Sweet
              </div>
              <div className="dashPreviewArrow" aria-hidden="true">
                →
              </div>
              <div className="dashPreviewNode">
                <span className="dashPreviewIcon">C</span> Check Stock
              </div>
              <div className="dashPreviewArrow" aria-hidden="true">
                →
              </div>
              <div className="dashPreviewNode">
                <span className="dashPreviewIcon">A</span> Update Stock
              </div>
              <div className="dashPreviewArrow" aria-hidden="true">
                →
              </div>
              <div className="dashPreviewNode">
                <span className="dashPreviewIcon">E</span> End
              </div>
            </div>

            <div className="dashHeroActions">
              <button className="btn" onClick={onOpenExampleRule}>
                Open Example
              </button>
              <div className="dashHint">
                Tip: press <span className="dashKbd">Delete</span> to remove a
                selected node.
              </div>
            </div>
          </div>

          <div className="dashSideCard">
            <div className="dashSideTitle">Your Rules</div>
            {rules.length ? (
              <div className="ruleList">
                {rules.slice(0, 8).map((r) => (
                  <div key={r.id} className="ruleItem">
                    <div className="ruleMain">
                      <div className="ruleName">{r.name}</div>
                      <div className="ruleMeta">
                        {(() => {
                          const nodeCount = r.workflow.nodes.length
                          const fnIds = new Set(
                            r.workflow.nodes
                              .map((n) => (n.data as WorkflowNodeData).config?.functionId)
                              .filter((id): id is string => typeof id === 'string' && id.length > 0),
                          )
                          return (
                            <>
                              {nodeCount} nodes · {fnIds.size} functions · Updated{' '}
                              {new Date(r.updatedAt).toLocaleString()}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="ruleActions">
                      <button className="btn" onClick={() => onOpenRule(r.id)}>
                        Open
                      </button>
                      <button
                        className="btn btnDanger"
                        onClick={() => onDeleteRule(r.id)}
                        title="Delete rule"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sideEmpty">
                No saved rules yet. Create a new rule to start building.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
