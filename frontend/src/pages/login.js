import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { friendlyError, resendCode } from '../auth/cognito';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', pwd: '' });
  const [err, setErr] = useState(location.state?.expired ? 'Your session expired. Please log in again.' : '');
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');

    if (!form.email || !form.pwd) {
      setErr('Email and password required');
      return;
    }

    setBusy(true);
    try {
      await login(form.email, form.pwd);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (error) {
      if (error?.code === 'UserNotConfirmedException') {
        try { await resendCode(form.email); } catch { /* the code step lets the user retry */ }
        navigate('/signup', { state: { verifyEmail: form.email } });
        return;
      }
      setErr(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '85vh', width: '100%' };

  return (
    <div style={centerStyle}>
      <div className="login-card">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Log in to continue planning your trips</p>
        {err && <p className="error">{err}</p>}
        
        <form onSubmit={handleLogin}>
          <div className="auth-form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" className="auth-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>

          <div className="auth-form-group">
            <label>Password</label>
            <input type="password" placeholder="........" className="auth-input" value={form.pwd} onChange={(e) => setForm({ ...form, pwd: e.target.value })} required />
          </div>

          <button type="submit" className="login-submit-btn" disabled={busy}>{busy ? 'Logging in...' : 'Log In'}</button>
        </form>
        
        <p className="auth-footer">Don't have an account? <Link to="/signup" className="auth-link">Sign Up</Link></p>
      </div>
    </div>
  );
};

export default Login;