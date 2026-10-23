import React, { StrictMode, ReactNode, ErrorInfo, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

// Apenas registra erros globais (ex.: extensões como MetaMask) sem derrubar a página
window.addEventListener('error', (e) => {
  console.error('Global Error:', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled Rejection:', e.reason);
});

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// 🚀 CODE SPLITTING & LAZY LOADING:
// O cardápio dos clientes (/) não carrega os módulos pesados do painel administrativo.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.tsx'));
const OrderTracking = lazy(() => import('./pages/OrderTracking.tsx'));
const InteractiveReport = lazy(() => import('./pages/InteractiveReport.tsx'));

const AdminLoadingFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0c0a09', color: '#ffffff', fontFamily: 'sans-serif' }}>
    <div style={{ width: '44px', height: '44px', border: '3px solid rgba(253, 222, 88, 0.2)', borderTopColor: '#fdde58', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ marginTop: '16px', fontSize: '13px', fontWeight: 'bold', color: '#e7e5e4', letterSpacing: '0.04em' }}>Carregando Painel Administrativo...</p>
  </div>
);

const GeneralLoadingFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', color: '#0f172a', fontFamily: 'sans-serif' }}>
    <div style={{ width: '38px', height: '38px', border: '3px solid #e2e8f0', borderTopColor: '#8b0000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ marginTop: '12px', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Carregando...</p>
  </div>
);

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in React tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: '640px', width: '100%', border: '1px solid #e2e8f0', textAlign: 'left' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', marginBottom: '8px' }}>Erro ao Carregar Painel / Cardápio</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>Ocorreu o seguinte erro de execução:</p>
            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px', overflowX: 'auto', marginBottom: '20px', fontSize: '13px', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {this.state.error?.toString() || 'Erro desconhecido'}
              {'\n\n'}
              {this.state.error?.stack}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{ backgroundColor: '#ea1d2c', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(234,29,44,0.3)' }}
            >
              🔄 Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
          <Route path="/admin/:tab" element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
          <Route path="/ADMIN" element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
          <Route path="/ADMIN/:tab" element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
          <Route path="/Admin" element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
          <Route path="/Admin/:tab" element={<Suspense fallback={<AdminLoadingFallback />}><AdminDashboard /></Suspense>} />
          <Route path="/track/:code" element={<Suspense fallback={<GeneralLoadingFallback />}><OrderTracking /></Suspense>} />
          <Route path="/report-2026" element={<Suspense fallback={<GeneralLoadingFallback />}><InteractiveReport /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
