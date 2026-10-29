import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './pages/HomeStyle.css';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './auth/AuthContext';

import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import LearnMore from './pages/LearnMore';
import Signup from './pages/signup';
import Login from './pages/login';

import Planner from './pages/Planner';
import TripCreated from './pages/TripCreated';
import Itinerary from './pages/Itinerary';

import Budget from './pages/Budget';

import Dashboard from './pages/Dashboard';

import AdminPanel from './pages/AdminPanel';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Same routes as before; private pages now require a Cognito session,
// and /admin additionally requires membership of the "admins" group (also enforced by the API).
function App() {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <div className="App">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
              <Route path="/planner" element={<ProtectedRoute><Planner /></ProtectedRoute>} />
              <Route path="/trip-created" element={<ProtectedRoute><TripCreated /></ProtectedRoute>} />
              <Route path="/itinerary" element={<ProtectedRoute><Itinerary /></ProtectedRoute>} />
              <Route path="/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
