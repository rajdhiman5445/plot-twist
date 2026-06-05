import Logo from './Logo.jsx'
import NavMenu from './NavMenu.jsx'

function Navbar() {
  return (
    <header className="navbar">
      <Logo />
      <NavMenu />
      <div className="navbar__actions">
        <input className="navbar__search" type="search" placeholder="Search" />
        <button className="navbar__account" type="button" aria-label="User account" />
      </div>
    </header>
  )
}

export default Navbar
