import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { orderService } from '../services/orderService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import SkeletonLoader from '../components/SkeletonLoader';
import {
  formatDateIndonesia,
  getDeliveryStatusMeta,
  getConfirmationStatusMeta,
} from '../utils/formatters';

export default function OrderHistory() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('semua'); // 'semua' | 'aktif' | 'selesai'

  const loadOrders = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await orderService.getOrdersByCustomerId(profile.id);
      setOrders(data);
    } catch (err) {
      console.error('Gagal mengambil riwayat order:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [profile?.id]);

  // Filter order berdasarkan tab aktif
  const filteredOrders = orders.filter((order) => {
    if (filterTab === 'aktif') {
      return order.status_pengiriman !== 'terkirim' && order.status_konfirmasi !== 'ditolak';
    }
    if (filterTab === 'selesai') {
      return order.status_pengiriman === 'terkirim';
    }
    return true;
  });

  return (
    <div className="app-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
            Riwayat Order Saya 📦
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Pantau status paket dan pesanan Anda
          </p>
        </div>
        <button
          onClick={loadOrders}
          style={{
            background: 'var(--color-bg-card)',
            border: '1px solid rgba(82,99,90,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--color-text-main)',
            boxShadow: 'var(--skeuo-button-raised)',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs (Skeuomorphic Segmented Pill) */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-bg-input)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          boxShadow: 'var(--skeuo-input-sunken)',
          gap: '4px',
          marginBottom: '18px',
        }}
      >
        {[
          { id: 'semua', label: 'Semua' },
          { id: 'aktif', label: 'Sedang Proses' },
          { id: 'selesai', label: 'Selesai' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: '700',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background:
                filterTab === tab.id
                  ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                  : 'transparent',
              color:
                filterTab === tab.id
                  ? 'var(--color-primary-dark)'
                  : 'var(--color-text-muted)',
              boxShadow:
                filterTab === tab.id ? '0 2px 4px rgba(20, 35, 28, 0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Daftar Order */}
      {loading ? (
        <SkeletonLoader type="list" count={3} />
      ) : filteredOrders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>📭</div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
            Belum ada order
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              marginTop: '4px',
              marginBottom: '20px',
            }}
          >
            Anda belum memiliki pesanan pada kategori ini.
          </p>
          <Button onClick={() => navigate('/buat-order')}>Buat Order Baru</Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOrders.map((order) => {
            const deliveryMeta = getDeliveryStatusMeta(order.status_pengiriman);
            const confirmationMeta = getConfirmationStatusMeta(order.status_konfirmasi);

            return (
              <Card key={order.id} padding="16px">
                {/* Header Card: Resi & Status Konfirmasi */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        color: 'var(--color-text-dim)',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {order.jenis_barang === 'paket_ekspedisi' ? '📦 PAKET EKSPEDISI' : '🛒 TITIP BELI'}
                    </span>
                    <h3
                      style={{
                        fontSize: '15.5px',
                        fontWeight: '800',
                        color: 'var(--color-text-main)',
                        marginTop: '2px',
                      }}
                    >
                      {order.nomor_resi || `Order #${order.id.slice(0, 8)}`}
                    </h3>
                  </div>

                  <Badge variant={deliveryMeta.variant}>{deliveryMeta.label}</Badge>
                </div>

                {/* Deskripsi Barang */}
                <p
                  style={{
                    fontSize: '13.5px',
                    color: 'var(--color-text-muted)',
                    lineHeight: '1.4',
                    marginBottom: '10px',
                  }}
                >
                  {order.deskripsi_barang}
                </p>

                {/* Info Alamat & Status Konfirmasi */}
                <div
                  style={{
                    background: 'var(--color-bg-input)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    fontSize: '12px',
                    color: 'var(--color-text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: 'var(--skeuo-input-sunken)',
                    marginBottom: '10px',
                  }}
                >
                  <div>
                    <b>📍 Tujuan:</b> {order.alamat_tujuan}
                  </div>
                  <div>
                    <b>💵 Metode:</b> {order.metode_pembayaran} •{' '}
                    <span style={{ color: order.status_pembayaran === 'lunas' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {order.status_pembayaran === 'lunas' ? 'LUNAS' : 'BELUM LUNAS'}
                    </span>
                  </div>
                </div>

                {/* Footer Card */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11.5px',
                    color: 'var(--color-text-dim)',
                    paddingTop: '6px',
                    borderTop: '1px solid rgba(82, 99, 90, 0.1)',
                  }}
                >
                  <span>{formatDateIndonesia(order.created_at)}</span>
                  <span>
                    Status Admin:{' '}
                    <b style={{ color: confirmationMeta.variant === 'danger' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                      {confirmationMeta.label}
                    </b>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav role="customer" />
    </div>
  );
}
