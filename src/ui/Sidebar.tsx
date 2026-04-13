import './Sidebar.css'

export type SidebarPage = 'dashboard' | 'builder' | 'simulation' | 'analytics' | 'templates' | 'history' | 'settings'

export function Sidebar({
  page,
  onNavigate,
}: {
  page: SidebarPage
  onNavigate: (page: SidebarPage) => void
  onCreateNewRule: () => void
}) {
  const menuItems: { id: SidebarPage; label: string; icon?: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'builder', label: 'Rule Builder' },
    { id: 'simulation', label: 'Simulation Lab' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'templates', label: 'Templates' },
    { id: 'history', label: 'History' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <aside className="sidebarRoot">
      <div className="sidebarBrand">
        <span className="sidebarBrandText">RuleIntelligence</span>
      </div>

      <nav className="sidebarNav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebarNavItem ${page === item.id ? 'sidebarNavItemActive' : ''}`}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebarFooter">
        <div className="sidebarUser">
          <div className="sidebarUserAvatar" />
          <div className="sidebarUserInfo">
            <div className="sidebarUserName">Admin User</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
