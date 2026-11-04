// ESC/POS Bluetooth Thermal Printer Driver for Minuman Herbal Pak Agan
// Supports Web Bluetooth API for Android/Chrome tablet offline printing & browser print simulation.

import { Transaksi, Shift, Cabang } from './types';
import { formatRupiah, formatWaktu } from './utils';

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
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
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
    this.newLine(3);
    this.buffer.push(0x1D, 0x56, 0x41, 0x10); // GS V A 16 (Cut paper)
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

  async isBluetoothAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return !!(navigator as any).bluetooth;
  }

  async connect(): Promise<{ success: boolean; name?: string; message?: string }> {
    try {
      if (!(await this.isBluetoothAvailable())) {
        return { success: false, message: 'Web Bluetooth API tidak didukung di browser ini.' };
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

    // Header
    builder.alignCenter();
    builder.bold(true).size(true, true);
    builder.text(cabang.struk_header || 'SERABI BAWEL & WEDANG GEPREK');
    builder.newLine();
    builder.size(false, false);
    builder.text('Serabi Tungku & Rempah Alami');
    builder.newLine();
    builder.bold(false);
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
    builder.row('Pelanggan:', transaksi.nama_pelanggan);
    builder.row('Metode:', transaksi.metode_bayar.toUpperCase());
    builder.line('-', 32);

    // Items
    for (const item of transaksi.items) {
      builder.bold(true);
      builder.text(item.nama_menu);
      builder.newLine();
      builder.bold(false);
      const detailStr = `  ${item.qty}x @${formatRupiah(item.harga).replace('Rp\u00a0', '')}`;
      const subtotalStr = formatRupiah(item.subtotal).replace('Rp\u00a0', '');
      builder.row(detailStr, subtotalStr);
      if (item.catatan) {
        builder.text(`  * ${item.catatan}`);
        builder.newLine();
      }
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

    // Footer
    builder.alignCenter();
    if (cabang.struk_footer) {
      builder.text(cabang.struk_footer);
    } else {
      builder.text('Khasiat Alami, Tubuh Sehat');
      builder.newLine();
      builder.text('Terima Kasih Atas Kunjungan Anda');
      builder.newLine();
      builder.text('--- www.pakagan.id ---');
    }
    builder.newLine();

    // Footer Promosi Permanen ivokgrup untuk Printer Thermal 58mm
    builder.line('-', 32);
    builder.bold(true);
    builder.text('DIGITALISASI MULTI-CABANG');
    builder.newLine();
    builder.bold(false);
    builder.text('POS & Finansial Custom Bisnis');
    builder.newLine();
    builder.text('Dipercaya 1.000+ Pengusaha');
    builder.newLine();
    builder.text('Bersama ivokgrup - ivok.id');
    builder.newLine();

    builder.cut();

    return builder.getBytes();
  }

  // Generate binary ESC/POS for Shift Closing Recap Receipt
  buildShiftCloseCommands(shift: Shift, cabang: Cabang): Uint8Array {
    const builder = new EscPosBuilder();
    builder.init();

    builder.alignCenter();
    builder.bold(true).size(true, true);
    builder.text('REKAP TUTUP SHIFT');
    builder.newLine();
    builder.size(false, false);
    builder.text('MINUMAN HERBAL PAK AGAN');
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
    builder.text('METODE LAIN:');
    builder.newLine();
    builder.bold(false);
    builder.row('QRIS Masuk:', formatRupiah(shift.total_qris_masuk));
    builder.row('Transfer Masuk:', formatRupiah(shift.total_transfer_masuk));

    builder.line('=', 32);
    builder.alignCenter();
    builder.text('Tanda Tangan PJ Kasir:');
    builder.newLine(3);
    builder.text(`( ${shift.karyawan_nama || 'Kasir Cabang'} )`);
    builder.newLine();
    builder.cut();

    return builder.getBytes();
  }
}

export const printerService = new BluetoothPrinterService();
