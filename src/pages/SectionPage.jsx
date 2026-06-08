import { DashboardChrome } from '../components/DashboardChrome.jsx'

export function SectionPage({ routePage, title, description, onRefresh, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
  return (
    <DashboardChrome
      routePage={routePage}
      onRefresh={onRefresh}
      onNewWidget={() => (window.location.hash = '/widgets/new')}
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={onToggleBookmarkSidebar}
    >
      <section className="panel detail-header">
        <p className="eyebrow">{title}</p>
        <h1>{title}</h1>
        <p className="hero-copy">{description}</p>
      </section>
    </DashboardChrome>
  )
}