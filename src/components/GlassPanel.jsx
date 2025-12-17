import React from 'react';
import { motion } from 'framer-motion';

const GlassPanel = ({ 
  children, 
  className = '', 
  delay = 0,
  dark = false,
  hover = false,
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`
        ${dark ? 'border-white/10 bg-white/5' : 'border-gray-200/30 bg-white/80'} 
        ${hover ? 'hover:border-primary/20 hover:bg-white/90 transition-all duration-300' : ''} 
        backdrop-blur-xl rounded-3xl border p-8 shadow-lg
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassPanel;