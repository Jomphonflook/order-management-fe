import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type LabelPaperSize = 'A4' | 'A5' | '100x150mm';

export interface StoreSettings {
  storeName: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  labelPaperSize: LabelPaperSize;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private readonly http: HttpClient) {}

  get(): Observable<StoreSettings> {
    return this.http.get<StoreSettings>(`${API_BASE_URL}/settings`, {
      withCredentials: true,
    });
  }

  update(settings: StoreSettings): Observable<StoreSettings> {
    const payload: StoreSettings = {
      storeName: settings.storeName,
      senderName: settings.senderName,
      senderPhone: settings.senderPhone,
      senderAddress: settings.senderAddress,
      labelPaperSize: settings.labelPaperSize,
    };
    return this.http.patch<StoreSettings>(`${API_BASE_URL}/settings`, payload, {
      withCredentials: true,
    });
  }
}
