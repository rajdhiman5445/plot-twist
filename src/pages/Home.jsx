import FeaturedSection from '../FeaturedSection.jsx'
import Hero2 from '../hero2.jsx'
import useBooks from '../hooks/useBooks.js'

function Home() {
  const { books, isLoading, error } = useBooks()

  return (
    <div className="home-page">
  
      <Hero2 />
      <section className="home-content">
        {error && <p className="error-message">Error: {error}</p>}
        <FeaturedSection
          books={books.data || []}
          isLoading={isLoading}
          lastCount={7}
        />
      </section>
    </div>
  )
}

export default Home
