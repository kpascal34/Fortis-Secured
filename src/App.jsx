import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import PublicSite from './pages/PublicSite.jsx';
import Portal from './pages/Portal.jsx';
import NotFound from './pages/NotFound.jsx';

const App = () => (
  <AuthProvider>
    <Routes>
      <Route path="/" element={<PublicSite />} />
      <Route path="/portal" element={<Portal />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </AuthProvider>
);

export default App;
