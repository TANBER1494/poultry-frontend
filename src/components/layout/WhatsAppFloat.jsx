import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './WhatsAppFloat.css';

const WHATSAPP_NUMBER = '2001112793953';
const DEFAULT_MESSAGE = 'مرحباً، أحتاج مساعدة بخصوص نظام إدارة المزارع';
const AUTO_HIDE_DELAY = 4000; // ms before auto-retracting

const WhatsAppFloat = () => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasEntrance, setHasEntrance] = useState(false);
  const hideTimerRef = useRef(null);
  const isTouchRef = useRef(false);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;

  // Detect touch device on first touch — prevents mouse events from interfering
  useEffect(() => {
    const onTouch = () => { isTouchRef.current = true; };
    window.addEventListener('touchstart', onTouch, { once: true, passive: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, []);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startHideTimer = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      setIsRevealed(false);
    }, AUTO_HIDE_DELAY);
  }, [clearHideTimer]);

  // Desktop only — touch devices handle reveal via click
  const handleMouseEnter = useCallback(() => {
    if (isTouchRef.current) return;
    setIsRevealed(true);
    clearHideTimer();
  }, [clearHideTimer]);

  const handleMouseLeave = useCallback(() => {
    if (isTouchRef.current) return;
    startHideTimer();
  }, [startHideTimer]);

  // Click handler — on touch: first tap reveals, second tap navigates
  const handleClick = useCallback((e) => {
    if (isTouchRef.current && !isRevealed) {
      e.preventDefault();
      setIsRevealed(true);
      startHideTimer();
    }
    // Desktop clicks or second mobile tap → navigate normally
  }, [isRevealed, startHideTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  return (
    <div
      className={`whatsapp-float-container ${isRevealed ? 'revealed' : ''}`}
      id="whatsapp-float"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tooltip — only shows when fully revealed */}
      <AnimatePresence>
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="whatsapp-tooltip"
          >
            <span>تواصل معنا عبر واتساب</span>
            <div className="whatsapp-tooltip-arrow" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-btn"
        onClick={handleClick}
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.8 }}
        onAnimationComplete={() => setHasEntrance(true)}
        whileTap={{ scale: 0.9 }}
        aria-label="تواصل معنا عبر واتساب"
      >
        {/* Pulse rings — only when revealed */}
        <span className={`whatsapp-pulse-ring ring-1 ${isRevealed ? 'active' : ''}`} />
        <span className={`whatsapp-pulse-ring ring-2 ${isRevealed ? 'active' : ''}`} />

        {/* WhatsApp SVG Icon */}
        <svg
          className="whatsapp-icon"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16.004 2.002C8.27 2.002 2.004 8.268 2.004 16.002c0 2.476.648 4.89 1.878 7.014L2 30l7.168-1.87A13.93 13.93 0 0016.004 30c7.734 0 14-6.266 14-14s-6.266-13.998-14-13.998zm0 25.596a11.59 11.59 0 01-5.93-1.624l-.424-.252-4.258 1.11 1.134-4.136-.278-.44A11.56 11.56 0 014.404 16c0-6.394 5.206-11.598 11.6-11.598S27.604 9.608 27.604 16c0 6.394-5.206 11.598-11.6 11.598zm6.354-8.68c-.348-.174-2.062-1.016-2.382-1.132-.32-.116-.552-.174-.784.174-.232.348-.9 1.132-1.102 1.364-.204.232-.406.26-.754.088-.348-.174-1.468-.54-2.796-1.722-1.034-.92-1.732-2.056-1.936-2.404-.204-.348-.022-.536.152-.71.158-.156.348-.406.522-.61.174-.204.232-.348.348-.58.116-.232.058-.436-.03-.61-.088-.174-.784-1.89-1.074-2.588-.284-.68-.572-.588-.784-.598l-.668-.012c-.232 0-.61.088-.928.436-.32.348-1.218 1.19-1.218 2.904 0 1.712 1.248 3.366 1.422 3.598.174.232 2.454 3.748 5.948 5.254.832.358 1.482.572 1.988.732.836.264 1.596.228 2.198.138.67-.1 2.062-.844 2.352-1.66.29-.814.29-1.514.204-1.66-.088-.146-.32-.232-.668-.406z"
            fill="white"
          />
        </svg>
      </motion.a>
    </div>
  );
};

export default WhatsAppFloat;
