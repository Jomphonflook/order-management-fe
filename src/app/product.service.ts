import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export interface ProductImage {
  _id: string;
  filename: string;
  url: string;
  contentType: string;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  sellingPrice: number;
  costPrice: number;
  profitPerUnit: number;
  commissionPercent: number;
  isActive: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private readonly http: HttpClient) {}

  getAll(isActive?: boolean): Observable<Product[]> {
    let params = new HttpParams();
    if (isActive !== undefined) {
      params = params.set('isActive', String(isActive));
    }

    return this.http.get<Product[]>(`${API_BASE_URL}/products`, {
      params,
      withCredentials: true,
    });
  }

  create(formData: FormData): Observable<Product> {
    return this.http.post<Product>(`${API_BASE_URL}/products`, formData, {
      withCredentials: true,
    });
  }

  update(id: string, formData: FormData): Observable<Product> {
    return this.http.patch<Product>(
      `${API_BASE_URL}/products/${encodeURIComponent(id)}`,
      formData,
      { withCredentials: true },
    );
  }

  removeImage(productId: string, imageId: string): Observable<Product> {
    return this.http.delete<Product>(
      `${API_BASE_URL}/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(imageId)}`,
      { withCredentials: true },
    );
  }

  imageUrl(path: string): string {
    return new URL(path, `${API_BASE_URL}/`).toString();
  }
}
