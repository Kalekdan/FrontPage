import { useEffect, useState } from 'react'
import { WiCloud, WiCloudy, WiDaySunny, WiFog, WiRain, WiSnow, WiThunderstorm } from 'react-icons/wi'
import { dashboardConfig } from '../frontpage.config.js'

export const weatherCodeLookup = {
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

export function getWeatherVisual(weatherCode) {
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

export function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#/, '') || '/'
  const parts = hash.split('/').filter(Boolean)

  if (parts[0] === 'feeds' && parts[1]) {
    return { page: 'feed', feedId: decodeURIComponent(parts[1]) }
  }

  if (parts[0] === 'widgets' && parts[1] === 'new') {
    return { page: 'widget-new' }
  }

  if (['insights', 'network', 'support', 'logout'].includes(parts[0])) {
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

export function formatDate(value) {
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

export function useHashRoute() {
  const [route, setRoute] = useState(() => getRouteFromHash())

  useEffect(() => {
    const handleHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return route
}

export function useFeedData(refreshKey) {
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

export function useServiceStatus(refreshKey) {
  const [serviceState, setServiceState] = useState([])

  useEffect(() => {
    let cancelled = false

    async function loadServices() {
      const results = await Promise.all(
        dashboardConfig.services.map(async (service) => {
          const controller = new AbortController()
          const timeoutMs = service.timeoutMs ?? 4000
          const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
          const startedAt = performance.now()
          const checkedAt = new Date().toISOString()
          const method = service.method ?? 'GET'

          try {
            const response = await fetch(service.url, {
              method,
              cache: 'no-store',
              signal: controller.signal,
            })

            const selectedHeaders = {
              'content-type': response.headers.get('content-type') || 'Unavailable',
              'cache-control': response.headers.get('cache-control') || 'Unavailable',
              server: response.headers.get('server') || 'Unavailable',
              date: response.headers.get('date') || 'Unavailable',
              'content-length': response.headers.get('content-length') || 'Unavailable',
            }

            return {
              name: service.name,
              description: service.description,
              ping: Math.round(performance.now() - startedAt),
              state: response.ok ? 'online' : 'degraded',
              detail: response.ok ? 'Responding normally' : `HTTP ${response.status}`,
              method,
              requestUrl: service.url,
              responseUrl: response.url || service.url,
              timeoutMs,
              checkedAt,
              statusCode: response.status,
              statusText: response.statusText || 'Unknown status',
              ok: response.ok,
              headers: selectedHeaders,
            }
          } catch (error) {
            return {
              name: service.name,
              description: service.description,
              ping: null,
              state: 'offline',
              detail: error.name === 'AbortError' ? 'Timed out' : error.message,
              method,
              requestUrl: service.url,
              responseUrl: null,
              timeoutMs,
              checkedAt,
              statusCode: null,
              statusText: 'No response received',
              ok: false,
              headers: {
                'content-type': 'Unavailable',
                'cache-control': 'Unavailable',
                server: 'Unavailable',
                date: 'Unavailable',
                'content-length': 'Unavailable',
              },
              errorName: error.name,
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

function buildProxyUrl(directUrl) {
  const proxyUrl = dashboardConfig.markets?.corsProxyUrl ?? dashboardConfig.markets?.proxyUrl ?? ''

  if (!proxyUrl) {
    return directUrl
  }

  if (proxyUrl.includes('{url}')) {
    return proxyUrl.replace('{url}', encodeURIComponent(directUrl))
  }

  return `${proxyUrl}${encodeURIComponent(directUrl)}`
}

function buildTwelveDataMarketRequest(instrument, userApiKey = '') {
  const twelvedata = dashboardConfig.markets?.twelvedata ?? {}
  const apiKey = userApiKey.trim() || twelvedata.apiKey || 'demo'
  const params = new URLSearchParams({
    symbol: instrument.symbol,
    interval: twelvedata.interval ?? '1day',
    outputsize: String(twelvedata.outputsize ?? 45),
    apikey: apiKey,
  })

  const directUrl = `https://api.twelvedata.com/time_series?${params.toString()}`
  return buildProxyUrl(directUrl)
}

function buildMarketRequest(instrument, userApiKey = '') {
  return buildTwelveDataMarketRequest(instrument, userApiKey)
}

function normalizeTwelveDataMarketSeries(instrument, payload) {
  if (payload?.status === 'error') {
    throw new Error(payload?.message || `No chart data returned for ${instrument.symbol}.`)
  }

  const values = Array.isArray(payload?.values) ? payload.values : []
  const points = values
    .map((point) => {
      const dateValue = point?.datetime
      const priceValue = Number(point?.close)
      const timestamp = dateValue ? new Date(dateValue).getTime() : Number.NaN

      if (!Number.isFinite(timestamp) || Number.isNaN(priceValue)) {
        return null
      }

      return {
        time: timestamp,
        value: priceValue,
      }
    })
    .filter(Boolean)
    .reverse()

  if (!points.length) {
    throw new Error(`No chart data returned for ${instrument.symbol}.`)
  }

  const firstValue = points[0].value
  const latestPoint = points[points.length - 1]
  const delta = latestPoint.value - firstValue
  const deltaPercent = firstValue ? (delta / firstValue) * 100 : 0

  return {
    status: 'ready',
    points,
    latestValue: latestPoint.value,
    delta,
    deltaPercent,
    currency: payload?.meta?.currency || '',
    exchangeName: payload?.meta?.exchange || '',
    previousClose: points.length > 1 ? points[points.length - 2].value : null,
  }
}

function normalizeMarketSeries(instrument, payload) {
  return normalizeTwelveDataMarketSeries(instrument, payload)
}

export function useMarketData(refreshKey, userApiKey = '') {
  const [marketState, setMarketState] = useState(() =>
    Object.fromEntries(
      (dashboardConfig.markets?.instruments ?? []).map((instrument) => [
        instrument.id,
        { status: 'loading', points: [] },
      ]),
    ),
  )

  useEffect(() => {
    let cancelled = false
    const instruments = dashboardConfig.markets?.instruments ?? []

    if (!instruments.length) {
      return undefined
    }

    async function loadMarketData() {
      const results = await Promise.all(
        instruments.map(async (instrument) => {
          try {
            const response = await fetch(buildMarketRequest(instrument, userApiKey), { cache: 'no-store' })
            const payload = await response.json()

            if (!response.ok) {
              throw new Error(`Market request failed with HTTP ${response.status}.`)
            }

            return [instrument.id, normalizeMarketSeries(instrument, payload)]
          } catch (error) {
            return [
              instrument.id,
              {
                status: 'error',
                points: [],
                error: error.message,
              },
            ]
          }
        }),
      )

      if (!cancelled) {
        setMarketState(Object.fromEntries(results))
      }
    }

    loadMarketData()

    return () => {
      cancelled = true
    }
  }, [refreshKey, userApiKey])

  return marketState
}

export function useWeather(refreshKey) {
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

export function getRelativeTime(value) {
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

export function getOverallServiceState(services) {
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

export function formatMarketPrice(value, currency = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unavailable'
  }

  return new Intl.NumberFormat(undefined, {
    style: currency ? 'currency' : 'decimal',
    currency: currency || undefined,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatMarketDelta(value, currency = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unavailable'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${formatMarketPrice(value, currency)}`
}

export function formatPercentDelta(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Unavailable'
  }

  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export async function requestIntelligenceSummary(feedData, userApiKey = '') {
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

  const apiKey = userApiKey
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  } else {
    throw new Error('Missing API key. Add one in the Intelligence Summary settings.')
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
      throw new Error('Summary request timed out.', { cause: error })
    }
    throw new Error(error.message || 'Summary request failed.', { cause: error })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function collectHeadlines(feedData) {
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

export function getBookmarkSections(searchValue) {
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

  for (const bookmark of matchingBookmarks) {
    const tags = (bookmark.tags ?? []).filter(Boolean)

    if (!tags.length) {
      if (!bookmark.starred) {
        untagged.push(bookmark)
      }
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