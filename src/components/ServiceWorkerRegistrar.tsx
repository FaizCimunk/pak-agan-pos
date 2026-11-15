'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // Selalu cek update SW terbaru setiap kali halaman dibuka
        reg.update();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Versi baru telah terinstal, segarkan otomatis agar update langsung tampil
                console.log('[SW] Update terdeteksi, membersihkan cache lama & memuat ulang...');
                if (!refreshing) {
                  refreshing = true;
                  window.location.reload();
                }
              }
            });
          }
        });
      } catch (err) {
        console.warn('Service Worker gagal didaftarkan:', err);
      }
    };

    register();
  }, []);

  return null;
}
