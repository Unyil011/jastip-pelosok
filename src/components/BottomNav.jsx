import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function BottomNav({ role = 'customer' }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation tabs definition per role
  const getTabs = () => {
    if (role === 'admin') {
      return [
        {
          id: 'pending',
          label: 'Pending',
          path: '/dashboard-admin?tab=pending',
          icon: '⏳',
        },
        {
          id: 'scan',
          label: 'Scan Resi',
          path: '/dashboard-admin?tab=scan',
          icon: '📷',
          highlight: true,
        },
        {
          id: 'kurir',
          label: 'Approval',
          path: '/dashboard-admin?tab=kurir',
          icon: '👥',
        },
      ];
    }

    if (role === 'kurir') {
      return [
        {
          id: 'beranda',
          label: 'Beranda',
          path: '/dashboard-kurir?tab=beranda',
          icon: '🏠',
        },
        {
          id: 'pesanan',
          label: 'Pesanan',
          path: '/dashboard-kurir?tab=pesanan',
          icon: '📦',
        },
        {
          id: 'scan',
          label: 'Scan Resi',
          path: '/dashboard-kurir?tab=scan',
          icon: '📷',
          highlight: true,
        },
        {
          id: 'keuangan',
          label: 'Keuangan',
          path: '/dashboard-kurir?tab=keuangan',
          icon: '💰',
        },
      ];
    }

    // Default: Customer
    return [
      {
        id: 'home',
        label: 'Beranda',
        path: '/dashboard-customer',
        icon: '🏠',
      },
      {
        id: 'buat-order',
        label: 'Buat Order',
        path: '/buat-order',
        icon: '➕',
        highlight: true,
      },
      {
        id: 'riwayat',
        label: 'Riwayat',
        path: '/riwayat-order',
        icon: '📦',
      },
    ];
  };

  const tabs = getTabs();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        height: '68px',
        background: 'linear-gradient(180deg, #fbfdfc 0%, #ebf0ee 100%)',
        boxShadow: 'var(--skeuo-nav-shadow)',
        borderTop: '1px solid rgba(255, 255, 255, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        padding: '0 8px',
      }}
    >
      {tabs.map((tab) => {
        let isActive = location.pathname + location.search === tab.path;
        if (role === 'kurir') {
          if (tab.id === 'beranda') {
            isActive =
              location.pathname === '/dashboard-kurir' &&
              (!location.search || location.search.includes('tab=beranda'));
          } else if (tab.id === 'pesanan') {
            isActive =
              location.search.includes('tab=pesanan') ||
              location.search.includes('tab=antaran');
          } else if (tab.id === 'scan') {
            isActive = location.search.includes('tab=scan');
          } else if (tab.id === 'keuangan') {
            isActive =
              location.search.includes('tab=keuangan') ||
              location.search.includes('tab=selesai');
          }
        } else if (tab.id === 'home' && location.pathname === '/dashboard-customer') {
          isActive = true;
        }

        if (tab.highlight) {
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                position: 'relative',
                top: '-12px',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'linear-gradient(180deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                border: '3px solid #fbfdfc',
                boxShadow:
                  '0 6px 14px rgba(18, 48, 30, 0.35), inset 0 1px 1px rgba(255,255,255,0.6)',
                color: '#ffffff',
                fontSize: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {tab.icon}
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              height: '100%',
              background: 'transparent',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              cursor: 'pointer',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-dim)',
              transition: 'var(--transition-smooth)',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                transform: isActive ? 'scale(1.12)' : 'scale(1)',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: isActive ? '700' : '500',
                letterSpacing: '-0.2px',
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
