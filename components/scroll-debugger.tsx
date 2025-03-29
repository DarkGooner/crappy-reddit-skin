"use client";

import { useState, useEffect } from "react";

export function ScrollDebugger() {
  const [scrollInfo, setScrollInfo] = useState({
    scrollY: 0,
    innerHeight: 0,
    scrollHeight: 0,
    scrollPercentage: 0,
  });
  
  useEffect(() => {
    const updateScrollInfo = () => {
      const scrollY = window.scrollY;
      const innerHeight = window.innerHeight;
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollPercentage = Math.round((scrollY / (scrollHeight - innerHeight)) * 100);
      
      setScrollInfo({
        scrollY,
        innerHeight,
        scrollHeight,
        scrollPercentage: isNaN(scrollPercentage) ? 0 : scrollPercentage,
      });
    };
    
    // Update initial values
    updateScrollInfo();
    
    // Add scroll event listener
    window.addEventListener('scroll', updateScrollInfo, { passive: true });
    window.addEventListener('resize', updateScrollInfo, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', updateScrollInfo);
      window.removeEventListener('resize', updateScrollInfo);
    };
  }, []);
  
  // Only show in development mode
  if (process.env.NODE_ENV === 'production') return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
      }}
    >
      <div>Scroll Y: {scrollInfo.scrollY}px</div>
      <div>Height: {scrollInfo.scrollHeight}px</div>
      <div>Viewport: {scrollInfo.innerHeight}px</div>
      <div>Scroll: {scrollInfo.scrollPercentage}%</div>
    </div>
  );
} 