import { FiRefreshCw } from 'react-icons/fi'
import { DashboardChrome } from '../components/DashboardChrome.jsx'
import { formatDate, getOverallServiceState } from '../lib/dashboardData.js'

export function NetworkPage({ serviceData, onRefreshServices, isBookmarkSidebarOpen, onToggleBookmarkSidebar }) {
  const overallServiceState = getOverallServiceState(serviceData)
  const onlineCount = serviceData.filter((service) => service.state === 'online').length
  const degradedCount = serviceData.filter((service) => service.state === 'degraded').length
  const offlineCount = serviceData.filter((service) => service.state === 'offline').length

  return (
    <DashboardChrome
      routePage="network"
      onRefresh={onRefreshServices}
      onNewWidget={() => (window.location.hash = '/widgets/new')}
      isBookmarkSidebarOpen={isBookmarkSidebarOpen}
      onToggleBookmarkSidebar={onToggleBookmarkSidebar}
    >
      <section className="panel detail-header">
        <div className="detail-header-actions">
          <p className="eyebrow">Network</p>
          <button className="service-refresh-button" type="button" onClick={onRefreshServices} aria-label="Refresh service diagnostics">
            <FiRefreshCw aria-hidden="true" />
          </button>
        </div>
        <h1>Service diagnostics</h1>
        <p className="hero-copy">
          {overallServiceState}. {onlineCount} online, {degradedCount} degraded, {offlineCount} offline.
        </p>
      </section>

      <section className="detail-list network-detail-list">
        {serviceData.map((service) => (
          <article className="panel detail-card network-detail-card" key={service.name}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{service.method} endpoint</p>
                <h2>{service.name}</h2>
              </div>
              <span className={`badge badge-${service.state}`}>{service.state}</span>
            </div>

            <p className="muted">{service.description}</p>

            <div className="network-summary-grid">
              <div>
                <span className="network-label">Status</span>
                <strong>{service.statusCode ? `${service.statusCode} ${service.statusText}` : service.statusText}</strong>
              </div>
              <div>
                <span className="network-label">Latency</span>
                <strong>{service.ping ? `${service.ping} ms` : 'Unavailable'}</strong>
              </div>
              <div>
                <span className="network-label">Timeout</span>
                <strong>{service.timeoutMs} ms</strong>
              </div>
              <div>
                <span className="network-label">Checked</span>
                <strong>{formatDate(service.checkedAt)}</strong>
              </div>
            </div>

            <dl className="network-metadata-list">
              <div>
                <dt>Request URL</dt>
                <dd>{service.requestUrl}</dd>
              </div>
              <div>
                <dt>Response URL</dt>
                <dd>{service.responseUrl || 'No response URL available'}</dd>
              </div>
              <div>
                <dt>Result</dt>
                <dd>{service.detail}</dd>
              </div>
              <div>
                <dt>Content-Type</dt>
                <dd>{service.headers['content-type']}</dd>
              </div>
              <div>
                <dt>Cache-Control</dt>
                <dd>{service.headers['cache-control']}</dd>
              </div>
              <div>
                <dt>Server</dt>
                <dd>{service.headers.server}</dd>
              </div>
              <div>
                <dt>Response Date</dt>
                <dd>{service.headers.date}</dd>
              </div>
              <div>
                <dt>Content-Length</dt>
                <dd>{service.headers['content-length']}</dd>
              </div>
              {service.errorName ? (
                <div>
                  <dt>Error Type</dt>
                  <dd>{service.errorName}</dd>
                </div>
              ) : null}
            </dl>
          </article>
        ))}
        {!serviceData.length ? <p className="muted">No service checks are configured.</p> : null}
      </section>
    </DashboardChrome>
  )
}