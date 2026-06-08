import { useEffect, useRef, useState } from 'react'
import {
  FiBookmark,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiSearch,
  FiStar,
} from 'react-icons/fi'
import { dashboardConfig } from '../frontpage.config.js'
import { getBookmarkSections } from '../lib/dashboardData.js'

function isEditableElement(element) {
  if (!element) {
    return false
  }

  const tagName = element.tagName?.toLowerCase()

  return element.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
}

export function BookmarkSidebar({ isOpen, onToggle }) {
  const [searchValue, setSearchValue] = useState('')
  const [collapsedSections, setCollapsedSections] = useState({})
  const { sections, totalMatches, matchingBookmarks } = getBookmarkSections(searchValue)
  const searchInputRef = useRef(null)
  const topSearchResult = matchingBookmarks[0]

  function openGoogleSearch(query) {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return
    }

    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(trimmedQuery)}`
    window.location.assign(searchUrl)
  }

  function openTopSearchResult() {
    if (!topSearchResult?.url) {
      return
    }

    window.location.assign(topSearchResult.url)
  }

  function submitSearch() {
    if (!searchValue.trim()) {
      return
    }

    if (topSearchResult) {
      openTopSearchResult()
      return
    }

    openGoogleSearch(searchValue)
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
        if (searchValue.trim()) {
          event.preventDefault()
          submitSearch()
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
                autoComplete="off"
                placeholder="Search bookmarks"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchValue.trim()) {
                    event.preventDefault()
                    submitSearch()
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

        {isOpen && searchValue && !matchingBookmarks.length ? <p className="muted">No matching bookmarks. Press enter to search on the web.</p> : null}
      </div>
    </aside>
  )
}