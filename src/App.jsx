import { useState } from 'react'
import './App.css'
import { dashboardConfig } from './frontpage.config.js'
import { useFeedData, useHashRoute, useServiceStatus, useWeather } from './lib/dashboardData.js'
import { FeedDetailPage } from './pages/FeedDetailPage.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { NetworkPage } from './pages/NetworkPage.jsx'
import { SectionPage } from './pages/SectionPage.jsx'

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0)
  const [isBookmarkSidebarOpen, setIsBookmarkSidebarOpen] = useState(true)
  const route = useHashRoute()
  const feedData = useFeedData(refreshKey)
  const serviceData = useServiceStatus(serviceRefreshKey)
  const weatherState = useWeather(refreshKey)
  const activeFeed = dashboardConfig.rss.feeds.find((feed) => feed.id === route.feedId)

  if (route.page === 'feed' && activeFeed) {
    return (
      <FeedDetailPage
        feed={activeFeed}
        state={feedData[activeFeed.id] ?? { summary: '', items: [] }}
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'insights') {
    return (
      <SectionPage
        routePage="insights"
        title="Insights"
        description="Explore signal trends, feed summaries, and intelligence snapshots."
        onRefresh={() => setRefreshKey((value) => value + 1)}
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'automation') {
    return (
      <SectionPage
        routePage="automation"
        title="Automation"
        description="Create and manage automation routines for recurring operations."
        onRefresh={() => setRefreshKey((value) => value + 1)}
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'network') {
    return (
      <NetworkPage
        serviceData={serviceData}
        onRefreshServices={() => setServiceRefreshKey((value) => value + 1)}
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'security') {
    return (
      <SectionPage
        routePage="security"
        title="Security"
        description="Review alerts, patch posture, and risk indicators across systems."
        onRefresh={() => setRefreshKey((value) => value + 1)}
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'support') {
    return (
      <SectionPage
        routePage="home"
        title="Support"
        description="Support options are coming next: runbooks, contact channels, and escalation flows."
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'logout') {
    return (
      <SectionPage
        routePage="home"
        title="Log out"
        description="Sign out flow is not connected yet. Wire this route to your authentication provider."
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  if (route.page === 'widget-new') {
    return (
      <SectionPage
        routePage="automation"
        title="New Widget"
        description="Widget creation has been stubbed. Add a form and persistence workflow to complete it."
        isBookmarkSidebarOpen={isBookmarkSidebarOpen}
        onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
      />
    )
  }

  return (
    <HomePage
      feedData={feedData}
      serviceData={serviceData}
      weatherState={weatherState}
      onRefresh={() => setRefreshKey((value) => value + 1)}
      onRefreshServices={() => setServiceRefreshKey((value) => value + 1)}
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
    />
  )
}

export default App
