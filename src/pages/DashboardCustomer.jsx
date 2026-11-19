import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import Card from '../components/Card';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import ConfirmationSheet from '../components/ConfirmationSheet';

export default function DashboardCustomer() {
  const navigate = useNavigate();
  const { profile, setProfile } = useAuth();
  const [logoutSheetOpen, setLogoutSheetOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setProfile(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Top Banner Card */}
      <Card
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-dark) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pelanggan Setia
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>
              Halo, {profile?.nama || 'Customer'}! 👋
            </h2>
            <p style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>
              📱 {profile?.no_hp || '-'}
            </p>
          </div>
          <button
            onClick={() => setLogoutSheetOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            Keluar
          </button>
        </div>
      </Card>

      {/* Quick Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <Card
          onClick={() => navigate('/buat-order')}
          padding="16px"
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>➕</div>
          <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>
            Buat Order Baru
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Titip resi ekspedisi / titip beli
          </p>
        </Card>

        <Card
          onClick={() => navigate('/riwayat-order')}
          padding="16px"
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>📋</div>
          <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>
            Riwayat Titipan
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Pantau status kiriman Anda
          </p>
        </Card>
      </div>

      {/* Info Card: Cara Kerja Jastip Pelosok */}
      <Card title="Cara Kerja Jastip Pelosok" subtitle="Pengiriman barang belanjaan & paket aman sampai pintu rumah">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-text-main)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>1️⃣</span>
            <div>
              <b>Kirimkan Resi / Daftar Belanja:</b> Input nomor resi paket online Anda atau daftar barang titipan.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>2️⃣</span>
            <div>
              <b>Paket Disortir di Hub:</b> Admin mengonfirmasi dan menerima paket di hub kecamatan/jalur.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>3️⃣</span>
            <div>
              <b>Kurir Mengantar ke Pelosok:</b> Kurir lokal mengambil paket dan mengantarkan langsung ke rumah Anda.
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun Jastip Pelosok?"
        confirmText="Ya, Keluar"
        confirmVariant="danger"
      />

      {/* Bottom Navigation */}
      <BottomNav role="customer" />
    </div>
  );
}
