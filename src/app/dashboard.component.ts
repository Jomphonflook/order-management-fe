import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardData, OrderService } from './order.service';
import { thaiErrorMessage } from './error-message';
import { formatThaiDate } from './thai-date';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dashboard-heading">
      <div>
        <span class="dashboard-eyebrow">ภาพรวมร้านค้า</span>
        <h1>แดชบอร์ด<span>.</span></h1>
        <p>สรุปยอดขาย ยอดรับ ยอดจ่าย และผลการดำเนินงาน</p>
      </div>
    </section>

    @if (errorMessage()) {
      <div class="dashboard-alert" role="alert">{{ errorMessage() }}</div>
    }

    <form class="dashboard-filters" (ngSubmit)="applyFilters()">
      <label class="dashboard-search">
        <span>ค้นหาออเดอร์ ลูกค้า หรือผู้ดูแล</span>
        <input
          name="search"
          type="search"
          [(ngModel)]="search"
          placeholder="เลขออเดอร์ ชื่อลูกค้า เบอร์โทร หรือผู้ดูแล"
        />
      </label>
      <label>
        <span>ตั้งแต่วันที่</span>
        <input name="from" type="date" [(ngModel)]="from" required />
      </label>
      <label>
        <span>ถึงวันที่</span>
        <input name="to" type="date" [(ngModel)]="to" required />
      </label>
      <label>
        <span>สถานะออเดอร์</span>
        <select name="orderStatus" [(ngModel)]="orderStatus">
          <option value="">ทุกสถานะ</option>
          @for (status of orderStatusOptions; track status) {
            <option [value]="status">{{ statusLabel(status) }}</option>
          }
        </select>
      </label>
      <label>
        <span>สถานะการชำระเงิน</span>
        <select name="paymentStatus" [(ngModel)]="paymentStatus">
          <option value="">ทุกสถานะการชำระเงิน</option>
          @for (status of paymentStatusOptions; track status) {
            <option [value]="status">{{ statusLabel(status) }}</option>
          }
        </select>
      </label>
      <label>
        <span>เรียงออเดอร์ตาม</span>
        <select name="sortBy" [(ngModel)]="sortBy">
          <option value="createdAt">วันที่สร้าง</option>
          <option value="orderNumber">เลขออเดอร์</option>
          <option value="customer.name">ชื่อลูกค้า</option>
          <option value="totalCents">ยอดขาย</option>
        </select>
      </label>
      <label>
        <span>ลำดับการเรียง</span>
        <select name="sortOrder" [(ngModel)]="sortOrder">
          <option value="desc">จากมากไปน้อย</option>
          <option value="asc">จากน้อยไปมาก</option>
        </select>
      </label>
      <label>
        <span>กราฟยอดขาย</span>
        <select name="chartInterval" [(ngModel)]="interval">
          <option value="day">รายวัน</option>
          <option value="month">รายเดือน</option>
          <option value="year">รายปี</option>
        </select>
      </label>
      <button class="dashboard-primary" type="submit" [disabled]="loading()">ค้นหา</button>
    </form>

    @if (loading()) {
      <div class="dashboard-loading">กำลังโหลดแดชบอร์ด...</div>
    } @else if (data(); as report) {
      <section class="dashboard-metrics" aria-label="สรุปข้อมูลทางการเงิน">
        <article class="dashboard-metric">
          <span>ยอดขาย</span>
          <strong>{{ money(report.summary.salesCents) }}</strong>
          <small>COD นับเมื่อสร้างออเดอร์; โอนเงินนับเมื่อชำระแล้ว</small>
        </article>
        <article class="dashboard-metric received">
          <span>ยอดรับ</span>
          <strong>{{ money(report.summary.receivedCents) }}</strong>
          <small>ยอดเงินจริงที่บันทึกว่ารับแล้ว</small>
        </article>
        <article class="dashboard-metric paid">
          <span>ค่าคอมมิชชันที่จ่ายแล้ว</span>
          <strong>{{ money(report.summary.paidCommissionCents) }}</strong>
          <small>ค่าคอมมิชชันที่ระบุว่าจ่ายแล้ว</small>
        </article>
        <article class="dashboard-metric">
          <span>กำไรขั้นต้น</span>
          <strong>{{ money(report.summary.grossProfitCents) }}</strong>
          <small>ยอดขายหักต้นทุนสินค้า</small>
        </article>
        <article class="dashboard-metric">
          <span>กำไรสุทธิ</span>
          <strong>{{ money(report.summary.netProfitCents) }}</strong>
          <small>หลังหักค่าคอมมิชชันและค่าใช้จ่าย</small>
        </article>
      </section>

      <section class="dashboard-counts" aria-label="จำนวนออเดอร์">
        <div>
          <span>ออเดอร์ทั้งหมด</span><strong>{{ report.summary.totalOrders }}</strong>
        </div>
        <div>
          <span>รอดำเนินการ</span><strong>{{ report.summary.pendingOrders }}</strong>
        </div>
        <div>
          <span>รอชำระเงิน</span><strong>{{ report.summary.unpaidOrders }}</strong>
        </div>
        <div>
          <span>สำเร็จ</span><strong>{{ report.summary.completedOrders }}</strong>
        </div>
        <div>
          <span>ยกเลิก</span><strong>{{ report.summary.cancelledOrders }}</strong>
        </div>
        <div>
          <span>คืนสินค้า</span><strong>{{ report.summary.returnedOrders }}</strong>
        </div>
      </section>

      <section class="dashboard-costs">
        <div>
          <span>ต้นทุนสินค้า</span><strong>{{ money(report.summary.productCostCents) }}</strong>
        </div>
        <div>
          <span>ต้นทุนค่าจัดส่ง</span><strong>{{ money(report.summary.shippingCostCents) }}</strong>
        </div>
        <div>
          <span>ค่าใช้จ่ายอื่น</span><strong>{{ money(report.summary.otherExpensesCents) }}</strong>
        </div>
      </section>

      <div class="dashboard-report-grid">
        <section class="dashboard-card">
          <header>
            <h2>ยอดขาย{{ intervalLabel }}</h2>
            <span>{{ report.range.from }} – {{ report.range.to }}</span>
          </header>
          @if (report.dailySales.length === 0) {
            <p class="dashboard-empty">ไม่มีรายการขายในช่วงวันที่นี้</p>
          } @else {
            <div class="sales-chart" role="img" aria-label="กราฟยอดขาย">
              @for (day of report.dailySales; track day.date) {
                <div class="sales-bar-column" [title]="day.date + ': ' + money(day.salesCents)">
                  <span class="sales-bar-value">{{ shortMoney(day.salesCents) }}</span>
                  <div class="sales-bar-track">
                    <span
                      class="sales-bar"
                      [style.height.%]="barHeight(day.salesCents, report.dailySales)"
                    ></span>
                  </div>
                  <span class="sales-bar-date">{{ trendLabel(day.date) }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="dashboard-card">
          <header>
            <h2>สินค้าขายดี</h2>
            <span>เรียงตามจำนวนที่ขาย</span>
          </header>
          @if (report.topProducts.length === 0) {
            <p class="dashboard-empty">ไม่มีรายการขายสินค้าในช่วงวันที่นี้</p>
          } @else {
            <div class="dashboard-list">
              @for (product of report.topProducts; track product.productId) {
                <div class="dashboard-list-row">
                  <span
                    ><strong>{{ product.name }}</strong
                    ><small>{{ product.sku }} · ขายแล้ว {{ product.quantity }} ชิ้น</small></span
                  >
                  <strong>{{ money(product.salesCents) }}</strong>
                </div>
              }
            </div>
          }
        </section>

        <section class="dashboard-card dashboard-wide">
          <header>
            <h2>ยอดขายและค่าคอมมิชชันแยกตามผู้ดูแล</h2>
            <span>เฉพาะออเดอร์ที่เข้าเงื่อนไข</span>
          </header>
          @if (report.salesByAdmin.length === 0) {
            <p class="dashboard-empty">ไม่มีรายการขายของผู้ดูแลในช่วงวันที่นี้</p>
          } @else {
            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>ผู้ดูแล</th>
                    <th>ออเดอร์</th>
                    <th>ยอดขาย</th>
                    <th>ค่าคอมมิชชัน</th>
                    <th>จ่ายค่าคอมมิชชันแล้ว</th>
                  </tr>
                </thead>
                <tbody>
                  @for (admin of report.salesByAdmin; track admin.adminId) {
                    <tr>
                      <td>{{ admin.adminName }}</td>
                      <td>{{ admin.orders }}</td>
                      <td>{{ money(admin.salesCents) }}</td>
                      <td>{{ money(admin.commissionCents) }}</td>
                      <td>{{ money(admin.paidCommissionCents) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <section class="dashboard-card dashboard-wide">
          <header>
            <h2>ออเดอร์ล่าสุด</h2>
            <span>ตรงตามตัวกรอง {{ report.summary.totalOrders }} รายการ</span>
          </header>
          @if (report.recentOrders.length === 0) {
            <p class="dashboard-empty">ไม่พบออเดอร์ที่ตรงกับตัวกรอง</p>
          } @else {
            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead>
                  <tr>
                    <th>ออเดอร์</th>
                    <th>ลูกค้า</th>
                    <th>ผู้ดูแล</th>
                    <th>สถานะ</th>
                    <th>การชำระเงิน</th>
                    <th>ยอดขาย</th>
                    <th>ยอดรับ</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of report.recentOrders; track order._id) {
                    <tr>
                      <td>
                        {{ order.orderNumber }}<small>{{ formatDate(order.createdAt) }}</small>
                      </td>
                      <td>{{ order.customer.name }}</td>
                      <td>{{ order.createdByName }}</td>
                      <td>{{ statusLabel(order.orderStatus) }}</td>
                      <td>
                        {{ order.paymentMethod === 'cod' ? 'เก็บเงินปลายทาง' : 'โอนเงิน' }} ·
                        {{ statusLabel(order.paymentStatus) }}
                      </td>
                      <td>{{ isSalesEligible(order) ? money(order.totalCents) : '—' }}</td>
                      <td>{{ money(order.amountPaidCents) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="dashboard-pagination">
              <span>หน้า {{ report.pages === 0 ? 0 : report.page }} จาก {{ report.pages }}</span>
              <div>
                <button
                  type="button"
                  [disabled]="loading() || report.page <= 1"
                  (click)="changePage(report.page - 1)"
                >
                  ก่อนหน้า
                </button>
                <button
                  type="button"
                  [disabled]="loading() || report.page >= report.pages"
                  (click)="changePage(report.page + 1)"
                >
                  ถัดไป
                </button>
              </div>
            </footer>
          }
        </section>
      </div>
    }
  `,
  styleUrls: ['./dashboard.component.css', './dashboard-reports.component.css'],
})
export class DashboardComponent implements OnInit {
  private readonly orderService = inject(OrderService);
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected search = '';
  protected from = this.monthStart();
  protected to = this.localDate();
  protected orderStatus = '';
  protected paymentStatus = '';
  protected sortBy: 'createdAt' | 'orderNumber' | 'customer.name' | 'totalCents' = 'createdAt';
  protected sortOrder: 'asc' | 'desc' = 'desc';
  protected interval: 'day' | 'month' | 'year' = 'day';
  protected page = 1;
  protected readonly orderStatusOptions = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ];
  protected readonly paymentStatusOptions = ['unpaid', 'pending_verification', 'paid', 'refunded'];

  ngOnInit(): void {
    this.applyFilters();
  }

  protected applyFilters(): void {
    if (!this.from || !this.to || this.from > this.to) {
      this.errorMessage.set('กรุณาเลือกช่วงวันที่ให้ถูกต้อง');
      return;
    }
    this.page = 1;
    this.loadDashboard();
  }

  protected changePage(page: number): void {
    const report = this.data();
    if (!report || page < 1 || page > report.pages || page === this.page) return;
    this.page = page;
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.orderService
      .getDashboard({
        from: this.from,
        to: this.to,
        search: this.search,
        orderStatus: this.orderStatus,
        paymentStatus: this.paymentStatus,
        page: this.page,
        limit: 10,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        interval: this.interval,
      })
      .subscribe({
        next: (report) => {
          this.data.set(report);
          this.page = report.page;
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(thaiErrorMessage(error, 'ไม่สามารถโหลดแดชบอร์ดได้'));
          this.loading.set(false);
        },
      });
  }

  protected money(cents: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(cents / 100);
  }

  protected formatDate(value: string): string {
    return formatThaiDate(value, 'short', 'short');
  }

  protected shortMoney(cents: number): string {
    return new Intl.NumberFormat('th-TH', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(cents / 100);
  }

  protected get intervalLabel(): string {
    return this.interval === 'day' ? 'รายวัน' : this.interval === 'month' ? 'รายเดือน' : 'รายปี';
  }

  protected statusLabel(value: string): string {
    const labels: Record<string, string> = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      processing: 'กำลังจัดเตรียม',
      shipped: 'จัดส่งแล้ว',
      delivered: 'ส่งถึงผู้รับแล้ว',
      cancelled: 'ยกเลิกแล้ว',
      returned: 'คืนสินค้าแล้ว',
      unpaid: 'ยังไม่ชำระ',
      pending_verification: 'รอตรวจสอบ',
      paid: 'ชำระแล้ว',
      refunded: 'คืนเงินแล้ว',
    };
    return labels[value] ?? value;
  }

  protected trendLabel(date: string): string {
    return this.interval === 'day' ? date.slice(5) : date;
  }

  protected barHeight(cents: number, days: DashboardData['dailySales']): number {
    const max = Math.max(...days.map((day) => day.salesCents), 1);
    return Math.max(2, (cents / max) * 100);
  }

  protected isSalesEligible(order: DashboardData['recentOrders'][number]): boolean {
    return (
      order.orderStatus !== 'cancelled' &&
      order.orderStatus !== 'returned' &&
      order.paymentStatus !== 'refunded' &&
      (order.paymentMethod === 'cod' || order.paymentStatus === 'paid')
    );
  }

  private monthStart(): string {
    return `${this.localDate().slice(0, 7)}-01`;
  }

  private localDate(): string {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }
}
