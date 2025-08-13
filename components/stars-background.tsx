'use client'

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Star {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

interface StarsBackgroundProps {
  numStars?: number;
}

export function StarsBackground({ numStars = 100 }: StarsBackgroundProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = [];
      for (let i = 0; i < numStars; i++) {
        newStars.push({
          id: `star-${i}`,
          x: Math.random() * 100, // Percentage of viewport width
          y: Math.random() * 100, // Percentage of viewport height
          size: Math.random() * 2 + 1, // Size between 1px and 3px
          opacity: Math.random() * 0.8 + 0.2, // Opacity between 0.2 and 1.0
          delay: Math.random() * 5, // Animation delay for twinkling effect
        });
      }
      setStars(newStars);
    };

    generateStars();
    // Regenerate stars if window resizes (optional, but good for responsiveness)
    const handleResize = () => generateStars();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [numStars]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className={cn(
            "absolute bg-white rounded-full animate-twinkle"
          )}
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: var(--initial-opacity, 1); }
          50% { opacity: 0.2; }
        }
        .animate-twinkle {
          animation: twinkle 4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
