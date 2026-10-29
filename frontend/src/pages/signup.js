import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmSignUp, friendlyError, resendCode, signUp } from '../auth/cognito';
import './signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: location.state?.verifyEmail || '', pwd: '', cpwd: '' });
  const [step, setStep] = useState(location.state?.verifyEmail ? 'verify' : 'form');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState(location.state?.verifyEmail ? 'We sent a verification code to your email.' : '');
  const [busy, setBusy] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setErr('');

    if (!form.name || !form.email || !form.pwd) {
      setErr('All fields required');
      return;
    }
    if (form.pwd !== form.cpwd) {
      setErr('Passwords do not match');
      return;
    }
    if (form.pwd.length < 8) {
      setErr('Password must be 8+ characters');
      return;
    }

    setBusy(true);
    try {
      await signUp(form.email, form.pwd, form.name);
      setInfo('We sent a verification code to your email.');
      setStep('verify');
    } catch (error) {
      setErr(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await confirmSignUp(form.email, code);
      navigate('/login');
    } catch (error) {
      setErr(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setErr('');
    try {
      await resendCode(form.email);
      setInfo('A new code has been sent.');
    } catch (error) {
      setErr(friendlyError(error));
    }
  };

  const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%', backgroundColor: '#ffffff' };

  return (
    <div style={centerStyle}>
      <div className="signup-card">
        <h1 className="auth-title">Join Voyara</h1>
        <p className="auth-subtitle">Create your account and start exploring</p>
        {err && <p className="error">{err}</p>}
        {info && !err && <p className="auth-subtitle">{info}</p>}

        {step === 'verify' ? (
          <form onSubmit={handleVerify}>
            <div className="auth-form-group">
              <label>Verification code</label>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" className="auth-input" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <button type="submit" className="signup-submit-btn" disabled={busy}>{busy ? 'Verifying...' : 'Verify Email'}</button>
            <p className="auth-footer"><button type="button" className="auth-link v-link-btn" onClick={handleResend}>Resend code</button></p>
          </form>
        ) : (
        <form onSubmit={handleSignup}>
          <div className="auth-form-group">
            <label>Full Name</label>
            <input type="text" placeholder="Your full name" className="auth-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="auth-form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" className="auth-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="auth-form-group">
            <label>Password</label>
            <input type="password" placeholder="Min 8 characters" className="auth-input" value={form.pwd} onChange={(e) => setForm({ ...form, pwd: e.target.value })} required />
          </div>
          <div className="auth-form-group">
            <label>Confirm Password</label>
            <input type="password" placeholder="........" className="auth-input" value={form.cpwd} onChange={(e) => setForm({ ...form, cpwd: e.target.value })} required />
          </div>
          <button type="submit" className="signup-submit-btn" disabled={busy}>{busy ? 'Creating account...' : 'Create Account'}</button>
        </form>
        )}
        
        <p className="auth-footer">Already have an account? <Link to="/login" className="auth-link">Log In</Link></p>
      </div>
    </div>
  );
};

export default Signup;