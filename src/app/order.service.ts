import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type OrderStatus =
  | 'awaiting_shipment'
  | 'in_transit'
  | 'completed'
  | 'returned'
  | 'exchanged';
export type PaymentStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'paid'
  | 'refunded';
export type PaymentMethod = 'bank_transfer' | 'cod';
export type CommissionStatus = 'pending' | 'paid';

export interface OrderAddress {
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
}

export interface OrderCustomer {
  name: string;
  phone: string;
  facebookName: string;
  address: OrderAddress;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  sellingPriceCents: number;
  costPriceCents: number;
  commissionPercent: number;
  quantity: number;
  subtotalCents: number;
  costTotalCents: number;
  commissionCents: number;
}

export interface PaymentSlip {
  contentType: string;
  uploadedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  shippingChargeCents: number;
  shippingCostCents: number;
  totalCents: number;
  productCostCents: number;
  grossProfitCents: number;
  commissionCents: number;
  otherExpensesCents: number;
  netProfitCents: number;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountPaidCents: number;
  paidAt?: string;
  paymentNote: string;
  paymentSlip?: PaymentSlip | null;
  shippingCompany: string;
  trackingNumber: string;
  createdBy: string;
  createdByName: string;
  createdByEmail: string;
  commissionStatus: CommissionStatus;
  commissionPaidAt?: string;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  customer: OrderCustomer;
  items: OrderItemInput[];
  discount: number;
  shippingCost?: number;
  paymentMethod: PaymentMethod;
  paymentNote: string;
}

export interface UpdateOrderInput {
  customer?: OrderCustomer;
  items?: OrderItemInput[];
  discount?: number;
  shippingCost?: number;
  paymentMethod?: PaymentMethod;
  orderStatus?: OrderStatus;
  orderDate?: string;
  paymentStatus?: PaymentStatus;
  amountPaid?: number;
  paymentNote?: string;
  shippingCompany?: string;
  trackingNumber?: string;
  commissionStatus?: CommissionStatus;
}

export interface CommissionSummary {
  totalCents: number;
  pendingCents: number;
  paidCents: number;
}

export interface DashboardData {
  summary: {
    totalOrders: number;
    awaitingShipmentOrders: number;
    inTransitOrders: number;
    unpaidOrders: number;
    completedOrders: number;
    returnedOrders: number;
    exchangedOrders: number;
    salesCents: number;
    receivedCents: number;
    paidCommissionCents: number;
    commissionTotalCents: number;
    productCostCents: number;
    shippingCostCents: number;
    otherExpensesCents: number;
    grossProfitCents: number;
    netProfitCents: number;
  };
  dailySales: Array<{ date: string; salesCents: number }>;
  salesByAdmin: Array<{
    adminId: string;
    adminName: string;
    orders: number;
    salesCents: number;
    commissionCents: number;
    paidCommissionCents: number;
    dueCommissionCents: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    salesCents: number;
  }>;
  recentOrders: Order[];
  range: { from: string; to: string };
  page: number;
  limit: number;
  pages: number;
}

export interface OrderListQuery {
  page: number;
  limit: number;
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface BulkUpdateOrderStatusInput {
  orderIds: string[];
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  commissionStatus?: CommissionStatus;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private readonly http: HttpClient) {}

  getAll(query: OrderListQuery): Observable<OrderListResponse> {
    let params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);
    if (query.search) params = params.set('search', query.search);
    if (query.orderStatus) {
      params = params.set('orderStatus', query.orderStatus);
    }
    if (query.paymentStatus) {
      params = params.set('paymentStatus', query.paymentStatus);
    }
    if (query.dateFrom) params = params.set('dateFrom', query.dateFrom);
    if (query.dateTo) params = params.set('dateTo', query.dateTo);
    return this.http.get<OrderListResponse>(`${API_BASE_URL}/orders`, {
      params,
      withCredentials: true,
    });
  }

  getOne(id: string): Observable<Order> {
    return this.http.get<Order>(
      `${API_BASE_URL}/orders/${encodeURIComponent(id)}`,
      { withCredentials: true },
    );
  }

  getCommissionSummary(): Observable<CommissionSummary> {
    return this.http.get<CommissionSummary>(
      `${API_BASE_URL}/orders/commission-summary`,
      { withCredentials: true },
    );
  }

  getDashboard(query: {
    from: string;
    to: string;
    search: string;
    orderStatus: string;
    paymentStatus: string;
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    interval: 'day' | 'month' | 'year';
  }): Observable<DashboardData> {
    let params = new HttpParams()
      .set('from', query.from)
      .set('to', query.to)
      .set('search', query.search.trim())
      .set('page', query.page)
      .set('limit', query.limit)
      .set('sortBy', query.sortBy)
      .set('sortOrder', query.sortOrder)
      .set('interval', query.interval);
    if (query.orderStatus) params = params.set('orderStatus', query.orderStatus);
    if (query.paymentStatus) params = params.set('paymentStatus', query.paymentStatus);
    return this.http.get<DashboardData>(`${API_BASE_URL}/orders/dashboard`, {
      params,
      withCredentials: true,
    });
  }

  getPaymentSlip(id: string): Observable<Blob> {
    return this.http.get(
      `${API_BASE_URL}/orders/${encodeURIComponent(id)}/payment-slip`,
      { withCredentials: true, responseType: 'blob' },
    );
  }

  create(input: CreateOrderInput): Observable<Order> {
    return this.http.post<Order>(`${API_BASE_URL}/orders`, input, {
      withCredentials: true,
    });
  }

  update(id: string, input: UpdateOrderInput): Observable<Order> {
    return this.http.patch<Order>(
      `${API_BASE_URL}/orders/${encodeURIComponent(id)}`,
      input,
      { withCredentials: true },
    );
  }

  bulkUpdateStatuses(input: BulkUpdateOrderStatusInput): Observable<Order[]> {
    return this.http.patch<Order[]>(`${API_BASE_URL}/orders/bulk-status`, input, {
      withCredentials: true,
    });
  }

  uploadPaymentSlip(id: string, file: File): Observable<Order> {
    const body = new FormData();
    body.append('slip', file, file.name);
    return this.http.post<Order>(
      `${API_BASE_URL}/orders/${encodeURIComponent(id)}/payment-slip`,
      body,
      { withCredentials: true },
    );
  }
}
