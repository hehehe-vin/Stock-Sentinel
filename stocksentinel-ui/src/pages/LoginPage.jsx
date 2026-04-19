import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
      <div className="w-full max-w-md p-8 rounded-2xl shadow-xl transition-all"
           style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        
        {/* Logo / Title */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Activity size={48} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-bold mt-4" style={{ color: 'var(--text)' }}>
            StockSentinel
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
            Sign in to your account
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg mb-6 text-sm font-medium animate-pulse"
               style={{ background: 'var(--danger)', color: '#fff' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-sm font-medium mb-1.5"
                   style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              placeholder="you@example.com" 
            />
          </div>
          
          {/* Password field */}
          <div>
             <label className="block text-sm font-medium mb-1.5"
                   style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
              placeholder="••••••••" 
            />
          </div>

          {/* Submit button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-2 rounded-lg font-medium text-sm transition-all duration-200 hover:opacity-90 disabled:opacity-50 flex justify-center items-center gap-2"
            style={{
              background: 'var(--accent)',
              color: '#fff'
            }}
          >
            {loading ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> Signing in...</>
            ) : "Sign In"}
          </button>
        </form>

        {/* Register link */}
        <p className="text-center mt-8 text-sm"
           style={{ color: 'var(--text-secondary)' }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: 'var(--accent)' }}
                className="font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
