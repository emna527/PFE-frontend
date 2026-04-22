import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EnergyReportHistory, SfmResponseDTO } from '../energy/models/energy.models';

export interface ZoneTotalDTO {
  zoneId: number;
  zoneName: string;
  startDate: string;
  endDate: string;
  totalKwh: number;
  totalCostEur: number;
  carbonFootprintKgCo2: number;
  avgDailyKwh: number;
}

export interface AggregationDTO {
  label: string;
  totalKwh: number;
  totalCostEur: number;
  avgKwh?: number;
  carbonFootprint?: number;
}

@Injectable({ providedIn: 'root' })
export class EnergyService {

  private readonly SFM_DIRECT = 'http://localhost:8083/energy/report';
  private readonly LOCAL_BASE  = 'http://localhost:8083/energy';

  constructor(private http: HttpClient) {}

  getReport(siteName: string, startDate: number, endDate: number): Observable<SfmResponseDTO> {
    const params = new HttpParams()
      .set('startDate', startDate.toString())
      .set('endDate',   endDate.toString());
    return this.http.get<SfmResponseDTO>(
      `${this.SFM_DIRECT}/${encodeURIComponent(siteName)}`, { params }
    );
  }

  getSfmZoneReport(zoneId: number, startDate: number, endDate: number): Observable<SfmResponseDTO> {
    const params = new HttpParams()
      .set('startDate', startDate.toString())
      .set('endDate',   endDate.toString());
    return this.http.get<SfmResponseDTO>(
      `${this.SFM_DIRECT}/area/${zoneId}`, { params }
    );
  }

  getSiteTotal(siteName: string, start: string, end: string): Observable<any> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get(
      `${this.LOCAL_BASE}/site/${encodeURIComponent(siteName)}/total`, { params }
    );
  }

  getSiteDaily(siteName: string, start: string, end: string): Observable<AggregationDTO[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<AggregationDTO[]>(
      `${this.LOCAL_BASE}/site/${encodeURIComponent(siteName)}/daily`, { params }
    );
  }

  getSiteMonthly(siteName: string, annee: number): Observable<AggregationDTO[]> {
    const params = new HttpParams().set('annee', annee.toString());
    return this.http.get<AggregationDTO[]>(
      `${this.LOCAL_BASE}/site/${encodeURIComponent(siteName)}/monthly`, { params }
    );
  }

  getMyZone(start: string, end: string): Observable<ZoneTotalDTO> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<ZoneTotalDTO>(`${this.LOCAL_BASE}/zone/my`, { params });
  }

  getZoneDaily(zoneId: number, start: string, end: string): Observable<AggregationDTO[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<AggregationDTO[]>(
      `${this.LOCAL_BASE}/zone/${zoneId}/daily`, { params }
    );
  }

  getZoneMonthly(zoneId: number, annee: number): Observable<AggregationDTO[]> {
    const params = new HttpParams().set('annee', annee.toString());
    return this.http.get<AggregationDTO[]>(
      `${this.LOCAL_BASE}/zone/${zoneId}/monthly`, { params }
    );
  }

  getHistory(siteName: string): Observable<EnergyReportHistory[]> {
    return this.http.get<EnergyReportHistory[]>(
      `${this.LOCAL_BASE}/history/${encodeURIComponent(siteName)}`
    );
  }

  // ── Calcul des timestamps ──────────────────────────────────
  static getDateRange(period: 'daily' | 'weekly' | 'monthly'): { startMs: number; endMs: number } {
    const DAY = 86_400_000;
    const now = new Date();
    const todayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const todayEndMs   = todayStartMs + DAY - 1;

    switch (period) {
      case 'daily':
        return { startMs: todayStartMs, endMs: todayEndMs };
      case 'weekly':
        return { startMs: todayStartMs - 7 * DAY, endMs: todayEndMs };
      case 'monthly':
        return { startMs: todayStartMs - 30 * DAY, endMs: todayEndMs };
    }
  }
}