import { useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from '../store'
import { login } from '../store/slices/authSlice'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const requestedPath = (location.state as { from?: string } | null)?.from
  const returnPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) {
      navigate(returnPath, { replace: true })
    }
  }

  return (
    <div className="auth-page">
      <h2>Sign in</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <p className="auth-error">{error}</p>}
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: 'var(--space-2)' }}>
          Do not have an account? <Link to="/register" state={{ from: returnPath }}>Create one</Link>
        </p>
      </form>
    </div>
  )
}

export default Login
