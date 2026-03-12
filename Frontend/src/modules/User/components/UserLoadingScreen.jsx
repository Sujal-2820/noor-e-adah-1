import React, { useEffect, useState } from 'react';
import { Trans } from '../../../components/Trans';
import './UserLoadingScreen.css';

export function UserLoadingScreen({ progress = 0, message = "Preparing your experience..." }) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="user-loading-screen">
      <div className="user-loading-screen__content">
        <div className="user-loading-screen__brand">
          <img src="/assets/NoorEAdahLogo.png" alt="Noor E Adah" className="h-16 w-auto object-contain rounded-full mb-4 shadow-xl ring-2 ring-brand-faded p-1" />
          <p className="user-loading-screen__subtitle">
            OFFICIAL BOUTIQUE
          </p>
        </div>

        <div className="user-loading-screen__progress-container">
          <div 
            className="user-loading-screen__progress-bar" 
            style={{ width: `${progress}%` }} 
          />
        </div>

        <div className="user-loading-screen__status">
          <p className="user-loading-screen__message">
            <Trans>{message}</Trans>{dots}
          </p>
          <span className="user-loading-screen__percentage">{Math.round(progress)}%</span>
        </div>

        <div className="user-loading-screen__decor">
          <div className="user-loading-screen__circle user-loading-screen__circle--1"></div>
          <div className="user-loading-screen__circle user-loading-screen__circle--2"></div>
        </div>
      </div>
      
      <div className="user-loading-screen__footer">
        <p>© 2024 Noor E Adah. All rights reserved.</p>
      </div>
    </div>
  );
}
