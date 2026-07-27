import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { UserProvider, useUsers } from './context/UserContext';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import Configuracion from './pages/Configuracion';
import Reportes from './pages/Reportes';
import Comparativa from './pages/Comparativa';
import Cambios from './pages/Cambios';
import { useApp } from './context/AppContext';
import './index.css';

const BORDER = '0.5px solid #D3D1C7';

function AppShell() {
  const [view, setView] = useState('dashboard');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { currentUser } = useUsers();
  const { data } = useApp();

  if (!currentUser) return <LoginScreen />;

  const handleOpenDetail = (id) => {
    setSelectedProduct(id);
    setView('detail');
  };

  const handleBack = () => {
    setSelectedProduct(null);
    setView('dashboard');
  };

  const handleNavigate = (newView) => {
    if (newView === 'dashboard') {
      setSelectedProduct(null);
      setView('dashboard');
    } else {
      setView(newView);
    }
  };

  const activeNav = view === 'detail' ? 'dashboard' : view;
  const isWide = view === 'cambios';

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      border: BORDER,
      borderRadius: 10,
      overflow: 'hidden',
      background: '#F1EFE8',
      maxWidth: isWide ? 1720 : 1200,
      margin: '0 auto',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <Sidebar
        activeView={activeNav}
        onNavigate={handleNavigate}
        productCount={data.products.length}
      />

      {view === 'detail' && selectedProduct ? (
        <ProductDetail productId={selectedProduct} onBack={handleBack} />
      ) : view === 'settings' ? (
        <Configuracion />
      ) : view === 'reports' ? (
        <Reportes />
      ) : view === 'comparativa' ? (
        <Comparativa />
      ) : view === 'cambios' ? (
        <Cambios />
      ) : (
        <Dashboard onOpenDetail={handleOpenDetail} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#E8E6DF', padding: '20px' }}>
      <UserProvider>
        <AppProvider>
          <AppShell />
        </AppProvider>
      </UserProvider>
    </div>
  );
}
