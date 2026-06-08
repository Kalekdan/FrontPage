import { useEffect, useState } from 'react'
import { WiCloud, WiCloudy, WiDaySunny, WiFog, WiRain, WiSnow, WiThunderstorm, WiStrongWind } from 'react-icons/wi'
import './App.css'
import { dashboardConfig } from './frontpage.config.js'

const weatherCodeLookup = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Heavy rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
}

function getWeatherVisual(weatherCode) {
  if (weatherCode === 0 || weatherCode === 1) {
    return { Icon: WiDaySunny, toneClass: 'tone-clear' }
  }

  if (weatherCode === 2 || weatherCode === 3) {
    return { Icon: WiCloudy, toneClass: 'tone-cloudy' }
  }

  if (weatherCode === 45 || weatherCode === 48) {
    return { Icon: WiFog, toneClass: 'tone-fog' }
  }

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)) {
    return { Icon: WiRain, toneClass: 'tone-rain' }
  }

  if ([71, 73, 75].includes(weatherCode)) {
    return { Icon: WiSnow, toneClass: 'tone-snow' }
  }

  if (weatherCode === 95) {
    return { Icon: WiThunderstorm, toneClass: 'tone-storm' }
  }

  return { Icon: WiCloud, toneClass: 'tone-cloudy' }
}

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  const parts = hash.split('/').filter(Boolean)

  if (parts[0] === 'feeds' && parts[1]) {
    return { page: 'feed', feedId: decodeURIComponent(parts[1]) }
  }

  return { page: 'home' }
}

function stripHtml(value = '') {
  if (typeof window === 'undefined' || !value) {
    return value
  }

  const doc = new window.DOMParser().parseFromString(value, 'text/html')
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function formatDate(value) {
  if (!value) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function buildSummary(feedName, items) {
  if (!items.length) {
    return `Summary: ${feedName} has no recent stories available right now.`
  }

  const headlineList = items
    .slice(0, 3)
    .map((item) => item.title)
    .filter(Boolean)

  return `Summary: ${feedName} is currently focused on ${headlineList.join(', ')}.`
}

function getFirstNodeText(root, selectors) {
  for (const selector of selectors) {
    const value = root.querySelector(selector)?.textContent?.trim()
    if (value) {
      return value
    }
  }

  return ''
}

function getItemLink(itemNode) {
  const inlineLink = getFirstNodeText(itemNode, ['link'])
  if (inlineLink) {
    return inlineLink
  }

  const atomLink =
    itemNode.querySelector('link[rel="alternate"]')?.getAttribute('href') ??
    itemNode.querySelector('link')?.getAttribute('href')

  return atomLink?.trim() || '#'
}

function getFirstNodeAttribute(root, selectors, attribute) {
  for (const selector of selectors) {
    const value = root.querySelector(selector)?.getAttribute(attribute)?.trim()
    if (value) {
      return value
    }
  }

  return ''
}

function getAttributeFromLocalName(root, localNames, attribute) {
  const normalizedNames = new Set(localNames.map((name) => name.toLowerCase()))
  const nodes = root.getElementsByTagName('*')

  for (const node of nodes) {
    const localName = node.localName?.toLowerCase()
    if (!localName || !normalizedNames.has(localName)) {
      continue
    }

    const value = node.getAttribute(attribute)?.trim()
    if (value) {
      return value
    }
  }

  return ''
}

function getFirstImageFromHtml(value = '') {
  if (typeof window === 'undefined' || !value) {
    return ''
  }

  const doc = new window.DOMParser().parseFromString(value, 'text/html')
  return doc.querySelector('img')?.getAttribute('src')?.trim() ?? ''
}

function getFeedImage(doc) {
  const feedRoot = doc.querySelector('channel, feed') ?? doc

  return (
    getAttributeFromLocalName(feedRoot, ['thumbnail'], 'url') ||
    getAttributeFromLocalName(feedRoot, ['image'], 'href') ||
    getAttributeFromLocalName(feedRoot, ['content'], 'url') ||
    getFirstNodeText(feedRoot, ['image > url', 'logo', 'icon'])
  )
}

function getItemImage(itemNode, fallbackImage) {
  const imageUrl =
    getAttributeFromLocalName(itemNode, ['thumbnail'], 'url') ||
    getAttributeFromLocalName(itemNode, ['content'], 'url') ||
    getAttributeFromLocalName(itemNode, ['image'], 'href') ||
    getFirstNodeAttribute(itemNode, ['enclosure[type^="image/"]'], 'url') ||
    getFirstNodeText(itemNode, ['image > url']) ||
    getFirstImageFromHtml(getFirstNodeText(itemNode, ['description', 'content\\:encoded', 'content', 'summary']))

  return imageUrl || fallbackImage || ''
}

function parseFeedXml(xmlText, itemLimit) {
  if (typeof window === 'undefined') {
    return []
  }

  const doc = new window.DOMParser().parseFromString(xmlText, 'text/xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('Feed returned invalid XML.')
  }

  const fallbackImage = getFeedImage(doc)
  const itemNodes = Array.from(doc.querySelectorAll('item, entry')).slice(0, itemLimit)

  return itemNodes.map((itemNode) => ({
    title: getFirstNodeText(itemNode, ['title']) || 'Untitled story',
    link: getItemLink(itemNode),
    imageUrl: getItemImage(itemNode, fallbackImage),
    pubDate: getFirstNodeText(itemNode, ['pubDate', 'published', 'updated']),
    description: stripHtml(
      getFirstNodeText(itemNode, ['description', 'content\\:encoded', 'content', 'summary']),
    ),
  }))
}

function buildProxyFeedRequest(feed) {
  const proxyUrl = dashboardConfig.rss.corsProxyUrl ?? dashboardConfig.rss.proxyUrl ?? ''

  if (!proxyUrl) {
    return ''
  }

  if (proxyUrl.includes('{url}')) {
    return proxyUrl.replace('{url}', encodeURIComponent(feed.url))
  }

  return `${proxyUrl}${encodeURIComponent(feed.url)}`
}

async function fetchFeedXml(feed) {
  let directFailure

  try {
    const directResponse = await fetch(feed.url)
    if (directResponse.ok) {
      return await directResponse.text()
    }

    directFailure = new Error(`Direct request failed with HTTP ${directResponse.status}.`)
  } catch (error) {
    directFailure = new Error(`Direct request failed: ${error.message}`, { cause: error })
  }

  const proxyRequest = buildProxyFeedRequest(feed)
  if (!proxyRequest) {
    throw directFailure ?? new Error(`Unable to load ${feed.name}.`)
  }

  try {
    const proxyResponse = await fetch(proxyRequest)
    if (!proxyResponse.ok) {
      throw new Error(`Proxy request failed with HTTP ${proxyResponse.status}.`)
    }

    return await proxyResponse.text()
  } catch (error) {
    const proxyFailure = new Error(`Proxy request failed: ${error.message}`, { cause: error })

    if (directFailure) {
      throw new Error(`${directFailure.message} ${proxyFailure.message}`, { cause: error })
    }

    throw proxyFailure
  }
}

function useHashRoute() {
  const [route, setRoute] = useState(() => getRouteFromHash())

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route
}

function useFeedData(refreshKey) {
  const [feedState, setFeedState] = useState(() =>
    Object.fromEntries(
      dashboardConfig.rss.feeds.map((feed) => [feed.id, { status: 'loading', items: [], summary: '' }]),
    ),
  )

  useEffect(() => {
    let cancelled = false

    async function loadFeeds() {
      const results = await Promise.all(
        dashboardConfig.rss.feeds.map(async (feed) => {
          try {
            const xmlText = await fetchFeedXml(feed)

            const items = parseFeedXml(xmlText, feed.itemLimit ?? 5)

            return [
              feed.id,
              {
                status: 'ready',
                items,
                summary: buildSummary(feed.name, items),
              },
            ]
          } catch (error) {
            return [
              feed.id,
              {
                status: 'error',
                items: [],
                summary: `Summary unavailable: ${error.message}`,
                error: error.message,
              },
            ]
          }
        }),
      )

      if (!cancelled) {
        setFeedState(Object.fromEntries(results))
      }
    }

    loadFeeds()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return feedState
}

function useServiceStatus(refreshKey) {
  const [serviceState, setServiceState] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadServices() {
      const results = await Promise.all(
        dashboardConfig.services.map(async (service) => {
          const controller = new AbortController()
          const timeoutId = window.setTimeout(() => controller.abort(), service.timeoutMs ?? 4000)
          const startedAt = performance.now()

          try {
            const response = await fetch(service.url, {
              method: service.method ?? 'GET',
              cache: 'no-store',
              signal: controller.signal,
            })

            return {
              name: service.name,
              description: service.description,
              ping: Math.round(performance.now() - startedAt),
              state: response.ok ? 'online' : 'degraded',
              detail: response.ok ? 'Responding normally' : `HTTP ${response.status}`,
            }
          } catch (error) {
            return {
              name: service.name,
              description: service.description,
              ping: null,
              state: 'offline',
              detail: error.name === 'AbortError' ? 'Timed out' : error.message,
            }
          } finally {
            window.clearTimeout(timeoutId)
          }
        }),
      )

      if (!cancelled) {
        setServiceState(results)
      }
    }

    loadServices()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return serviceState
}

function useWeather(refreshKey) {
  const [weatherState, setWeatherState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function loadWeather() {
      const { weather } = dashboardConfig
      const params = new URLSearchParams({
        latitude: String(weather.latitude),
        longitude: String(weather.longitude),
        current: 'temperature_2m,weather_code,wind_speed_10m',
        daily: 'temperature_2m_max,temperature_2m_min',
        forecast_days: '1',
        timezone: weather.timezone,
        temperature_unit: weather.temperatureUnit,
        wind_speed_unit: weather.windspeedUnit,
      })

      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error('Unable to load weather forecast.')
        }

        if (!cancelled) {
          setWeatherState({
            status: 'ready',
            currentTemp: data.current?.temperature_2m,
            weatherCode: data.current?.weather_code,
            windSpeed: data.current?.wind_speed_10m,
            high: data.daily?.temperature_2m_max?.[0],
            low: data.daily?.temperature_2m_min?.[0],
          })
        }
      } catch (error) {
        if (!cancelled) {
          setWeatherState({ status: 'error', error: error.message })
        }
      }
    }

    loadWeather()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return weatherState
}

function getRelativeTime(value) {
  if (!value) {
    return 'Recently'
  }

  const deltaMs = Date.now() - new Date(value).getTime()
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000))

  if (deltaMinutes < 60) {
    return `${deltaMinutes} min ago`
  }

  const deltaHours = Math.round(deltaMinutes / 60)
  if (deltaHours < 24) {
    return `${deltaHours} hour${deltaHours === 1 ? '' : 's'} ago`
  }

  const deltaDays = Math.round(deltaHours / 24)
  return `${deltaDays} day${deltaDays === 1 ? '' : 's'} ago`
}

function getOverallServiceState(services) {
  if (!services.length) {
    return 'checking'
  }

  if (services.some((service) => service.state === 'offline')) {
    return 'issues detected'
  }

  if (services.some((service) => service.state === 'degraded')) {
    return 'minor issues'
  }

  return 'all systems operational'
}

function buildIntelligenceSummary(serviceData, weatherState, headlines) {
  const offlineCount = serviceData.filter((service) => service.state === 'offline').length
  const degradedCount = serviceData.filter((service) => service.state === 'degraded').length
  const serviceSummary =
    offlineCount > 0
      ? `${offlineCount} service${offlineCount === 1 ? '' : 's'} offline`
      : degradedCount > 0
        ? `${degradedCount} service${degradedCount === 1 ? '' : 's'} degraded`
        : 'network systems stable'

  const weatherSummary =
    weatherState.status === 'ready'
      ? `${weatherCodeLookup[weatherState.weatherCode] ?? 'mixed conditions'} in ${dashboardConfig.weather.label}`
      : 'weather data still loading'

  const headlineSummary = headlines[0]?.title ? `Top story: ${headlines[0].title}.` : 'No headlines available right now.'

  return `${serviceSummary}, ${weatherSummary}. ${headlineSummary}`
}

function collectHeadlines(feedData) {
  const toTimestamp = (value) => {
    const timestamp = new Date(value).getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  return dashboardConfig.rss.feeds
    .flatMap((feed) =>
      (feedData[feed.id]?.items ?? []).map((item) => ({
        ...item,
        feedName: feed.name,
        feedId: feed.id,
      })),
    )
    .sort((a, b) => toTimestamp(b.pubDate) - toTimestamp(a.pubDate))
    .slice(0, 12)
}

function DashboardChrome({ children, routePage, onRefresh }) {
  const menuItems = ['Home', 'Insights', 'Automation', 'Network', 'Security']

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="brand-title">Nexus Dashboard</p>
          <p className="brand-subtitle">System Admin</p>
          <p className="brand-mode">Precision Mode</p>
        </div>

        <nav className="side-nav" aria-label="Primary">
          {menuItems.map((item) => {
            const isHome = routePage === 'home' && item === 'Home'
            const isFeed = routePage === 'feed' && item === 'Insights'
            const active = isHome || isFeed

            return (
              <a key={item} className={`side-nav-item${active ? ' active' : ''}`} href={item === 'Home' ? '#/' : '#/'}>
                <span className="dot" aria-hidden="true" />
                {item}
              </a>
            )
          })}
        </nav>

        <button className="widget-button" type="button">
          + New Widget
        </button>

        <div className="side-foot">
          <a href="#/">Support</a>
          <a href="#/">Log out</a>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <nav className="top-tabs" aria-label="Sections">
            <a className="active" href="#/">
              Home
            </a>
            <a href="#/">Insights</a>
            <a href="#/">Automation</a>
          </nav>
          <div className="top-actions">
            <span className="icon-chip" aria-hidden="true">
              O
            </span>
            <span className="icon-chip" aria-hidden="true">
              !
            </span>
            <span className="icon-chip" aria-hidden="true">
              *
            </span>
            {onRefresh ? (
              <button className="refresh-button" type="button" onClick={onRefresh}>
                Refresh all
              </button>
            ) : null}
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </section>
    </div>
  )
}

function HomePage({ feedData, serviceData, weatherState, onRefresh }) {
  const headlines = collectHeadlines(feedData)
  const summaryText = buildIntelligenceSummary(serviceData, weatherState, headlines)
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

  return (
    <DashboardChrome routePage="home" onRefresh={onRefresh}>
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
            <span className="status-pill">{overallServiceState}</span>
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
        <p className="eyebrow">Intelligence Summary</p>
        <p className="summary">{summaryText}</p>
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
            <a className="panel-link" href="#/">
              Refresh all
            </a>
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

function FeedDetailPage({ feed, state }) {
  return (
    <DashboardChrome routePage="feed">
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

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const route = useHashRoute()
  const feedData = useFeedData(refreshKey)
  const serviceData = useServiceStatus(refreshKey)
  const weatherState = useWeather(refreshKey)
  const activeFeed = dashboardConfig.rss.feeds.find((feed) => feed.id === route.feedId)

  if (route.page === 'feed' && activeFeed) {
    return <FeedDetailPage feed={activeFeed} state={feedData[activeFeed.id] ?? { summary: '', items: [] }} />
  }

  return (
    <HomePage
      feedData={feedData}
      serviceData={serviceData}
      weatherState={weatherState}
      onRefresh={() => setRefreshKey((value) => value + 1)}
    />
  )
}

export default App
