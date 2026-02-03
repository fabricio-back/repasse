'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface SplitTextProps {
  children: string;
  className?: string;
  delay?: number;
  animationType?: 'fade' | 'slide' | 'scale' | 'blur';
}

export function SplitText({ 
  children, 
  className = '', 
  delay = 0,
  animationType = 'fade'
}: SplitTextProps) {
  const words = children.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { 
        staggerChildren: 0.05, 
        delayChildren: delay 
      },
    }),
  };

  const childVariants = {
    fade: {
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring' as const,
          damping: 12,
          stiffness: 100,
        },
      },
      hidden: {
        opacity: 0,
        y: 20,
      },
    },
    slide: {
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          type: 'spring' as const,
          damping: 12,
          stiffness: 100,
        },
      },
      hidden: {
        opacity: 0,
        x: -20,
      },
    },
    scale: {
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          type: 'spring' as const,
          damping: 12,
          stiffness: 100,
        },
      },
      hidden: {
        opacity: 0,
        scale: 0.8,
      },
    },
    blur: {
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: {
          duration: 0.4,
        },
      },
      hidden: {
        opacity: 0,
        filter: 'blur(10px)',
      },
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ display: 'inline-block' }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          style={{ 
            display: 'inline-block',
            whiteSpace: 'pre',
          }}
        >
          {word.split('').map((char, charIndex) => (
            <motion.span
              key={`${index}-${charIndex}`}
              variants={childVariants[animationType]}
              style={{ display: 'inline-block' }}
            >
              {char}
            </motion.span>
          ))}
          {index < words.length - 1 && (
            <motion.span
              variants={childVariants[animationType]}
              style={{ display: 'inline-block' }}
            >
              &nbsp;
            </motion.span>
          )}
        </span>
      ))}
    </motion.span>
  );
}

// Componente para animar palavras inteiras (mais performático)
export function SplitWords({ 
  children, 
  className = '', 
  delay = 0 
}: SplitTextProps) {
  const words = children.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.08, 
        delayChildren: delay 
      },
    },
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
      style={{ display: 'inline-block' }}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          style={{ 
            display: 'inline-block',
            marginRight: '0.25em'
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

// Componente para destacar parte do texto
export function HighlightText({
  children,
  highlightWords,
  highlightClassName = 'text-amber-500',
  className = '',
}: {
  children: string;
  highlightWords: string[];
  highlightClassName?: string;
  className?: string;
}) {
  const words = children.split(' ');

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.05,
      },
    },
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.9,
    },
  };

  const highlight = {
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 8,
        stiffness: 120,
      },
    },
    hidden: {
      opacity: 0,
      y: -10,
      scale: 1.1,
    },
  };

  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, index) => {
        const isHighlight = highlightWords.includes(word.toLowerCase());
        return (
          <motion.span
            key={index}
            variants={isHighlight ? highlight : child}
            className={isHighlight ? highlightClassName : ''}
            style={{ 
              display: 'inline-block',
              marginRight: '0.25em'
            }}
          >
            {word}
          </motion.span>
        );
      })}
    </motion.span>
  );
}
