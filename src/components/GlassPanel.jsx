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
        ${dark ? 'fs-card' : 'fs-card'}
        ${hover ? 'hover:bg-surface-2 transition-all duration-300' : ''}
        rounded-2xl p-8
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassPanel;