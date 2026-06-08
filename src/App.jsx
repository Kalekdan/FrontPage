import { useEffect, useState } from 'react'
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

function buildFeedRequest(feed) {
  const { proxyUrl } = dashboardConfig.rss

  if (proxyUrl.includes('{url}')) {
    return proxyUrl.replace('{url}', encodeURIComponent(feed.url))
  }

  const separator = proxyUrl.includes('?') ? '&' : '?'
  return `${proxyUrl}${encodeURIComponent(feed.url)}${separator}count=${feed.itemLimit ?? 5}`
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
            const response = await fetch(buildFeedRequest(feed))
            const data = await response.json()

            if (!response.ok || data.status === 'error') {
              throw new Error(data.message || `Unable to load ${feed.name}.`)
            }

            const items = (data.items ?? []).slice(0, feed.itemLimit ?? 5).map((item) => ({
              title: item.title,
              link: item.link,
              pubDate: item.pubDate,
              description: stripHtml(item.description ?? item.content ?? ''),
            }))

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

function HomePage({ feedData, serviceData, weatherState, onRefresh }) {
  return (
    <main className="layout">
      <section className="hero panel">
        <div>
          <p className="eyebrow">Configured dashboard</p>
          <h1>{dashboardConfig.title}</h1>
          <p className="hero-copy">{dashboardConfig.subtitle}</p>
        </div>
        <button className="refresh-button" type="button" onClick={onRefresh}>
          Refresh data
        </button>
      </section>

      <section className="section-grid">
        <div className="section-header">
          <div>
            <p className="eyebrow">News</p>
            <h2>Feed summaries</h2>
          </div>
        </div>
        <div className="feed-grid">
          {dashboardConfig.rss.feeds.map((feed) => (
            <FeedCard key={feed.id} feed={feed} state={feedData[feed.id] ?? { status: 'loading', items: [] }} />
          ))}
        </div>
      </section>

      <section className="dual-grid">
        <article className="panel">
          <div className="section-header compact">
            <div>
              <p className="eyebrow">Status</p>
              <h2>Service checks</h2>
            </div>
          </div>
          <div className="status-list">
            {serviceData.map((service) => (
              <div className="status-row" key={service.name}>
                <div>
                  <strong>{service.name}</strong>
                  <p className="muted">{service.description}</p>
                </div>
                <div className="status-meta">
                  <span className={`badge badge-${service.state}`}>{service.state}</span>
                  <span>{service.ping ? `${service.ping} ms` : '—'}</span>
                  <span className="muted">{service.detail}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel weather-card">
          <div className="section-header compact">
            <div>
              <p className="eyebrow">Weather</p>
              <h2>{dashboardConfig.weather.label}</h2>
            </div>
          </div>
          {weatherState.status === 'ready' ? (
            <>
              <p className="weather-temp">{weatherState.currentTemp}°</p>
              <p className="summary">{weatherCodeLookup[weatherState.weatherCode] ?? 'Current conditions unavailable'}</p>
              <dl className="weather-stats">
                <div>
                  <dt>High</dt>
                  <dd>{weatherState.high}°</dd>
                </div>
                <div>
                  <dt>Low</dt>
                  <dd>{weatherState.low}°</dd>
                </div>
                <div>
                  <dt>Wind</dt>
                  <dd>{weatherState.windSpeed}</dd>
                </div>
              </dl>
            </>
          ) : null}
          {weatherState.status === 'error' ? <p className="error-text">{weatherState.error}</p> : null}
          {weatherState.status === 'loading' ? <p className="muted">Loading weather...</p> : null}
        </article>
      </section>
    </main>
  )
}

function FeedDetailPage({ feed, state }) {
  return (
    <main className="layout">
      <section className="panel detail-header">
        <a className="back-link" href="#/">
          ← Back to dashboard
        </a>
        <p className="eyebrow">Feed details</p>
        <h1>{feed.name}</h1>
        <p className="hero-copy">{state.summary}</p>
      </section>

      <section className="detail-list">
        {state.items.map((item) => (
          <article className="panel detail-card" key={`${feed.id}-${item.link}`}>
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
    </main>
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
