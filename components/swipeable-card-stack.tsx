'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface SwipeableCardStackProps {
  children: React.ReactElement[]; // Expecting React elements to clone props
  className?: string;
}

export function SwipeableCardStack({ children, className }: SwipeableCardStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const numCards = React.Children.count(children);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsSwiping(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    setCurrentX(e.touches[0].clientX);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const diffX = currentX - startX;
    const swipeThreshold = 50; // Pixels to consider a swipe

    if (diffX < -swipeThreshold && activeIndex < numCards - 1) {
      setActiveIndex((prev) => prev + 1);
    } else if (diffX > swipeThreshold && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
    setStartX(0);
    setCurrentX(0);
  }, [isSwiping, currentX, startX, activeIndex, numCards]);

  // Add mouse events for desktop interaction
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsSwiping(true);
    setStartX(e.clientX);
    setCurrentX(e.clientX);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSwiping) return;
    setCurrentX(e.clientX);
  }, [isSwiping]);

  const handleMouseUp = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const diffX = currentX - startX;
    const swipeThreshold = 50;

    if (diffX < -swipeThreshold && activeIndex < numCards - 1) {
      setActiveIndex((prev) => prev + 1);
    } else if (diffX > swipeThreshold && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
    setStartX(0);
    setCurrentX(0);
  }, [isSwiping, currentX, startX, activeIndex, numCards]);

  // Attach mousemove and mouseup to window to handle drag outside container
  useEffect(() => {
    if (isSwiping) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isSwiping, handleMouseMove, handleMouseUp]);


  return (
    <div
      ref={containerRef}
      className={cn("relative w-full max-w-[300px] h-[420px] flex justify-center items-center", className)} // Adjusted height
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {React.Children.map(children, (child, index) => {
        const distance = index - activeIndex;
        const isCurrent = index === activeIndex;

        let scale = 0.85;
        let translateX = 0;
        let zIndex = numCards - Math.abs(distance);
        let opacity = 1;
        let pointerEvents: 'auto' | 'none' = 'auto';

        if (isCurrent) {
          scale = 1;
          translateX = 0;
          zIndex = numCards;
        } else if (distance === 1) { // Immediate next card
          translateX = 120; // Adjusted for narrower width
          scale = 0.85;
          opacity = 1;
        } else if (distance === -1) { // Immediate previous card
          translateX = -120; // Adjusted for narrower width
          scale = 0.85;
          opacity = 1;
        } else { // Cards further away (more than one step)
          opacity = 0; // Hide them
          pointerEvents = 'none'; // Ensure they are not interactive
          // Keep some default transform to avoid jumpiness if they become visible
          translateX = distance > 0 ? 150 : -150; // Push them far out
          scale = 0.7;
        }

        // Apply drag offset during swipe
        if (isSwiping && containerRef.current) {
          const dragOffset = currentX - startX;
          const swipeProgress = dragOffset / (containerRef.current.offsetWidth / 2);

          if (isCurrent) {
            translateX += dragOffset * 0.8;
            scale = 1 - Math.abs(swipeProgress) * 0.1;
          } else if (distance === 1) { // Next card
            translateX += dragOffset * 0.8;
            scale = 0.85 + Math.abs(swipeProgress) * 0.1;
          } else if (distance === -1) { // Previous card
            translateX += dragOffset * 0.8;
            scale = 0.85 + Math.abs(swipeProgress) * 0.1;
          }
        }

        return (
          <div
            key={index}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[280px] h-full transition-all duration-300 ease-out" // Adjusted max-w
            style={{
              transform: `translateX(${translateX}px) scale(${scale})`,
              zIndex: zIndex,
              pointerEvents: pointerEvents, // Use the calculated pointerEvents
              opacity: opacity,
            }}
          >
            {React.cloneElement(child, { isActive: isCurrent })}
          </div>
        );
      })}
    </div>
  );
}
