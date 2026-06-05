import { useEffect, useMemo, useState } from 'react'

const BOOKS_API_URL =
  'https://plot-twist-server-gu4sfm6iv-rajdhiman5445s-projects.vercel.app/api/books'

function useBooks(bookId) {
  const [books, setBooks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchBooks() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(BOOKS_API_URL, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch books: ${response.status}`)
        }

        const data = await response.json()
        setBooks(data)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    fetchBooks()

    return () => controller.abort()
  }, [])

  const book = useMemo(() => {
    if (!bookId) {
      return null
    }

    const bookList = Array.isArray(books) ? books : books.data || []
    return bookList.find(({ _id }) => _id === bookId) || null
  }, [bookId, books])

  return { books, book, isLoading, error }
}

export { BOOKS_API_URL }
export default useBooks
