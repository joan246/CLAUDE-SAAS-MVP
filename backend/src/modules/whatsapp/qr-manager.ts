import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

interface StoredQr {
  qr: string;
  dataUrl: string;
  generatedAt: Date;
}

/** Vida útil de un QR de WhatsApp antes de que el teléfono lo rechace (~60s, usamos 50). */
const QR_TTL_MS = 50_000;

/**
 * Mantiene el último QR generado por empresa, convertido a data-URL
 * para que el frontend lo muestre directamente en un <img>.
 */
@Injectable()
export class QRManager {
  private qrs = new Map<string, StoredQr>();

  async set(companyId: string, qr: string): Promise<StoredQr> {
    const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 300 });
    const stored: StoredQr = { qr, dataUrl, generatedAt: new Date() };
    this.qrs.set(companyId, stored);
    return stored;
  }

  get(companyId: string): StoredQr | null {
    const stored = this.qrs.get(companyId);
    if (!stored) return null;
    if (Date.now() - stored.generatedAt.getTime() > QR_TTL_MS) {
      this.qrs.delete(companyId);
      return null;
    }
    return stored;
  }

  clear(companyId: string) {
    this.qrs.delete(companyId);
  }
}
