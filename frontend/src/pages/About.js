import React, { useEffect } from 'react';
import about1 from '../assets/about1.avif';
import about2 from '../assets/about2.avif';

const styles = `
  .about-banner {
    position: relative;
    height: 500px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-top: 60px;
  }
  .banner-img {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    z-index: -1;
  }
  .banner-text { text-align: center; }
  .banner-text .info-h2 { font-size: 55px; color: #ffffff; }
  .banner-text .info-subtext { color: #ffffff; }
  .values-section {
    padding: 100px 80px;
    background: linear-gradient(135deg, #ffffff, #f0fafa, #fff5f2);
  }
  .values-header { text-align: center; margin-bottom: 60px; }
  .icon { font-size: 30px; margin-bottom: 20px; }
  .item-3 { border-left: 5px solid #D4A373; }
  @media (max-width: 900px) {
    .values-section { padding: 60px 20px; }
    .banner-text .info-h2 { font-size: 40px; }
  }
`;

const About = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="about-wrapper">
      <style>{styles}</style>

      <header className="about-banner">
        <img src={about1} alt="Boat on calm water" className="banner-img" />
        <div className="top-content banner-text">
          <span className="info-subtext">Established 2024</span>
          <h1 className="info-h2">Redefining the way <br /><span>the world travels.</span></h1>
        </div>
      </header>

      <section className="info">
        <div className="info-con">
          <div>
            <span className="info-subtext">Our Mission</span>
            <h2 className="info-h2">Travel without <br /><span>the math.</span></h2>
            <p className="info-p">Voyara was born from a simple yet powerful observation: the most transformative moments of a journey are too often overshadowed by the exhausting weight of logistical management.</p>
            <p className="info-p">Our team came together to bridge the gap between high-level travel ambition and ground-level reality, balancing financial tracking with intuitive itinerary planning.</p>
          </div>
          <div className="img-box">
            <div className="img-bg"></div>
            <img src={about2} className="img-main" alt="Our Vision" />
          </div>
        </div>
      </section>

      <section className="values-section">
        <div className="values-header">
          <span className="info-subtext">Why Voyara?</span>
          <h2 className="info-h2">Our Core Values</h2>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
          <div className="grid-item item-1">
            <div className="icon">✨</div>
            <h3>Radical Transparency</h3>
            <p>Clear, real-time data and honest tracking for every cent spent abroad. Eliminates hidden fee anxiety by syncing local exchange rates.</p>
          </div>
          <div className="grid-item item-2">
            <div className="icon">🌍</div>
            <h3>Global Inspiration</h3>
            <p>We don't just plan trips, we foster curiosity. By curating budget-conscious experiences, we empower users to explore the furthest reaches of the globe.</p>
          </div>
          <div className="grid-item item-3">
            <div className="icon">🛠️</div>
            <h3>Intelligent Utility</h3>
            <p>Modern nomads need tools as fast as their lifestyle. Offline accessibility and granular control over group expenses.</p>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="grid-item item-1">
            <div className="icon">🤝</div>
            <h3>Community First</h3>
            <p>Travel is better together. Voyara is built around shared experiences — from collaborative itineraries to group expense splitting across any currency.</p>
          </div>
          <div className="grid-item item-2">
            <div className="icon">🔒</div>
            <h3>Privacy by Design</h3>
            <p>Your travel data is yours. We never sell your information or share your itineraries without explicit consent. Security is built into every layer.</p>
          </div>
          <div className="grid-item item-3">
            <div className="icon">♻️</div>
            <h3>Sustainable Travel</h3>
            <p>We actively promote eco-conscious travel choices — from low-carbon transport options to responsible tourism recommendations at every destination.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;