import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">Voyara</Link>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/dashboard">Dashboard</Link></li>
        <li><Link to="/planner">Trip Planner</Link></li>
        <li><Link to="/budget">Budget</Link></li>
        <li><Link to="/about">About</Link></li>
        <li><Link to="/learn-more">Learn More</Link></li>
        <li><Link to="/contact">Contact</Link></li>
        {user?.isAdmin && <li><Link to="/admin">Admin</Link></li>}
      </ul>
      <div className="auth">
        {user ? (
          <button className="btn-l" onClick={handleLogout} title={user.email}>Log Out</button>
        ) : (
          <>
            <Link to="/login">
              <button className="btn-l">Log In</button>
            </Link>
            <Link to="/signup">
              <button className="btn-s">Sign Up</button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
