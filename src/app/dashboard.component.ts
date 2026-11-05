import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardData, OrderService } from './order.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="dashboard-heading">
      <div>
        <span class="dashboard-eyebrow">STORE PERFORMANCE</span>
        <h1>Dashboard<span>.</span></h1>
        <p>Sales, receipts, payouts, and order performance.</p>
      </div>
    </section>

    @if (errorMessage()) {
      <div class="dashboard-alert" role="alert">{{ errorMessage() }}</div>
    }

    <form class="dashboard-filters" (ngSubmit)="applyFilters()">
      <label class="dashboard-search">
        <span>Search orders, customers, or Admin</span>
        <input name="search" type="search" [(ngModel)]="search" placeholder="Order number, customer, phone, Admin" />
      </label>
      <label>
        <span>From</span>
        <input name="from" type="date" [(ngModel)]="from" required />
      </label>
      <label>
        <span>To</span>
        <input name="to" type="date" [(ngModel)]="to" required />
      </label>
      <label>
        <span>Order status</span>
        <select name="orderStatus" [(ngModel)]="orderStatus">
          <option value="">All statuses</option>
          @for (status of orderStatusOptions; track status) {
            <option [value]="status">{{ status.replace('_', ' ') }}</option>
          }
        </select>
      </label>
      <label>
        <span>Payment status</span>
        <select name="paymentStatus" [(ngModel)]="paymentStatus">
          <option value="">All payments</option>
          @for (status of paymentStatusOptions; track status) {
            <option [value]="status">{{ status.replace('_', ' ') }}</option>
          }
        </select>
      </label>
      <label>
        <span>Sort orders by</span>
        <select name="sortBy" [(ngModel)]="sortBy">
          <option value="createdAt">Created date</option>
          <option value="orderNumber">Order number</option>
          <option value="customer.name">Customer</option>
          <option value="totalCents">Sales total</option>
        </select>
      </label>
      <label>
        <span>Order direction</span>
        <select name="sortOrder" [(ngModel)]="sortOrder">
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
      <label>
        <span>Sales chart</span>
        <select name="chartInterval" [(ngModel)]="interval">
          <option value="day">Daily</option>
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>
      </label>
      <button class="dashboard-primary" type="submit" [disabled]="loading()">Search</button>
    </form>

    @if (loading()) {
      <div class="dashboard-loading">Loading dashboard...</div>
    } @else if (data(); as report) {
      <section class="dashboard-metrics" aria-label="Financial summary">
        <article class="dashboard-metric">
          <span>Sales</span>
          <strong>{{ money(report.summary.salesCents) }}</strong>
          <small>COD at order creation; transfers when paid</small>
        </article>
        <article class="dashboard-metric received">
          <span>Received</span>
          <strong>{{ money(report.summary.receivedCents) }}</strong>
          <small>Actual amount recorded as received</small>
        </article>
        <article class="dashboard-metric paid">
          <span>Paid commission</span>
          <strong>{{ money(report.summary.paidCommissionCents) }}</strong>
          <small>Commission marked as paid</small>
        </article>
        <article class="dashboard-metric">
          <span>Gross profit</span>
          <strong>{{ money(report.summary.grossProfitCents) }}</strong>
          <small>Sales minus product cost</small>
        </article>
        <article class="dashboard-metric">
          <span>Net profit</span>
          <strong>{{ money(report.summary.netProfitCents) }}</strong>
          <small>After commission and expenses</small>
        </article>
      </section>

      <section class="dashboard-counts" aria-label="Order counts">
        <div><span>Orders</span><strong>{{ report.summary.totalOrders }}</strong></div>
        <div><span>Pending</span><strong>{{ report.summary.pendingOrders }}</strong></div>
        <div><span>Awaiting payment</span><strong>{{ report.summary.unpaidOrders }}</strong></div>
        <div><span>Completed</span><strong>{{ report.summary.completedOrders }}</strong></div>
        <div><span>Cancelled</span><strong>{{ report.summary.cancelledOrders }}</strong></div>
        <div><span>Returned</span><strong>{{ report.summary.returnedOrders }}</strong></div>
      </section>

      <section class="dashboard-costs">
        <div><span>Product cost</span><strong>{{ money(report.summary.productCostCents) }}</strong></div>
        <div><span>Shipping cost</span><strong>{{ money(report.summary.shippingCostCents) }}</strong></div>
        <div><span>Other expenses</span><strong>{{ money(report.summary.otherExpensesCents) }}</strong></div>
      </section>

      <div class="dashboard-report-grid">
        <section class="dashboard-card">
          <header><h2>Sales {{ intervalLabel }}</h2><span>{{ report.range.from }} – {{ report.range.to }}</span></header>
          @if (report.dailySales.length === 0) {
            <p class="dashboard-empty">No sales in this date range.</p>
          } @else {
            <div class="sales-chart" role="img" aria-label="Daily sales chart">
              @for (day of report.dailySales; track day.date) {
                <div class="sales-bar-column" [title]="day.date + ': ' + money(day.salesCents)">
                  <span class="sales-bar-value">{{ shortMoney(day.salesCents) }}</span>
                  <div class="sales-bar-track"><span class="sales-bar" [style.height.%]="barHeight(day.salesCents, report.dailySales)"></span></div>
                  <span class="sales-bar-date">{{ trendLabel(day.date) }}</span>
                </div>
              }
            </div>
          }
        </section>

        <section class="dashboard-card">
          <header><h2>Top products</h2><span>By units sold</span></header>
          @if (report.topProducts.length === 0) {
            <p class="dashboard-empty">No product sales in this date range.</p>
          } @else {
            <div class="dashboard-list">
              @for (product of report.topProducts; track product.productId) {
                <div class="dashboard-list-row">
                  <span><strong>{{ product.name }}</strong><small>{{ product.sku }} · {{ product.quantity }} sold</small></span>
                  <strong>{{ money(product.salesCents) }}</strong>
                </div>
              }
            </div>
          }
        </section>

        <section class="dashboard-card dashboard-wide">
          <header><h2>Sales and commission by Admin</h2><span>Eligible orders only</span></header>
          @if (report.salesByAdmin.length === 0) {
            <p class="dashboard-empty">No Admin sales in this date range.</p>
          } @else {
            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead><tr><th>Admin</th><th>Orders</th><th>Sales</th><th>Commission</th><th>Commission paid</th></tr></thead>
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
          <header><h2>Recent orders</h2><span>{{ report.summary.totalOrders }} matching orders</span></header>
          @if (report.recentOrders.length === 0) {
            <p class="dashboard-empty">No orders match the selected filters.</p>
          } @else {
            <div class="dashboard-table-wrap">
              <table class="dashboard-table">
                <thead><tr><th>Order</th><th>Customer</th><th>Admin</th><th>Status</th><th>Payment</th><th>Sales</th><th>Received</th></tr></thead>
                <tbody>
                  @for (order of report.recentOrders; track order._id) {
                    <tr>
                      <td>{{ order.orderNumber }}<small>{{ order.createdAt | date:'short' }}</small></td>
                      <td>{{ order.customer.name }}</td>
                      <td>{{ order.createdByName }}</td>
                      <td>{{ order.orderStatus }}</td>
                      <td>{{ order.paymentMethod === 'cod' ? 'COD' : 'Transfer' }} · {{ order.paymentStatus }}</td>
                      <td>{{ isSalesEligible(order) ? money(order.totalCents) : '—' }}</td>
                      <td>{{ money(order.amountPaidCents) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <footer class="dashboard-pagination">
              <span>Page {{ report.pages === 0 ? 0 : report.page }} of {{ report.pages }}</span>
              <div>
                <button type="button" [disabled]="loading() || report.page <= 1" (click)="changePage(report.page - 1)">Previous</button>
                <button type="button" [disabled]="loading() || report.page >= report.pages" (click)="changePage(report.page + 1)">Next</button>
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
  protected sortBy: 'createdAt' | 'orderNumber' | 'customer.name' | 'totalCents' =
    'createdAt';
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
  protected readonly paymentStatusOptions = [
    'unpaid',
    'pending_verification',
    'paid',
    'refunded',
  ];

  ngOnInit(): void {
    this.applyFilters();
  }

  protected applyFilters(): void {
    if (!this.from || !this.to || this.from > this.to) {
      this.errorMessage.set('Choose a valid date range.');
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
    this.orderService.getDashboard({
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
    }).subscribe({
      next: (report) => {
        this.data.set(report);
        this.page = report.page;
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        const message = error.error?.message;
        this.errorMessage.set(
          Array.isArray(message) ? message.join(' ') :
          typeof message === 'string' ? message :
          error.status === 0 ? 'Could not connect to the server.' : 'Unable to load the dashboard.',
        );
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

  protected shortMoney(cents: number): string {
    return new Intl.NumberFormat('th-TH', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(cents / 100);
  }

  protected get intervalLabel(): string {
    return this.interval === 'day'
      ? 'by day'
      : this.interval === 'month'
        ? 'by month'
        : 'by year';
  }

  protected trendLabel(date: string): string {
    return this.interval === 'day' ? date.slice(5) : date;
  }

  protected barHeight(
    cents: number,
    days: DashboardData['dailySales'],
  ): number {
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
