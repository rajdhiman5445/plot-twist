import { useState } from 'react'
import './hero2.css'

import heroImage from './assets/hero2.png'

function Hero2() {
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  return (
    <section className="hero-card">
      <div className="hero-card__content">
        <p className="hero-card__eyebrow">Editor's Pick</p>
        <h1 className="hero-card__title">Consume Ideas from World's Sharpest Minds</h1>
        <p className="hero-card__description">
          Curated books that changes how you think, work, and live.
        </p>
        <button className="hero-card__button" type="button">
          Explore Now
        </button>
      </div>
      <div
        className={`hero2-card__image-wrap${isImageLoaded ? ' hero2-card__image-wrap--loaded' : ''}`}
      >
        <img
          className="hero2-card__image"
          src={heroImage}
          alt=""
          decoding="async"
          onLoad={() => setIsImageLoaded(true)}
        />
      </div>
    </section>
  )
}

export default Hero2
