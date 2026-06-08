import { FiBookmark } from 'react-icons/fi'
import { BookmarkSidebar } from './BookmarkSidebar.jsx'

export function DashboardChrome({ children, routePage, onRefresh, onNewWidget, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
  const menuItems = [
    { label: 'Home', page: 'home', href: '#/' },
    { label: 'Insights', page: 'insights', href: '#/insights' },
    { label: 'Automation', page: 'automation', href: '#/automation' },
    { label: 'Network', page: 'network', href: '#/network' },
    { label: 'Security', page: 'security', href: '#/security' },
  ]
  const topTabs = [
    { label: 'Home', page: 'home', href: '#/' },
    { label: 'Insights', page: 'insights', href: '#/insights' },
    { label: 'Automation', page: 'automation', href: '#/automation' },
  ]

  return (
    <div className={`dashboard-shell${isBookmarkSidebarOpen ? ' bookmark-sidebar-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand-block">
          <p className="brand-title">JR's Dashboard</p>
          <p className="brand-subtitle">System Admin</p>
          <p className="brand-mode">Precision Mode</p>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {menuItems.map((item) => {
            const isFeed = routePage === 'feed' && item.page === 'insights'
            const active = routePage === item.page || isFeed

            return (
              <a key={item.page} className={`side-nav-item${active ? ' active' : ''}`} href={item.href}>
                <span className="dot" aria-hidden="true" />
                {item.label}
              </a>
            )
          })}
        </nav>

        <button className="widget-button" type="button" onClick={onNewWidget}>
          + New Widget
        </button>

        <div className="side-foot">
          <a href="#/support">Support</a>
          <a href="#/logout">Log out</a>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <nav className="top-tabs" aria-label="Sections">
            {topTabs.map((tab) => {
              const isFeed = routePage === 'feed' && tab.page === 'insights'
              const active = routePage === tab.page || isFeed

              return (
                <a className={active ? 'active' : ''} href={tab.href} key={tab.page}>
                  {tab.label}
                </a>
              )
            })}
          </nav>
          <div className="top-actions">
            <button className="bookmark-launcher" type="button" onClick={onToggleBookmarkSidebar}>
              <FiBookmark aria-hidden="true" />
              Bookmarks
            </button>
            {onRefresh ? (
              <button className="refresh-button" type="button" onClick={onRefresh}>
                Refresh all
              </button>
            ) : null}
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </section>

      {isBookmarkSidebarOpen ? <BookmarkSidebar isOpen={isBookmarkSidebarOpen} onToggle={onToggleBookmarkSidebar} /> : null}
    </div>
  )
}