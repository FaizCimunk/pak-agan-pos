// ESC/POS Bluetooth Thermal Printer Driver for Minuman Herbal Pak Agan
// Supports Web Bluetooth API for Android/Chrome tablet offline printing & browser print simulation.

import { Transaksi, Shift, Cabang, KitchenStation } from './types';
import { formatRupiah, formatWaktu } from './utils';

// Helper untuk mengklasifikasi item ke salah satu dari 3 Ruangan Masak:
// 1. serabi (Tungku tanah liat Serabi Bawel)
// 2. wedang (Bar Racikan Wedang Geprek & Minuman Herbal)
// 3. makanan (Dapur Camilan / Gorengan)
export function getItemKitchenStation(item: {
  nama_menu?: string;
  menu_id?: string;
  kategori_id?: string;
  kategori_nama?: string;
  nama?: string;
}): 'serabi' | 'wedang' | 'makanan' {
  const name = (item.nama_menu || item.nama || '').toLowerCase();
  const kat = (item.kategori_id || '').toLowerCase();
  const katNama = (item.kategori_nama || '').toLowerCase();

  // 1. Serabi Bawel: Kategori serabi (ID kat-sb atau UUID serabi) atau nama mengandung serabi, kinca, oncom, pandan
  if (
    kat === 'kat-sb' ||
    kat === '6d639aab-ff78-40b3-87df-4c18a4977288' ||
    kat.includes('serabi') ||
    katNama.includes('serabi') ||
    name.includes('serabi') ||
    name.includes('kinca') ||
    name.includes('oncom') ||
    name.includes('pandan')
  ) {
    return 'serabi';
  }

  // 2. Makanan & Camilan: Kategori makanan/camilan (ID kat-6 atau UUID makanan) atau nama masakan/camilan
  if (
    kat === 'kat-6' ||
    kat === 'ccae656c-4c48-421f-aa93-efe6e5b28f43' ||
    kat.includes('makanan') ||
    kat.includes('camilan') ||
    kat.includes('snack') ||
    kat.includes('dapur') ||
    katNama.includes('makanan') ||
    katNama.includes('camilan') ||
    katNama.includes('snack') ||
    katNama.includes('dapur') ||
    katNama.includes('masak') ||
    name.includes('mie') ||
    name.includes('ayam') ||
    name.includes('nasi') ||
    name.includes('bakso') ||
    name.includes('pisang') ||
    name.includes('singkong') ||
    name.includes('mendoan') ||
    name.includes('goreng') ||
    name.includes('tahu') ||
    name.includes('tempe') ||
    name.includes('camilan') ||
    name.includes('snack') ||
    name.includes('kentang') ||
    name.includes('bakwan') ||
    name.includes('soto') ||
    name.includes('sate') ||
    name.includes('bebek') ||
    name.includes('roti') ||
    name.includes('kwetiau') ||
    name.includes('bihun') ||
    name.includes('dimsum') ||
    name.includes('pangsit') ||
    name.includes('telur') ||
    name.includes('seblak') ||
    name.includes('batagor') ||
    name.includes('siomay') ||
    name.includes('risol')
  ) {
    return 'makanan';
  }

  // 3. Wedang Geprek & Minuman Herbal (default station)
  return 'wedang';
}

export type OrderServiceMode = 'bungkus' | 'mixed' | 'makan_sini';

/** Menentukan layanan pesanan (Bungkus / Campur / Makan Di Sini) dari penanda maupun catatan per item. */
export function getOrderServiceMode(
  penandaOrName: string,
  items: Array<{ catatan?: string }> = []
): OrderServiceMode {
  const penandaLower = (penandaOrName || '').toLowerCase();
  if (
    penandaLower.includes('bungkus') ||
    penandaLower.includes('take away') ||
    penandaLower.includes('takeaway') ||
    penandaLower.includes('bawa')
  ) {
    return 'bungkus';
  }

  if (items.length === 0) return 'makan_sini';

  const isNoteBungkus = (c?: string) => {
    const low = (c || '').toLowerCase();
    return (
      low.includes('bungkus') ||
      low.includes('take away') ||
      low.includes('takeaway') ||
      low.includes('bawa')
    );
  };

  const bungkusCount = items.filter(it => isNoteBungkus(it.catatan)).length;
  if (bungkusCount === items.length) return 'bungkus';
  if (bungkusCount > 0) return 'mixed';
  return 'makan_sini';
}

export interface BluetoothPrinterState {
  isConnected: boolean;
  deviceName: string | null;
  error: string | null;
}

class EscPosBuilder {
  private buffer: number[] = [];

  constructor() {
    this.init();
  }

  init() {
    this.buffer.push(0x1B, 0x40); // ESC @ Initialize
    return this;
  }

  alignCenter() {
    this.buffer.push(0x1B, 0x61, 0x01);
    return this;
  }

  alignLeft() {
    this.buffer.push(0x1B, 0x61, 0x00);
    return this;
  }

  alignRight() {
    this.buffer.push(0x1B, 0x61, 0x02);
    return this;
  }

  bold(enable: boolean = true) {
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00);
    return this;
  }

  size(doubleWidth: boolean = false, doubleHeight: boolean = false) {
    let n = 0;
    if (doubleWidth) n |= 0x20;
    if (doubleHeight) n |= 0x01;
    this.buffer.push(0x1D, 0x21, n);
    return this;
  }

  text(str: string) {
    // Sanitasi karakter khusus: ganti non-breaking space (\u00a0 / \u202F) menjadi spasi biasa (ASCII 0x20)
    // agar tidak muncul karakter "á" pada printer thermal Bluetooth
    const cleanStr = str.replace(/[\u00a0\u202F]/g, ' ');
    const encoder = new TextEncoder();
    const bytes = encoder.encode(cleanStr);
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i]);
    }
    return this;
  }

  newLine(count: number = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0A);
    }
    return this;
  }

  line(char: string = '-', width: number = 32) {
    this.text(char.repeat(width));
    this.newLine();
    return this;
  }

  row(left: string, right: string, width: number = 32) {
    const available = width - right.length;
    let l = left;
    if (l.length > available - 1) {
      l = l.substring(0, available - 2) + ' ';
    }
    const spaces = Math.max(1, width - l.length - right.length);
    this.text(l + ' '.repeat(spaces) + right);
    this.newLine();
    return this;
  }

  cut() {
    // PENTING: Printer Bluetooth portable 58mm tidak memiliki motor pisau otomatis (hanya gerigi sobekan manual).
    // Perintah GS V (0x1D 0x56) menyebabkan firmware printer berputar tanpa henti (infinite paper feed).
    // Beri 3 baris kosong agar tulisan melewati gerigi pemotong manual, lalu berhenti dengan rapi.
    this.newLine(3);
    return this;
  }

  getBytes(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

// Bluetooth Manager Singleton
class BluetoothPrinterService {
  private device: any = null;
  private characteristic: any = null;

  isNativeApp(): boolean {
    return typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
  }

  async isBluetoothAvailable(): Promise<boolean> {
    if (this.isNativeApp()) return true;
    if (typeof window === 'undefined') return false;
    return !!(navigator as any).bluetooth;
  }

  async connect(): Promise<{ success: boolean; name?: string; message?: string }> {
    // 1. Jika berjalan di dalam Native Android APK (seperti Ivok Laundry)
    if (this.isNativeApp()) {
      try {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BT_GET_PAIRED_DEVICES',
        }));
        return { success: true, name: 'Printer Native Android Aktif' };
      } catch (e: any) {
        return { success: false, message: e.message || 'Gagal memanggil native printer bridge.' };
      }
    }

    // 2. Fallback Web Bluetooth BLE untuk browser desktop / Chrome kompatibel
    try {
      if (!(await this.isBluetoothAvailable())) {
        return { success: false, message: 'Web Bluetooth API tidak didukung di browser ini. Gunakan Aplikasi APK Kasir untuk mencetak ke printer thermal Bluetooth.' };
      }

      const bluetooth = (navigator as any).bluetooth;
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Thermal POS standard
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          0xff00,
          0xffe0,
        ],
      });

      const server = await device.gatt.connect();
      
      // Find writable characteristic
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            this.device = device;
            return { success: true, name: device.name || 'Thermal Printer' };
          }
        }
      }

      return { success: false, message: 'Karakteristik ESC/POS tidak ditemukan pada printer.' };
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      return { success: false, message: err.message || 'Gagal menyambung ke printer Bluetooth.' };
    }
  }

  async printRaw(bytes: Uint8Array): Promise<boolean> {
    // 1. Jika berjalan di Android APK Native Shell (Ivok Laundry Bridge)
    if (this.isNativeApp()) {
      try {
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({
          type: 'BT_PRINT_RECEIPT',
          rawBytes: Array.from(bytes),
          text: binary,
          openDrawer: true,
        }));
        return true;
      } catch (e) {
        console.warn('Native WebView bridge print error:', e);
      }
    }

    // 2. Web Bluetooth BLE Characteristic
    if (!this.characteristic) return false;
    try {
      const CHUNK_SIZE = 512;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        if (this.characteristic.writeValueWithResponse) {
          await this.characteristic.writeValueWithResponse(chunk);
        } else {
          await this.characteristic.writeValueWithoutResponse(chunk);
        }
      }
      return true;
    } catch (e) {
      console.error('Error writing bytes to printer:', e);
      return false;
    }
  }

  // Generate binary ESC/POS for Customer Transaction Receipt
  buildReceiptCommands(transaksi: Transaksi, cabang: Cabang): Uint8Array {
    const builder = new EscPosBuilder();
    builder.init();

    // Header Struk (Normal Bold agar pas 32 karakter dan tidak terpotong 3 baris)
    builder.alignCenter();
    builder.bold(true).size(false, false);
    const headerTitle = (cabang.struk_header || 'SERABI BAWEL & WEDANG GEPREK').trim();
    if (headerTitle === 'SERABI BAWEL & WEDANG GEPREK' || headerTitle === 'SERABI BAWEL DAN WEDANG GEPREK') {
      builder.text('SERABI BAWEL');
      builder.newLine();
      builder.text('& WEDANG GEPREK');
    } else {
      builder.text(headerTitle);
    }
    builder.newLine();
    builder.bold(false);
    builder.text('Serabi Tungku & Rempah Alami');
    builder.newLine();
    builder.text(cabang.nama);
    builder.newLine();
    builder.text(cabang.alamat);
    builder.newLine();
    builder.text(`Telp/WA: ${cabang.telepon}`);
    builder.newLine();
    builder.line('=', 32);

    // Meta
    builder.alignLeft();
    builder.row('No:', transaksi.invoice_no);
    builder.row('Tgl:', formatWaktu(transaksi.waktu));
    builder.row('Kasir:', transaksi.karyawan_nama || 'Kasir Cabang');
    const penandaReceipt = (transaksi as any).penanda || (transaksi as any).meja;
    const isBungkusReceipt = (penandaReceipt || transaksi.nama_pelanggan || '').toLowerCase().includes('bungkus') ||
                            (penandaReceipt || transaksi.nama_pelanggan || '').toLowerCase().includes('take away') ||
                            (penandaReceipt || transaksi.nama_pelanggan || '').toLowerCase().includes('bawa');
    builder.row('Layanan:', isBungkusReceipt ? 'BUNGKUS (TAKE AWAY)' : 'MAKAN DI SINI');
    if (penandaReceipt) {
      builder.row('Penanda:', penandaReceipt);
    }
    builder.row('Pelanggan:', transaksi.nama_pelanggan);
    builder.row('Metode:', transaksi.metode_bayar.toUpperCase());
    builder.line('-', 32);

    // Items
    for (const item of transaksi.items) {
      builder.bold(true);
      const itemTitle = item.varian_nama 
        ? `${item.nama_menu} (${item.varian_nama})`
        : (item.temperature === 'dingin' ? `${item.nama_menu} (ES)` : item.nama_menu);
      builder.text(itemTitle);
      builder.newLine();
      builder.bold(false);
      if (item.catatan) {
        builder.bold(true);
        builder.text(`  * CATATAN: ${item.catatan.toUpperCase()}`);
        builder.newLine();
        builder.bold(false);
      }
      const detailStr = `  ${item.qty}x @${formatRupiah(item.harga).replace('Rp\u00a0', '')}`;
      const subtotalStr = formatRupiah(item.subtotal).replace('Rp\u00a0', '');
      builder.row(detailStr, subtotalStr);
    }

    builder.line('-', 32);

    // Summary
    builder.row('Subtotal:', formatRupiah(transaksi.subtotal));
    if (transaksi.diskon > 0) {
      builder.row('Diskon:', `-${formatRupiah(transaksi.diskon)}`);
    }
    builder.bold(true);
    builder.row('TOTAL TAGIHAN:', formatRupiah(transaksi.total));
    builder.bold(false);
    builder.row('Bayar:', formatRupiah(transaksi.bayar));
    builder.row('Kembali:', formatRupiah(transaksi.kembali));

    builder.line('=', 32);

    // Promo Khusus Cabang jika ada
    if (cabang.struk_promo) {
      builder.alignCenter();
      builder.bold(true);
      builder.text('*** PROMO KHUSUS CABANG ***');
      builder.newLine();
      builder.text(cabang.struk_promo);
      builder.newLine();
      builder.bold(false);
      builder.line('-', 32);
    }

    // Footer Toko (Hapus referensi www.pakagan.id sesuai permintaan)
    builder.alignCenter();
    const rawFooter = cabang.struk_footer || 'Khasiat Alami, Tubuh Sehat\nTerima Kasih Atas Kunjungan Anda';
    const cleanFooter = rawFooter
      .replace(/---?\s*www\.pakagan\.id\s*---?/gi, '')
      .replace(/www\.pakagan\.id/gi, '')
      .trim();
    if (cleanFooter) {
      builder.text(cleanFooter);
      builder.newLine();
    }

    // Footer Promosi Paten Permanen ivokgrup untuk Seluruh Cabang (Tidak Bisa Dirubah)
    builder.line('-', 32);
    builder.alignCenter();
    builder.bold(true);
    builder.text('Digitalisasi Operasional');
    builder.newLine();
    builder.text('Multi-Cabang, POS & Keuangan');
    builder.newLine();
    builder.text('Terintegrasi.');
    builder.newLine();
    builder.bold(false);
    builder.text('Dipercaya oleh 1.000+');
    builder.newLine();
    builder.text('Pengusaha Berkembang.');
    builder.newLine();
    builder.bold(true);
    builder.text('Solusi Bisnis Cerdas bersama');
    builder.newLine();
    builder.text('ivokgrup.com');
    builder.newLine();
    builder.bold(false);

    builder.cut();

    return builder.getBytes();
  }

  // Generate binary ESC/POS for Shift Closing Recap Receipt
  buildShiftCloseCommands(shift: Shift, cabang: Cabang): Uint8Array {
    const builder = new EscPosBuilder();
    builder.init();

    builder.alignCenter();
    builder.bold(true).size(false, false);
    builder.text('REKAP TUTUP SHIFT');
    builder.newLine();
    builder.text('SERABI BAWEL & WEDANG GEPREK');
    builder.newLine();
    builder.bold(false);
    builder.text(cabang.nama);
    builder.newLine();
    builder.line('=', 32);

    builder.alignLeft();
    builder.row('PJ Kasir:', shift.karyawan_nama || 'Kasir');
    builder.row('Buka:', formatWaktu(shift.waktu_buka));
    builder.row('Tutup:', formatWaktu(shift.waktu_tutup || new Date().toISOString()));
    builder.line('-', 32);

    builder.bold(true);
    builder.text('MUTASI KAS LACI:');
    builder.newLine();
    builder.bold(false);
    builder.row('(+) Modal Awal:', formatRupiah(shift.modal_awal));
    builder.row('(+) Tunai Masuk:', formatRupiah(shift.total_tunai_masuk));
    builder.row('(-) Belanja Approved:', formatRupiah(shift.total_belanja_approved));
    builder.row('(-) Kasbon Approved:', formatRupiah(shift.total_kasbon_approved));
    builder.line('-', 32);

    builder.bold(true);
    builder.row('SALDO SISTEM:', formatRupiah(shift.saldo_akhir_sistem));
    builder.row('FISIK UANG LACI:', formatRupiah(shift.saldo_akhir_fisik));
    
    const diffStatus = shift.selisih === 0 ? 'COCOK / PAS' : shift.selisih > 0 ? `LEBIH (+${formatRupiah(shift.selisih)})` : `TEKOR (-${formatRupiah(Math.abs(shift.selisih))})`;
    builder.row('SELISIH:', diffStatus);
    builder.bold(false);

    builder.line('-', 32);
    builder.bold(true);
    builder.text('NON-TUNAI & OJOL/ONLINE:');
    builder.newLine();
    builder.bold(false);
    builder.row('QRIS Masuk:', formatRupiah(shift.total_qris_masuk || 0));
    builder.row('Transfer Bank:', formatRupiah(shift.total_transfer_masuk || 0));
    builder.row('ShopeeFood:', formatRupiah(shift.total_shopeefood_masuk || 0));
    builder.row('GoFood:', formatRupiah(shift.total_gofood_masuk || 0));
    builder.row('GrabFood:', formatRupiah(shift.total_grabfood_masuk || 0));
    const totalOmzetShift =
      (shift.total_tunai_masuk || 0) +
      (shift.total_qris_masuk || 0) +
      (shift.total_transfer_masuk || 0) +
      (shift.total_shopeefood_masuk || 0) +
      (shift.total_gofood_masuk || 0) +
      (shift.total_grabfood_masuk || 0);
    builder.line('-', 32);
    builder.bold(true);
    builder.row('TOTAL OMZET SHIFT:', formatRupiah(totalOmzetShift));
    builder.bold(false);

    if (shift.catatan && shift.catatan.trim()) {
      builder.line('-', 32);
      builder.bold(true);
      builder.text('CATATAN / KETERANGAN:');
      builder.newLine();
      builder.bold(false);
      const rawNote = shift.catatan.trim();
      for (let i = 0; i < rawNote.length; i += 32) {
        builder.text(rawNote.slice(i, i + 32));
        builder.newLine();
      }
    }

    builder.line('=', 32);
    builder.alignCenter();
    builder.text('Tanda Tangan PJ Kasir:');
    builder.newLine(3);
    builder.text(`( ${shift.karyawan_nama || 'Kasir Cabang'} )`);
    builder.newLine();
    builder.cut();

    return builder.getBytes();
  }

  // Generate binary ESC/POS for Kitchen Station Ticket (3 Ruangan Masak: Wedang, Serabi, Makanan)
  buildKitchenStationTicket(
    transaksi: Transaksi,
    cabang: Cabang,
    station: KitchenStation = 'semua'
  ): Uint8Array {
    const builder = new EscPosBuilder();
    builder.init();

    // Filter items matching the station
    const stationItems = station === 'semua' 
      ? transaksi.items 
      : transaksi.items.filter(it => getItemKitchenStation(it) === station);

    if (stationItems.length === 0) {
      return new Uint8Array();
    }

    const stationTitles: Record<KitchenStation, string> = {
      serabi: 'DAPUR SERABI',
      wedang: 'BAR WEDANG',
      makanan: 'DAPUR MAKANAN',
      semua: 'PESANAN SEMUA DAPUR'
    };

    const stationTitle = stationTitles[station] || 'TIKET DAPUR';

    // Header Besar Ruangan Masak
    builder.alignCenter();
    builder.bold(true).size(true, true);
    builder.text(`[ ${stationTitle} ]`);
    builder.newLine();
    builder.size(false, false);
    builder.bold(false);
    builder.text('SERABI BAWEL & WEDANG GEPREK');
    builder.newLine();
    builder.text(cabang.nama);
    builder.newLine();
    builder.line('=', 32);

    // Identitas Penanda & Tipe Layanan (Bungkus vs Campur vs Makan Di Sini)
    builder.alignLeft();
    builder.bold(true).size(true, true);
    const penandaDisplay = (transaksi as any).penanda || (transaksi as any).meja || (transaksi.nama_pelanggan.toLowerCase().includes('meja') ? transaksi.nama_pelanggan : `Pesanan: ${transaksi.nama_pelanggan}`);
    const serviceMode = getOrderServiceMode(penandaDisplay, stationItems);

    builder.text(penandaDisplay.toUpperCase());
    builder.newLine();
    builder.size(false, false);
    builder.bold(true);
    if (serviceMode === 'bungkus') {
      builder.text('>> BUNGKUS / TAKE AWAY <<');
      builder.newLine();
      builder.bold(false);
      builder.text('*(Kemas Pakai Dus / Cup / Plastik)*');
    } else if (serviceMode === 'mixed') {
      builder.text('>> CAMPUR: BUNGKUS & MAKAN SINI <<');
      builder.newLine();
      builder.bold(false);
      builder.text('*(Cek catatan BUNGKUS/MAKAN SINI tiap item)*');
    } else {
      builder.text('>> MAKAN DI SINI (DINE IN) <<');
      builder.newLine();
      builder.bold(false);
      builder.text('*(Sajikan di Piring / Cangkir Saji)*');
    }
    builder.newLine();
    builder.bold(false);

    builder.row('No. Nota:', transaksi.invoice_no);
    builder.row('Waktu:', formatWaktu(transaksi.waktu));
    builder.row('Kasir:', (transaksi.karyawan_nama || 'Kasir').split('(')[0].trim());
    if (transaksi.nama_pelanggan && transaksi.nama_pelanggan !== penandaDisplay) {
      builder.row('Pelanggan:', transaksi.nama_pelanggan);
    }
    builder.row('Status:', transaksi.status === 'pending_payment' ? 'BELUM BAYAR (BAYAR NANTI)' : 'LUNAS DI AWAL');
    builder.line('-', 32);

    // Daftar Pesanan Ruangan Ini
    let totalPorsi = 0;
    for (const item of stationItems) {
      totalPorsi += item.qty;
      builder.bold(true).size(false, true); // Double height agar jelas
      const tempTag = item.temperature === 'dingin' ? ' [ES]' : item.temperature === 'panas' ? ' [PANAS]' : '';
      const varianTag = item.varian_nama ? ` [${item.varian_nama.toUpperCase()}]` : '';
      const itemTitle = `${item.nama_menu}${varianTag}${tempTag}`;
      builder.text(`${item.qty}x  ${itemTitle}`);
      builder.newLine();
      builder.size(false, false).bold(false);
      if (item.catatan) {
        builder.bold(true);
        builder.text(`    >>> ${item.catatan.toUpperCase()} <<<`);
        builder.newLine();
        builder.bold(false);
      }
    }

    builder.line('=', 32);

    // Footer Tiket Dapur
    builder.alignCenter();
    builder.bold(true);
    builder.text(`TOTAL: ${totalPorsi} PORSI`);
    builder.newLine();
    builder.bold(false);
    builder.text('*** MOHON SEGERA DIMASAK ***');
    builder.newLine();
    builder.cut();

    return builder.getBytes();
  }
}

export const printerService = new BluetoothPrinterService();
