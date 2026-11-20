import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function TopBar({ onOpenProfile }) {
  const { profile } = useAuth();

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto 16px auto',
        background: 'var(--color-bg-card)',
        borderRadius: '999px',
        padding: '6px 8px 6px 14px',
        boxShadow: 'var(--skeuo-button-raised), 0 4px 18px rgba(0, 0, 0, 0.08)',
        border: '1.5px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backdropFilter: 'blur(8px)',
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

      {/* Avatar Profil Kanan di Kapsul (Klik untuk Buka Drawer dari Kanan) */}
      <button
        onClick={onOpenProfile}
        title="Buka Pengaturan & Akun"
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.15s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {profile?.foto_url ? (
          <img
            src={profile.foto_url}
            alt={profile?.nama || 'Profil'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--color-primary)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          />
        ) : (
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
              color: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              boxShadow: 'var(--skeuo-button-raised)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '15px',
            }}
          >
            {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'C'}
          </div>
        )}
      </button>
    </div>
  );
}
