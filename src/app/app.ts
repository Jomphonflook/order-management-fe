import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, type AppUser } from './auth.service';
import { ProductService, type Product } from './product.service';
import { OrderService, type CommissionSummary } from './order.service';
import { OrderManagementComponent } from './order-management.component';
import { SettingsManagementComponent } from './settings-management.component';
import { TeamManagementComponent } from './team-management.component';
import { DashboardComponent } from './dashboard.component';
import { thaiErrorMessage } from './error-message';

type WorkspaceTab = 'dashboard' | 'orders' | 'products' | 'settings' | 'users';
type ProductStatusFilter = 'all' | 'active' | 'inactive';

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  description: string;
  sellingPrice: string;
  costPrice: string;
  commissionPercent: string;
}

@Component({
  imports: [
    CommonModule,
    FormsModule,
    OrderManagementComponent,
    SettingsManagementComponent,
    TeamManagementComponent,
    DashboardComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productService = inject(ProductService);
  private readonly orderService = inject(OrderService);
  protected readonly user = this.auth.user;
  protected readonly commissionSummary = signal<CommissionSummary | null>(null);
  protected readonly commissionSummaryLoading = signal(false);
  protected readonly commissionSummaryError = signal('');
  protected readonly checkingSession = signal(true);
  protected readonly submitting = signal(false);
  protected readonly loggingOut = signal(false);
  protected readonly activeTab = signal<WorkspaceTab>('dashboard');
  protected readonly errorMessage = signal('');
  protected readonly showPassword = signal(false);
  protected readonly products = signal<Product[]>([]);
  protected readonly filteredProducts = computed(() => {
    const query = this.productSearch().trim().toLowerCase();
    const status = this.productStatus();
    return this.products().filter((product) => {
      const matchesStatus =
        status === 'all' || (status === 'active' ? product.isActive : !product.isActive);
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  });
  protected readonly productSearch = signal('');
  protected readonly productStatus = signal<ProductStatusFilter>('all');
  protected readonly productsLoading = signal(false);
  protected readonly productSaving = signal(false);
  protected readonly changingProductId = signal('');
  protected readonly showProductEditor = signal(false);
  protected readonly editingProduct = signal<Product | null>(null);
  protected readonly productFiles = signal<File[]>([]);
  protected readonly productNotice = signal('');
  protected readonly productForm = this.emptyProductForm();
  protected email = '';
  protected password = '';

  ngOnInit(): void {
    this.auth.getCurrentUser().subscribe({
      next: (user) => {
        this.auth.setUser(user);
        this.checkingSession.set(false);
        this.loadCommissionSummary();
      },
      error: (error: HttpErrorResponse) => {
        this.auth.setUser(null);
        if (error.status !== 401) {
          this.errorMessage.set(
            'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบ API แล้วลองอีกครั้ง',
          );
        }
        this.checkingSession.set(false);
      },
    });
  }

  protected login(): void {
    if (this.submitting()) return;

    this.errorMessage.set('');
    this.submitting.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: (user) => {
        this.auth.setUser(user);
        this.loadCommissionSummary();
        this.password = '';
        this.activeTab.set('dashboard');
        this.submitting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.status === 401
            ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง'
            : error.status === 0
              ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง'
              : this.errorMessageFrom(error),
        );
        this.submitting.set(false);
      },
    });
  }

  protected logout(): void {
    if (this.loggingOut()) return;

    this.loggingOut.set(true);
    this.errorMessage.set('');
    this.auth.logout().subscribe({
      next: () => {
        this.auth.setUser(null);
        this.commissionSummary.set(null);
        this.commissionSummaryError.set('');
        this.email = '';
        this.password = '';
        this.activeTab.set('dashboard');
        this.loggingOut.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(
          error.status === 0
            ? 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อออกจากระบบได้ กรุณาลองอีกครั้ง'
            : this.errorMessageFrom(error),
        );
        this.loggingOut.set(false);
      },
    });
  }

  protected selectTab(tab: WorkspaceTab): void {
    if ((tab === 'settings' || tab === 'users') && this.user()?.role !== 'owner') return;
    this.activeTab.set(tab);
    if (tab === 'products' && this.user()) {
      this.loadProducts();
    }
    if (tab !== 'products') {
      this.productNotice.set('');
    }
  }

  protected loadCommissionSummary(): void {
    if (!this.user()) {
      this.commissionSummary.set(null);
      return;
    }
    this.commissionSummaryLoading.set(true);
    this.commissionSummaryError.set('');
    this.orderService.getCommissionSummary().subscribe({
      next: (summary) => {
        this.commissionSummary.set(summary);
        this.commissionSummaryLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.commissionSummaryError.set(this.errorMessageFrom(error));
        this.commissionSummaryLoading.set(false);
      },
    });
  }

  protected commissionMoney(cents: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
    }).format(cents / 100);
  }

  protected loadProducts(): void {
    this.productsLoading.set(true);
    this.errorMessage.set('');
    this.productService.getAll().subscribe({
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

  protected openProductEditor(product: Product | null = null): void {
    this.editingProduct.set(product);
    this.productFiles.set([]);
    Object.assign(
      this.productForm,
      product
        ? {
            name: product.name,
            sku: product.sku,
            category: product.category,
            description: product.description ?? '',
            sellingPrice: String(product.sellingPrice),
            costPrice: String(product.costPrice),
            commissionPercent: String(product.commissionPercent),
          }
        : this.emptyProductForm(),
    );
    this.productNotice.set('');
    this.errorMessage.set('');
    this.showProductEditor.set(true);
  }

  protected closeProductEditor(): void {
    if (this.productSaving()) return;
    this.showProductEditor.set(false);
    this.editingProduct.set(null);
    this.productFiles.set([]);
  }

  protected onProductFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = Array.from(input.files ?? []);
    const currentCount = this.editingProduct()?.images.length ?? 0;
    const availableSlots = Math.max(0, 8 - currentCount - this.productFiles().length);
    const allowed = selected.slice(0, availableSlots);

    if (allowed.some((file) => file.size > 5 * 1024 * 1024)) {
      this.errorMessage.set('รูปสินค้าแต่ละรูปต้องมีขนาดไม่เกิน 5 MB');
    } else if (selected.length > availableSlots) {
      this.errorMessage.set('สินค้าแต่ละรายการเพิ่มรูปได้สูงสุด 8 รูป');
    } else {
      this.errorMessage.set('');
    }

    this.productFiles.update((files) => [
      ...files,
      ...allowed.filter((file) => file.size <= 5 * 1024 * 1024),
    ]);
    input.value = '';
  }

  protected removeSelectedProductFile(index: number): void {
    this.productFiles.update((files) => files.filter((_, i) => i !== index));
  }

  protected saveProduct(): void {
    if (this.productSaving()) return;

    const formData = new FormData();
    formData.append('name', this.productForm.name.trim());
    formData.append('sku', this.productForm.sku.trim());
    formData.append('category', this.productForm.category.trim());
    formData.append('description', this.productForm.description.trim());
    formData.append('sellingPrice', this.productForm.sellingPrice);
    formData.append('costPrice', this.productForm.costPrice);
    formData.append('commissionPercent', this.productForm.commissionPercent);
    if (this.editingProduct()) {
      formData.append('isActive', String(this.editingProduct()!.isActive));
    }
    for (const file of this.productFiles()) {
      formData.append('images', file, file.name);
    }

    const product = this.editingProduct();
    this.productSaving.set(true);
    this.errorMessage.set('');
    const request = product
      ? this.productService.update(product._id, formData)
      : this.productService.create(formData);
    request.subscribe({
      next: () => {
        this.productNotice.set(product ? 'แก้ไขสินค้าเรียบร้อยแล้ว' : 'เพิ่มสินค้าเรียบร้อยแล้ว');
        this.showProductEditor.set(false);
        this.editingProduct.set(null);
        this.productFiles.set([]);
        this.productSaving.set(false);
        this.loadProducts();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.productSaving.set(false);
      },
    });
  }

  protected toggleProductStatus(product: Product): void {
    if (this.changingProductId()) return;

    const formData = new FormData();
    formData.append('isActive', String(!product.isActive));
    this.changingProductId.set(product._id);
    this.errorMessage.set('');
    this.productService.update(product._id, formData).subscribe({
      next: () => {
        this.productNotice.set(product.isActive ? 'ปิดใช้งานสินค้าแล้ว' : 'เปิดใช้งานสินค้าแล้ว');
        this.changingProductId.set('');
        this.loadProducts();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.changingProductId.set('');
      },
    });
  }

  protected removeProductImage(product: Product, imageId: string): void {
    if (this.changingProductId()) return;
    this.changingProductId.set(product._id);
    this.errorMessage.set('');
    this.productService.removeImage(product._id, imageId).subscribe({
      next: (updatedProduct) => {
        this.products.update((products) =>
          products.map((item) => (item._id === updatedProduct._id ? updatedProduct : item)),
        );
        this.editingProduct.set(updatedProduct);
        this.changingProductId.set('');
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage.set(this.errorMessageFrom(error));
        this.changingProductId.set('');
      },
    });
  }

  protected productImageUrl(path: string): string {
    return this.productService.imageUrl(path);
  }

  protected trackProduct(_index: number, product: Product): string {
    return product._id;
  }

  private emptyProductForm(): ProductForm {
    return {
      name: '',
      sku: '',
      category: '',
      description: '',
      sellingPrice: '',
      costPrice: '',
      commissionPercent: '0',
    };
  }

  protected get userInitials(): string {
    const name = this.user()?.name?.trim();
    if (!name) return 'U';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  protected get roleLabel(): string {
    return this.user()?.role === 'owner' ? 'เจ้าของร้าน' : 'ผู้ดูแล';
  }

  private errorMessageFrom(error: HttpErrorResponse): string {
    return thaiErrorMessage(error, 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
  }
}
