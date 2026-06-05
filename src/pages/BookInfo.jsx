import { Link, useParams } from 'react-router-dom'

import useBooks from '../hooks/useBooks.js'
import './BookInfo.css'

function ReadingModeButtons({ bookId }) {
  return (
    <div className="book-info__modes">
      <p className="book-info__mode-label">Read in</p>
      <div className="book-info__mode-buttons">
        <Link
          className="book-info__mode-button"
          to={`/books/${bookId}/read`}
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Classic Mode
        </Link>
        <Link
          className="book-info__mode-button book-info__mode-button--immersive"
          to={`/books/${bookId}/immersive`}
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Immersive Mode
        </Link>
      </div>
    </div>
  )
}

function FloatingBookCover({ coverImage, title }) {
  return (
    <div
      className="book-info__cover-stage"
      style={{ '--book-cover': `url("${coverImage}")` }}
    >
      <div className="book-info__cover-wrap">
        <img className="book-info__cover" src={coverImage} alt={title} />
      </div>
    </div>
  )
}

function BookInfo() {
  const { book_id: bookId } = useParams()
  const { book, isLoading, error } = useBooks(bookId)

  if (isLoading) {
    return <div className="book-info-state">Loading book...</div>
  }

  if (error) {
    return <div className="book-info-state">Unable to load this book: {error}</div>
  }

  if (!book) {
    return <div className="book-info-state">Book not found.</div>
  }

  return (
    <article className="book-info">
      <div className="book-info__content">
        <div className="book-info__details">
          <h1 className="book-info__title">{book.title}</h1>
          <Link
            className="book-info__author"
            to={`/authors?name=${encodeURIComponent(book.author)}`}
          >
            {book.author}
          </Link>
          <p className="book-info__description">{book.description}</p>

          <ReadingModeButtons bookId={bookId} />
        </div>

        <FloatingBookCover coverImage={book.coverImage} title={book.title} />
      </div>
    </article>
  )
}

export default BookInfo
