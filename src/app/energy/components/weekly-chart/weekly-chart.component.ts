import {
  Component, Input, OnChanges, OnDestroy,
  AfterViewInit, ViewChild, ElementRef, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Chart, registerables } from 'chart.js';
import { SfmResponseDTO } from '../../models/energy.models';

Chart.register(...registerables);

@Component({
  selector: 'app-weekly-chart',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './weekly-chart.component.html',
  styleUrls: ['./weekly-chart.component.css']
})
export class WeeklyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() data: SfmResponseDTO | null = null;

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  private barChart: Chart | null = null;

  ngAfterViewInit(): void  { this.buildCharts(); }
  ngOnChanges(c: SimpleChanges): void {
    if (c['data'] && !c['data'].firstChange) this.buildCharts();
  }
  ngOnDestroy(): void { this.barChart?.destroy(); }

  get totalKwh():    number { return this.data?.globalConsumption?.totalKwh ?? 0; }
  get totalCost():   number { return this.data?.globalConsumption?.totalCostEur ?? 0; }
  get co2():         number { return this.data?.globalConsumption?.carbonFootprintKgCo2 ?? 0; }
  get avgDaily():    number { return this.data?.globalConsumption?.avgDailyKwh ?? 0; }
  get costPerKwh():  number { return this.data?.globalConsumption?.costPerKwh ?? 0; }
  get durationDays():number { return this.data?.period?.durationDays ?? 7; }
  get siteName():    string { return this.data?.siteInfo?.siteName?.trim() ?? '—'; }

  get period(): string {
    const DAY = 86_400_000;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const start = new Date(todayStart.getTime() - 7 * DAY);
    const end   = new Date(todayStart.getTime() - DAY);
    const fmt = (d: Date) => d.toLocaleDateString('fr-CA');
    return fmt(start) + ' → ' + fmt(end);
  }

  private getDayLabels(): string[] {
    const DAY = 86_400_000;
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const labels: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 7; i >= 1; i--) {
      const d = new Date(today.getTime() - i * DAY);
      labels.push(`${dayNames[d.getDay()]} ${d.getDate()}`);
    }
    return labels;
  }

  private getDailyData(): number[] {
    const avg = +this.avgDaily.toFixed(2);
    if (!avg) return Array(7).fill(0);
    const arr = Array(7).fill(avg);
    const diff = +(this.totalKwh - avg * 7).toFixed(2);
    arr[6] = +(arr[6] + diff).toFixed(2);
    return arr;
  }

  private buildCharts(): void { this.buildBarChart(); }

  private buildBarChart(): void {
    this.barChart?.destroy();
    const labels = this.getDayLabels();
    const daily  = this.getDailyData();
    const dayNames = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const today = new Date();
    const colors = daily.map((_, i) => {
      const d = new Date(today.getTime() - (7 - i) * 86_400_000);
      const dow = d.getDay();
      return (dow === 0 || dow === 6) ? '#1D9E75' : '#4F6EF7';
    });

    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'kWh/jour',
          data: daily,
          backgroundColor: colors,
          borderRadius: 8,
          barPercentage: 0.65
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => ` ${(ctx.raw as number).toFixed(2)} kWh` } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8896b3', font: { size: 11 } } },
          y: { grid: { color: 'rgba(128,128,128,0.1)' }, ticks: { color: '#8896b3', font: { size: 11 } } }
        }
      }
    });
  }
}