export const dashboardConfig = {
  title: 'FrontPage Dashboard',
  subtitle: 'A configurable personal homepage for feeds, service health, and weather.',
  rss: {
    proxyUrl: 'https://api.rss2json.com/v1/api.json?rss_url=',
    feeds: [
      {
        id: 'hacker-news',
        name: 'Hacker News',
        url: 'https://hnrss.org/frontpage',
        description: 'Top stories from the Hacker News front page.',
        itemLimit: 5,
      },
      {
        id: 'bbc-world',
        name: 'BBC World',
        url: 'http://feeds.bbci.co.uk/news/world/rss.xml',
        description: 'World headlines from BBC News.',
        itemLimit: 5,
      },
    ],
  },
  services: [
    {
      name: 'GitHub API',
      url: 'https://api.github.com',
      method: 'GET',
      timeoutMs: 4000,
      description: 'General GitHub API availability.',
    },
    {
      name: 'Cloudflare Status API',
      url: 'https://www.cloudflarestatus.com/api/v2/status.json',
      method: 'GET',
      timeoutMs: 4000,
      description: 'Cloudflare public status summary.',
    },
  ],
  weather: {
    label: 'London',
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: 'Europe/London',
    temperatureUnit: 'celsius',
    windspeedUnit: 'kmh',
  },
}
