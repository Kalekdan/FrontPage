# FrontPage

A lightweight JSX dashboard that can be configured from code.

## Features
- RSS feed cards configured in `/tmp/workspace/Kalekdan/FrontPage/src/frontpage.config.js`
- AI-style summaries for each feed on the dashboard front page
- Separate detail page for each feed at `#/feeds/<feed-id>`
- Service status checks with response-time pings
- Current weather panel powered by Open-Meteo

## Getting started
```bash
cd /tmp/workspace/Kalekdan/FrontPage
npm ci
npm run dev
```

## Configuration
Edit `/tmp/workspace/Kalekdan/FrontPage/src/frontpage.config.js` to change:
- `rss.feeds`: feed ids, names, descriptions, and RSS URLs
- `rss.proxyUrl`: RSS proxy endpoint. The default uses rss2json and supports either a prefix URL or a `{url}` placeholder.
- `services`: CORS-accessible URLs to ping from the browser
- `weather`: label, coordinates, timezone, and unit preferences

## Validation
```bash
cd /tmp/workspace/Kalekdan/FrontPage
npm run build
npm run lint
```
