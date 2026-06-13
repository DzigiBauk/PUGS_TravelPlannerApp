import { useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { RootState, AppDispatch } from '../store'
import type { UserRole } from '../models/User'
import { register } from '../store/slices/authSlice'

function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('User')
  const dispatch = useDispatch<AppDispatch>()
  const location = useLocation()
  const navigate = useNavigate()
  const { loading, error } = useSelector((state: RootState) => state.auth)
  const requestedPath = (location.state as { from?: string } | null)?.from
  const returnPath = requestedPath?.startsWith('/') && !requestedPath.startsWith('//')
    ? requestedPath
    : role === 'Admin' ? '/admin' : '/dashboard'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const result = await dispatch(register({ name, email, password, role }))
    if (register.fulfilled.match(result)) {
      navigate(returnPath, {
        state: { success: 'Account created successfully.' },
      })
    }
  }

  return (
    <div className="auth-page">
      <h2>Create account</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <p className="auth-error">{error}</p>}
        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
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
            autoComplete="new-password"
            minLength={6}
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">Account type</label>
          <select
            id="role"
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
          >
            <option value="User">User</option>
            <option value="Admin">Admin (testing)</option>
          </select>
          <small className="form-help">Admin registration is enabled only in the Development environment.</small>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.9rem', marginTop: 'var(--space-2)' }}>
          Already have an account? <Link to="/login" state={{ from: returnPath }}>Sign in</Link>
        </p>
      </form>
    </div>
  )
}

export default Register
