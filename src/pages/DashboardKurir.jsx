import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { orderService } from '../services/orderService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import SkeletonLoader from '../components/SkeletonLoader';
import { formatRupiah, getDeliveryStatusMeta } from '../utils/formatters';

export default function DashboardKurir() {
  const { profile } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // BottomSheet State untuk aksi status
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [codAmount, setCodAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmMulaiSheet, setConfirmMulaiSheet] = useState(false);
  const [selesaiSheetOpen, setSelesaiSheetOpen] = useState(false);
  const [feedbackSheet, setFeedbackSheet] = useState({ open: false, title: '', message: '' });

  const loadKurirOrders = async () => {
    if (!profile?.jalur_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await orderService.getOrdersForKurir(profile.jalur_id);
      setOrders(data);
    } catch (err) {
      console.error('Gagal memuat order kurir:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKurirOrders();
  }, [profile?.jalur_id]);

  // Aksi: Mulai Antar (status -> dalam_perjalanan)
  const handleMulaiAntar = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await orderService.updateDeliveryStatus(selectedOrder.id, 'dalam_perjalanan', {
        kurir_id: profile.id,
      });
      setConfirmMulaiSheet(false);
      setSelectedOrder(null);
      loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Pengantaran Dimulai',
        message: 'Status paket berhasil diubah menjadi "Dalam Perjalanan". Hati-hati di jalan!',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal',
        message: err.message || 'Gagal mengubah status order.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Aksi: Sampai Tujuan (status -> terkirim)
  const handleSampaiTujuan = async () => {
    if (!selectedOrder) return;

    // Jika COD, wajib input ongkir_diterima
    if (selectedOrder.metode_pembayaran === 'COD') {
      const amount = parseFloat(codAmount);
      if (isNaN(amount) || amount < 0) {
        setFeedbackSheet({
          open: true,
          title: 'Input Tidak Valid',
          message: 'Harap masukkan nominal ongkir yang diterima dari customer.',
        });
        return;
      }
    }

    setActionLoading(true);
    try {
      const extra = {
        kurir_id: profile.id,
      };

      if (selectedOrder.metode_pembayaran === 'COD') {
        extra.ongkir_diterima = parseFloat(codAmount);
        extra.status_pembayaran = 'lunas';
      }

      await orderService.updateDeliveryStatus(selectedOrder.id, 'terkirim', extra);
      setSelesaiSheetOpen(false);
      setSelectedOrder(null);
      setCodAmount('');
      loadKurirOrders();
      setFeedbackSheet({
        open: true,
        title: 'Paket Berhasil Dikirim! 🎉',
        message: 'Order telah selesai dan status diupdate menjadi "Terkirim".',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal',
        message: err.message || 'Gagal menyelesaikan pengiriman.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Kurir Header Banner */}
      <Card
        style={{
          background: 'linear-gradient(135deg, #1f94c4 0%, #10597a 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.9 }}>
              Mitra Kurir Lapangan 🛵
            </span>
            <h2 style={{ fontSize: '19px', fontWeight: '800', marginTop: '2px' }}>
              {profile?.nama || 'Kurir'}
            </h2>
            <p style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '2px' }}>
              DANA: {profile?.nomor_dana || '-'}
            </p>
          </div>
          <button
            onClick={loadKurirOrders}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </Card>

      {/* Title */}
      <div style={{ marginBottom: '14px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--color-text-main)' }}>
          Daftar Antaran Hari Ini ({orders.length})
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)' }}>
          Khusus jalur wilayah penugasan Anda
        </p>
      </div>

      {/* Orders List */}
      {loading ? (
        <SkeletonLoader type="list" count={3} />
      ) : orders.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>🌴</div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-text-main)' }}>
            Belum ada antaran aktif
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Saat admin menerima paket di hub untuk jalur Anda, paket akan otomatis muncul di sini.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {orders.map((order) => {
            const meta = getDeliveryStatusMeta(order.status_pengiriman);
            const isDiHub = order.status_pengiriman === 'diterima_hub';
            const isOtw = order.status_pengiriman === 'dalam_perjalanan';

            return (
              <Card key={order.id} padding="16px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-dim)' }}>
                      {order.jenis_barang === 'paket_ekspedisi' ? '📦 RESI EKSPEDISI' : '🛒 TITIP BELI'}
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-text-main)' }}>
                      {order.nomor_resi || `Order #${order.id.slice(0, 8)}`}
                    </h4>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>

                {/* Info Penerima */}
                <div
                  style={{
                    margin: '10px 0',
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-input)',
                    boxShadow: 'var(--skeuo-input-sunken)',
                    fontSize: '12.5px',
                    lineHeight: '1.5',
                  }}
                >
                  <div>
                    <b>Penerima:</b> {order.customer?.nama || 'Customer'} (📱 {order.customer?.no_hp || '-'})
                  </div>
                  <div>
                    <b>Alamat:</b> {order.alamat_tujuan}
                  </div>
                  <div>
                    <b>Barang:</b> {order.deskripsi_barang}
                  </div>
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(82,99,90,0.1)' }}>
                    <b>Pembayaran:</b>{' '}
                    <span style={{ fontWeight: '700', color: order.metode_pembayaran === 'COD' ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                      {order.metode_pembayaran === 'COD' ? '💵 COD' : '🏦 Transfer'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  {isDiHub && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setConfirmMulaiSheet(true);
                      }}
                    >
                      🚀 Mulai Antar
                    </Button>
                  )}

                  {isOtw && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedOrder(order);
                        setCodAmount(order.ongkir_patokan > 0 ? String(order.ongkir_patokan) : '');
                        setSelesaiSheetOpen(true);
                      }}
                    >
                      ✅ Sampai Tujuan (Selesaikan)
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Sheet Mulai Antar */}
      <ConfirmationSheet
        isOpen={confirmMulaiSheet}
        onClose={() => setConfirmMulaiSheet(false)}
        onConfirm={handleMulaiAntar}
        title="Mulai Antar Paket"
        message={`Mulai perjalanan untuk mengirim paket ke ${selectedOrder?.customer?.nama}? Status akan diubah menjadi "Dalam Perjalanan".`}
        confirmText="Mulai Antar Sekarang"
        loading={actionLoading}
      />

      {/* Bottom Sheet Selesai Antar (COD input / Transfer Proof) */}
      <BottomSheet
        isOpen={selesaiSheetOpen}
        onClose={() => setSelesaiSheetOpen(false)}
        title="Konfirmasi Paket Sampai Tujuan"
      >
        <div style={{ padding: '8px 0 16px 0' }}>
          {selectedOrder?.metode_pembayaran === 'COD' ? (
            <div>
              <div
                style={{
                  background: 'var(--color-warning-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#92400e',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                }}
              >
                ⚠️ <b>Metode Pembayaran COD:</b> Pastikan Anda telah menagih dan menerima uang tunai dari customer sebelum menyelesaikan order.
              </div>

              <Input
                label="Jumlah Ongkir yang Diterima (Rp)"
                type="number"
                placeholder="Contoh: 25000"
                value={codAmount}
                onChange={(e) => setCodAmount(e.target.value)}
                required
                helperText="Nominal uang tunai yang Anda terima"
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: 'var(--color-info-bg)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#0369a1',
                }}
              >
                ℹ️ <b>Metode Pembayaran Transfer:</b> Cek konfirmasi bukti transfer customer di bawah ini sebelum menyerahkan paket.
              </div>

              {selectedOrder?.bukti_transfer_url ? (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <img
                    src={selectedOrder.bukti_transfer_url}
                    alt="Bukti Transfer"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '200px',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--skeuo-card-shadow)',
                    }}
                  />
                </div>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                  Customer belum mengunggah foto bukti transfer.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <Button variant="outline" onClick={() => setSelesaiSheetOpen(false)}>
              Batal
            </Button>
            <Button loading={actionLoading} onClick={handleSampaiTujuan}>
              Konfirmasi Selesai
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Feedback Sheet */}
      <BottomSheet
        isOpen={feedbackSheet.open}
        onClose={() => setFeedbackSheet({ ...feedbackSheet, open: false })}
        title={feedbackSheet.title}
      >
        <div style={{ textAlign: 'center', padding: '12px 0 16px 0' }}>
          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {feedbackSheet.message}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button onClick={() => setFeedbackSheet({ ...feedbackSheet, open: false })}>
              Tutup
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Nav */}
      <BottomNav role="kurir" />
    </div>
  );
}
