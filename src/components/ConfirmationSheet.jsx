import React from 'react';

export default function ConfirmationSheet({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  confirmVariant = 'primary', // 'primary' | 'danger'
  loading = false,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        display: isOpen ? 'flex' : 'none',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(15, 26, 20, 0.5)',
        backdropFilter: 'blur(3px)',
        animation: 'backdropFadeIn 0.2s ease-out forwards',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'linear-gradient(180deg, #fbfdfc 0%, var(--color-bg-card) 100%)',
          borderRadius: '24px 24px 0 0',
          boxShadow: 'var(--skeuo-sheet-shadow)',
          borderTop: '1px solid rgba(255, 255, 255, 0.9)',
          padding: '16px 20px 28px 20px',
          animation: 'sheetSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Grab Handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: '#a5b5b0',
            borderRadius: '99px',
            margin: '0 auto 16px auto',
          }}
        />

        <h3
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: 'var(--color-text-main)',
            textAlign: 'center',
            marginBottom: '8px',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
            lineHeight: '1.5',
            marginBottom: '24px',
            padding: '0 8px',
          }}
        >
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14.5px',
              fontWeight: '600',
              fontFamily: 'inherit',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(180deg, #f7faf8 0%, #e2e8e5 100%)',
              color: 'var(--color-text-main)',
              border: '1px solid rgba(82, 99, 90, 0.25)',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '14.5px',
              fontWeight: '600',
              fontFamily: 'inherit',
              borderRadius: 'var(--radius-md)',
              background:
                confirmVariant === 'danger'
                  ? 'linear-gradient(180deg, #e54949 0%, #ba2828 100%)'
                  : 'linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
              color: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.15)',
              boxShadow: 'var(--skeuo-button-raised)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}
          >
            {loading ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
