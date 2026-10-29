import React, { useState, useEffect } from 'react';
import ombre from '../assets/ombre.png';

const styles = `
  .contact-page-body {
    min-height: 100vh;
  }
  .contact-container { max-width: 1100px; margin: 60px auto 100px; padding: 0 40px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; }
  .contact-detail { margin-top: 35px; }
  .contact-form-wrapper { background: #ffffffd9; backdrop-filter: blur(15px); padding: 45px; border-radius: 30px; border: 1px solid #ffffff99; }
  input, textarea { width: 100%; padding: 15px; border: 1px solid #e0e0e0; border-radius: 12px; font-size: 1rem; outline: none; margin-bottom: 20px; }
  .full-width-btn { width: 100%; margin-top: 10px; }
  .success-msg { text-align: center; padding: 40px 0; }
  @media (max-width: 900px) { .contact-container { grid-template-columns: 1fr; } }
`;

const emptyForm = { name: '', email: '', message: '' };

function isValidEmail(email) {
  return email.includes('@') && email.includes('.');
}

function isFormValid(form) {
  return form.name && isValidEmail(form.email) && form.message;
}

const Contact = () => {
  const [isSent, setIsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!isFormValid(form)) return alert('Please fill in all fields correctly.');
    setLoading(true);
    setTimeout(() => { setLoading(false); setIsSent(true); }, 1000);
  }

  return (
    <div className="contact-page-body" style={{ backgroundImage: `url(${ombre})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
      <style>{styles}</style>
      <div className="header-spacer">
        <span className="info-subtext">Support Center</span>
        <h1 className="info-h2">Get in touch</h1>
      </div>
      <section className="contact-container">
        <div className="contact-info">
          <h2 className="info-h2">We're based at <br /><span>VIT Chennai.</span></h2>
          <p className="info-p">Have questions? Our team at VIT is here to help.</p>
          <p className="contact-detail"><span className="info-subtext">Direct Email</span><br /><strong>support@voyara.com</strong></p>
          <p className="contact-detail"><span className="info-subtext">Campus Office</span><br />Vellore Institute of Technology,<br />Vandalur-Kelambakkam Road,<br />Chennai, TN 600127</p>
        </div>
        <div className="contact-form-wrapper">
          {!isSent ? (
            <form onSubmit={handleSubmit}>
              <input type="text" name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              <input type="email" name="email" placeholder="Email Address" value={form.email} onChange={handleChange} required />
              <textarea rows="4" name="message" placeholder="How can we help?" value={form.message} onChange={handleChange} required />
              <button type="submit" className="btn-s full-width-btn">{loading ? 'Sending...' : 'Send Message'}</button>
            </form>
          ) : (
            <div className="success-msg">
              <p style={{ fontSize: '3rem' }}>✨</p>
              <h3 className="info-h2">Success!</h3>
              <p className="info-p">We'll get back to you soon.</p>
              <button className="btn-l" onClick={() => { setIsSent(false); setForm(emptyForm); }}>Send another</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Contact;