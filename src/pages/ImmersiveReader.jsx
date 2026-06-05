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
  const [activeChunkIndex, setActiveChunkIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  // Save progress
  useEffect(() => {
    if (bookId) {
      localStorage.setItem(`plot-twist-progress-${bookId}`, currentChapterIndex)
    }
  }, [bookId, currentChapterIndex])

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

    // 1. Split by paragraphs first
    const paragraphs = markdownContent
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0)

    const refinedChunks = []

    // 2. Sub-divide long paragraphs into roughly 50-word segments
    paragraphs.forEach(para => {
      const words = para.split(/\s+/)
      if (words.length <= 65) { // Threshold for sub-dividing
        refinedChunks.push(para)
      } else {
        for (let i = 0; i < words.length; i += 50) {
          refinedChunks.push(words.slice(i, i + 50).join(' '))
        }
      }
    })
    
    // Add Chapter Header as first chunk
    const chapter = book?.chapters[currentChapterIndex]
    const headerChunk = `# Chapter ${chapter?.order}\n## ${chapter?.title}`
    
    setChunks([headerChunk, ...refinedChunks])
    setActiveChunkIndex(0)
    window.scrollTo(0, 0)
  }, [markdownContent, currentChapterIndex, book])

  // Virtual Scroll Sync: Map scroll depth to active chunk
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = window.pageYOffset || document.documentElement.scrollTop
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
      if (height <= 0) return

      const progress = winScroll / height
      setScrollProgress(progress)

      if (chunks.length > 0) {
        const index = Math.min(
          chunks.length - 1,
          Math.floor(progress * chunks.length)
        )
        setActiveChunkIndex(index)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [chunks.length])

  // Reused Handlers
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
    <div className={`immersive-reader reader--theme-${theme} ${isFullWidth ? 'reader--full-width' : ''}`} onClick={toggleHeader} style={{ '--read-progress': scrollProgress }}>
      <div className="immersive-reader__bg"></div>
      
      {/* Reused Classic Header */}
      <header className={`reader__header ${isHeaderVisible ? 'reader__header--visible' : ''}`}>
        <Link to={`/books/${bookId}`} className="reader__back" onClick={handleSettingClick}>
          &larr; Exit Immersive
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

      {/* Immersive Viewport: Only 1 Chunk Visible at a time */}
      <main className="immersive-reader__viewport">
        <div className="immersive-reader__scroll-spacer" style={{ height: `${chunks.length * 100}vh` }}></div>
        
        <div className="immersive-reader__focus-window">
          {isFetchingChapter ? (
            <div className="immersive-state">Loading focus chunks...</div>
          ) : (
            <div className="immersive-reader__chunk-container" style={{ fontSize: `${fontSize}rem` }}>
              {chunks.map((chunk, index) => (
                <div 
                  key={index}
                  className={`immersive-reader__chunk ${index === activeChunkIndex ? 'active' : ''} ${index < activeChunkIndex ? 'past' : ''} ${index > activeChunkIndex ? 'future' : ''}`}
                >
                  <ReactMarkdown>{chunk}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Reused Controls Bar */}
      <div className={`reader__controls-bar ${isHeaderVisible ? 'reader__controls-bar--visible' : ''}`} onClick={handleSettingClick}>
        <div className="reader__progress-container">
          <div className="reader__progress-fill" style={{ width: `${scrollProgress * 100}%` }}></div>
        </div>
        <div className="reader__controls-inner">
          <button className="reader__nav-btn" disabled={currentChapterIndex === 0} onClick={(e) => { e.stopPropagation(); setCurrentChapterIndex(p => p - 1); }}>&larr; Prev</button>
          <div className="reader__controls-divider"></div>
          <div className="reader__settings-group reader__settings-group--font">
            <button className="reader__setting-btn" onClick={() => setFontSize(p => Math.max(0.8, p - 0.1))}>A-</button>
            <button className="reader__setting-btn" onClick={() => setFontSize(p => Math.min(3.5, p + 0.1))}>A+</button>
          </div>
          <div className="reader__controls-divider"></div>
          <div className="reader__settings-group reader__settings-group--theme">
            <button className={`reader__theme-btn reader__theme-btn--default ${theme === 'default' ? 'active' : ''}`} onClick={() => setTheme('default')}></button>
            <button className={`reader__theme-btn reader__theme-btn--dark ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}></button>
            <button className={`reader__theme-btn reader__theme-btn--light ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}></button>
          </div>
          <div className="reader__controls-divider reader__desktop-only"></div>
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
