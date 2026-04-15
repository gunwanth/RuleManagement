import './Sidebar.css'
import { BrainCircuit, Database, ListFilter } from 'lucide-react'

export type SidebarPage = 'dashboard' | 'rules' | 'builder' | 'flowlab' | 'analytics' | 'activity' | 'settings' | 'agent' | 'ml-hub' | 'model-analytics'

export function Sidebar({
  page,
  onNavigate,
}: {
  page: SidebarPage
  onNavigate: (page: SidebarPage) => void
  onCreateNewRule: () => void
}) {
  const menuItems: { id: SidebarPage; label: string; icon?: any }[] = [
    { id: 'agent', icon: BrainCircuit, label: 'Agent Studio' },
    { id: 'ml-hub', icon: Database, label: 'ML & Datasets' },
    { id: 'rules', icon: ListFilter, label: 'Rule Directory' },
    { id: 'builder', label: 'Rule Builder' },
    { id: 'flowlab', label: 'Simulation Lab' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'activity', label: 'History' },
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
