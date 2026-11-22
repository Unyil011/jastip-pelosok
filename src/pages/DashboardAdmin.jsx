import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { adminService } from '../services/adminService';
import { villageService } from '../services/villageService';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import SkeletonLoader from '../components/SkeletonLoader';
import { formatDateIndonesia } from '../utils/formatters';

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'pending'; // 'pending' | 'scan' | 'kurir'

  // Logout State
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Gagal keluar:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  // Tab 1: Orders Pending
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Tab 2: Scanner Barcode
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResi, setScannedResi] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [scanNotFound, setScanNotFound] = useState(false);
  const scannerRef = useRef(null);

  // Form Buat Order Manual Admin jika tidak ketemu
  const [customers, setCustomers] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [manualCustomerId, setManualCustomerId] = useState('');
  const [manualDesaId, setManualDesaId] = useState('');
  const [manualDeskripsi, setManualDeskripsi] = useState('');
  const [manualAlamat, setManualAlamat] = useState('');
  const [manualMetode, setManualMetode] = useState('COD');
  const [creatingManual, setCreatingManual] = useState(false);

  // Tab 3: Manajemen Kurir (Daftar & Tambah Kurir Baru)
  const [kurirList, setKurirList] = useState([]);
  const [jalurList, setJalurList] = useState([]);
  const [loadingKurir, setLoadingKurir] = useState(false);
  const [showAddKurirModal, setShowAddKurirModal] = useState(false);

  // Form Tambah Kurir Baru oleh Admin
  const [newKurirName, setNewKurirName] = useState('');
  const [newKurirPhone, setNewKurirPhone] = useState('');
  const [newKurirPassword, setNewKurirPassword] = useState('');
  const [newKurirDana, setNewKurirDana] = useState('');
  const [newKurirJalurId, setNewKurirJalurId] = useState('');
  const [savingKurir, setSavingKurir] = useState(false);

  // Confirmation & Feedback BottomSheets
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmOrderSheet, setConfirmOrderSheet] = useState({ open: false, order: null, action: '' });
  const [feedbackSheet, setFeedbackSheet] = useState({ open: false, title: '', message: '' });

  // Load Tab Data
  useEffect(() => {
    if (currentTab === 'pending') {
      loadPendingOrders();
    } else if (currentTab === 'kurir') {
      loadKurirData();
    } else if (currentTab === 'scan') {
      loadSupportDataForScan();
    }
  }, [currentTab]);

  const loadPendingOrders = async () => {
    setLoadingPending(true);
    try {
      const data = await orderService.getPendingConfirmationOrders();
      setPendingOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadKurirData = async () => {
    setLoadingKurir(true);
    try {
      const [kurirs, jalurs] = await Promise.all([
        adminService.getAllKurirs(),
        villageService.getAllJalur(),
      ]);
      setKurirList(kurirs);
      setJalurList(jalurs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKurir(false);
    }
  };

  const loadSupportDataForScan = async () => {
    try {
      const [custs, desas] = await Promise.all([
        adminService.getAllCustomers(),
        villageService.getAllDesa(),
      ]);
      setCustomers(custs);
      setDesaList(desas);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------------------------------------------------
  // SCANNER CONTROLS (html5-qrcode)
  // ---------------------------------------------------------
  const startScanner = async () => {
    setMatchedOrder(null);
    setScanNotFound(false);
    setIsScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 180 },
        },
        async (decodedText) => {
          stopScanner();
          handleResiDetected(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Kamera scanner error:', err);
      setIsScanning(false);
      setFeedbackSheet({
        open: true,
        title: 'Izin Kamera Diperlukan',
        message: 'Tidak dapat mengakses kamera HP. Pastikan izin kamera telah diberikan di browser.',
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error(e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleResiDetected = async (resi) => {
    setScannedResi(resi);
    setActionLoading(true);
    try {
      const found = await orderService.findOrderByResi(resi);
      if (found) {
        setMatchedOrder(found);
        setScanNotFound(false);
      } else {
        setMatchedOrder(null);
        setScanNotFound(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerimaDiHub = async () => {
    if (!matchedOrder) return;
    setActionLoading(true);
    try {
      await orderService.updateDeliveryStatus(matchedOrder.id, 'diterima_hub', {
        status_konfirmasi: 'dikonfirmasi',
      });
      setFeedbackSheet({
        open: true,
        title: 'Berhasil Masuk Hub! 📦',
        message: `Paket resi ${matchedOrder.nomor_resi} berhasil diupdate statusnya jadi "Diterima di Hub". Kurir di jalur terkait dapat langsung melihat paket ini.`,
      });
      setMatchedOrder(null);
      setScannedResi('');
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Update',
        message: err.message,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateManualOrder = async (e) => {
    e.preventDefault();
    if (!manualCustomerId || !manualDesaId) {
      setFeedbackSheet({
        open: true,
        title: 'Data Belum Lengkap',
        message: 'Pilih customer dan desa tujuan pengiriman.',
      });
      return;
    }

    const desa = desaList.find((d) => d.id === manualDesaId);
    if (!desa) return;

    setCreatingManual(true);
    try {
      const fullAddress = `${manualAlamat.trim()}, Desa ${desa.nama_desa}`;
      await orderService.createOrderByAdmin({
        customerId: manualCustomerId,
        jalurId: desa.jalur_id,
        nomorResi: scannedResi,
        deskripsiBarang: manualDeskripsi || 'Paket Ekspedisi (Manual)',
        metodePembayaran: manualMetode,
        alamatTujuan: fullAddress,
      });

      setFeedbackSheet({
        open: true,
        title: 'Order Berhasil Dibuat! 🚀',
        message: `Order resi ${scannedResi} telah tersimpan dan langsung berstatus "Diterima di Hub" siap antar.`,
      });

      setScanNotFound(false);
      setScannedResi('');
      setManualDeskripsi('');
      setManualAlamat('');
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Buat Order',
        message: err.message,
      });
    } finally {
      setCreatingManual(false);
    }
  };

  // ---------------------------------------------------------
  // ORDER CONFIRMATION HANDLERS
  // ---------------------------------------------------------
  const handleExecuteOrderAction = async () => {
    const { order, action } = confirmOrderSheet;
    if (!order) return;

    setActionLoading(true);
    try {
      await orderService.updateConfirmationStatus(order.id, action);
      setConfirmOrderSheet({ open: false, order: null, action: '' });
      loadPendingOrders();
      setFeedbackSheet({
        open: true,
        title: action === 'dikonfirmasi' ? 'Order Dikonfirmasi' : 'Order Ditolak',
        message: `Order ${order.nomor_resi || order.id.slice(0, 8)} berhasil ${action}.`,
      });
    } catch (err) {
      setFeedbackSheet({ open: true, title: 'Error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // ---------------------------------------------------------
  // BUAT KURIR BARU OLEH ADMIN
  // ---------------------------------------------------------
  const handleCreateKurirSubmit = async (e) => {
    e.preventDefault();

    if (!newKurirName.trim() || !newKurirPhone.trim() || !newKurirPassword.trim() || !newKurirJalurId) {
      setFeedbackSheet({
        open: true,
        title: 'Data Belum Lengkap',
        message: 'Nama, No HP, Password, dan Jalur Penugasan wajib diisi!',
      });
      return;
    }

    setSavingKurir(true);
    try {
      await adminService.createKurirByAdmin({
        name: newKurirName.trim(),
        phone: newKurirPhone.trim(),
        password: newKurirPassword.trim(),
        danaNumber: newKurirDana.trim(),
        jalurId: newKurirJalurId,
      });

      setShowAddKurirModal(false);
      setNewKurirName('');
      setNewKurirPhone('');
      setNewKurirPassword('');
      setNewKurirDana('');
      setNewKurirJalurId('');
      loadKurirData();

      setFeedbackSheet({
        open: true,
        title: 'Kurir Berhasil Dibuat! 🎉',
        message: 'Akun mitra kurir telah aktif (Approved). Kurir sudah bisa langsung login menggunakan No HP dan kata sandi tersebut.',
      });
    } catch (err) {
      setFeedbackSheet({
        open: true,
        title: 'Gagal Membuat Kurir',
        message: err.message || 'Terjadi kesalahan saat membuat akun kurir.',
      });
    } finally {
      setSavingKurir(false);
    }
  };

  return (
    <div className="app-container">
      {/* Admin Title & Logout Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
            Panel Administrator ⚙️
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Kelola konfirmasi order, scan paket fisik & data mitra kurir
          </p>
        </div>

        <button
          onClick={() => setLogoutSheetOpen(true)}
          style={{
            background: 'var(--color-bg-card)',
            border: '1.5px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: '#dc2626',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--skeuo-button-raised)',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🚪</span>
          <span>Keluar</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-bg-input)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          boxShadow: 'var(--skeuo-input-sunken)',
          gap: '4px',
          marginBottom: '16px',
        }}
      >
        <button
          onClick={() => setSearchParams({ tab: 'pending' })}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            fontFamily: 'inherit',
            cursor: 'pointer',
            background:
              currentTab === 'pending'
                ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                : 'transparent',
            color: currentTab === 'pending' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            boxShadow: currentTab === 'pending' ? '0 2px 4px rgba(20,35,28,0.12)' : 'none',
          }}
        >
          ⏳ Pending ({pendingOrders.length})
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'scan' })}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            fontFamily: 'inherit',
            cursor: 'pointer',
            background:
              currentTab === 'scan'
                ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                : 'transparent',
            color: currentTab === 'scan' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            boxShadow: currentTab === 'scan' ? '0 2px 4px rgba(20,35,28,0.12)' : 'none',
          }}
        >
          📷 Scan Resi
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'kurir' })}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            fontFamily: 'inherit',
            cursor: 'pointer',
            background:
              currentTab === 'kurir'
                ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                : 'transparent',
            color: currentTab === 'kurir' ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
            boxShadow: currentTab === 'kurir' ? '0 2px 4px rgba(20,35,28,0.12)' : 'none',
          }}
        >
          🛵 Kurir ({kurirList.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDER PENDING KONFIRMASI */}
      {/* ========================================================================= */}
      {currentTab === 'pending' && (
        <div>
          {loadingPending ? (
            <SkeletonLoader type="list" count={3} />
          ) : pendingOrders.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>🎉</div>
              <h4 style={{ fontSize: '16px', fontWeight: '700' }}>Tidak ada order pending</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Semua titipan customer telah terkonfirmasi.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingOrders.map((order) => (
                <Card key={order.id} padding="16px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-dim)' }}>
                        {order.jenis_barang === 'paket_ekspedisi' ? 'RESI' : 'TITIP BELI'}
                      </span>
                      <h4 style={{ fontSize: '15px', fontWeight: '800' }}>
                        {order.nomor_resi || `Order #${order.id.slice(0, 8)}`}
                      </h4>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>

                  <div
                    style={{
                      margin: '10px 0',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-bg-input)',
                      fontSize: '12.5px',
                      lineHeight: '1.45',
                    }}
                  >
                    <div>
                      <b>Customer:</b> {order.customer?.nama} (📱 {order.customer?.no_hp})
                    </div>
                    <div>
                      <b>Jalur:</b> {order.jalur?.nama_jalur || '-'}
                    </div>
                    <div>
                      <b>Alamat:</b> {order.alamat_tujuan}
                    </div>
                    <div>
                      <b>Deskripsi:</b> {order.deskripsi_barang}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setConfirmOrderSheet({ open: true, order, action: 'ditolak' })
                      }
                    >
                      Tolak
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        setConfirmOrderSheet({ open: true, order, action: 'dikonfirmasi' })
                      }
                    >
                      Konfirmasi (Terima)
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SCAN BARCODE (HTML5-QRCODE) */}
      {/* ========================================================================= */}
      {currentTab === 'scan' && (
        <div>
          <Card title="Scanner Kamera Barcode Resi" subtitle="Arahkan kamera HP ke barcode pada paket fisik">
            {/* Viewfinder Kamera */}
            <div
              id="qr-reader-container"
              style={{
                width: '100%',
                minHeight: isScanning ? '260px' : '0px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                marginBottom: isScanning ? '14px' : '0px',
                background: '#000000',
              }}
            />

            {!isScanning ? (
              <Button onClick={startScanner}>📷 Aktifkan Kamera Scanner</Button>
            ) : (
              <Button variant="danger" onClick={stopScanner}>
                Matikan Scanner
              </Button>
            )}

            {/* Alternatif Input Manual Resi */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(82,99,90,0.14)' }}>
              <Input
                label="Atau Masukkan / Scan Resi Manual"
                placeholder="Ketik nomor resi..."
                value={scannedResi}
                onChange={(e) => setScannedResi(e.target.value)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResiDetected(scannedResi)}
                disabled={!scannedResi.trim()}
              >
                Cari Resi
              </Button>
            </div>
          </Card>

          {/* Skenario A: Resi Ketemu di Database */}
          {matchedOrder && (
            <Card
              style={{
                border: '2px solid var(--color-success)',
                background: 'linear-gradient(180deg, #f0fbf4 0%, #e2f5e9 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
                  Paket Ditemukan di Sistem!
                </h4>
              </div>

              <div style={{ fontSize: '13px', lineHeight: '1.6', marginBottom: '14px', color: 'var(--color-text-main)' }}>
                <div>
                  <b>Nomor Resi:</b> {matchedOrder.nomor_resi}
                </div>
                <div>
                  <b>Nama Customer:</b> {matchedOrder.customer?.nama}
                </div>
                <div>
                  <b>No. HP:</b> {matchedOrder.customer?.no_hp}
                </div>
                <div>
                  <b>Tujuan / Jalur:</b> {matchedOrder.alamat_tujuan} ({matchedOrder.jalur?.nama_jalur})
                </div>
                <div>
                  <b>Status Saat Ini:</b> {matchedOrder.status_pengiriman}
                </div>
              </div>

              <Button loading={actionLoading} onClick={handleTerimaDiHub}>
                📦 Update Status: Diterima di Hub
              </Button>
            </Card>
          )}

          {/* Skenario B: Resi TIDAK Ketemu -> Form Buat Order Manual */}
          {scanNotFound && (
            <Card
              title="Resi Baru (Belum Terdaftar)"
              subtitle={`Resi ${scannedResi} belum diinput customer. Isi form di bawah untuk mendaftarkannya langsung.`}
              style={{ border: '2px solid var(--color-warning)' }}
            >
              <form onSubmit={handleCreateManualOrder}>
                <Select
                  label="Pilih Customer"
                  placeholder="-- Pilih Customer Terdaftar --"
                  required
                  value={manualCustomerId}
                  onChange={(e) => {
                    setManualCustomerId(e.target.value);
                    const cust = customers.find((c) => c.id === e.target.value);
                    if (cust?.alamat) setManualAlamat(cust.alamat);
                  }}
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.nama} (${c.no_hp})`,
                  }))}
                />

                <Select
                  label="Pilih Desa Tujuan"
                  placeholder="-- Pilih Desa Tujuan --"
                  required
                  value={manualDesaId}
                  onChange={(e) => setManualDesaId(e.target.value)}
                  options={desaList.map((d) => ({
                    value: d.id,
                    label: `Desa ${d.nama_desa}`,
                  }))}
                />

                <Input
                  label="Detail Alamat Pengiriman"
                  placeholder="Dusun/RT/RW"
                  value={manualAlamat}
                  onChange={(e) => setManualAlamat(e.target.value)}
                  required
                />

                <Input
                  label="Deskripsi / Keterangan Barang"
                  placeholder="Contoh: Paket Pakaian / Elektronik"
                  value={manualDeskripsi}
                  onChange={(e) => setManualDeskripsi(e.target.value)}
                />

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }}>
                    Metode Pembayaran
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="manualMetode"
                        value="COD"
                        checked={manualMetode === 'COD'}
                        onChange={() => setManualMetode('COD')}
                      />{' '}
                      COD
                    </label>
                    <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="radio"
                        name="manualMetode"
                        value="transfer"
                        checked={manualMetode === 'transfer'}
                        onChange={() => setManualMetode('transfer')}
                      />{' '}
                      Transfer
                    </label>
                  </div>
                </div>

                <Button type="submit" loading={creatingManual}>
                  Simpan & Set Diterima di Hub
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANAJEMEN MITRA KURIR */}
      {/* ========================================================================= */}
      {currentTab === 'kurir' && (
        <div>
          {/* Tombol Tambah Kurir Baru */}
          <div style={{ marginBottom: '16px' }}>
            <Button
              variant="secondary"
              onClick={() => setShowAddKurirModal(true)}
            >
              ➕ Buatkan Akun Kurir Baru
            </Button>
          </div>

          {loadingKurir ? (
            <SkeletonLoader type="list" count={3} />
          ) : kurirList.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>🛵</div>
              <h4 style={{ fontSize: '16px', fontWeight: '700' }}>Belum ada kurir terdaftar</h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Klik tombol di atas untuk mendaftarkan mitra kurir baru.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {kurirList.map((kurir) => (
                <Card key={kurir.id} padding="16px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '800' }}>{kurir.nama}</h4>
                      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        📱 {kurir.no_hp}
                      </p>
                      <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', marginTop: '4px' }}>
                        💳 <b>DANA:</b> {kurir.nomor_dana || '-'}
                      </p>
                      <p style={{ fontSize: '12.5px', color: 'var(--color-primary-dark)', marginTop: '2px', fontWeight: '700' }}>
                        🗺️ Jalur: {kurir.jalur?.nama_jalur || 'Belum Ditentukan'}
                      </p>
                    </div>
                    <Badge variant={kurir.status_approval === 'approved' ? 'success' : 'warning'}>
                      {kurir.status_approval === 'approved' ? 'Aktif' : kurir.status_approval}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bottom Sheet Buat Akun Kurir Baru */}
      <BottomSheet
        isOpen={showAddKurirModal}
        onClose={() => setShowAddKurirModal(false)}
        title="Daftarkan Mitra Kurir Baru"
      >
        <form onSubmit={handleCreateKurirSubmit} style={{ padding: '4px 0 16px 0' }}>
          <Input
            label="Nama Lengkap Kurir"
            placeholder="Contoh: Rian Pratama"
            value={newKurirName}
            onChange={(e) => setNewKurirName(e.target.value)}
            required
          />

          <Input
            label="Nomor WhatsApp / HP Kurir"
            type="tel"
            placeholder="Contoh: 081234567890"
            value={newKurirPhone}
            onChange={(e) => setNewKurirPhone(e.target.value)}
            helperText="Digunakan kurir untuk login"
            required
          />

          <Input
            label="Kata Sandi Awal"
            type="password"
            placeholder="Minimal 6 karakter"
            value={newKurirPassword}
            onChange={(e) => setNewKurirPassword(e.target.value)}
            helperText="Berikan kata sandi ini kepada kurir bersangkutan"
            required
            minLength={6}
          />

          <Input
            label="Nomor Akun DANA (Pencairan Ongkir)"
            type="tel"
            placeholder="Nomor DANA kurir"
            value={newKurirDana}
            onChange={(e) => setNewKurirDana(e.target.value)}
            required
          />

          <Select
            label="Jalur Penugasan"
            placeholder="-- Pilih Jalur Penugasan --"
            required
            value={newKurirJalurId}
            onChange={(e) => setNewKurirJalurId(e.target.value)}
            options={jalurList.map((j) => ({
              value: j.id,
              label: j.nama_jalur,
            }))}
            helperText="Kurir ini akan mengantar paket di desa-desa dalam jalur ini"
          />

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <Button variant="outline" onClick={() => setShowAddKurirModal(false)}>
              Batal
            </Button>
            <Button type="submit" variant="secondary" loading={savingKurir}>
              Simpan & Aktifkan Kurir
            </Button>
          </div>
        </form>
      </BottomSheet>

      {/* Confirmation Sheet Order Action */}
      <ConfirmationSheet
        isOpen={confirmOrderSheet.open}
        onClose={() => setConfirmOrderSheet({ open: false, order: null, action: '' })}
        onConfirm={handleExecuteOrderAction}
        title={confirmOrderSheet.action === 'dikonfirmasi' ? 'Konfirmasi Order' : 'Tolak Order'}
        message={`Apakah Anda yakin ingin ${confirmOrderSheet.action === 'dikonfirmasi' ? 'mengonfirmasi' : 'menolak'} order ${confirmOrderSheet.order?.nomor_resi || ''}?`}
        confirmText={confirmOrderSheet.action === 'dikonfirmasi' ? 'Ya, Konfirmasi' : 'Ya, Tolak'}
        confirmVariant={confirmOrderSheet.action === 'dikonfirmasi' ? 'primary' : 'danger'}
        loading={actionLoading}
      />

      {/* General Feedback Sheet */}
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

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={handleLogout}
        title="Keluar dari Panel Admin"
        message="Apakah Anda yakin ingin keluar dari sesi akun Administrator ini?"
        confirmText="Ya, Keluar Akun"
        confirmVariant="danger"
        loading={logoutLoading}
      />

      {/* Bottom Nav Admin */}
      <BottomNav role="admin" />
    </div>
  );
}
