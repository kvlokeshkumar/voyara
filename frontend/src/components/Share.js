import React, { useState } from 'react';
import './Share.css';

const Share = ({ tripData }) => {
  const [copied, setCopied] = useState(false);

  if (!tripData) return null;

  const shareText = `Check out my trip! 🌍 I'm traveling from ${tripData.from} to ${tripData.to} (${tripData.startDate} to ${tripData.endDate}). Budget: ₹${tripData.budget} for ${tripData.travelers} travelers. #TravelPlanner #Trip`;

  const shareLink = `${window.location.origin}${window.location.pathname}`;

  const handleShare = (platform) => {
    const encodedText = encodeURIComponent(shareText);
    const encodedLink = encodeURIComponent(shareLink);

    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodedText}&u=${encodedLink}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedLink}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedLink}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`,
      email: `mailto:?subject=Check out my trip!&body=${encodeURIComponent(shareText)}`
    };

    if (platform === 'email') {
      window.location.href = urls.email;
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="share-container">
      <h3 className="share-title">Share Your Trip</h3>
      <div className="share-buttons">
        <button className="share-btn fb" onClick={() => handleShare('facebook')} title="Share on Facebook">
          f
        </button>
        <button className="share-btn twitter" onClick={() => handleShare('twitter')} title="Share on Twitter">
          𝕏
        </button>
        <button className="share-btn whatsapp" onClick={() => handleShare('whatsapp')} title="Share on WhatsApp">
          💬
        </button>
        <button className="share-btn linkedin" onClick={() => handleShare('linkedin')} title="Share on LinkedIn">
          in
        </button>
        <button className="share-btn email" onClick={() => handleShare('email')} title="Share via Email">
          ✉
        </button>
        <button className="share-btn copy" onClick={handleCopyLink} title="Copy to clipboard">
          {copied ? '✓ Copied' : '📋'}
        </button>
      </div>
    </div>
  );
};

export default Share;
