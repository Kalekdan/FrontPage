# FrontPage

A lightweight JSX dashboard that can be configured from code.

## Features
- RSS feed cards configured in `src/frontpage.config.js`
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
- `rss.feeds`: feed ids, names, descriptions, and RSS URLs
- `rss.corsProxyUrl`: optional CORS proxy endpoint if a feed blocks direct browser requests; supports either a prefix URL or a `{url}` placeholder
- `llm`: endpoint and request settings for the Intelligence Summary "Generate summary" button
	- `llm.summaryApiUrl`: OpenAI-compatible chat endpoint to call from the browser
	- `llm.model`: model name sent in the request body
	- `llm.timeoutMs`: request timeout for summary generation
	- `llm.systemPrompt`: optional system instruction for the summarizer
	- `llm.headers`: optional additional request headers
- `services`: CORS-accessible URLs to ping from the browser
- `weather`: label, coordinates, timezone, and unit preferences

## Validation
```bash
cd <project-directory>
npm run build
npm run lint
```
