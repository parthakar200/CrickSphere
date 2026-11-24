import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';
import { Locality } from '../models/locality.model';
import { ApiResponse } from '../models/api.model';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'cricket_selected_locality';

export interface CreateLocalityPayload {
  name: string;
  adminEmail?: string;
  scorerEmail?: string;
  password?: string;
  district?: string;
  state?: string;
}

@Injectable({ providedIn: 'root' })
export class LocalityService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  private baseUrl = environment.apiUrl;

  private localitiesSignal = signal<Locality[]>([]);
  private selectedLocalitySignal = signal<Locality | null>(null);
  private loadingSignal = signal<boolean>(false);

  readonly localities = computed(() => this.localitiesSignal());
  readonly selectedLocality = computed(() => this.selectedLocalitySignal());
  readonly selectedLocalityId = computed(() => this.selectedLocalitySignal()?._id ?? null);
  readonly selectedLocalityName = computed(
    () => this.selectedLocalitySignal()?.name ?? 'Select a Village'
  );
  readonly isLoading = computed(() => this.loadingSignal());

  constructor() {
    this.restoreFromStorage();
    queueMicrotask(() => {
      this.loadLocalities().subscribe({
        error: (err) => console.error('Failed initial load of localities:', err),
      });
    });
  }

  loadLocalities(): Observable<ApiResponse<Locality[]>> {
    this.loadingSignal.set(true);
    return this.http.get<ApiResponse<Locality[]>>(`${this.baseUrl}/localities`).pipe(
      tap({
        next: (res) => {
          const list = res.data || [];
          this.localitiesSignal.set(list);
          this.loadingSignal.set(false);

          // If no locality is currently selected or stored, select default
          const currentSelected = this.selectedLocalitySignal();
          if (!currentSelected) {
            const defaultLoc = list.find((l) => l.isDefault) || list[0] || null;
            if (defaultLoc) {
              this.setLocality(defaultLoc);
            }
          } else {
            // Re-sync with latest object from backend
            const matched = list.find((l) => l._id === currentSelected._id);
            if (matched) {
              this.selectedLocalitySignal.set(matched);
            } else if (list.length > 0) {
              // Stored locality was deleted or not found; fallback to default
              const fallback = list.find((l) => l.isDefault) || list[0];
              this.setLocality(fallback);
            }
          }
        },
        error: (err) => {
          console.error('Error in loadLocalities:', err);
          this.loadingSignal.set(false);
        },
      })
    );
  }

  createLocality(payload: CreateLocalityPayload): Observable<Locality & { admin?: any }> {
    return this.http
      .post<ApiResponse<Locality & { admin?: any }>>(`${this.baseUrl}/localities`, payload)
      .pipe(
        map((res) => res.data),
        tap((loc) => {
          // Add to local list without duplicates
          this.localitiesSignal.update((list) => {
            const exists = list.some((item) => item._id === loc._id);
            return exists ? list.map((item) => (item._id === loc._id ? loc : item)) : [...list, loc];
          });
          this.setLocality(loc);
        })
      );
  }

  updateLocality(
    id: string,
    payload: { name?: string; district?: string; state?: string; description?: string }
  ): Observable<Locality> {
    return this.http.patch<ApiResponse<Locality>>(`${this.baseUrl}/localities/${id}`, payload).pipe(
      map((res) => res.data),
      tap((updatedLoc) => {
        this.localitiesSignal.update((list) =>
          list.map((loc) => (loc._id === updatedLoc._id ? updatedLoc : loc))
        );
        if (this.selectedLocalityId() === updatedLoc._id) {
          this.setLocality(updatedLoc);
        }
      })
    );
  }

  setLocality(locality: Locality): void {
    this.selectedLocalitySignal.set(locality);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locality));
    } catch {
      // localStorage may fail in private mode
    }
    this.api.clearCache();
  }

  setLocalityById(id: string): void {
    const found = this.localitiesSignal().find((l) => l._id === id);
    if (found) {
      this.setLocality(found);
    }
  }

  private restoreFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Locality = JSON.parse(stored);
        if (parsed && parsed._id) {
          this.selectedLocalitySignal.set(parsed);
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }
}
