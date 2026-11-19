import React from 'react';
import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ style = {} }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Ganti ke Mode Terang (Light Mode)' : 'Ganti ke Mode Gelap (Dark Mode)'}
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(145deg, #25382e 0%, #17241d 100%)'
          : 'linear-gradient(145deg, #ffffff 0%, #e2e8e5 100%)',
        border: '1px solid var(--color-border)',
        boxShadow: isDark
          ? 'inset 0 1px 1px rgba(255,255,255,0.1), 0 3px 6px rgba(0,0,0,0.5)'
          : 'inset 0 1px 1px rgba(255,255,255,0.8), 0 3px 6px rgba(20,35,28,0.12)',
        cursor: 'pointer',
        fontSize: '18px',
        userSelect: 'none',
        transition: 'transform 0.15s ease, background 0.25s ease',
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}
