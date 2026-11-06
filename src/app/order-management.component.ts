import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';
import { Product, ProductService } from './product.service';
import {
  CommissionStatus,
  CreateOrderInput,
  Order,
  OrderItemInput,
  OrderService,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ShippingStatus,
  UpdateOrderInput,
} from './order.service';
import { SettingsService, StoreSettings } from './settings.service';
import { thaiErrorMessage } from './error-message';
import { formatThaiDate } from './thai-date';
import { ShippingLabelPrintService } from './shipping-label-print.service';

interface DraftOrderItem {
  productId: string;
  quantity: number;
}

interface OrderForm {
  customerName: string;
  customerPhone: string;
  facebookName: string;
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  discount: string;
  shippingCharge: string;
  shippingCost: string;
  otherExpenses: string;
  paymentMethod: PaymentMethod;
  paymentNote: string;
}

interface OrderDetailsForm {
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  discount: string;
  shippingCharge: string;
  shippingCost: string;
  otherExpenses: string;
  paymentMethod: PaymentMethod;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  amountPaid: string;
  paymentNote: string;
  shippingStatus: ShippingStatus;
  shippingCompany: string;
  trackingNumber: string;
  commissionStatus: CommissionStatus;
}

@Component({
  selector: 'app-order-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './order-management.component.html',
  styleUrls: [
    './order-management.component.css',
    './order-management-table.component.css',
    './order-management-modal.component.css',
    './order-management-details.component.css',
  ],
})
export class OrderManagementComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly orderService = inject(OrderService);
  private readonly productService = inject(ProductService);
  private readonly settingsService = inject(SettingsService);
  private readonly labelPrinter = inject(ShippingLabelPrintService);
  protected readonly commissionChanged = output<void>();
  protected readonly orders = signal<Order[]>([]);
  protected readonly user = this.auth.user;
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly productsLoading = signal(false);
  protected readonly printSettings = signal<StoreSettings | null>(null);
  protected readonly printSettingsLoading = signal(true);
  protected readonly selectedOrderIds = signal<string[]>([]);
  protected readonly selectedOrders = computed(() => {
    const ids = new Set(this.selectedOrderIds());
    return this.orders().filter((order) => ids.has(order._id));
  });
  protected readonly saving = signal(false);
  protected readonly updating = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly notice = signal('');
  protected readonly page = signal(1);
  protected readonly total = signal(0);
  protected readonly pages = signal(0);
  protected readonly search = signal('');
  protected readonly orderStatusFilter = signal('');
  protected readonly paymentStatusFilter = signal('');
  protected readonly showCreateForm = signal(false);
  protected readonly selectedOrder = signal<Order | null>(null);
  protected readonly detailItems = signal<OrderItemInput[]>([]);
  protected readonly draftItems = signal<DraftOrderItem[]>([]);
  protected readonly selectedProductId = signal('');
  protected readonly orderForm = this.emptyOrderForm();
  protected readonly detailsForm = this.emptyDetailsForm();
  protected readonly selectedSlipFile = signal<File | null>(null);
  protected readonly paymentSlipUrl = signal('');
  protected readonly paymentSlipLoading = signal(false);
  protected readonly paymentSlipError = signal('');
  private paymentSlipObjectUrl = '';
  private paymentSlipInput?: HTMLInputElement;
  protected readonly orderStatusOptions: OrderStatus[] = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'returned',
  ];
  protected readonly paymentStatusOptions: PaymentStatus[] = [
    'unpaid',
    'pending_verification',
    'paid',
    'refunded',
  ];
  protected readonly shippingStatusOptions: ShippingStatus[] = [
    'not_shipped',
    'preparing',
    'shipped',
    'delivered',
    'returned',
  ];
  protected readonly commissionStatusOptions: CommissionStatus[] = ['pending', 'paid'];
  protected readonly draftSubtotalCents = computed(() =>
    this.draftItems().reduce((sum, item) => {
      const product = this.products().find((candidate) => candidate._id === item.productId);
      return sum + Math.round((product?.sellingPrice ?? 0) * 100) * item.quantity;
    }, 0),
  );
  protected draftTotalCents(): number {
    const form = this.orderForm;
    return (
      this.draftSubtotalCents() - this.toCents(form.discount) + this.toCents(form.shippingCharge)
    );
  }
  protected readonly detailsSubtotalCents = computed(() => {
    const orderItems = new Map(
      (this.selectedOrder()?.items ?? []).map((item) => [item.productId, item]),
    );
    return this.detailItems().reduce((sum, item) => {
      const currentProduct = this.products().find((product) => product._id === item.productId);
      const originalItem = orderItems.get(item.productId);
      const unitPriceCents =
        originalItem?.sellingPriceCents ??
        (currentProduct ? Math.round(currentProduct.sellingPrice * 100) : 0);
      return sum + unitPriceCents * item.quantity;
    }, 0);
  });
  protected detailsTotalCents(): number {
    return (
      this.detailsSubtotalCents() -
      this.toCents(this.detailsForm.discount) +
      this.toCents(this.detailsForm.shippingCharge)
    );
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.loadPrintSettings();
  }

  ngOnDestroy(): void {
    this.clearPaymentSlipPreview();
  }

  protected loadOrders(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.orderService
      .getAll({
        page: this.page(),
        limit: 10,
        search: this.search().trim() || undefined,
        orderStatus: (this.orderStatusFilter() as OrderStatus) || undefined,
        paymentStatus: (this.paymentStatusFilter() as PaymentStatus) || undefined,
      })
      .subscribe({
        next: (result) => {
          this.orders.set(result.items);
          this.total.set(result.total);
          this.pages.set(result.pages);
          this.page.set(result.page);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(this.errorMessageFrom(error));
          this.loading.set(false);
        },
      });
  }

  protected applyFilters(): void {
    this.page.set(1);
    this.selectedOrderIds.set([]);
    this.loadOrders();
  }

  protected changePage(page: number): void {
    if (page < 1 || page > this.pages() || page === this.page()) return;
    this.page.set(page);
    this.selectedOrderIds.set([]);
    this.loadOrders();
  }

  protected isOrderSelected(orderId: string): boolean {
    return this.selectedOrderIds().includes(orderId);
  }

  protected get allOrdersSelected(): boolean {
    const visibleOrders = this.orders();
    return (
      visibleOrders.length > 0 && visibleOrders.every((order) => this.isOrderSelected(order._id))
    );
  }

  protected onOrderSelectionChanged(orderId: string, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.selectedOrderIds.update((ids) =>
      selected
        ? ids.includes(orderId)
          ? ids
          : [...ids, orderId]
        : ids.filter((id) => id !== orderId),
    );
  }

  protected onSelectAllChanged(event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    const visibleIds = this.orders().map((order) => order._id);
    this.selectedOrderIds.update((current) => {
      const retained = current.filter((id) => !visibleIds.includes(id));
      return selected ? [...retained, ...visibleIds] : retained;
    });
  }

  protected printSelectedLabels(): void {
    this.printLabels(this.selectedOrders());
  }

  protected printOrderLabel(order: Order): void {
    this.printLabels([order]);
  }

  protected openCreateForm(): void {
    Object.assign(this.orderForm, this.emptyOrderForm());
    this.draftItems.set([]);
    this.selectedProductId.set('');
    this.errorMessage.set('');
    this.showCreateForm.set(true);
  }

  protected closeCreateForm(): void {
    if (this.saving()) return;
    this.showCreateForm.set(false);
  }

  protected addDraftItem(): void {
    const productId = this.selectedProductId();
    if (!productId) return;
    const existing = this.draftItems().find((item) => item.productId === productId);
    if (existing) {
      this.draftItems.update((items) =>
        items.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      this.draftItems.update((items) => [...items, { productId, quantity: 1 }]);
    }
    this.selectedProductId.set('');
  }

  protected removeDraftItem(productId: string): void {
    this.draftItems.update((items) => items.filter((item) => item.productId !== productId));
  }

  protected updateDraftQuantity(productId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    this.draftItems.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
  }

  protected saveNewOrder(): void {
    if (this.saving()) return;
    if (this.draftItems().length === 0) {
      this.errorMessage.set('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการในออเดอร์');
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.orderService.create(this.toCreateInput()).subscribe({
      next: (order) => {
        this.showCreateForm.set(false);
        this.saving.set(false);
        this.notice.set(`สร้างออเดอร์ ${order.orderNumber} เรียบร้อยแล้ว`);
        this.commissionChanged.emit();
        this.page.set(1);
        this.loadOrders();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.saving.set(false);
      },
    });
  }

  protected openOrder(order: Order): void {
    this.selectedOrder.set(order);
    this.detailItems.set(
      order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );
    this.selectedProductId.set('');
    this.selectedSlipFile.set(null);
    this.paymentSlipError.set('');
    this.clearPaymentSlipPreview();
    Object.assign(this.detailsForm, {
      addressLine: order.customer.address.addressLine,
      subdistrict: order.customer.address.subdistrict,
      district: order.customer.address.district,
      province: order.customer.address.province,
      postalCode: order.customer.address.postalCode,
      discount: (order.discountCents / 100).toFixed(2),
      shippingCharge: (order.shippingChargeCents / 100).toFixed(2),
      shippingCost: ((order.shippingCostCents ?? 0) / 100).toFixed(2),
      otherExpenses: (order.otherExpensesCents / 100).toFixed(2),
      paymentMethod: order.paymentMethod,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      amountPaid: (order.amountPaidCents / 100).toFixed(2),
      paymentNote: order.paymentNote ?? '',
      shippingStatus: order.shippingStatus,
      shippingCompany: order.shippingCompany ?? '',
      trackingNumber: order.trackingNumber ?? '',
      commissionStatus: order.commissionStatus,
    });
    this.errorMessage.set('');
    if (order.paymentSlip) this.loadPaymentSlip(order._id);
  }

  protected closeOrderDetails(): void {
    if (this.updating()) return;
    this.selectedOrder.set(null);
    this.detailItems.set([]);
    this.selectedSlipFile.set(null);
    this.clearPaymentSlipPreview();
  }

  protected saveOrderDetails(): void {
    const order = this.selectedOrder();
    if (!order || this.updating()) return;
    this.updating.set(true);
    this.errorMessage.set('');
    this.orderService.update(order._id, this.toUpdateInput()).subscribe({
      next: (updated) => {
        this.selectedOrder.set(updated);
        this.updating.set(false);
        this.notice.set(`แก้ไขออเดอร์ ${updated.orderNumber} เรียบร้อยแล้ว`);
        this.commissionChanged.emit();
        this.loadOrders();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.updating.set(false);
      },
    });
  }

  protected onPaymentSlipSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentSlipInput = input;
    const file = input.files?.[0] ?? null;
    this.paymentSlipError.set('');
    if (
      file &&
      (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
        file.size > 5 * 1024 * 1024)
    ) {
      this.paymentSlipError.set('กรุณาเลือกไฟล์ภาพ JPEG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
      input.value = '';
      this.selectedSlipFile.set(null);
      return;
    }
    this.selectedSlipFile.set(file);
  }

  protected uploadPaymentSlip(): void {
    const order = this.selectedOrder();
    const file = this.selectedSlipFile();
    if (!order || !file || this.paymentSlipLoading()) return;
    this.paymentSlipLoading.set(true);
    this.paymentSlipError.set('');
    this.orderService.uploadPaymentSlip(order._id, file).subscribe({
      next: (updated) => {
        this.selectedOrder.set(updated);
        this.selectedSlipFile.set(null);
        if (this.paymentSlipInput) this.paymentSlipInput.value = '';
        this.paymentSlipLoading.set(false);
        this.notice.set(`อัปโหลดสลิปของออเดอร์ ${updated.orderNumber} เรียบร้อยแล้ว`);
        this.loadPaymentSlip(updated._id);
      },
      error: (error: HttpErrorResponse) => {
        this.paymentSlipError.set(this.errorMessageFrom(error));
        this.paymentSlipLoading.set(false);
      },
    });
  }

  protected changePaymentStatus(status: PaymentStatus): void {
    this.detailsForm.paymentStatus = status;
    const order = this.selectedOrder();
    if (status === 'paid' && order) {
      this.detailsForm.amountPaid = (this.detailsTotalCents() / 100).toFixed(2);
    } else if (status === 'unpaid') {
      this.detailsForm.amountPaid = '0.00';
    }
  }

  protected addDetailItem(): void {
    const productId = this.selectedProductId();
    if (!productId) return;
    const existing = this.detailItems().find((item) => item.productId === productId);
    if (existing) {
      this.detailItems.update((items) =>
        items.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
    } else {
      this.detailItems.update((items) => [...items, { productId, quantity: 1 }]);
    }
    this.selectedProductId.set('');
    this.syncPaidAmount();
  }

  protected removeDetailItem(productId: string): void {
    if (this.detailItems().length <= 1) return;
    this.detailItems.update((items) => items.filter((item) => item.productId !== productId));
    this.syncPaidAmount();
  }

  protected updateDetailQuantity(productId: string, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity < 1) return;
    this.detailItems.update((items) =>
      items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    );
    this.syncPaidAmount();
  }

  protected onDetailMoneyChange(): void {
    this.syncPaidAmount();
  }

  protected detailItemName(productId: string): string {
    return (
      this.selectedOrder()?.items.find((item) => item.productId === productId)?.name ??
      this.products().find((product) => product._id === productId)?.name ??
      'ไม่พบสินค้า'
    );
  }

  protected detailItemSku(productId: string): string {
    return (
      this.selectedOrder()?.items.find((item) => item.productId === productId)?.sku ??
      this.products().find((product) => product._id === productId)?.sku ??
      ''
    );
  }

  protected detailItemUnitPriceCents(productId: string): number {
    const snapshot = this.selectedOrder()?.items.find((item) => item.productId === productId);
    if (snapshot) return snapshot.sellingPriceCents;
    const product = this.products().find((item) => item._id === productId);
    return product ? Math.round(product.sellingPrice * 100) : 0;
  }

  protected productFor(id: string): Product | undefined {
    return this.products().find((product) => product._id === id);
  }

  protected productPriceCents(product: Product): number {
    return Math.round(product.sellingPrice * 100);
  }

  protected productLineTotalCents(product: Product, quantity: number): number {
    return this.productPriceCents(product) * quantity;
  }

  protected toQuantity(value: unknown): number {
    return Number(value);
  }

  protected money(cents: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(cents / 100);
  }

  protected formatDate(
    value: string,
    dateStyle: 'short' | 'medium',
    timeStyle: 'short' | 'medium',
  ): string {
    return formatThaiDate(value, dateStyle, timeStyle);
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
      not_shipped: 'ยังไม่จัดส่ง',
      preparing: 'กำลังเตรียมจัดส่ง',
    };
    return labels[value] ?? value;
  }

  protected trackOrder(_index: number, order: Order): string {
    return order._id;
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.productService.getAll(true).subscribe({
      next: (products) => {
        this.products.set(products);
        this.productsLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.productsLoading.set(false);
      },
    });
  }

  private loadPrintSettings(): void {
    this.settingsService.get().subscribe({
      next: (settings) => {
        this.printSettings.set(settings);
        this.printSettingsLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.printSettingsLoading.set(false);
      },
    });
  }

  private printLabels(orders: Order[]): void {
    if (orders.length === 0) return;
    if (this.printSettingsLoading()) {
      this.errorMessage.set('กำลังโหลดการตั้งค่าร้าน กรุณาลองอีกครั้ง');
      return;
    }
    const settings = this.printSettings();
    if (!settings) {
      this.errorMessage.set('กำลังโหลดการตั้งค่าร้าน กรุณาลองอีกครั้ง');
      return;
    }
    if (
      !settings.senderName.trim() ||
      !settings.senderPhone.trim() ||
      !settings.senderAddress.trim()
    ) {
      this.errorMessage.set('กรุณากรอกข้อมูลผู้ส่งในหน้าตั้งค่าก่อนพิมพ์ใบปะหน้า');
      return;
    }
    if (!this.labelPrinter.print(orders, settings)) {
      this.errorMessage.set('กรุณาอนุญาตป๊อปอัปในเบราว์เซอร์เพื่อพิมพ์ใบปะหน้า');
    }
  }

  private toCreateInput(): CreateOrderInput {
    const form = this.orderForm;
    const items: OrderItemInput[] = this.draftItems().map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));
    return {
      customer: {
        name: form.customerName.trim(),
        phone: form.customerPhone.trim(),
        facebookName: form.facebookName.trim(),
        address: {
          addressLine: form.addressLine.trim(),
          subdistrict: form.subdistrict.trim(),
          district: form.district.trim(),
          province: form.province.trim(),
          postalCode: form.postalCode.trim(),
        },
      },
      items,
      discount: Number(form.discount || 0),
      shippingCharge: Number(form.shippingCharge || 0),
      shippingCost: Number(form.shippingCost || 0),
      otherExpenses: Number(form.otherExpenses || 0),
      paymentMethod: form.paymentMethod,
      paymentNote: form.paymentNote.trim(),
    };
  }

  private toUpdateInput(): UpdateOrderInput {
    const form = this.detailsForm;
    const order = this.selectedOrder();
    return {
      customer: order
        ? {
            ...order.customer,
            address: {
              addressLine: form.addressLine.trim(),
              subdistrict: form.subdistrict.trim(),
              district: form.district.trim(),
              province: form.province.trim(),
              postalCode: form.postalCode.trim(),
            },
          }
        : undefined,
      items: this.detailItems(),
      discount: Number(form.discount || 0),
      shippingCharge: Number(form.shippingCharge || 0),
      shippingCost: Number(form.shippingCost || 0),
      otherExpenses: Number(form.otherExpenses || 0),
      paymentMethod: form.paymentMethod,
      orderStatus: form.orderStatus,
      paymentStatus: form.paymentStatus,
      amountPaid: Number(form.amountPaid || 0),
      paymentNote: form.paymentNote.trim(),
      shippingStatus: form.shippingStatus,
      shippingCompany: form.shippingCompany.trim(),
      trackingNumber: form.trackingNumber.trim(),
      commissionStatus: this.user()?.role === 'owner' ? form.commissionStatus : undefined,
    };
  }

  private syncPaidAmount(): void {
    if (this.detailsForm.paymentStatus === 'paid') {
      this.detailsForm.amountPaid = (this.detailsTotalCents() / 100).toFixed(2);
    }
  }

  private toCents(value: string): number {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  }

  private emptyOrderForm(): OrderForm {
    return {
      customerName: '',
      customerPhone: '',
      facebookName: '',
      addressLine: '',
      subdistrict: '',
      district: '',
      province: '',
      postalCode: '',
      discount: '0',
      shippingCharge: '0',
      shippingCost: '0',
      otherExpenses: '0',
      paymentMethod: 'bank_transfer',
      paymentNote: '',
    };
  }

  private emptyDetailsForm(): OrderDetailsForm {
    return {
      addressLine: '',
      subdistrict: '',
      district: '',
      province: '',
      postalCode: '',
      discount: '0.00',
      shippingCharge: '0.00',
      shippingCost: '0.00',
      otherExpenses: '0.00',
      paymentMethod: 'bank_transfer',
      orderStatus: 'pending',
      paymentStatus: 'unpaid',
      amountPaid: '0.00',
      paymentNote: '',
      shippingStatus: 'not_shipped',
      shippingCompany: '',
      trackingNumber: '',
      commissionStatus: 'pending',
    };
  }

  private loadPaymentSlip(orderId: string): void {
    this.paymentSlipLoading.set(true);
    this.orderService.getPaymentSlip(orderId).subscribe({
      next: (blob) => {
        this.clearPaymentSlipPreview();
        this.paymentSlipObjectUrl = URL.createObjectURL(blob);
        this.paymentSlipUrl.set(this.paymentSlipObjectUrl);
        this.paymentSlipLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.paymentSlipError.set(this.errorMessageFrom(error));
        this.paymentSlipLoading.set(false);
      },
    });
  }

  private clearPaymentSlipPreview(): void {
    if (this.paymentSlipObjectUrl) {
      URL.revokeObjectURL(this.paymentSlipObjectUrl);
      this.paymentSlipObjectUrl = '';
    }
    this.paymentSlipUrl.set('');
  }

  private errorMessageFrom(error: HttpErrorResponse): string {
    return thaiErrorMessage(error, 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
  }
}
