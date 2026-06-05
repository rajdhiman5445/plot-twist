import { useState } from 'react'
import { Link } from 'react-router-dom'

import './BookCard.css'

function BookCard({ book, isLoading }) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  if (isLoading) {
    return (
      <div className="book-card book-card--skeleton">
        <div className="book-card__image-container">
          <div className="book-card__skeleton-image" />
        </div>
        <div className="book-card__info">
          <div className="book-card__skeleton-text book-card__skeleton-title" />
          <div className="book-card__skeleton-text book-card__skeleton-author" />
        </div>
      </div>
    )
  }

  const { _id, title, author, coverImage } = book

  return (
    <Link className="book-card" to={`/books/${_id}`}>
      <div className="book-card__image-container">
        <img
          src={coverImage}
          alt={title}
          className={`book-card__image ${isImageLoaded ? 'book-card__image--loaded' : ''}`}
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>
      <div className="book-card__info">
        <h3 className="book-card__title">{title}</h3>
        <p className="book-card__author">{author}</p>
      </div>
    </Link>
  )
}

export default BookCard
