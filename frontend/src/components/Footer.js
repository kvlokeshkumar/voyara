import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer>
    <Link to="/" className="logo">Voyara</Link>
    <p>&copy; 2026 Voyara Systems &bull; Your Intelligent Travel Partner.</p>
    <p className="f-copy">VOYARA &trade; | SMART TRAVEL &copy;</p>
  </footer>
);

export default Footer;
