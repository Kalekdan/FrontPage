import { useEffect, useState } from 'react'
import { FiRefreshCw, FiSettings } from 'react-icons/fi'
import { WiStrongWind } from 'react-icons/wi'
import { dashboardConfig } from '../frontpage.config.js'
import {
  collectHeadlines,
  getOverallServiceState,
  getRelativeTime,
  getWeatherVisual,
  requestIntelligenceSummary,
  weatherCodeLookup,
} from '../lib/dashboardData.js'
import { DashboardChrome } from '../components/DashboardChrome.jsx'

export function HomePage({ feedData, serviceData, weatherState, onRefresh, onRefreshServices, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
  const headlines = collectHeadlines(feedData)
  const [summaryText, setSummaryText] = useState('')
  const [summaryStatus, setSummaryStatus] = useState('idle')
  const [summaryError, setSummaryError] = useState('')
  const [showSummarySettings, setShowSummarySettings] = useState(false)
  const [userApiKey, setUserApiKey] = useState(() => {
    if (typeof window === 'undefined') {
      return ''
    }

    return window.localStorage.getItem('frontpage.openaiApiKey') ?? ''
  })
  const overallServiceState = getOverallServiceState(serviceData)
  const weatherVisual = getWeatherVisual(weatherState.weatherCode)
  const WeatherIcon = weatherVisual.Icon
  const windUnit = dashboardConfig.weather.windspeedUnit === 'kmh' ? 'km/h' : dashboardConfig.weather.windspeedUnit
  const feedStates = dashboardConfig.rss.feeds.map((feed) => ({
    name: feed.name,
    state: feedData[feed.id] ?? { status: 'loading' },
  }))
  const hasLoadingFeeds = feedStates.some((feed) => feed.state.status === 'loading')
  const failedFeeds = feedStates.filter((feed) => feed.state.status === 'error')
  const failedFeedTooltip = failedFeeds
    .map((feed) => `${feed.name}: ${feed.state.error || 'Unable to load feed.'}`)
    .join('\n')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (userApiKey) {
      window.localStorage.setItem('frontpage.openaiApiKey', userApiKey)
      return
    }

    window.localStorage.removeItem('frontpage.openaiApiKey')
  }, [userApiKey])

  async function handleGenerateSummary() {
    try {
      setSummaryStatus('loading')
      setSummaryError('')
      const nextSummary = await requestIntelligenceSummary(feedData, userApiKey.trim())
      setSummaryText(nextSummary)
      setSummaryStatus('ready')
    } catch (error) {
      setSummaryStatus('error')
      setSummaryError(error.message || 'Unable to generate summary.')
    }
  }

  return (
    <DashboardChrome
      routePage="home"
      onRefresh={onRefresh}
      onNewWidget={() => (window.location.hash = '/widgets/new')}
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={onToggleBookmarkSidebar}
    >
      <section className="top-grid">
        <article className="panel weather-panel">
          <div className="weather-header">
            <div>
              <p className="eyebrow">Weather</p>
              <h2>{dashboardConfig.weather.label}</h2>
            </div>
            <div className={`weather-icon-wrap ${weatherVisual.toneClass}`}>
              <WeatherIcon className="weather-icon" aria-hidden="true" />
            </div>
          </div>
          {weatherState.status === 'ready' ? (
            <div className="weather-visual">
              <div>
                <p className="weather-temp">{Math.round(weatherState.currentTemp ?? 0)}°</p>
                <p className="weather-line">{weatherCodeLookup[weatherState.weatherCode] ?? 'Conditions unavailable'}</p>
              </div>
              <div className="forecast-row">
                <div>
                  <span>High</span>
                  <strong>{Math.round(weatherState.high ?? weatherState.currentTemp ?? 0)}°</strong>
                </div>
                <div>
                  <span>Low</span>
                  <strong>{Math.round(weatherState.low ?? weatherState.currentTemp ?? 0)}°</strong>
                </div>
                <div>
                  <span>Wind</span>
                  <strong>
                    <WiStrongWind aria-hidden="true" /> {weatherState.windSpeed ?? '—'} {weatherState.windSpeed ? windUnit : ''}
                  </strong>
                </div>
              </div>
            </div>
          ) : null}
          {weatherState.status === 'loading' ? <p className="muted">Loading weather...</p> : null}
          {weatherState.status === 'error' ? <p className="error-text">{weatherState.error}</p> : null}
        </article>

        <article className="panel service-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Network Infrastructure</p>
              <h2>Service availability</h2>
            </div>
            <div className="service-heading-actions">
              <button className="service-refresh-button" type="button" onClick={onRefreshServices} aria-label="Refresh network infrastructure">
                <FiRefreshCw aria-hidden="true" />
              </button>
              <span className="status-pill">{overallServiceState}</span>
            </div>
          </div>

          <div className="service-grid">
            {serviceData.map((service) => (
              <div className="service-tile" key={service.name}>
                <div>
                  <strong>{service.name}</strong>
                  <p className="muted">{service.detail}</p>
                </div>
                <div className="service-state">
                  <span className={`badge badge-${service.state}`}>{service.state}</span>
                  <span>Latency: {service.ping ? `${service.ping} ms` : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel intelligence">
        <div className="intelligence-header">
          <div className="intelligence-title-row">
            <p className="eyebrow">Intelligence Summary</p>
            <button
              className="summary-settings-button"
              type="button"
              onClick={() => setShowSummarySettings((value) => !value)}
              aria-label={showSummarySettings ? 'Hide API key settings' : 'Show API key settings'}
              aria-expanded={showSummarySettings}
              aria-controls="summary-key-settings"
            >
              <FiSettings aria-hidden="true" />
            </button>
          </div>
          <button
            className="summary-generate-button"
            type="button"
            onClick={handleGenerateSummary}
            disabled={summaryStatus === 'loading'}
          >
            {summaryStatus === 'loading' ? 'Generating...' : 'Generate summary'}
          </button>
        </div>
        {showSummarySettings ? (
          <>
            <div className="summary-key-row" id="summary-key-settings">
              <label className="summary-key-label" htmlFor="summary-api-key">
                OpenAI API key
              </label>
              <input
                className="summary-key-input"
                id="summary-api-key"
                type="password"
                value={userApiKey}
                onChange={(event) => setUserApiKey(event.target.value)}
                placeholder="sk-..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="summary-key-clear"
                type="button"
                onClick={() => setUserApiKey('')}
                disabled={!userApiKey}
              >
                Clear
              </button>
            </div>
            <p className="muted">Stored locally in this browser only.</p>
          </>
        ) : null}
        {summaryText ? <p className="summary">{summaryText}</p> : null}
        {summaryStatus === 'loading' ? <p className="muted">Requesting summary from the LLM API...</p> : null}
        {summaryStatus === 'error' ? <p className="error-text">{summaryError}</p> : null}
      </section>

      <section className="headlines-block">
        <div className="section-header">
          <div>
            <p className="eyebrow">Latest headlines</p>
            <div className="signal-title-row">
              <h2>Signal feed</h2>
              <details className="feed-picker">
                <summary className="feed-picker-button">RSS feeds</summary>
                <div className="feed-picker-list" role="menu" aria-label="RSS feed links">
                  {dashboardConfig.rss.feeds.map((feed) => {
                    const state = feedData[feed.id]?.status ?? 'loading'
                    const stateLabel = state === 'loading' ? 'fetching' : state

                    return (
                      <a className="feed-picker-link" href={`#/feeds/${feed.id}`} key={feed.id} role="menuitem">
                        <span>{feed.name}</span>
                        <span className={`feed-picker-state state-${state}`}>{stateLabel}</span>
                      </a>
                    )
                  })}
                </div>
              </details>
            </div>
          </div>
          <div className="feed-header-actions">
            <span className={`feed-loading${hasLoadingFeeds ? ' active' : ''}`} role="status" aria-live="polite">
              <span className="loading-icon" aria-hidden="true" />
              <span className="sr-only">Loading feeds</span>
            </span>
            <button className="panel-link" type="button" onClick={onRefresh}>
              Refresh all
            </button>
          </div>
        </div>

        <div className="headline-grid">
          {headlines.map((item, index) => (
            <article className="headline-card panel" key={`${item.feedId}-${item.link}`}>
              {item.imageUrl ? (
                <img className="headline-image-media" src={item.imageUrl} alt="" loading="lazy" />
              ) : (
                <div className={`headline-image variant-${(index % 3) + 1}`} />
              )}
              <div className="headline-body">
                <p className="headline-tag">{item.feedName}</p>
                <h3>{item.title}</h3>
                <p className="muted">{item.description || 'No description available.'}</p>
                <div className="headline-meta">
                  <span>{getRelativeTime(item.pubDate)}</span>
                  <a className="panel-link" href={`#/feeds/${item.feedId}`}>
                    Open feed
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {failedFeeds.length ? (
          <div className="feed-warning-row">
            <span className="feed-warning" title={failedFeedTooltip}>
              Feed warning: {failedFeeds.length} feed{failedFeeds.length === 1 ? '' : 's'} failed to load
            </span>
          </div>
        ) : null}
      </section>
    </DashboardChrome>
  )
}