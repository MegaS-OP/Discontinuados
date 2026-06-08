import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import './index.css';

const BORDER = '0.5px solid #D3D1C7';

function AppShell() {
  const [view, setView] = useState('dashboard');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const handleOpenDetail = (id) => {
    setSelectedProduct(id);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedProduct(null);
    setView('dashboard');
  };

  const handleNavigate = (newView) => {
    if (newView === 'dashboard') handleBack();
    else setView(newView);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        border: BORDER,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#F1EFE8',
        maxWidth: 1200,
        margin: '0 auto',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      <Sidebar
        activeView={view === 'detail' ? 'dashboard' : view}
        onNavigate={handleNavigate}
      />
      {view === 'detail' && selectedProduct ? (
        <ProductDetail productId={selectedProduct} onBack={handleBack} />
      ) : (
        <Dashboard onOpenDetail={handleOpenDetail} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#E8E6DF', padding: '20px' }}>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </div>
  );
}
