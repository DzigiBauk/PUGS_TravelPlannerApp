import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store'
import { logout } from '../store/slices/authSlice'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()

  const handleLogout = () => {
    dispatch(logout())
    setMenuOpen(false)
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          Travel Planner
        </Link>

        <button
          className={`navbar-toggle${menuOpen ? ' open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
        >
          <span className="navbar-toggle-line" />
          <span className="navbar-toggle-line" />
          <span className="navbar-toggle-line" />
        </button>

        <ul id="primary-navigation" className={`navbar-links${menuOpen ? ' open' : ''}`}>
          {isAuthenticated ? (
            <>
              <li><Link to="/dashboard" onClick={() => setMenuOpen(false)}>My plans</Link></li>
              {user?.role === 'Admin' && (
                <li><Link to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link></li>
              )}
              <li><span className="navbar-user">Welcome, {user?.name}</span></li>
              <li>
                <button className="navbar-btn" onClick={handleLogout}>
                  Sign out
                </button>
              </li>
            </>
          ) : (
            <>
              <li><Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link></li>
              <li><Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
