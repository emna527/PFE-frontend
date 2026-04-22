import {
  Component, Input, OnChanges, OnDestroy,
  AfterViewInit, ViewChild, ElementRef, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { SfmResponseDTO } from '../../models/energy.models';

Chart.register(...registerables);

@Component({
  selector: 'app-monthly-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-chart.component.html',
  styleUrls: ['./monthly-chart.component.css']
})
export class MonthlyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: SfmResponseDTO | null = null;

  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;
  private lineChart: Chart | null = null;

  ngAfterViewInit(): void  { this.buildCharts(); }
  ngOnChanges(c: SimpleChanges): void {
    if (c['data'] && !c['data'].firstChange) this.buildCharts();
  }
  ngOnDestroy(): void {
    this.lineChart?.destroy();
  }

  get totalKwh():     number { return this.data?.globalConsumption?.totalKwh ?? 0; }
  get totalCost():    number { return this.data?.globalConsumption?.totalCostEur ?? 0; }
  get co2():          number { return this.data?.globalConsumption?.carbonFootprintKgCo2 ?? 0; }
  get avgDaily():     number { return this.data?.globalConsumption?.avgDailyKwh ?? 0; }
  get costPerKwh():   number { return this.data?.globalConsumption?.costPerKwh ?? 0; }
  get durationDays(): number { return this.data?.period?.durationDays ?? 30; }
  get siteName():     string { return this.data?.siteInfo?.siteName?.trim() ?? '—'; }
  get surface():      number { return this.data?.siteInfo?.surface ?? 0; }
  get hasAlerts():    boolean { return (this.data?.alertsAndAnomalies?.length ?? 0) > 0; }

  get startDate(): string {
    const DAY = 86_400_000;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return new Date(todayStart.getTime() - 30 * DAY).toLocaleDateString('fr-CA');
  }

  get endDate(): string {
    const DAY = 86_400_000;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    return new Date(todayStart.getTime() - DAY).toLocaleDateString('fr-CA');
  }

  get kwhPerM2(): string {
    const s = this.data?.siteInfo?.surface;
    if (!s || !this.totalKwh) return '—';
    return (this.totalKwh / s).toFixed(2);
  }

  private getWeekLabels(): string[] {
    const DAY = 86_400_000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startMs = today.getTime() - 30 * DAY;
    const monthsFr = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
    const labels: string[] = [];
    const weeks = Math.ceil(30 / 7);
    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(startMs + w * 7 * DAY);
      labels.push(`Sem.${w + 1} (${weekStart.getDate()} ${monthsFr[weekStart.getMonth()]})`);
    }
    return labels;
  }

  private getWeeklyData(): number[] {
    const weeks   = Math.ceil(30 / 7);
    const avgWeek = +(this.avgDaily * 7).toFixed(2);
    if (!avgWeek) return Array(weeks).fill(0);
    const arr = Array(weeks).fill(avgWeek);
    const lastWeekDays = 30 - (weeks - 1) * 7;
    arr[weeks - 1] = +(this.avgDaily * lastWeekDays).toFixed(2);
    return arr;
  }

  private buildCharts(): void {
    this.buildLineChart();
  }

  private buildLineChart(): void {
    this.lineChart?.destroy();
    const weekLabels = this.getWeekLabels();
    const weeklyKwh  = this.getWeeklyData();
    const weeklyCost = weeklyKwh.map(k => +(k * this.costPerKwh).toFixed(2));

    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: weekLabels,
        datasets: [
          {
            label: 'kWh', yAxisID: 'y',
            data: weeklyKwh,
            borderColor: '#4F6EF7', backgroundColor: 'rgba(79,110,247,0.08)',
            tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: '#4F6EF7'
          },
          {
            label: 'Coût (EUR)', yAxisID: 'y2',
            data: weeklyCost,
            borderColor: '#BA7517', borderDash: [4, 3],
            tension: 0.4, fill: false, pointRadius: 5, pointBackgroundColor: '#BA7517'
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: true, labels: { color: '#555', font: { size: 11 } } } },
        scales: {
          x:  { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#8896b3', font: { size: 11 } } },
          y:  { position: 'left',  grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#4F6EF7', font: { size: 10 } }, title: { display: true, text: 'kWh', color: '#4F6EF7', font: { size: 10 } } },
          y2: { position: 'right', grid: { display: false }, ticks: { color: '#BA7517', font: { size: 10 } }, title: { display: true, text: 'EUR', color: '#BA7517', font: { size: 10 } } }
        }
      }
    });
  }
}