import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font)' }}>
      <div className="text-center">
        <AlertCircle size={64} style={{ color: 'var(--accent)' }} className="mx-auto mb-6" />
        <h1 className="text-6xl font-bold mb-4 font-mono" style={{ color: 'var(--text)' }}>404</h1>
        <h2 className="text-2xl font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Page Not Found</h2>
        <p className="mb-8 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
          The dashboard or page you are looking for does not exist or has been moved.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
