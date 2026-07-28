import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const CursorGlow: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(true);

  const cursorX = useMotionValue(-150);
  const cursorY = useMotionValue(-150);

  const springConfig = { damping: 50, stiffness: 150, mass: 0.8 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 150); // half of 300px width
      cursorY.set(e.clientY - 150); // half of 300px height
      if (!isVisible) setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    if (!isMobile) {
      window.addEventListener('mousemove', moveCursor);
      document.body.addEventListener('mouseleave', handleMouseLeave);
      document.body.addEventListener('mouseenter', handleMouseEnter);
    }

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('mousemove', moveCursor);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      document.body.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isMobile, cursorX, cursorY, isVisible]);

  if (isMobile) return null;

  return (
    <motion.div
      style={{
        translateX: cursorXSpring,
        translateY: cursorYSpring,
      }}
      animate={{
        opacity: isVisible ? 0.35 : 0,
        scale: isVisible ? 1 : 0.8,
      }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 w-[300px] h-[300px] rounded-full pointer-events-none z-[1] blur-[110px] bg-gradient-to-br from-primary to-accent"
    />
  );
};
export default CursorGlow;
