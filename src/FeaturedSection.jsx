import BookCard from './BookCard.jsx'
import './FeaturedSection.css'

function FeaturedSection({ books, isLoading, lastCount }) {
  return (
    <section className="featured-card">
      <div className="featured-card__header">
        <div className="featured-card__titles">
          <p className="featured-card__title">Tiny Books, Big Ideas</p>
          <p className="featured-card__subheading">Top picks loved by readers around the world</p>
        </div>
        <button className="featured-card__view-all" type="button">
          View all &gt;
        </button>
      </div>

      <div className="featured-card__grid">
        {isLoading
          ? Array.from({ length: lastCount }).map((_, index) => (
              <BookCard key={`featured-skeleton-${index}`} isLoading={true} />
            ))
          : books.map((book) => (
              <BookCard key={book._id} book={book} />
            ))}
      </div>
    </section>
  )
}

export default FeaturedSection
