import { DashboardChrome } from '../components/DashboardChrome.jsx'
import { formatDate } from '../lib/dashboardData.js'

function FeedCard({ feed, state }) {
  return (
    <article className="panel feed-card">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">RSS feed</p>
          <h2>{feed.name}</h2>
        </div>
        <a className="panel-link" href={`#/feeds/${feed.id}`}>
          View details
        </a>
      </div>
      <p className="muted">{feed.description}</p>
      <p className="summary">{state.summary || 'Generating summary...'}</p>
      {state.status === 'ready' && state.items[0] ? (
        <ul className="headline-list">
          {state.items.slice(0, 3).map((item) => (
            <li key={`${feed.id}-${item.link}`}>
              <a href={item.link} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {state.status === 'error' ? <p className="error-text">{state.error}</p> : null}
    </article>
  )
}

export function FeedDetailPage({ feed, state, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
  return (
    <DashboardChrome
      routePage="feed"
      onNewWidget={() => (window.location.hash = '/widgets/new')}
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={onToggleBookmarkSidebar}
    >
      <section className="panel detail-header">
        <a className="back-link" href="#/">
          Back to dashboard
        </a>
        <p className="eyebrow">Feed details</p>
        <h1>{feed.name}</h1>
        <p className="hero-copy">{state.summary}</p>
      </section>

      <section className="detail-list">
        <FeedCard feed={feed} state={state} />
        {state.items.map((item) => (
          <article className="panel detail-card" key={`${feed.id}-${item.link}`}>
            {item.imageUrl ? <img className="detail-image" src={item.imageUrl} alt="" loading="lazy" /> : null}
            <div className="panel-heading">
              <h2>{item.title}</h2>
              <span className="muted">{formatDate(item.pubDate)}</span>
            </div>
            <p className="muted">{item.description || 'No description available.'}</p>
            <a className="panel-link" href={item.link} target="_blank" rel="noreferrer">
              Open article
            </a>
          </article>
        ))}
        {!state.items.length ? <p className="muted">No feed items are available.</p> : null}
      </section>
    </DashboardChrome>
  )
}