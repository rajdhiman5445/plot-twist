import { useEffect, useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link, useParams } from 'react-router-dom'
import { getDownloadURL, ref } from 'firebase/storage'

import { storage } from '../firebase'
import useBooks from '../hooks/useBooks.js'
import { useScrollDirection } from '../hooks/useScrollDirection'
import './ImmersiveReader.css'

function ImmersiveReader() {
  const { book_id: bookId } = useParams()
  const { book, isLoading: isBookLoading, error: bookError } = useBooks(bookId)
  const scrollDirection = useScrollDirection()

  const [currentChapterIndex, setCurrentChapterIndex] = useState(() => {
    const saved = localStorage.getItem(`plot-twist-progress-${bookId}`)
    return saved ? parseInt(saved, 10) : 0
  })
  const [markdownContent, setMarkdownContent] = useState('')
  const [isFetchingChapter, setIsFetchingChapter] = useState(false)
  const [chapterError, setChapterError] = useState(null)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)

  // Reader Settings State (Reused from Classic)
  const [fontSize, setFontSize] = useState(2) // Default larger for immersive
  const [theme, setTheme] = useState('dark') 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isFullWidth, setIsFullWidth] = useState(false)
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('plot-twist-notes')
    return saved ? JSON.parse(saved) : []
  })
  const [noteText, setNoteText] = useState('')
  const [selection, setSelection] = useState({ text: '', x: 0, y: 0, show: false })

  // Immersive Specific State
  const [chunks, setChunks] = useState([])
  const [activeChunkIndex, setActiveChunkIndex] = useState(() => {
    const saved = localStorage.getItem(`plot-twist-chunk-${bookId}`)
    return saved ? parseInt(saved, 10) : 0
  })
  const [scrollProgress, setScrollProgress] = useState(0)

  // Save progress
  useEffect(() => {
    if (bookId) {
      localStorage.setItem(`plot-twist-progress-${bookId}`, currentChapterIndex)
    }
  }, [bookId, currentChapterIndex])

  // Save specific chunk progress
  useEffect(() => {
    if (bookId && chunks.length > 0) {
      localStorage.setItem(`plot-twist-chunk-${bookId}`, activeChunkIndex)
    }
  }, [bookId, activeChunkIndex, chunks.length])

  // Restore Scroll Position on Chunk Load
  useEffect(() => {
    if (chunks.length > 0) {
      const savedChunk = localStorage.getItem(`plot-twist-chunk-${bookId}`)
      if (savedChunk) {
        const index = parseInt(savedChunk, 10)
        if (index > 0 && index < chunks.length) {
          const elements = document.querySelectorAll('.immersive-reader__chunk')
          if (elements[index]) {
            elements[index].scrollIntoView({ behavior: 'instant', block: 'center' })
          }
        }
      }
    }
  }, [chunks.length, bookId])

  // Save notes
  useEffect(() => {
    localStorage.setItem('plot-twist-notes', JSON.stringify(notes))
  }, [notes])

  // Selection Logic (Reused from Classic)
  useEffect(() => {
    const handleSelection = () => {
      const activeSelection = window.getSelection()
      const text = activeSelection.toString().trim()
      if (text && text.length > 0) {
        const range = activeSelection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setSelection({
          text, x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 10, show: true
        })
      } else {
        setSelection(prev => ({ ...prev, show: false }))
      }
    }
    document.addEventListener('mouseup', handleSelection)
    document.addEventListener('touchend', handleSelection)
    const handleDocumentClick = (e) => {
      if (selection.show && !e.target.closest('.reader__selection-popup')) {
        setSelection(prev => ({ ...prev, show: false }))
      }
    }
    document.addEventListener('mousedown', handleDocumentClick)
    return () => {
      document.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('touchend', handleSelection)
      document.removeEventListener('mousedown', handleDocumentClick)
    }
  }, [selection.show])

  const handleSaveSelection = () => {
    setNoteText(`"${selection.text}"\n\n`)
    setIsNotesOpen(true)
    setSelection(prev => ({ ...prev, show: false }))
    window.getSelection().removeAllRanges()
  }

  // Chunking Logic: Split markdown into small Focus Chunks
  useEffect(() => {
    if (!markdownContent) {
      setChunks([])
      return
    }

    const paragraphs = markdownContent
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    const refinedChunks = []
    paragraphs.forEach(para => {
      const words = para.split(/\s+/)
      if (words.length <= 65) {
        refinedChunks.push(para)
      } else {
        for (let i = 0; i < words.length; i += 50) {
          refinedChunks.push(words.slice(i, i + 50).join(' '))
        }
      }
    })
    
    const chapter = book?.chapters[currentChapterIndex]
    const headerChunk = `# Chapter ${chapter?.order}\n## ${chapter?.title}`
    
    const newChunks = [headerChunk, ...refinedChunks]
    setChunks(newChunks)

    // Reset scroll ONLY if we are moving to a NEW chapter that isn't the one saved
    const savedProgress = localStorage.getItem(`plot-twist-progress-${bookId}`)
    if (savedProgress && parseInt(savedProgress, 10) !== currentChapterIndex) {
      setActiveChunkIndex(0)
      localStorage.setItem(`plot-twist-chunk-${bookId}`, 0)
      window.scrollTo(0, 0)
    }
  }, [markdownContent, currentChapterIndex, book, bookId])

  // Native Scroll Snapping & Tracking
  useEffect(() => {
    if (chunks.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index'), 10)
            setActiveChunkIndex(index)
            setScrollProgress(index / (chunks.length - 1))
          }
        })
      },
      { 
        threshold: 0.4,
        rootMargin: '-5% 0px -5% 0px'
      }
    )

    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.immersive-reader__chunk')
      elements.forEach((el) => observer.observe(el))
    }, 200)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [chunks])

  // Controls Visibility Logic
  useEffect(() => {
    if (scrollDirection === 'down') {
      setIsHeaderVisible(false)
    } else {
      setIsHeaderVisible(true)
    }
  }, [scrollDirection])

  const toggleHeader = () => {
    if (isSidebarOpen || isNotesOpen) return
    setIsHeaderVisible((prev) => !prev)
  }

  const handleSettingClick = (e) => e.stopPropagation()

  const handleNoteClick = (chapterOrder) => {
    const index = book.chapters.findIndex(ch => ch.order === chapterOrder)
    if (index !== -1) {
      setCurrentChapterIndex(index)
      setIsNotesOpen(false)
    }
  }

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!noteText.trim()) return
    const newNote = {
      id: Date.now(),
      bookId,
      bookTitle: book.title,
      chapterOrder: book.chapters[currentChapterIndex].order,
      chapterTitle: book.chapters[currentChapterIndex].title,
      text: noteText,
      timestamp: new Date().toLocaleString()
    }
    setNotes([newNote, ...notes])
    setNoteText('')
  }

  const deleteNote = (id) => setNotes(notes.filter(note => note.id !== id))

  // Keyboard & Swipe Navigation
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0

    const handleKeyDown = (e) => {
      if (isSidebarOpen || isNotesOpen) return

      if (e.key === 'ArrowLeft') {
        setCurrentChapterIndex((prev) => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        const totalChapters = book?.chapters?.length || 0
        setCurrentChapterIndex((prev) => Math.min(totalChapters - 1, prev + 1))
      }
    }

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e) => {
      if (isSidebarOpen || isNotesOpen) return
      
      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY
      
      const diffX = touchStartX - touchEndX
      const diffY = touchStartY - touchEndY

      // Require a strong horizontal swipe and minimal vertical movement to trigger
      if (Math.abs(diffX) > 100 && Math.abs(diffY) < 60) {
        if (diffX > 0) {
          // Swipe Left -> Next
          const totalChapters = book?.chapters?.length || 0
          setCurrentChapterIndex((prev) => Math.min(totalChapters - 1, prev + 1))
        } else {
          // Swipe Right -> Prev
          setCurrentChapterIndex((prev) => Math.max(0, prev - 1))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [book, isSidebarOpen, isNotesOpen])

  // Fetch Chapter
  useEffect(() => {
    if (!book || !book.chapters || !book.chapters[currentChapterIndex]) return

    let ignore = false
    const fetchChapter = async () => {
      setIsFetchingChapter(true)
      setChapterError(null)

      try {
        const chapter = book.chapters[currentChapterIndex]
        const storageRef = ref(storage, chapter.file)
        const downloadUrl = await getDownloadURL(storageRef)
        const response = await fetch(downloadUrl)
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)
        const text = await response.text()
        if (!ignore) setMarkdownContent(text)
      } catch (err) {
        if (!ignore) setChapterError(err.message)
      } finally {
        if (!ignore) setIsFetchingChapter(false)
      }
    }

    fetchChapter()
    return () => { ignore = true }
  }, [book, currentChapterIndex])

  if (isBookLoading) return null
  if (bookError) return <div className="immersive-state">Error: {bookError}</div>
  if (!book) return <div className="immersive-state">Book not found.</div>

  const chapters = book.chapters || []
  const currentChapter = chapters[currentChapterIndex]
  const bookNotes = notes.filter(n => n.bookId === bookId)

  return (
    <div 
      className={`immersive-reader reader--theme-${theme} ${isFullWidth ? 'reader--full-width' : ''}`} 
      onClick={toggleHeader} 
      style={{ 
        '--read-progress': scrollProgress,
        '--chapter-accent': currentChapter?.accentColor || '#d46b32',
        '--book-cover': `url("${book?.coverImage}")`
      }}
    >
      <div className="immersive-reader__bg">
        <div className="immersive-reader__aura-blob immersive-reader__aura-blob--1"></div>
        <div className="immersive-reader__aura-blob immersive-reader__aura-blob--2"></div>
        <div className="immersive-reader__aura-blob immersive-reader__aura-blob--3"></div>
        <div className="immersive-reader__aura-blob immersive-reader__aura-blob--4"></div>
      </div>
      
      {/* Reused Classic Header */}
      <header className={`reader__header ${isHeaderVisible ? 'reader__header--visible' : ''}`}>
        <Link to={`/books/${bookId}`} className="reader__back" onClick={handleSettingClick}>
          &larr; Exit<span className="reader__back-extra"> Immersive</span>
        </Link>
        <div className="reader__title-wrap">
          <h1 className="reader__book-title">{book.title}</h1>
          {currentChapter && (
            <p className="reader__chapter-title">
              Ch. {currentChapter.order}: {currentChapter.title}
            </p>
          )}
        </div>
      </header>

      {/* Chapters Sidebar */}
      <aside className={`reader__sidebar ${isSidebarOpen ? 'reader__sidebar--open' : ''}`} onClick={handleSettingClick}>
        <div className="reader__sidebar-header">
          <h2>Chapters</h2>
          <button className="reader__sidebar-close" onClick={() => setIsSidebarOpen(false)}>&times;</button>
        </div>
        <ul className="reader__chapter-list">
          {chapters.map((ch, index) => (
            <li key={index} className={`reader__chapter-item ${index === currentChapterIndex ? 'reader__chapter-item--active' : ''}`} onClick={() => setCurrentChapterIndex(index)}>
              <span className="reader__chapter-number">{ch.order}.</span>
              <span className="reader__chapter-name">{ch.title}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Notes Sidebar */}
      <aside className={`reader__sidebar reader__sidebar--notes ${isNotesOpen ? 'reader__sidebar--open' : ''}`} onClick={handleSettingClick}>
        <div className="reader__sidebar-header">
          <h2>My Notes</h2>
          <button className="reader__sidebar-close" onClick={() => setIsNotesOpen(false)}>&times;</button>
        </div>
        <form className="reader__note-form" onSubmit={handleAddNote}>
          <textarea 
            placeholder="Write a short note..." 
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            style={{ fontSize: `${Math.max(0.9, fontSize * 0.8)}rem` }}
          ></textarea>
          <button type="submit" className="reader__setting-btn reader__setting-btn--chapters">Add Note</button>
        </form>
        <div className="reader__notes-list">
          {bookNotes.map(note => (
            <div key={note.id} className="reader__note-item" onClick={() => handleNoteClick(note.chapterOrder)} style={{ cursor: 'pointer' }}>
              <div className="reader__note-meta"><span>Ch. {note.chapterOrder}</span><span>{note.timestamp}</span></div>
              <p className="reader__note-text" style={{ fontSize: `${Math.max(0.9, fontSize * 0.8)}rem` }}>{note.text}</p>
              <button className="reader__note-delete" onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}>Delete</button>
            </div>
          ))}
        </div>
      </aside>

      {(isSidebarOpen || isNotesOpen) && <div className="reader__overlay" onClick={() => { setIsSidebarOpen(false); setIsNotesOpen(false); }}></div>}

      {/* Selection Pop-up */}
      {selection.show && (
        <button
          className="reader__selection-popup"
          style={{ position: 'absolute', left: `${selection.x}px`, top: `${selection.y}px` }}
          onClick={handleSaveSelection}
        >
          Save to Note
        </button>
      )}

      {/* Immersive Viewport: Vertical list with scroll-snap */}
      <main className="immersive-reader__viewport">
        {isFetchingChapter ? (
          <div className="immersive-reader__loading-focus">
            <p>Setting the scene for</p>
            <h2>Chapter {currentChapter?.order}: {currentChapter?.title}</h2>
          </div>
        ) : (
          <div className="immersive-reader__chunk-list" style={{ fontSize: `${fontSize}rem` }}>
            {chunks.map((chunk, index) => (
              <section 
                key={index}
                data-index={index}
                className={`immersive-reader__chunk ${index === activeChunkIndex ? 'active' : ''} ${index < activeChunkIndex ? 'past' : 'future'}`}
              >
                <div className="immersive-reader__chunk-content">
                  <ReactMarkdown>{chunk}</ReactMarkdown>
                </div>
              </section>
            ))}
            
            {/* End of chapter buffer */}
            <div className="immersive-reader__bottom-spacer"></div>
          </div>
        )}
      </main>

      {/* Reused Controls Bar */}
      <div className={`reader__controls-bar ${isHeaderVisible ? 'reader__controls-bar--visible' : ''}`} onClick={handleSettingClick}>
        <div className="reader__progress-container">
          <div className="reader__progress-fill" style={{ width: `${scrollProgress * 100}%` }}></div>
        </div>
        <div className="reader__controls-inner">
          <button className="reader__nav-btn" disabled={currentChapterIndex === 0} onClick={(e) => { e.stopPropagation(); setCurrentChapterIndex(p => p - 1); }}>&larr; Prev</button>
          
          <div className="reader__controls-divider"></div>
          
          <button className="reader__setting-btn reader__desktop-only" onClick={() => setIsFullWidth(p => !p)}>
            {isFullWidth ? 'Centered' : 'Full Width'}
          </button>
          
          <div className="reader__controls-divider"></div>
          
          <button className="reader__setting-btn reader__setting-btn--notes" onClick={() => setIsNotesOpen(true)}>Notes</button>
          
          <div className="reader__controls-divider"></div>
          
          <button className="reader__setting-btn reader__setting-btn--chapters" onClick={() => setIsSidebarOpen(true)}>Chapters</button>
          
          <div className="reader__controls-divider"></div>
          
          <button className="reader__nav-btn" disabled={currentChapterIndex === chapters.length - 1} onClick={(e) => { e.stopPropagation(); setCurrentChapterIndex(p => p + 1); }}>Next &rarr;</button>
        </div>
      </div>
    </div>
  )
}

export default ImmersiveReader
