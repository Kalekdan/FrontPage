import { dashboardConfig } from '../frontpage.config.js'
import { useState } from 'react'
import { FiSettings } from 'react-icons/fi'
import {
  formatDate,
  formatMarketDelta,
  formatMarketPrice,
  formatPercentDelta,
  getRelativeTime,
} from '../lib/dashboardData.js'
import { DashboardChrome } from '../components/DashboardChrome.jsx'

function MarketSparkline({ points, direction }) {
  if (!points.length) {
    return <div className="market-sparkline empty" aria-hidden="true" />
  }

  const width = 240
  const height = 80
  const padding = 6
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0
  const polyline = points
    .map((point, index) => {
      const x = padding + index * step
      const y = height - padding - ((point.value - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className={`market-sparkline ${direction}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-fill-${direction}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline
        className="market-sparkline-fill"
        fill={`url(#spark-fill-${direction})`}
        points={`${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`}
      />
      <polyline className="market-sparkline-line" fill="none" points={polyline} />
    </svg>
  )
}

function FeedInsightCard({ feed, state }) {
  const latestItem = state.items?.[0]

  return (
    <article className="panel insight-feed-card">
      <div className="panel-heading">
        <div>
          <h2>{feed.name}</h2>
        </div>
        <a className="panel-link" href={`#/feeds/${feed.id}`}>
          Open feed
        </a>
      </div>
      {latestItem ? (
        <>
          <a className="insight-story-link" href={latestItem.link} target="_blank" rel="noreferrer">
            {latestItem.title}
          </a>
          <div className="insight-feed-meta">
            <span className="insight-feed-time">{getRelativeTime(latestItem.pubDate)}</span>
            <span className="insight-feed-description">{feed.description}</span>
          </div>
        </>
      ) : null}
      {state.status === 'loading' ? <p className="muted">Loading feed...</p> : null}
      {state.status === 'ready' && !latestItem ? <p className="muted">No recent items.</p> : null}
      {state.status === 'error' ? <p className="error-text">{state.error || 'Unable to load feed.'}</p> : null}
    </article>
  )
}

function MarketCard({ instrument, state }) {
  const direction = state.delta >= 0 ? 'positive' : 'negative'
  const latestPoint = state.points?.[state.points.length - 1]

  return (
    <article className="panel market-card">
      <div className="market-card-header">
        <div>
          <p className="eyebrow">{instrument.type}</p>
          <h2>{instrument.name}</h2>
          <p className="market-symbol">{instrument.symbol}</p>
        </div>
        <div className={`market-change ${direction}`}>
          <strong>{formatMarketDelta(state.delta, state.currency)}</strong>
          <span>{formatPercentDelta(state.deltaPercent)}</span>
        </div>
      </div>

      <div className="market-card-grid">
        <div>
          <p className="market-price">{formatMarketPrice(state.latestValue, state.currency)}</p>
          <p className="muted">
            {state.exchangeName || 'Market data'}
            {latestPoint ? ` • ${formatDate(latestPoint.time)}` : ''}
          </p>
        </div>
        <MarketSparkline points={state.points} direction={direction} />
      </div>
    </article>
  )
}

export function InsightsPage({
  feedData,
  marketData,
  summaryText,
  summaryGeneratedAt,
  marketApiKey,
  onMarketApiKeyChange,
  onRefresh,
  isBookmarkSidebarOpen,
  onToggleBookmarkSidebar,
}) {
  const [showMarketSettings, setShowMarketSettings] = useState(false)
  const summaryGeneratedLabel = summaryGeneratedAt ? formatDate(summaryGeneratedAt) : ''
  const feeds = dashboardConfig.rss.feeds
  const markets = dashboardConfig.markets?.instruments ?? []

  return (
    <DashboardChrome
      routePage="insights"
      onRefresh={onRefresh}
      onNewWidget={() => (window.location.hash = '/widgets/new')}
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={onToggleBookmarkSidebar}
    >
      <section className="panel intelligence insight-summary-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Insights</p>
            <h2>Summary</h2>
          </div>
          {summaryGeneratedLabel ? <span className="status-pill">{summaryGeneratedLabel}</span> : null}
        </div>
        <p className="summary">{summaryText || 'No generated summary has been saved yet. Use the home page to generate one.'}</p>
      </section>

      <section className="insight-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">RSS feeds</p>
            <h2>Feeds</h2>
          </div>
          <span className="muted">{feeds.length} tracked</span>
        </div>
        <div className="insight-feed-grid">
          {feeds.map((feed) => (
            <FeedInsightCard key={feed.id} feed={feed} state={feedData[feed.id] ?? { status: 'loading', items: [], summary: '' }} />
          ))}
        </div>
      </section>

      <section className="insight-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Market charts</p>
            <h2>Markets</h2>
          </div>
          <div className="insight-market-actions">
            <button
              className="summary-settings-button"
              type="button"
              onClick={() => setShowMarketSettings((value) => !value)}
              aria-label={showMarketSettings ? 'Hide Twelve Data key settings' : 'Show Twelve Data key settings'}
              aria-expanded={showMarketSettings}
              aria-controls="market-key-settings"
            >
              <FiSettings aria-hidden="true" />
            </button>
            <span className="muted">{markets.length} configured</span>
          </div>
        </div>
        {showMarketSettings ? (
          <article className="panel insight-market-settings" id="market-key-settings">
            <div className="summary-key-row">
              <label className="summary-key-label" htmlFor="market-api-key">
                Twelve Data API key
              </label>
              <input
                className="summary-key-input"
                id="market-api-key"
                type="password"
                value={marketApiKey}
                onChange={(event) => onMarketApiKeyChange(event.target.value)}
                placeholder="td_..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="summary-key-clear"
                type="button"
                onClick={() => onMarketApiKeyChange('')}
                disabled={!marketApiKey}
              >
                Clear
              </button>
            </div>
            <p className="muted">Stored locally in this browser only.</p>
          </article>
        ) : null}
        <div className="market-grid">
          {markets.map((instrument) => {
            const state = marketData[instrument.id] ?? { status: 'loading', points: [] }

            if (state.status === 'error') {
              return (
                <article className="panel market-card" key={instrument.id}>
                  <div className="market-card-header">
                    <div>
                      <p className="eyebrow">{instrument.type}</p>
                      <h2>{instrument.name}</h2>
                      <p className="market-symbol">{instrument.symbol}</p>
                    </div>
                  </div>
                  <p className="error-text">{state.error || 'Unable to load market data.'}</p>
                </article>
              )
            }

            if (state.status !== 'ready') {
              return (
                <article className="panel market-card" key={instrument.id}>
                  <div className="market-card-header">
                    <div>
                      <p className="eyebrow">{instrument.type}</p>
                      <h2>{instrument.name}</h2>
                      <p className="market-symbol">{instrument.symbol}</p>
                    </div>
                  </div>
                  <p className="muted">Loading market data...</p>
                </article>
              )
            }

            return <MarketCard key={instrument.id} instrument={instrument} state={state} />
          })}
        </div>
      </section>
    </DashboardChrome>
  )
}