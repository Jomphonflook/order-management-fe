import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Order } from './order.service';
import { StoreSettings } from './settings.service';

@Injectable({ providedIn: 'root' })
export class ShippingLabelPrintService {
  private readonly document = inject(DOCUMENT);

  print(orders: Order[], settings: StoreSettings): boolean {
    if (orders.length === 0) return false;
    const printWindow = this.document.defaultView;
    if (!printWindow || !this.document.body) return false;

    const labels = orders.map((order) => this.renderLabel(order, settings)).join('');
    const printContainer = this.document.createElement('div');
    printContainer.className = 'shipping-label-print-root';
    printContainer.innerHTML = labels;

    const printStyle = this.document.createElement('style');
    printStyle.textContent = this.printStyles(settings.labelPaperSize);
    this.document.head.append(printStyle);
    this.document.body.append(printContainer);

    const cleanup = () => {
      printContainer.remove();
      printStyle.remove();
    };
    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printWindow.setTimeout(() => printWindow.print(), 250);
    return true;
  }

  private printStyles(paperSize: StoreSettings['labelPaperSize']): string {
    const isCustomLabel = paperSize === '100x150mm';
    const paperHeight = paperSize === 'A4' ? '255mm' : paperSize === 'A5' ? '190mm' : '142mm';
    const pageSize = isCustomLabel ? '100mm 150mm' : paperSize;
    const pageMargin = isCustomLabel ? '4mm' : '10mm';
    const logoSize = isCustomLabel ? '16mm' : '20mm';
    const storeNameFontSize = isCustomLabel ? '16pt' : '18pt';
    const senderFontSize = isCustomLabel ? '11pt' : '13pt';
    const recipientPadding = isCustomLabel ? '5mm 6mm' : '12mm 10mm';
    const itemFontSize = isCustomLabel ? '10pt' : '12pt';
    const addressFontSize = paperSize === 'A4' ? '23pt' : paperSize === 'A5' ? '18pt' : '16pt';
    const nameFontSize = paperSize === 'A4' ? '28pt' : paperSize === 'A5' ? '22pt' : '20pt';
    const phoneFontSize = paperSize === 'A4' ? '21pt' : paperSize === 'A5' ? '18pt' : '16pt';

    return `
      .shipping-label-print-root { display: none; }
      @page { size: ${pageSize}; margin: ${pageMargin}; }
      @media print {
        * { box-sizing: border-box; }
        body * { visibility: hidden !important; }
        .shipping-label-print-root,
        .shipping-label-print-root * { visibility: visible !important; }
        .shipping-label-print-root {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          display: block !important;
          width: 100% !important;
          color: #17212f;
          font-family: "Leelawadee UI", Tahoma, "Noto Sans Thai", sans-serif;
        }
        .shipping-label {
          display: flex;
          min-height: ${paperHeight};
          flex-direction: column;
          border: 1.5px solid #26364b;
          page-break-after: always;
          break-after: page;
        }
        .shipping-label:last-child { page-break-after: auto; break-after: auto; }
        .sender { padding: ${isCustomLabel ? '5mm' : '9mm'}; border-bottom: 1px solid #8994a2; }
        .sender-brand { display: flex; align-items: center; gap: 4mm; margin-bottom: 4mm; }
        .sender-logo { width: ${logoSize}; height: ${logoSize}; object-fit: contain; }
        .store-name { margin: 0; color: #334d6b; font-size: ${storeNameFontSize}; font-weight: 700; letter-spacing: .5px; }
        .section-title { margin: 0 0 3mm; color: #64748a; font-size: 12pt; font-weight: 700; letter-spacing: .5px; }
        .sender p { margin: 1.5mm 0; font-size: ${senderFontSize}; line-height: 1.45; }
        .recipient { display: flex; flex: 1; flex-direction: column; justify-content: center; padding: ${recipientPadding}; }
        .recipient-name { margin: 0 0 5mm; font-size: ${nameFontSize}; font-weight: 700; line-height: 1.35; overflow-wrap: anywhere; }
        .recipient-phone { margin: 0 0 6mm; font-size: ${phoneFontSize}; font-weight: 600; }
        .recipient-address { margin: 0; font-size: ${addressFontSize}; line-height: 1.65; overflow-wrap: anywhere; }
        .label-items { margin-top: 5mm; padding-top: 3mm; border-top: 1px solid #c5ccd5; }
        .label-items-title { margin: 0 0 2mm; color: #64748a; font-size: 11pt; font-weight: 700; }
        .label-items-list { display: grid; gap: 1.5mm; margin: 0; padding: 0; list-style: none; }
        .label-item { display: flex; justify-content: space-between; gap: 4mm; font-size: ${itemFontSize}; line-height: 1.35; break-inside: avoid; }
        .label-item-name { min-width: 0; overflow-wrap: anywhere; }
        .label-item-quantity { flex: 0 0 auto; font-weight: 700; white-space: nowrap; }
        .payment-note { margin: 0 0 3mm; padding: 3mm; border: 1px solid #405672; color: #263d58; font-size: ${isCustomLabel ? '13pt' : '16pt'}; font-weight: 700; text-align: center; }
        .payment-note strong { display: block; margin-top: 1mm; font-size: ${isCustomLabel ? '16pt' : '19pt'}; }
      }
    `;
  }

  private renderLabel(order: Order, settings: StoreSettings): string {
    const address = order.customer.address;
    const recipientAddress = [
      address.addressLine,
      `ตำบล${address.subdistrict}`,
      `อำเภอ${address.district}`,
      `จังหวัด${address.province}`,
      address.postalCode,
    ].join(' ');
    const paymentNote =
      order.paymentMethod === 'cod'
        ? `<p class="payment-note">เก็บเงินปลายทาง(COD)<strong>ยอดชำระ ${this.escape(this.formatMoney(order.totalCents))}</strong></p>`
        : '<p class="payment-note">ไม่ต้องเก็บเงิน</p>';
    const items = order.items
      .map(
        (item) =>
          `<li class="label-item"><span class="label-item-name">${this.escape(item.name)}</span><span class="label-item-quantity">จำนวน ${item.quantity}</span></li>`,
      )
      .join('');

    return `<article class="shipping-label paper-${settings.labelPaperSize.toLowerCase()}">
      <header class="sender">
        <div class="sender-brand">
          <img class="sender-logo" src="/logo/logo.png" alt="LEKTAE" />
          <h1 class="store-name">${this.escape(settings.storeName)}</h1>
        </div>
        <h2 class="section-title">ผู้ส่ง</h2>
        <p>${this.escape(settings.senderName)}</p>
        <p>${this.escape(settings.senderPhone)}</p>
        <p>${this.escape(settings.senderAddress)}</p>
      </header>
      <main class="recipient">
        <h2 class="section-title">ผู้รับ</h2>
        <p class="recipient-name">${this.escape(order.customer.name)}</p>
        <p class="recipient-phone">${this.escape(order.customer.phone)}</p>
        <p class="recipient-address">${this.escape(recipientAddress)}</p>
        <section class="label-items">
          <h3 class="label-items-title">รายการสินค้า</h3>
          <ul class="label-items-list">${items}</ul>
        </section>
        ${paymentNote}
      </main>
    </article>`;
  }

  private formatMoney(amountCents: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(amountCents / 100);
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[character]!;
    });
  }
}
