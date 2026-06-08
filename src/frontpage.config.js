export const dashboardConfig = {
  title: 'FrontPage Dashboard',
  subtitle: 'A configurable personal homepage for feeds, service health, and weather.',
  rss: {
    corsProxyUrl: 'https://api.allorigins.win/raw?url=',
    feeds: [
      {
        id: 'morning-brew',
        name: 'Morning Brew',
        url: 'https://feeds.megaphone.fm/MOBI8777994188',
        description: 'Daily business news from Morning Brew.',
        itemLimit: 12,
      },
      {
        id: 'bbc-uk',
        name: 'BBC UK News',
        url: 'https://feeds.bbci.co.uk/news/uk/rss.xml',
        description: 'UK headlines from BBC News.',
        itemLimit: 12,
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
