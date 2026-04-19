import { Component } from 'react';
import { AlertOctagon } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 text-gray-900">
          <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-red-100 text-center">
            <AlertOctagon size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-gray-600 text-sm mb-6">
              A critical error occurred in the application interface.
            </p>
            <div className="bg-red-50 text-red-800 p-4 rounded text-left text-xs font-mono overflow-auto mb-6 h-32">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
