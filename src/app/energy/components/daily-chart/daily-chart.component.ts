import {
  Component, Input, OnChanges, OnDestroy,
  AfterViewInit, ViewChild, ElementRef, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { SfmResponseDTO } from '../../models/energy.models';

Chart.register(...registerables);

@Component({
  selector: 'app-daily-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-chart.component.html',
  styleUrls: ['./daily-chart.component.css']
})
export class DailyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: SfmResponseDTO | null = null;

  @ViewChild('kpiCanvas') kpiCanvas!: ElementRef<HTMLCanvasElement>;

  private kpiChart: Chart | null = null;

  ngAfterViewInit(): void  { this.buildCharts(); }
  ngOnChanges(c: SimpleChanges): void {
    if (c['data'] && !c['data'].firstChange) this.buildCharts();
  }
  ngOnDestroy(): void {
    this.kpiChart?.destroy();
  }

  get totalKwh():   number { return this.data?.globalConsumption?.totalKwh ?? 0; }
  get totalCost():  number { return this.data?.globalConsumption?.totalCostEur ?? 0; }
  get co2():        number { return this.data?.globalConsumption?.carbonFootprintKgCo2 ?? 0; }
  get avgDaily():   number { return this.data?.globalConsumption?.avgDailyKwh ?? 0; }
  get costPerKwh(): number { return this.data?.globalConsumption?.costPerKwh ?? 0; }
  get siteName():   string { return this.data?.siteInfo?.siteName?.trim() ?? '—'; }
  get surface():    number { return this.data?.siteInfo?.surface ?? 0; }
  get devices():    number { return this.data?.siteInfo?.totalDevices ?? 0; }

  get period(): string {
    const DAY = 86_400_000;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const yesterday  = new Date(todayStart.getTime() - DAY);
    const fmt = (d: Date) => d.toLocaleDateString('fr-CA');
    return fmt(yesterday) + ' → ' + fmt(yesterday);
  }

  get hasAlerts(): boolean { return (this.data?.alertsAndAnomalies?.length ?? 0) > 0; }

  get kwhPerM2(): string {
    const s = this.data?.siteInfo?.surface;
    if (!s || !this.totalKwh) return '—';
    return (this.totalKwh / s).toFixed(3);
  }

  private buildCharts(): void {
    this.buildKpiChart();
  }

  private buildKpiChart(): void {
    this.kpiChart?.destroy();
    const kwh       = +this.totalKwh.toFixed(2);
    const threshold = 50;
    const remaining = Math.max(0, threshold - kwh);
    const over      = Math.max(0, kwh - threshold);

    this.kpiChart = new Chart(this.kpiCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: ['Consommé', over > 0 ? 'Dépassement' : 'Restant'],
        datasets: [{
          data: over > 0 ? [threshold, over] : [kwh, remaining],
          backgroundColor: over > 0
            ? ['#1D9E75', '#D85A30']
            : ['#1D9E75', 'rgba(128,128,128,0.1)'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: ctx => ` ${ctx.label}: ${(ctx.raw as number).toFixed(2)} kWh` }
          }
        }
      }
    });
  }
}