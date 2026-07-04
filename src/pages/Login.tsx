import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MessageCircle } from 'lucide-react'

const API = 'https://chatapp-backend-i946.vercel.app'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Login failed')
      login(data)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 70, height: 70, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <MessageCircle size={35} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.3rem' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Sign in to continue chatting
          </p>
        </div>

        {/* Form */}
        <div style={{
          background: 'var(--bg2)', borderRadius: 16,
          padding: '2rem', border: '1px solid var(--border)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
                Email
              </label>
              <input type="email" name="email" value={formData.email}
                onChange={handleChange} placeholder="john@example.com" required />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '0.4rem' }}>
                Password
              </label>
              <input type="password" name="password" value={formData.password}
                onChange={handleChange} placeholder="••••••••" required />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,77,109,0.1)', border: '1px solid var(--danger)',
                borderRadius: 8, padding: '0.7rem 1rem',
                fontSize: '0.82rem', color: 'var(--danger)',
              }}>
                ❌ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 50, padding: '0.85rem', fontWeight: 700,
              fontSize: '0.92rem', marginTop: '0.5rem',
              opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
            }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}