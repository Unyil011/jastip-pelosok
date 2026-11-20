import React from 'react';

export default function TopBar({ onOpenProfile }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: '8px',
        zIndex: 100,
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto 16px auto',
        background: 'var(--color-bg-card)',
        borderRadius: '999px',
        padding: '7px 10px 7px 16px',
        boxShadow: 'var(--skeuo-button-raised), 0 6px 20px rgba(0, 0, 0, 0.12)',
        border: '1.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Brand Kiri di Kapsul */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src="/logo.webp"
          alt="Logo Jastip Pelosok"
          style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }}
        />
        <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-primary-dark)', letterSpacing: '-0.3px' }}>
          Jastip Pelosok
        </span>
      </div>

      {/* Ikon Pengaturan (Gear / Setting) di Kanan Kapsul */}
      <button
        onClick={onOpenProfile}
        title="Buka Pengaturan & Akun"
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: 'var(--color-bg-base)',
          border: '1.5px solid var(--color-border)',
          boxShadow: 'var(--skeuo-button-raised)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: 'var(--color-primary-dark)',
          transition: 'transform 0.15s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        ⚙️
      </button>
    </div>
  );
}
