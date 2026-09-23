import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PageLoader({ onComplete }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      if (onComplete) onComplete();
    }, 900);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white"
        >
          <div className="relative flex flex-col items-center">
            {/* Logo Mark */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="w-10 h-10 rounded-xl bg-ariso-600 flex items-center justify-center shadow-lg shadow-ariso-500/20">
                <svg className="w-6 h-6 text-white" viewBox="0 0 32 32" fill="none">
                  <path d="M8 22L16 8L24 22H19.5L16 15.5L12.5 22H8Z" fill="currentColor" />
                </svg>
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">
                ARISO
              </span>
            </motion.div>

            {/* Expanding line */}
            <div className="w-48 h-[2px] bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
                className="w-full h-full bg-gradient-to-r from-transparent via-ariso-600 to-transparent"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
