# FrontPage

A lightweight JSX dashboard that can be configured from code.

## Features
- RSS feed cards configured in `src/frontpage.config.js`
- Bookmark sidebar with grouped sections, search, and quick open
- On-demand intelligence summary generation from loaded RSS feed data
- Separate detail page for each feed at `#/feeds/<feed-id>`
- Service status checks with response-time pings
- Current weather panel powered by Open-Meteo

## Getting started
```bash
cd <project-directory>
npm ci
npm run dev
```

## Configuration
Edit `src/frontpage.config.js` to change:
- `bookmarks`: links shown in the bookmark sidebar
	- `id`: unique bookmark id
	- `title`: bookmark display name
	- `url`: target link opened from the sidebar
	- `description`: optional supporting text on the bookmark card
	- `tags`: optional list used to group bookmarks into sections
	- `starred`: when `true`, bookmark appears in the Starred section
- `rss.feeds`: feed ids, names, descriptions, and RSS URLs
	- `itemLimit`: optional per-feed cap (`0` keeps all fetched items)
- `rss.corsProxyUrl`: optional CORS proxy endpoint if a feed blocks direct browser requests; supports either a prefix URL or a `{url}` placeholder
- `llm`: endpoint and request settings for the Intelligence Summary "Generate summary" button (key is set by the user in the UI and stored in browser storage)
	- `llm.summaryApiUrl`: OpenAI-compatible chat endpoint to call from the browser
	- `llm.model`: model name sent in the request body
	- `llm.timeoutMs`: request timeout for summary generation
	- `llm.systemPrompt`: optional system instruction for the summarizer
	- `llm.headers`: optional additional request headers
- `services`: CORS-accessible URLs to ping from the browser
	- `name`: label shown in the service panel
	- `url`: endpoint to ping
	- `method`: HTTP method for the check
	- `timeoutMs`: timeout per service check
	- `description`: optional detail text shown in the UI
- `weather`: location and unit preferences for the weather panel
	- `label`, `latitude`, `longitude`, `timezone`
	- `temperatureUnit`: `celsius` or `fahrenheit`
	- `windspeedUnit`: unit label passed to the weather API (for example `kmh`)

## Validation
```bash
cd <project-directory>
npm run build
npm run lint
```
