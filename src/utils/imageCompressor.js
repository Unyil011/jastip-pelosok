/**
 * Utility untuk mengompresi dan mengonversi gambar ke format WebP di sisi browser (client-side).
 * Menghasilkan file yang sangat ringan (~15-40 KB) untuk hemat kuota dan cepat di pelosok.
 */
export async function compressImageToWebP(file, maxDimension = 320, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('File yang dipilih bukan gambar yang valid.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat gambar untuk dikompres.'));
      img.onload = () => {
        // Hitung skala aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Gambar ke canvas dengan ukuran optimal
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Browser tidak mendukung canvas pengolah gambar.'));
        }

        // Gambar dengan filter kualitas halus
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor langsung ke format image/webp
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          resolve(webpDataUrl);
        } catch {
          // Fallback jika browser lawas belum mendukung webp
          const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(jpegDataUrl);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}
