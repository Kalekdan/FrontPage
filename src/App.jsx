import { useEffect, useRef, useState } from 'react'
import {
  FiBookmark,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiSearch,
  FiSettings,
  FiStar,
} from 'react-icons/fi'
import { WiCloud, WiCloudy, WiDaySunny, WiFog, WiRain, WiSnow, WiThunderstorm, WiStrongWind } from 'react-icons/wi'
import './App.css'
import { dashboardConfig } from './frontpage.config.js'

const weatherCodeLookup = {
  0: 'Clear sky',
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

   if (parts[0] === 'widgets' && parts[1] === 'new') {
    return { page: 'widget-new' }
  }

  if (['insights', 'automation', 'network', 'security', 'support', 'logout'].includes(parts[0])) {
    return { page: parts[0] }
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
  const allItemNodes = Array.from(doc.querySelectorAll('item, entry'))
  const itemNodes = itemLimit === 0 ? allItemNodes : allItemNodes.slice(0, itemLimit)

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

function getFeedPayloadForSummary(feedData) {
  return dashboardConfig.rss.feeds.map((feed) => {
    const state = feedData[feed.id] ?? { status: 'loading', items: [] }

    return {
      id: feed.id,
      name: feed.name,
      description: feed.description,
      status: state.status,
      items: (state.items ?? []).map((item) => ({
        title: item.title,
        description: item.description,
        pubDate: item.pubDate,
        link: item.link,
      })),
    }
  })
}

function getSummaryRequestPrompt(feedData) {
  const payload = getFeedPayloadForSummary(feedData)

  return [
    'Create a concise intelligence summary from these RSS feeds.',
    'Requirements:',
    '- Use only the provided feed data.',
    '- Focus on major themes, notable changes, and high-impact stories.',
    '- Keep it to 4-6 sentences.',
    '- Mention uncertainty when a feed has no data or failed to load.',
    '',
    'Feed data JSON:',
    JSON.stringify(payload),
  ].join('\n')
}

function getSummaryFromApiResponse(payload) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  if (typeof payload.summary === 'string' && payload.summary.trim()) {
    return payload.summary.trim()
  }

  const choiceContent = payload.choices?.[0]?.message?.content
  if (typeof choiceContent === 'string' && choiceContent.trim()) {
    return choiceContent.trim()
  }

  const outputText = payload.output_text
  if (typeof outputText === 'string' && outputText.trim()) {
    return outputText.trim()
  }

  const contentBlocks = payload.content
  if (Array.isArray(contentBlocks)) {
    const textValue = contentBlocks
      .map((block) => block?.text)
      .filter(Boolean)
      .join(' ')
      .trim()

    if (textValue) {
      return textValue
    }
  }

  return ''
}

async function requestIntelligenceSummary(feedData, userApiKey = '') {
  const llmConfig = dashboardConfig.llm ?? {}
  const apiUrl = llmConfig.summaryApiUrl

  if (!apiUrl) {
    throw new Error('Missing LLM API URL. Add dashboardConfig.llm.summaryApiUrl in frontpage.config.js.')
  }

  const model = llmConfig.model ?? 'gpt-4.1-mini'
  const systemPrompt =
    llmConfig.systemPrompt ??
    'You summarize RSS feed intelligence for a dashboard. Be factual, concise, and avoid speculation.'

  const requestBody = {
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: getSummaryRequestPrompt(feedData) },
    ],
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(llmConfig.headers ?? {}),
  }

  const apiKey = userApiKey || llmConfig.apiKey
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  } else {
    throw new Error('Missing API key. Add one in the Intelligence Summary panel.')
  }

  const controller = new AbortController()
  const timeoutMs = llmConfig.timeoutMs ?? 20000
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const apiError = payload?.error?.message || payload?.message || `HTTP ${response.status}`
      throw new Error(`Summary request failed: ${apiError}`)
    }

    const summaryText = getSummaryFromApiResponse(payload)
    if (!summaryText) {
      throw new Error('Summary API returned no usable text.')
    }

    return summaryText
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Summary request timed out.')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
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

function matchesBookmarkSearch(bookmark, searchValue) {
  if (!searchValue) {
    return true
  }

  const haystack = [bookmark.title, bookmark.description, bookmark.url, ...(bookmark.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(searchValue.toLowerCase())
}

function getBookmarkSections(searchValue) {
  const bookmarks = dashboardConfig.bookmarks ?? []
  const matchingBookmarks = bookmarks.filter((bookmark) => matchesBookmarkSearch(bookmark, searchValue))

  if (searchValue) {
    return {
      totalMatches: matchingBookmarks.length,
      sections: [],
      matchingBookmarks,
    }
  }

  const starred = matchingBookmarks.filter((bookmark) => bookmark.starred)
  const taggedGroups = new Map()
  const untagged = []

  for (const bookmark of matchingBookmarks.filter((entry) => !entry.starred)) {
    const tags = (bookmark.tags ?? []).filter(Boolean)

    if (!tags.length) {
      untagged.push(bookmark)
      continue
    }

    for (const tag of tags) {
      const currentGroup = taggedGroups.get(tag) ?? []
      currentGroup.push(bookmark)
      taggedGroups.set(tag, currentGroup)
    }
  }

  const sections = []

  if (starred.length) {
    sections.push({ id: 'starred', label: 'Starred', items: starred })
  }

  for (const [tag, items] of Array.from(taggedGroups.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    sections.push({ id: `tag-${tag.toLowerCase().replace(/\s+/g, '-')}`, label: tag, items })
  }

  if (untagged.length) {
    sections.push({ id: 'untagged', label: 'Other', items: untagged })
  }

  return {
    totalMatches: matchingBookmarks.length,
    sections,
    matchingBookmarks,
  }
}

function BookmarkSidebar({ isOpen, onToggle }) {
  const [searchValue, setSearchValue] = useState('')
  const [collapsedSections, setCollapsedSections] = useState({})
  const { sections, totalMatches, matchingBookmarks } = getBookmarkSections(searchValue)
  const searchInputRef = useRef(null)
  const topSearchResult = matchingBookmarks[0]

  function openTopSearchResult() {
    if (!topSearchResult?.url) {
      return
    }

    window.location.assign(topSearchResult.url)
  }

  function isEditableElement(element) {
    if (!element) {
      return false
    }

    const tagName = element.tagName?.toLowerCase()

    return element.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
  }

  useEffect(() => {
    function handleGlobalBookmarkSearch(event) {
      if (!isOpen || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const target = event.target
      const targetIsSearchInput = target === searchInputRef.current

      if (targetIsSearchInput) {
        return
      }

      if (isEditableElement(target) && !targetIsSearchInput) {
        return
      }

      if (event.key === 'Enter') {
        if (searchValue && topSearchResult) {
          event.preventDefault()
          openTopSearchResult()
        }
        return
      }

      if (event.key === 'Backspace') {
        if (!searchValue) {
          return
        }

        event.preventDefault()
        setSearchValue((currentValue) => currentValue.slice(0, -1))
        searchInputRef.current?.focus()
        return
      }

      if (event.key.length !== 1) {
        return
      }

      event.preventDefault()
      setSearchValue((currentValue) => `${currentValue}${event.key}`)
      searchInputRef.current?.focus()
    }

    window.addEventListener('keydown', handleGlobalBookmarkSearch)
    return () => window.removeEventListener('keydown', handleGlobalBookmarkSearch)
  }, [isOpen, searchValue, topSearchResult])

  function toggleSection(sectionId) {
    setCollapsedSections((currentValue) => ({
      ...currentValue,
      [sectionId]: !(currentValue[sectionId] ?? sectionId !== 'starred'),
    }))
  }

  return (
    <aside className={`bookmark-sidebar${isOpen ? ' open' : ' collapsed'}`} aria-label="Bookmarks">
      <div className="bookmark-sidebar-head">
        <div className="bookmark-title-row">
          <div>
            <p className="eyebrow">Bookmarks</p>
            {isOpen ? <h2>Quick access</h2> : null}
          </div>
          <button
            className="bookmark-toggle"
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls="bookmark-sidebar-body"
            aria-label={isOpen ? 'Collapse bookmarks sidebar' : 'Expand bookmarks sidebar'}
          >
            {isOpen ? <FiChevronRight aria-hidden="true" /> : <FiChevronLeft aria-hidden="true" />}
          </button>
        </div>
        {isOpen ? (
          <>
            <label className="bookmark-search" htmlFor="bookmark-search">
              <FiSearch aria-hidden="true" />
              <input
                ref={searchInputRef}
                id="bookmark-search"
                type="search"
                placeholder="Search bookmarks"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchValue && topSearchResult) {
                    event.preventDefault()
                    openTopSearchResult()
                  }
                }}
              />
            </label>
            <p className="bookmark-count">{totalMatches} matching bookmark{totalMatches === 1 ? '' : 's'}</p>
          </>
        ) : null}
      </div>

      <div className="bookmark-sidebar-body" id="bookmark-sidebar-body">
        {!isOpen ? (
          <div className="bookmark-sidebar-mini" aria-hidden="true">
            <FiBookmark />
            <span>{dashboardConfig.bookmarks?.length ?? 0}</span>
          </div>
        ) : null}

        {isOpen && searchValue ? (
          <div className="bookmark-list">
            {matchingBookmarks.map((bookmark) => (
              <a className="bookmark-card" href={bookmark.url} key={bookmark.id}>
                <div className="bookmark-card-head">
                  <strong>{bookmark.title}</strong>
                  <span className="bookmark-icons">
                    {bookmark.starred ? <FiStar aria-hidden="true" /> : null}
                    <FiExternalLink aria-hidden="true" />
                  </span>
                </div>
                {bookmark.description ? <p>{bookmark.description}</p> : null}
              </a>
            ))}
          </div>
        ) : null}

        {isOpen && !searchValue
          ? sections.map((section) => {
              const isCollapsed = collapsedSections[section.id] ?? section.id !== 'starred'

              return (
                <section className="bookmark-section" key={section.id}>
                  <div className="bookmark-section-head">
                    <button
                      className="bookmark-section-toggle"
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      aria-expanded={!isCollapsed}
                    >
                      <span>{section.label}</span>
                      <span className="bookmark-section-meta">
                        <span>{section.items.length}</span>
                        <FiChevronDown className={isCollapsed ? 'collapsed' : ''} aria-hidden="true" />
                      </span>
                    </button>
                  </div>

                  {!isCollapsed ? (
                    <div className="bookmark-list">
                      {section.items.map((bookmark) => (
                        <a className="bookmark-card" href={bookmark.url} key={`${section.id}-${bookmark.id}`}>
                          <div className="bookmark-card-head">
                            <strong>{bookmark.title}</strong>
                            <span className="bookmark-icons">
                              {bookmark.starred ? <FiStar aria-hidden="true" /> : null}
                              <FiExternalLink aria-hidden="true" />
                            </span>
                          </div>
                          {bookmark.description ? <p>{bookmark.description}</p> : null}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })
          : null}

        {isOpen && searchValue && !matchingBookmarks.length ? <p className="muted">No bookmarks match the current search.</p> : null}
      </div>
    </aside>
  )
}

function DashboardChrome({ children, routePage, onRefresh, onNewWidget, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
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

      {isBookmarkSidebarOpen ? <BookmarkSidebar isOpen={isBookmarkSidebarOpen} onToggle={onToggleBookmarkSidebar} /> : null}
    </div>
  )
}

function HomePage({ feedData, serviceData, weatherState, onRefresh, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
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

function FeedDetailPage({ feed, state, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
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

function SectionPage({ routePage, title, description, onRefresh, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
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

function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isBookmarkSidebarOpen, setIsBookmarkSidebarOpen] = useState(true)
  const route = useHashRoute()
  const feedData = useFeedData(refreshKey)
  const serviceData = useServiceStatus(refreshKey)
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
      <SectionPage
        routePage="network"
        title="Network"
        description="Track network health, uptime history, and endpoint diagnostics."
        onRefresh={() => setRefreshKey((value) => value + 1)}
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
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={() => setIsBookmarkSidebarOpen((value) => !value)}
    />
  )
}

export default App
