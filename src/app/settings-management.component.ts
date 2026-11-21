import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LabelPaperSize, SettingsService, StoreSettings } from './settings.service';
import { thaiErrorMessage } from './error-message';

@Component({
  selector: 'app-settings-management',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="settings-heading">
      <div>
        <span class="settings-eyebrow">ตั้งค่าระบบ</span>
        <h1>ตั้งค่า<span>.</span></h1>
        <p>จัดการข้อมูลร้านค้าและรูปแบบใบปะหน้า</p>
      </div>
    </section>

    @if (errorMessage()) {
      <div class="settings-message settings-error" role="alert">
        {{ errorMessage() }}
        <button type="button" aria-label="ปิดข้อความ" (click)="errorMessage.set('')">×</button>
      </div>
    }
    @if (notice()) {
      <div class="settings-message settings-success" role="status">
        {{ notice() }}
        <button type="button" aria-label="ปิดข้อความ" (click)="notice.set('')">×</button>
      </div>
    }

    @if (loading()) {
      <section class="settings-loading">
        <span class="settings-spinner"></span> กำลังโหลดการตั้งค่า...
      </section>
    } @else {
      <form class="settings-card" #settingsForm="ngForm" (ngSubmit)="save()">
        <header>
          <div>
            <h2>ข้อมูลร้านค้าและผู้ส่ง</h2>
            <p>ข้อมูลนี้จะแสดงบนใบปะหน้า โดยจะไม่พิมพ์ชื่อบริษัทขนส่งและเลขพัสดุ</p>
          </div>
        </header>
        <div class="settings-grid">
          <label>
            <span>ชื่อร้าน *</span>
            <input name="storeName" [(ngModel)]="form.storeName" required maxlength="150" />
          </label>
          <label>
            <span>ชื่อผู้ส่ง *</span>
            <input name="senderName" [(ngModel)]="form.senderName" required maxlength="150" />
          </label>
          <label>
            <span>เบอร์โทรศัพท์ผู้ส่ง *</span>
            <input name="senderPhone" [(ngModel)]="form.senderPhone" required maxlength="30" />
          </label>
          <label>
            <span>ขนาดกระดาษใบปะหน้า *</span>
            <select name="labelPaperSize" [(ngModel)]="form.labelPaperSize">
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="100x150mm">100 mm × 150 mm</option>
            </select>
          </label>
          <label class="settings-wide">
            <span>ที่อยู่ผู้ส่ง *</span>
            <textarea
              name="senderAddress"
              [(ngModel)]="form.senderAddress"
              required
              maxlength="500"
              rows="3"
            ></textarea>
          </label>
        </div>
        <footer>
          <span>เฉพาะเจ้าของร้านเท่านั้นที่แก้ไขการตั้งค่านี้ได้</span>
          <button type="submit" [disabled]="settingsForm.invalid || saving()">
            {{ saving() ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า' }}
          </button>
        </footer>
      </form>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        color: #252a31;
        font-family: 'DM Sans', 'Segoe UI', sans-serif;
      }
      .settings-heading {
        margin-bottom: 24px;
      }
      .settings-eyebrow {
        color: #6d7a8b;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 1.35px;
      }
      .settings-heading h1 {
        margin: 10px 0 6px;
        font-family: 'Manrope', 'Segoe UI', sans-serif;
        font-size: clamp(28px, 2.3vw, 36px);
        font-weight: 650;
        letter-spacing: -1.2px;
      }
      .settings-heading h1 span {
        color: #728299;
      }
      .settings-heading p,
      .settings-card header p {
        margin: 0;
        color: #7b8797;
        font-size: 12px;
      }
      .settings-card {
        overflow: hidden;
        border: 1px solid #e6e9ed;
        border-radius: 8px;
        background: #fff;
      }
      .settings-card header {
        padding: 18px 20px;
        border-bottom: 1px solid #eceef1;
      }
      .settings-card h2 {
        margin: 0 0 6px;
        color: #3b444f;
        font-size: 16px;
      }
      .settings-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        padding: 20px;
      }
      .settings-grid label {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .settings-grid label > span {
        color: #596575;
        font-size: 12px;
        font-weight: 650;
      }
      .settings-grid input,
      .settings-grid select,
      .settings-grid textarea {
        width: 100%;
        min-width: 0;
        min-height: 42px;
        padding: 9px 11px;
        border: 1px solid #dfe4ea;
        border-radius: 6px;
        outline: none;
        color: #35404e;
        background: #fff;
        font: inherit;
        font-size: 14px;
      }
      .settings-grid textarea {
        resize: vertical;
      }
      .settings-grid input:focus,
      .settings-grid select:focus,
      .settings-grid textarea:focus {
        border-color: #8292a8;
        box-shadow: 0 0 0 3px rgba(82, 103, 130, 0.1);
      }
      .settings-wide {
        grid-column: 1/-1;
      }
      .settings-card footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        padding: 14px 20px;
        border-top: 1px solid #eceef1;
        background: #fcfcfd;
      }
      .settings-card footer span {
        color: #828c99;
        font-size: 11px;
      }
      .settings-card footer button {
        min-height: 40px;
        padding: 0 16px;
        border: 1px solid #405672;
        border-radius: 6px;
        color: #fff;
        background: #405672;
        font: inherit;
        font-size: 13px;
        font-weight: 650;
        cursor: pointer;
      }
      .settings-card footer button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .settings-message {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 16px;
        padding: 12px;
        border: 1px solid #eed7d5;
        border-radius: 6px;
        color: #914e4b;
        background: #fff9f8;
        font-size: 12px;
      }
      .settings-success {
        border-color: #d7e5dc;
        color: #466c56;
        background: #f7fbf8;
      }
      .settings-message button {
        border: 0;
        color: inherit;
        background: transparent;
        font-size: 18px;
        cursor: pointer;
      }
      .settings-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        min-height: 180px;
        color: #687586;
        font-size: 13px;
      }
      .settings-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid #e1e5eb;
        border-top-color: #526782;
        border-radius: 50%;
        animation: settings-spin 0.7s linear infinite;
      }
      @keyframes settings-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (max-width: 600px) {
        .settings-grid {
          grid-template-columns: 1fr;
          padding: 16px;
        }
        .settings-wide {
          grid-column: auto;
        }
        .settings-card footer {
          align-items: flex-start;
          flex-direction: column;
          padding: 14px 16px;
        }
        .settings-card footer button {
          width: 100%;
        }
      }
    `,
  ],
})
export class SettingsManagementComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly form: StoreSettings = this.emptySettings();

  ngOnInit(): void {
    this.load();
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.errorMessage.set('');
    this.notice.set('');
    this.settingsService.update({ ...this.form }).subscribe({
      next: (settings) => {
        this.setFormValues(settings);
        this.notice.set('บันทึกการตั้งค่าเรียบร้อยแล้ว');
        this.saving.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.saving.set(false);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.setFormValues(settings);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.messageFor(error));
        this.loading.set(false);
      },
    });
  }

  private setFormValues(settings: StoreSettings): void {
    this.form.storeName = settings.storeName;
    this.form.senderName = settings.senderName;
    this.form.senderPhone = settings.senderPhone;
    this.form.senderAddress = settings.senderAddress;
    this.form.labelPaperSize = settings.labelPaperSize;
  }

  private emptySettings(): StoreSettings {
    return {
      storeName: 'LEKTAE',
      senderName: '',
      senderPhone: '',
      senderAddress: '',
      labelPaperSize: 'A4' satisfies LabelPaperSize,
    };
  }

  private messageFor(error: HttpErrorResponse): string {
    return thaiErrorMessage(error, 'ไม่สามารถโหลดหรือบันทึกการตั้งค่าได้');
  }
}
