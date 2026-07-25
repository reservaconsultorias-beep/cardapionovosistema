import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import AdminDashboard from './pages/AdminDashboard.tsx';
import OrderTracking from './pages/OrderTracking.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/ADMIN" element={<AdminDashboard />} />
        <Route path="/Admin" element={<AdminDashboard />} />
        <Route path="/track/:code" element={<OrderTracking />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);


