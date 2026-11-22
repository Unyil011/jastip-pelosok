import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Koordinat Resmi 11 Desa Se-Kecamatan Naringgul (Fallback jika pelanggan belum set titik GPS mandiri)
export const NARINGGUL_VILLAGE_COORDS = {
  balegede: [-7.4623, 107.4589],
  cinerang: [-7.4812, 107.4721],
  malati: [-7.4955, 107.489],
  margasari: [-7.458, 107.512],
  mekarsari: [-7.471, 107.525],
  naringgul: [-7.4764, 107.4851],
  sukabakti: [-7.512, 107.495],
  sukamulya: [-7.528, 107.478],
  wanasari: [-7.442, 107.492],
  wangunjaya: [-7.435, 107.515],
  wangunsari: [-7.468, 107.475],
};

// Deteksi koordinat dari alamat orderan
export const resolveOrderCoords = (order) => {
  const rawLat = parseFloat(order.customer?.latitude);
  const rawLng = parseFloat(order.customer?.longitude);
  if (!isNaN(rawLat) && !isNaN(rawLng) && rawLat !== 0 && rawLng !== 0) {
    return [rawLat, rawLng];
  }

  // Fallback berdasarkan nama desa di alamat tujuan
  const text = `${order.alamat_tujuan || ''} ${order.deskripsi_barang || ''}`.toLowerCase();
  for (const [desa, coords] of Object.entries(NARINGGUL_VILLAGE_COORDS)) {
    if (text.includes(desa)) {
      // Berikan offset acak kecil (10-30 meter) agar pin tidak bertumpuk pas jika banyak order di desa yang sama
      const seed = (order.id ? order.id.charCodeAt(0) : 1) % 10;
      const jitterLat = (seed - 5) * 0.0012;
      const jitterLng = ((seed * 3) % 10 - 5) * 0.0012;
      return [coords[0] + jitterLat, coords[1] + jitterLng];
    }
  }

  // Default Hub Naringgul
  return [-7.4764, 107.4851];
};

export default function DeliveryMap({
  orders = [],
  selectedOrder = null,
  onSelectOrder = () => {},
  courierLocation = null,
  height = '420px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});
  const courierMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Pusat Default: Hub Kecamatan Naringgul, Cianjur Selatan
  const NARINGGUL_CENTER = [-7.4764, 107.4851];

  // 1. Inisialisasi Peta Leaflet & Tile Layer Satelit Murni
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: NARINGGUL_CENTER,
        zoom: 14,
        zoomControl: true,
      });

      // Peta Satelit Google Hybrid (Citra Satelit Jernih + Nama Jalan & Kampung Pelosok)
      const satLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google Satellite Imagery',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }).addTo(map);

      tileLayerRef.current = satLayer;
      mapInstanceRef.current = map;
      setMapReady(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Fix Layout & Size Invalidation agar peta tidak blank
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 150);
    const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 400);
    const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [mapReady, orders]);

  // 3. Render Titik Rumah Pelanggan (Icon Rumah 🏠), Jalur Rute Polyline, dan Posisi Kurir
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Bersihkan marker lama & polyline rute lama
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    const bounds = [];
    const routePoints = [];

    // Jika posisi kurir aktif, jadikan titik awal rute pengantaran
    const courierPoint = courierLocation && courierLocation[0] && courierLocation[1]
      ? [parseFloat(courierLocation[0]), parseFloat(courierLocation[1])]
      : NARINGGUL_CENTER;

    bounds.push(courierPoint);
    routePoints.push(courierPoint);

    let pinNumber = 1;

    orders.forEach((order) => {
      const coords = resolveOrderCoords(order);
      bounds.push(coords);
      routePoints.push(coords);

      const isTerkirim = order.status_pengiriman === 'terkirim';
      const isOtw = order.status_pengiriman === 'dalam_perjalanan';
      const isRetur = order.status_pengiriman === 'retur';
      const isSelected = selectedOrder?.id === order.id;

      let bgColor = '#f97316'; // Siap antar (Oranye)
      let symbol = '🏠'; // Customer selalu icon RUMAH 🏠

      if (isTerkirim) {
        bgColor = '#10b981'; // Selesai (Hijau)
        symbol = '✓';
      } else if (isOtw) {
        bgColor = '#2563eb'; // Diantar ke rumah ini (Biru)
        symbol = '🏠';
      } else if (isRetur) {
        bgColor = '#ef4444'; // Retur (Merah)
        symbol = '↩';
      }

      const glowShadow = isSelected
        ? '0 0 16px #38bdf8, 0 4px 12px rgba(0,0,0,0.6)'
        : '0 4px 10px rgba(0,0,0,0.5)';
      const scaleStyle = isSelected ? 'transform: scale(1.25); z-index: 1000;' : '';

      const customPinHtml = `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          background: ${bgColor};
          transform: rotate(-45deg);
          box-shadow: ${glowShadow};
          border: 2px solid #ffffff;
          cursor: pointer;
          transition: all 0.2s ease;
          ${scaleStyle}
        ">
          <span style="
            transform: rotate(45deg);
            color: #ffffff;
            font-weight: 800;
            font-size: ${symbol === '🏠' ? '16px' : '14px'};
            font-family: sans-serif;
            line-height: 1;
          ">
            ${symbol}
          </span>
        </div>
      `;

      const icon = L.divIcon({
        html: customPinHtml,
        className: 'custom-satelit-pin',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      const marker = L.marker(coords, { icon }).addTo(map);

      // Popup Detail Titik Rumah Pelanggan
      const popupHtml = `
        <div style="min-width: 210px; font-family: sans-serif; font-size: 12px; color: #1e293b;">
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
            🏠 Rumah: ${order.customer?.nama || 'Pelanggan Pelosok'}
          </div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 6px; line-height: 1.35;">
            📍 ${order.alamat_tujuan || '-'}
          </div>
          <div style="padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
            <div style="font-weight: 700; color: #334155;">📦 ${order.deskripsi_barang || 'Paket Ekspedisi'}</div>
            <div style="font-weight: 800; color: ${order.status_pengiriman === 'retur' ? '#ef4444' : '#059669'}; margin-top: 2px;">
              ${order.status_pengiriman === 'retur' ? '↩️ RETUR (Ongkir Kurir Dibayar)' : order.metode_pembayaran === 'COD' ? '💵 Bayar di Tempat (COD)' : '🏦 Lunas Transfer'}
            </div>
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}" target="_blank" rel="noopener noreferrer" 
               style="flex: 1; text-align: center; background: #0284c7; color: #ffffff; padding: 7px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 11px;">
              🧭 Navigasi
            </a>
            ${order.customer?.no_hp ? `
              <a href="https://wa.me/62${order.customer.no_hp.replace(/^0+/, '')}" target="_blank" rel="noopener noreferrer"
                 style="flex: 1; text-align: center; background: #16a34a; color: #ffffff; padding: 7px; border-radius: 6px; text-decoration: none; font-weight: 800; font-size: 11px;">
                💬 Chat WA
              </a>
            ` : ''}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.on('click', () => onSelectOrder(order));
      markersRef.current[order.id] = marker;
      pinNumber++;
    });

    // 4. Gambar Garis Jalur Rute Pengantaran (Delivery Route Polyline)
    if (routePoints.length >= 2) {
      const polyline = L.polyline(routePoints, {
        color: '#38bdf8',
        weight: 4.5,
        opacity: 0.9,
        dashArray: '8, 8',
        lineJoin: 'round',
      }).addTo(map);

      polyline.bindTooltip('🛣️ Jalur Pengantaran Kurir Pelosok', { sticky: true });
      routePolylineRef.current = polyline;
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [orders, selectedOrder, courierLocation]);

  // 5. Render Pin Posisi Kurir Bergerak (Live Motor Kurir Pulse Marker)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const currentCoords = courierLocation && courierLocation[0] && courierLocation[1]
      ? [parseFloat(courierLocation[0]), parseFloat(courierLocation[1])]
      : NARINGGUL_CENTER;

    const courierHtml = `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #0284c7;
        box-shadow: 0 0 0 7px rgba(56, 189, 248, 0.45), 0 4px 14px rgba(0,0,0,0.6);
        border: 2.5px solid #ffffff;
        font-size: 22px;
        transition: transform 0.3s ease;
      ">
        🛵
      </div>
    `;

    const courierIcon = L.divIcon({
      html: courierHtml,
      className: 'courier-satelit-pin',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    if (courierMarkerRef.current) {
      courierMarkerRef.current.setLatLng(currentCoords);
    } else {
      courierMarkerRef.current = L.marker(currentCoords, {
        icon: courierIcon,
        zIndexOffset: 1500,
      }).addTo(map);
      courierMarkerRef.current.bindTooltip('🛵 Posisi Kurir ( Bergerak Real-time )', { permanent: false, direction: 'top' });
    }
  }, [courierLocation]);

  // Tombol Reset Zoom ke Seluruh Rute
  const handleFitAll = () => {
    if (!mapInstanceRef.current) return;
    const bounds = [];
    orders.forEach((o) => bounds.push(resolveOrderCoords(o)));
    if (courierLocation && courierLocation[0]) bounds.push(courierLocation);
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else {
      mapInstanceRef.current.setView(NARINGGUL_CENTER, 14);
    }
  };

  // Tombol Pusatkan Tepat ke Posisi Kurir (Seperti Google Maps)
  const handleCenterToCourier = () => {
    if (!mapInstanceRef.current) return;
    const currentCoords = courierLocation && courierLocation[0] && courierLocation[1]
      ? [parseFloat(courierLocation[0]), parseFloat(courierLocation[1])]
      : NARINGGUL_CENTER;

    mapInstanceRef.current.flyTo(currentCoords, 17, {
      animate: true,
      duration: 1.2,
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1.5px solid var(--color-border)',
        boxShadow: 'var(--skeuo-card-shadow)',
        background: '#090d16',
      }}
    >
      {/* Kontainer Peta Satelit Murni */}
      <div ref={mapContainerRef} style={{ width: '100%', height, background: '#090d16' }} />

      {/* Floating Top Controls (Status Titik & Tombol Rute) */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '11.5px',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🛰️</span>
          <b>Peta Satelit Pelosok ({orders.length} Rumah)</b>
        </div>

        <button
          type="button"
          onClick={handleFitAll}
          style={{
            background: 'var(--color-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          🔍 Lihat Semua Rute
        </button>
      </div>

      {/* Tombol Tengahkan ke Posisi Saya (Floating Crosshair Icon ala Google Maps) */}
      <button
        type="button"
        onClick={handleCenterToCourier}
        title="Tengahkan ke Posisi Motor Saya"
        style={{
          position: 'absolute',
          bottom: '50px',
          right: '12px',
          zIndex: 999,
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: '#ffffff',
          color: '#0284c7',
          border: '2px solid rgba(2, 132, 199, 0.3)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        🎯
      </button>

      {/* Keterangan Warna Pin di Bawah Peta Satelit (Icon Rumah 🏠 & Motor 🛵) */}
      <div
        style={{
          padding: '8px 12px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '11px',
          color: '#cbd5e1',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '13px' }}>🏠</span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
          <span>Siap Antar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '13px' }}>🏠</span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb' }} />
          <span>Di Jalan</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '13px' }}>🏠</span>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
          <span>Terkirim</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '13px' }}>🛵</span>
          <span style={{ color: '#38bdf8', fontWeight: '700' }}>Posisi Saya</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '14px', height: '3px', background: '#38bdf8', borderRadius: '2px' }} />
          <span style={{ color: '#38bdf8', fontWeight: '700' }}>Jalur Rute</span>
        </div>
      </div>
    </div>
  );
}
