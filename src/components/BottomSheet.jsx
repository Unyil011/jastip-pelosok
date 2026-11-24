import React, { useEffect } from 'react';

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = 'auto', // 'auto' | 'full'
}) {
  // Prevent body scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(15, 26, 20, 0.45)',
        backdropFilter: 'blur(3px)',
        animation: 'backdropFadeIn 0.25s ease-out forwards',
      }}
      onClick={onClose}
    >
      {/* Bottom Sheet Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: snapPoints === 'full' ? '92vh' : '85vh',
          background: 'linear-gradient(180deg, #fbfdfc 0%, var(--color-bg-card) 100%)',
          borderRadius: '24px 24px 0 0',
          boxShadow: 'var(--skeuo-sheet-shadow)',
          borderTop: '1px solid rgba(255, 255, 255, 0.9)',
          padding: '12px 20px 28px 20px',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sheetSlideUp 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          overflowY: 'auto',
        }}
      >
        {/* Physical Grab Handle */}
        <div
          style={{
            width: '42px',
            height: '5px',
            background: 'linear-gradient(180deg, #b0beba 0%, #8c9e99 100%)',
            boxShadow: 'inset 0 1px 1px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.8)',
            borderRadius: '99px',
            margin: '0 auto 16px auto',
            cursor: 'pointer',
          }}
          onClick={onClose}
        />

        {/* Title Bar */}
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(82, 99, 90, 0.15)',
            }}
          >
            <h3
              style={{
                fontSize: '17px',
                fontWeight: '700',
                color: 'var(--color-text-main)',
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(82, 99, 90, 0.12)',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1 }}>{children}</div>
      </div>

      <style>{`
        @keyframes backdropFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheetSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
