import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DailyChartComponent } from '../daily-chart/daily-chart.component';
import { WeeklyChartComponent } from '../weekly-chart/weekly-chart.component';
import { MonthlyChartComponent } from '../monthly-chart/monthly-chart.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SfmResponseDTO } from '../../models/energy.models';
import { AggregationDTO, EnergyService } from '../../../services/energy.service';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { catchError, of } from 'rxjs';


Chart.register(...registerables);

export type Period = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-energy-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatSnackBarModule,
    DailyChartComponent, WeeklyChartComponent, MonthlyChartComponent
  ],
  templateUrl: './energy-dashboard.component.html',
  styleUrls: ['./energy-dashboard.component.css']
})
export class EnergyDashboardComponent implements OnInit, OnDestroy {

  @ViewChild('trendCanvas')     trendCanvas!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('evolutionCanvas') evolutionCanvas!: ElementRef<HTMLCanvasElement>;

  siteName          = 'SFM TUNISIE';
  reportData:        SfmResponseDTO | null = null;
  trendData:         AggregationDTO[] = [];
  previousTrendData: AggregationDTO[] = [];
  loading           = false;
  error:             string | null = null;
  activePeriod:      Period = 'daily';

  private trendChart:     Chart | null = null;
  private evolutionChart: Chart | null = null;

  // ── KPI getters ──
  get totalKwh():   number { return this.reportData?.globalConsumption?.totalKwh ?? 0; }
  get totalCost():  number { return this.reportData?.globalConsumption?.totalCostEur ?? 0; }
  get co2():        number { return this.reportData?.globalConsumption?.carbonFootprintKgCo2 ?? 0; }
  get costPerKwh(): number { return this.reportData?.globalConsumption?.costPerKwh ?? 0; }
  get devices():    number { return this.reportData?.siteInfo?.totalDevices ?? 0; }
  get surface():    number { return this.reportData?.siteInfo?.surface ?? 235; }

  get kwhPerM2(): string {
    const s = this.surface;
    if (!s || !this.totalKwh) return '—';
    return (this.totalKwh / s).toFixed(3);
  }

  get period(): string {
    if (this.reportData?.period) {
      return `${this.reportData.period.startDate} → ${this.reportData.period.endDate}`;
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const now = new Date();
    return `${fmt(now)} → ${fmt(now)}`;
  }

  // ── Equipment getter (données réelles) ──
  get equipData() {
    const equips = this.reportData?.equipmentConsumptions ?? [];
    const maxKwh = Math.max(...equips.map(e => e.consumptionKwh), 1);
    const colors = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444', '#f97316'];
    return equips.map((e, i) => ({
      name:  e.designation || e.equipmentName,
      kwh:   `${e.consumptionKwh.toFixed(2)} kWh`,
      pct:   `${((e.consumptionKwh / maxKwh) * 100).toFixed(0)}%`,
      color: colors[i % colors.length]
    }));
  }

  // ── Evolution getters (données réelles) ──
  get evolutionValue(): string {
    return this.reportData?.trendsComparison?.vsLastMonth?.consumptionChange ?? '—';
  }

  get evolutionPositive(): boolean {
    return !this.evolutionValue.startsWith('-');
  }

  // ── Anomalies getters (données réelles) ──
  get anomalies() {
    return this.reportData?.alertsAndAnomalies ?? [];
  }

  get anomalyCount(): number {
    return this.anomalies.length;
  }

  // ── Trend chart title ──
  get trendChartTitle(): string {
    switch (this.activePeriod) {
      case 'daily':   return 'Consommation par heure (kWh)';
      case 'weekly':  return 'Consommation par jour (kWh)';
      case 'monthly': return 'Consommation par mois (kWh)';
    }
  }

  constructor(
    private energyService: EnergyService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { this.loadReport(); }

  ngOnDestroy(): void {
    this.trendChart?.destroy();
    this.evolutionChart?.destroy();
  }

  loadReport(): void {
  this.loading = true;
  this.error   = null;

  const { startMs, endMs } = EnergyService.getDateRange(this.activePeriod);

  console.log('startMs:', startMs, 'endMs:', endMs);
  console.log('startDate:', new Date(startMs).toISOString());
  console.log('endDate:', new Date(endMs).toISOString());
  const toDate   = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const startStr = toDate(startMs);
  const endStr   = toDate(endMs);
  const year     = new Date().getFullYear();

  const duration     = endMs - startMs;
  const prevStartMs  = startMs - duration - 86_400_000;
  const prevStartStr = toDate(prevStartMs);
  const prevEndStr   = toDate(new Date(startMs - 1).toISOString().slice(0, 10) === startStr
    ? startMs - 86_400_000
    : startMs - 1);


  const report$    = this.energyService.getReport(this.siteName, startMs, endMs);
  const trend$     = (this.activePeriod === 'monthly'
    ? this.energyService.getSiteMonthly(this.siteName, year)
    : this.energyService.getSiteDaily(this.siteName, startStr, endStr)
  ).pipe(catchError(() => of([])));
  const prevTrend$ = (this.activePeriod === 'monthly'
    ? this.energyService.getSiteMonthly(this.siteName, year - 1)
    : this.energyService.getSiteDaily(this.siteName, prevStartStr, toDate(prevStartMs + duration))
  ).pipe(catchError(() => of([])));

  forkJoin({ report: report$, trend: trend$, prevTrend: prevTrend$ }).subscribe({
    next: ({ report, trend, prevTrend }) => {
      this.reportData        = report;
      this.trendData         = trend as AggregationDTO[];
      this.previousTrendData = prevTrend as AggregationDTO[];
      this.loading           = false;
      setTimeout(() => {
        this.buildTrendChart();
        this.buildEvolutionChart();
      }, 50);
    },
    error: () => { this.loading = false; }
  });
}

  switchPeriod(period: Period): void {
    this.activePeriod = period;
    this.loadReport();
  }

  private buildTrendChart(): void {
    if (!this.trendCanvas) return;
    this.trendChart?.destroy();

    const labels = this.trendData.map(d => d.label);
    const values = this.trendData.map(d => d.totalKwh);
    const maxVal = Math.max(...values, 1);

    this.trendChart = new Chart(this.trendCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'kWh',
          data: values,
          fill: true,
          backgroundColor: 'rgba(59,130,246,0.15)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#E6EDF3',
            bodyColor: '#93c5fd',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: ctx => ` ${(ctx.raw as number).toFixed(2)} kWh`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#6E7681', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#6E7681', font: { size: 10 } },
            min: 0,
            suggestedMax: maxVal * 1.2
          }
        }
      }
    });
  }

  private buildEvolutionChart(): void {
    if (!this.evolutionCanvas) return;
    this.evolutionChart?.destroy();

    const labels         = this.trendData.map(d => d.label);
    const currentValues  = this.trendData.map(d => d.totalKwh);
    const previousValues = this.previousTrendData.map(d => d.totalKwh);

    this.evolutionChart = new Chart(this.evolutionCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Période actuelle',
            data: currentValues,
            fill: true,
            backgroundColor: 'rgba(34,197,94,0.12)',
            borderColor: '#22c55e',
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5,
            tension: 0.4
          },
          {
            label: 'Période précédente',
            data: previousValues,
            fill: false,
            borderColor: 'rgba(255,255,255,0.2)',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#E6EDF3',
            bodyColor: '#93c5fd',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${(ctx.raw as number).toFixed(2)} kWh`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#6E7681', font: { size: 9 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#6E7681', font: { size: 9 } },
            min: 0
          }
        }
      }
    });
  }
}