import React from 'react';
import { Link } from 'react-router-dom';
import './HomeStyle.css';

import bali from '../assets/bali.jfif';
import maldives from '../assets/maldives.jfif';
import greece from '../assets/greece.jfif';
import hawaii from '../assets/hawaii.jfif';
import italy from '../assets/italy.jfif';
import travel from '../assets/travel.avif';

const Home = () => {
  const reviews = [
    { name: "Subha M", text: "Voyara made planning effortless. Best trip of my life!", stars: 5 },
    { name: "Swetha R", text: "Smart suggestions, beautiful itineraries. Absolutely love it.", stars: 5 },
    { name: "Priya V", text: "The budget tracker saved us so much money. Highly recommend!", stars: 5 },
  ];

  return (
    <>
      <header className="main-top">
        <div className="top-content">
          <div className="title-box">
            <h1 className="rot-text">Plan Your Journey.</h1>
            <h1 className="rot-text">Master Your Budget.</h1>
            <h1 className="rot-text">Travel Without Stress.</h1>
          </div>
          <p>The all-in-one travel ecosystem. Create detailed itineraries and track every penny in real-time, ensuring your dream trip stays within reach.</p>
          <Link to="/planner"><button className="btn-main">Start Planning</button></Link>
        </div>
      </header>

      <section className="spots">
        <h2 className="s-title">Budget-Friendly Escapes</h2>
        <div className="mq">
          <div className="card"><img src={bali} alt="Bali"/><div className="card-tag">Bali Itineraries</div></div>
          <div className="card"><img src={maldives} alt="Maldives"/><div className="card-tag">Maldives Budgeting</div></div>
          <div className="card"><img src={greece} alt="Greece"/><div className="card-tag">Greece Stay-Plans</div></div>
          <div className="card"><img src={hawaii} alt="Hawaii"/><div className="card-tag">Hawaii Low-Cost</div></div>
          <div className="card"><img src={italy} alt="Italy"/><div className="card-tag">Italy Essentials</div></div>
          <div className="card"><img src={bali} alt="Bali"/><div className="card-tag">Bali Itineraries</div></div>
        </div>
      </section>

      <section className="info">
        <div className="info-con">
          <div style={{ flex: 1.5 }}>
            <span className="info-subtext">The Modern Way to Travel</span>
            <h2 className="info-h2">Experience <span>Freedom</span> through Structure.</h2>
            <p className="info-p">Voyara bridges the gap between ambitious exploration and logistical reality. By uniting intuitive itinerary visualization with granular financial data, we empower you to navigate the world without the fear of hidden costs or dead-ends.</p>
            <p className="info-p">Our platform is a digital sanctuary for explorers who demand more than fragmented tools. Whether navigating Tokyo's subways or crossing continents, Voyara provides a unified dashboard where every flight, stay, and experience is synchronized.</p>
            <div className="grid">
              <div className="grid-item item-1">
                <h3>Collaborative Planning</h3>
                <p>Invite friends to your board. Drag and drop flights, hotels, and activities into a shared timeline everyone can edit in real-time.</p>
              </div>
              <div className="grid-item item-2">
                <h3>Automated Split-Pay</h3>
                <p>Log an expense, tag the group, and Voyara calculates who owes what in over 150 local currencies. No spreadsheets required.</p>
              </div>
            </div>
          </div>
          <div className="img-box">
            <div className="img-bg"></div>
            <img src={travel} className="img-main" alt="Travel" />
          </div>
        </div>
      </section>

      <section className="reviews">
        <h2>What Travelers Say...</h2>
        <div className="reviews-grid">
          {reviews.map((r, i) => (
            <div className="review-card" key={i}>
              <p className="stars">{"★".repeat(r.stars)}</p>
              <p className="review-text">"{r.text}"</p>
              <span className="reviewer">— {r.name}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;