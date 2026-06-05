import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Library', to: '/library' },
  { label: 'Genres', to: '/genres' },
  { label: 'Authors', to: '/authors' },
]

function NavMenu() {
  return (
    <nav className="nav-menu" aria-label="Primary navigation">
      {navItems.map((item) => (
        <NavLink
          className={({ isActive }) =>
            `nav-menu__item${isActive ? ' nav-menu__item--active' : ''}`
          }
          end={item.to === '/'}
          key={item.to}
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export default NavMenu
