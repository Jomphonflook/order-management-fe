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
        <h1>แดชบอร์ด</h1>
        <p>สรุปยอดขาย ยอดรับ ยอดจ่าย และผลการดำเนินงาน</p>
      </div>
    </section>

    @if (errorMessage()) {
      <div class="dashboard-alert" role="alert">{{ errorMessage() }}</div>
    }

    <form class="dashboard-filters" (ngSubmit)="applyFilters()">
      <div class="dashboard-filter-main">
        <label class="dashboard-search">
          <span class="visually-hidden">ค้นหาออเดอร์ ลูกค้า หรือผู้ดูแล</span>
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.8" cy="8.8" r="5.8" stroke="currentColor" stroke-width="1.5" />
            <path d="m13.2 13.2 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <input
            name="search"
            type="search"
            [(ngModel)]="search"
            placeholder="ค้นหาเลขออเดอร์ ชื่อลูกค้า หรือเบอร์โทร"
          />
        </label>
        <div class="dashboard-date-range">
          <label>
            <span>ตั้งแต่</span>
            <input name="from" type="date" [(ngModel)]="from" required />
          </label>
          <span class="date-range-divider" aria-hidden="true">–</span>
          <label>
            <span>ถึง</span>
            <input name="to" type="date" [(ngModel)]="to" required />
          </label>
        </div>
        <button class="dashboard-primary" type="submit" [disabled]="loading()">ค้นหา</button>
      </div>
      <div class="dashboard-filter-secondary" aria-label="ตัวกรองเพิ่มเติม">
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
          <span>สถานะชำระเงิน</span>
          <select name="paymentStatus" [(ngModel)]="paymentStatus">
            <option value="">ทุกสถานะ</option>
            @for (status of paymentStatusOptions; track status) {
              <option [value]="status">{{ statusLabel(status) }}</option>
            }
          </select>
        </label>
        <label>
          <span>เรียงตาม</span>
          <select name="sortBy" [(ngModel)]="sortBy">
            <option value="orderDate">วันที่ออเดอร์</option>
            <option value="orderNumber">เลขออเดอร์</option>
            <option value="customer.name">ชื่อลูกค้า</option>
            <option value="totalCents">ยอดขาย</option>
          </select>
        </label>
        <label>
          <span>ลำดับ</span>
          <select name="sortOrder" [(ngModel)]="sortOrder">
            <option value="desc">มากไปน้อย</option>
            <option value="asc">น้อยไปมาก</option>
          </select>
        </label>
        <label>
          <span>ช่วงกราฟ</span>
          <select name="chartInterval" [(ngModel)]="interval">
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
          </select>
        </label>
      </div>
    </form>

    @if (loading()) {
      <div class="dashboard-loading">กำลังโหลดแดชบอร์ด...</div>
    } @else if (data(); as report) {
      <section class="dashboard-metrics" aria-label="สรุปข้อมูลทางการเงิน">
        <article class="dashboard-metric sales-metric">
          <div class="metric-heading">
            <span>ยอดขาย</span>
            <span class="metric-icon sales-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none"><path d="M3 15.5 7.2 11l3 2.5L17 6.5M12.5 6.5H17v4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <strong class="metric-value">{{ money(report.summary.salesCents) }}</strong>
          <small class="metric-received">
            ยอดรับ {{ money(report.summary.receivedCents) }}
            <span>COD นับเมื่อสร้างออเดอร์; โอนเงินนับเมื่อชำระแล้ว</span>
          </small>
        </article>
        <article class="dashboard-metric product-cost">
          <div class="metric-heading">
            <span>ต้นทุนสินค้า</span>
            <span class="metric-icon cost-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none"><path d="M4 5.5h12v10H4zM7 5.5v-2h6v2M7 9h6M7 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <strong class="metric-value">{{ money(report.summary.productCostCents) }}</strong>
          <small>ต้นทุนของสินค้าที่ขายได้</small>
        </article>
        <article class="dashboard-metric commission-due">
          <div class="metric-heading">
            <span>ค่าคอมมิชชัน Admin</span>
            <span class="metric-icon commission-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M12.5 7.5c-.5-.6-1.2-.9-2.2-.9-1.1 0-1.8.5-1.8 1.3 0 2 4.2.8 4.2 3.2 0 .9-.8 1.6-2.1 1.6-1 0-1.9-.4-2.5-1.1M10 5.3v9.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
            </span>
          </div>
          <strong class="metric-value">{{ money(report.summary.commissionTotalCents) }}</strong>
          <small>คำนวณจากออเดอร์โดยไม่ขึ้นกับสถานะการชำระเงิน</small>
        </article>
        <article class="dashboard-metric cod-fee">
          <div class="metric-heading">
            <span>ค่าธรรมเนียม COD</span>
            <span class="metric-icon cod-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4.5" width="14" height="11" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M3 8h14M6 12h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </span>
          </div>
          <strong class="metric-value">{{ money(report.summary.shippingCostCents) }}</strong>
          <small>ต้นทุนจัดส่งที่บันทึกไว้</small>
        </article>
        <article class="dashboard-metric net-profit">
          <div class="metric-heading">
            <span>กำไรสุทธิ</span>
            <span class="metric-icon profit-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none"><path d="M10 2.8 16 5v4.6c0 3.6-2.5 6.2-6 7.6-3.5-1.4-6-4-6-7.6V5l6-2.2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m7.2 9.8 1.8 1.8 3.8-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
          </div>
          <strong class="metric-value">{{ money(report.summary.netProfitCents) }}</strong>
          <small>หลังหักค่าคอมมิชชันและค่าใช้จ่าย</small>
        </article>
      </section>

      <section class="dashboard-costs">
        <div class="other-expenses">
          <span class="expense-dot" aria-hidden="true"></span>
          <span>ค่าใช้จ่ายอื่น</span><strong>{{ money(report.summary.otherExpensesCents) }}</strong>
        </div>
      </section>

      <section class="dashboard-counts" aria-label="กรองออเดอร์ตามสถานะ">
        <button class="total-orders" type="button" [class.selected]="isStatusSelected('all')" [attr.aria-pressed]="isStatusSelected('all')" (click)="selectStatusFilter('all')">
          <span><i class="status-dot"></i>ทั้งหมด</span><strong>{{ report.summary.totalOrders }}</strong>
        </button>
        <button class="awaiting-shipment" type="button" [class.selected]="isStatusSelected('awaiting_shipment')" [attr.aria-pressed]="isStatusSelected('awaiting_shipment')" (click)="selectStatusFilter('awaiting_shipment')">
          <span><i class="status-dot"></i>ที่ต้องจัดส่ง</span><strong>{{ report.summary.awaitingShipmentOrders }}</strong>
        </button>
        <button class="in-transit" type="button" [class.selected]="isStatusSelected('in_transit')" [attr.aria-pressed]="isStatusSelected('in_transit')" (click)="selectStatusFilter('in_transit')">
          <span><i class="status-dot"></i>ขนส่งกำลังจัดส่ง</span><strong>{{ report.summary.inTransitOrders }}</strong>
        </button>
        <button class="unpaid-orders" type="button" [class.selected]="isStatusSelected('unpaid')" [attr.aria-pressed]="isStatusSelected('unpaid')" (click)="selectStatusFilter('unpaid')">
          <span><i class="status-dot"></i>รอชำระเงิน</span><strong>{{ report.summary.unpaidOrders }}</strong>
        </button>
        <button class="completed-orders" type="button" [class.selected]="isStatusSelected('completed')" [attr.aria-pressed]="isStatusSelected('completed')" (click)="selectStatusFilter('completed')">
          <span><i class="status-dot"></i>สำเร็จ</span><strong>{{ report.summary.completedOrders }}</strong>
        </button>
        <button class="exchanged-orders" type="button" [class.selected]="isStatusSelected('exchanged')" [attr.aria-pressed]="isStatusSelected('exchanged')" (click)="selectStatusFilter('exchanged')">
          <span><i class="status-dot"></i>เปลี่ยนสินค้า</span><strong>{{ report.summary.exchangedOrders }}</strong>
        </button>
        <button class="returned-orders" type="button" [class.selected]="isStatusSelected('returned')" [attr.aria-pressed]="isStatusSelected('returned')" (click)="selectStatusFilter('returned')">
          <span><i class="status-dot"></i>คืนสินค้า</span><strong>{{ report.summary.returnedOrders }}</strong>
        </button>
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
                <div class="sales-bar-column">
                  <span class="sales-bar-value">{{ shortMoney(day.salesCents) }}</span>
                  <div class="sales-bar-track">
                    <svg class="sales-chart-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                      <line x1="0" y1="25" x2="100" y2="25" />
                      <line x1="0" y1="50" x2="100" y2="50" />
                      <line x1="0" y1="75" x2="100" y2="75" />
                    </svg>
                    <span
                      class="sales-bar"
                      [style.height.%]="barHeight(day.salesCents, report.dailySales)"
                    ></span>
                  </div>
                  <span class="sales-bar-date">{{ trendLabel(day.date) }}</span>
                  <span class="sales-tooltip">{{ day.date }} · {{ money(day.salesCents) }}</span>
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
                <div class="dashboard-list-row product-row">
                  <span class="product-rank">{{ $index + 1 }}</span>
                  @if (product.imageUrl) {
                    <img class="product-thumbnail" [src]="product.imageUrl" [alt]="product.name" />
                  } @else {
                    <span class="product-thumbnail product-thumbnail-placeholder" aria-hidden="true">□</span>
                  }
                  <span class="product-info">
                    <strong>{{ product.name }}</strong>
                    <span class="product-meta">
                      <small class="product-sku">{{ product.sku }}</small>
                      <small>{{ product.quantity }} ชิ้น</small>
                    </span>
                    <span class="product-progress"><i [style.width.%]="productBarWidth(product.quantity, report.topProducts)"></i></span>
                  </span>
                  <strong class="product-revenue">{{ money(product.salesCents) }}</strong>
                </div>
              }
            </div>
          }
        </section>

        <section class="dashboard-card dashboard-wide">
          <header>
            <h2>ยอดขายและค่าคอมมิชชันแยกตามผู้ดูแล</h2>
            <span>ยอดคำนวณจากออเดอร์โดยไม่ขึ้นกับสถานะการชำระเงิน</span>
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
                    <th>ค่าคอมมิชชันรวม</th>
                    <th>จ่ายแล้ว</th>
                    <th>ค้างจ่าย</th>
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
                      <td>{{ money(admin.dueCommissionCents) }}</td>
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
                        {{ order.orderNumber }}<small>{{ formatDate(order.orderDate) }}</small>
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
  protected sortBy: 'orderDate' | 'orderNumber' | 'customer.name' | 'totalCents' = 'orderDate';
  protected sortOrder: 'asc' | 'desc' = 'desc';
  protected interval: 'day' | 'month' | 'year' = 'day';
  protected page = 1;
  protected readonly orderStatusOptions = [
    'awaiting_shipment',
    'in_transit',
    'completed',
    'returned',
    'exchanged',
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

  protected selectStatusFilter(
    status:
      | 'all'
      | 'awaiting_shipment'
      | 'in_transit'
      | 'unpaid'
      | 'completed'
      | 'exchanged'
      | 'returned',
  ): void {
    if (status === 'all') {
      this.orderStatus = '';
      this.paymentStatus = '';
    } else if (status === 'unpaid') {
      this.paymentStatus = this.paymentStatus === 'unpaid' ? '' : 'unpaid';
      this.orderStatus = '';
    } else {
      this.orderStatus = this.orderStatus === status ? '' : status;
      this.paymentStatus = '';
    }
    this.applyFilters();
  }

  protected isStatusSelected(
    status:
      | 'all'
      | 'awaiting_shipment'
      | 'in_transit'
      | 'unpaid'
      | 'completed'
      | 'exchanged'
      | 'returned',
  ): boolean {
    if (status === 'all') return !this.orderStatus && !this.paymentStatus;
    if (status === 'unpaid') return this.paymentStatus === 'unpaid';
    return this.orderStatus === status;
  }

  protected productBarWidth(
    quantity: number,
    products: DashboardData['topProducts'],
  ): number {
    const maxQuantity = Math.max(...products.map((product) => product.quantity), 1);
    return Math.max(8, (quantity / maxQuantity) * 100);
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
      awaiting_shipment: 'ที่ต้องจัดส่ง',
      in_transit: 'ขนส่งกำลังจัดส่ง',
      completed: 'สำเร็จ',
      returned: 'คืนสินค้า',
      exchanged: 'เปลี่ยนสินค้า',
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
      order.orderStatus !== 'returned' &&
      order.orderStatus !== 'exchanged' &&
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
