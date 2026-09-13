import React from 'react';
import { renderToString } from 'react-dom/server';
import { motion } from 'framer-motion';

const TestComponent = () => {
  return React.createElement(motion.div, {
    initial: { opacity: 0 },
    animate: { opacity: 1 }
  }, "Framer Motion Test");
};

console.log(renderToString(React.createElement(TestComponent)));
