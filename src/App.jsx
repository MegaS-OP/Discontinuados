import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/producto/:id" element={<ProductDetail />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
