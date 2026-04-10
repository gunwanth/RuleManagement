import './TopNav.css'

export type TopNavPage = 'dashboard' | 'rules' | 'flowlab'

export function TopNav({
  page,
  onNavigate,
  onCreateNewRule,
}: {
  page: TopNavPage
  onNavigate: (page: TopNavPage) => void
  onCreateNewRule: () => void
}) {
  return (
    <header className="navRoot">
      <div className="navLeft">
        <div className="navBrand">
          <span className="navBrandIcon" aria-hidden="true">
            SS
          </span>
          <span className="navBrandText">Rule Intelligence Platform</span>
        </div>

        <nav className="navTabs" aria-label="Primary">
          <button
            className={`navTab ${page === 'dashboard' ? 'navTabActive' : ''}`}
            onClick={() => onNavigate('dashboard')}
            type="button"
          >
            Dashboard
          </button>
          <button
            className={`navTab ${page === 'rules' ? 'navTabActive' : ''}`}
            onClick={() => onNavigate('rules')}
            type="button"
          >
            Rule Management
          </button>
          <button
            className={`navTab ${page === 'flowlab' ? 'navTabActive' : ''}`}
            onClick={() => onNavigate('flowlab')}
            type="button"
          >
            Flow Lab
          </button>
        </nav>
      </div>

      <div className="navRight">
        <button className="btn btnPrimary" onClick={onCreateNewRule} type="button">
          Create New Rule
        </button>
      </div>
    </header>
  )
}
