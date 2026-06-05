import { Route, Routes, useLocation } from 'react-router-dom'

import './App.css'
import Navbar from './Navbar.jsx'
import Authors from './pages/Authors.jsx'
import BookInfo from './pages/BookInfo.jsx'
import Genres from './pages/Genres.jsx'
import Home from './pages/Home.jsx'
import Library from './pages/Library.jsx'
import Reader from './pages/Reader.jsx'
import ImmersiveReader from './pages/ImmersiveReader.jsx'

function App() {
  const { pathname } = useLocation()
  const isImmersivePage = pathname.endsWith('/immersive')
  const isReaderPage = pathname.endsWith('/read') || isImmersivePage
  const isBookInfoPage = pathname.startsWith('/books/') && !isReaderPage

  if (isReaderPage) {
    return (
      <Routes>
        <Route path="/books/:book_id/read" element={<Reader />} />
        <Route path="/books/:book_id/immersive" element={<ImmersiveReader />} />
      </Routes>
    )
  }

  return (
    <div className="app">
      <Navbar />
      <main className={`page-content ${isBookInfoPage ? 'page-content--book-info' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/genres" element={<Genres />} />
          <Route path="/authors" element={<Authors />} />
          <Route path="/books/:book_id" element={<BookInfo />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
