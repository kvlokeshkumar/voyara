import React, { useEffect } from 'react';
import learn2 from '../assets/learn2.avif';
import learn3 from '../assets/learn3.avif';
import learn4 from '../assets/learn4.avif';
import learn5 from '../assets/learn5.avif';
import screenrecord from '../assets/screenrecord.mp4';

const styles = `
  .learn-header {
    padding: 150px 80px 40px;
    text-align: center;
  }
  .video-section {
    text-align: center;
    padding-bottom: 60px;
  }
  video {
    border-radius: 15px;
    max-width: 90%;
  }
  .values-bar {
    max-width: 1200px;
    margin: 0 auto 100px;
    padding: 0 80px;
  }
  .steps-container {
    padding: 0 80px 100px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .step-row {
    display: flex;
    gap: 80px;
    margin-bottom: 100px;
  }
  .step-row.reverse {
    flex-direction: row-reverse;
  }
  .step-number {
    font-size: 80px;
    color: #A3D5DB;
    opacity: 0.4;
  }
  .step-img {
    width: 100%;
    height: 400px;
    object-fit: cover;
    border-radius: 25px;
  }
  .item-3 {
    border-left: 5px solid #D4A373;
  }
`;

const LearnMore = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="learn-more-wrapper">
      <style>{styles}</style>

      <header className="learn-header">
        <span className="info-subtext">Visual Guide</span>
        <h1 className="info-h2">Master the Platform</h1>
      </header>

      <section className="video-section">
        <video width="800" height="450" controls>
          <source src={screenrecord} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </section>

      <section className="values-bar">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="grid-item item-1">
            <h3>150+ Currencies</h3>
            <p>Automatic conversion based on real-time exchange rates as you travel.</p>
          </div>
          <div className="grid-item item-2">
            <h3>Global Coverage</h3>
            <p>Detailed maps and landmark data for over 2,000 cities worldwide.</p>
          </div>
          <div className="grid-item item-3">
            <h3>24/7 Support</h3>
            <p>Direct access to our VIT-based technical team whenever you need help.</p>
          </div>
        </div>
      </section>

      <section className="steps-container">

        <div className="step-row">
          <div>
            <span className="step-number">01</span>
            <h2 className="info-h2">Define Your <br /><span>Destination.</span></h2>
            <p className="info-p">Start by entering your dream location into our search bar. Our planner suggests the best seasons to visit based on global travel trends.</p>
          </div>
          <div>
            <img src={learn2} alt="Planning" className="step-img" />
          </div>
        </div>

        <div className="step-row reverse">
          <div>
            <span className="step-number">02</span>
            <h2 className="info-h2">Set Your <br /><span>Daily Budget.</span></h2>
            <p className="info-p">Tell us your upper limit and let Voyara handle the math for a stress-free trip.</p>
          </div>
          <div>
            <img src={learn3} alt="Budget" className="step-img" />
          </div>
        </div>

        <div className="step-row">
          <div>
            <span className="step-number">03</span>
            <h2 className="info-h2">Start <br /><span>Planning.</span></h2>
            <p className="info-p">Hit Start Planning to launch your personalised trip workspace. Pick your travel dates, group size, and preferences — Voyara instantly surfaces smart recommendations for stays, activities, and transport.</p>
          </div>
          <div>
            <img src={learn4} alt="Start Planning" className="step-img" />
          </div>
        </div>

        <div className="step-row reverse">
          <div>
            <span className="step-number">04</span>
            <h2 className="info-h2">Build &amp; Save Your <br /><span>Itinerary.</span></h2>
            <p className="info-p">Organise your trip day by day — add hotels, flights, and activities. Once done, save your itinerary directly to your dashboard where you can revisit and manage everything in one place.</p>
          </div>
          <div>
            <img src={learn5} alt="Itinerary" className="step-img" />
          </div>
        </div>

        <div className="step-row">
          <div>
            <span className="step-number">05</span>
            <h2 className="info-h2">Track, View &amp; <br /><span>Share.</span></h2>
            <p className="info-p">Log expenses on the go and watch your budget tracker update in real time — broken down by flights, hotels, food, and activities. View everything on your dashboard and share your trip with travel companions via a simple link.</p>
          </div>
          <div>
            <p className="info-p" style={{ marginTop: '40px' }}>Whether you're travelling solo or with a group, Voyara keeps everyone aligned. Share a read-only link or invite collaborators to edit — your trip, your rules.</p>
          </div>
        </div>

      </section>
    </div>
  );
};

export default LearnMore;