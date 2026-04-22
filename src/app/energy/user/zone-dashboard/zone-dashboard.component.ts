import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type Period = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-zone-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  templateUrl: './zone-dashboard.component.html',
  styleUrls: ['./zone-dashboard.component.css']
})
export class ZoneDashboardComponent implements OnInit, OnDestroy {

  zoneData: any        = null;
  periodInfo: any      = null;
  areaInfo: any        = null;
  loading              = false;
  error: string | null = null;
  zoneId: number       = 0;
  areaName             = '';

  activePeriod: Period = 'daily';
  readonly periods: { key: Period; label: string; icon: string }[] = [
    { key: 'daily',   label: 'Daily',   icon: 'today'          },
    { key: 'weekly',  label: 'Weekly',  icon: 'date_range'     },
    { key: 'monthly', label: 'Monthly', icon: 'calendar_month' }
  ];

  private chart: Chart | null = null;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.zoneId   = Number(localStorage.getItem('zoneId'));
    this.areaName = localStorage.getItem('siteName') || 'Ma Zone';
    this.loadAll();
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  switchPeriod(p: Period): void {
    this.activePeriod = p;
    this.loadAll();
  }

  loadAll(): void {
    if (!this.zoneId) {
      this.error = 'Zone non assignée. Contactez l\'administrateur.';
      return;
    }

    this.loading = true;
    this.error   = null;
    this.zoneData = null;

    const { startMs, endMs } = this.rangeForPeriod(this.activePeriod);

    const params = new HttpParams()
      .set('startDate', startMs.toString())
      .set('endDate',   endMs.toString());

    this.http.get<any>(
      `http://localhost:8083/energy/report/area/${this.zoneId}`,
      { params }
    ).subscribe({
      next: (res: any) => {
        this.zoneData   = res.globalConsumption;
        this.periodInfo = res.period;
        this.areaInfo   = res.siteInfo ?? res.areaInfo ?? null;
        // Le nom de la zone vient du localStorage (zoneId → nom)
        if (res.areaInfo?.areaName) {
          this.areaName = res.areaInfo.areaName;
        }
        this.loading    = false;
        this.buildChart();
      },
      error: err => {
        this.error   = err.error?.message ?? err.error?.error ?? 'Erreur de chargement des données';
        this.loading = false;
        this.snackBar.open(this.error!, 'Fermer', {
          duration: 4000,
          panelClass: ['snack-error'],
          horizontalPosition: 'end',
          verticalPosition: 'top'
        });
      }
    });
  }

  /**
   * Calcul des plages de dates en heure locale (Tunis UTC+1/+2).
   * On utilise new Date() et on manipule les dates locales
   * pour éviter le double-offset.
   *
   *  DAILY   → début du jour courant (00:00:00.000) → fin du jour courant (23:59:59.999)
   *  WEEKLY  → il y a 6 jours (00:00:00.000)        → fin du jour courant (23:59:59.999)
   *  MONTHLY → il y a 29 jours (00:00:00.000)       → fin du jour courant (23:59:59.999)
   */
  private rangeForPeriod(p: Period): { startMs: number; endMs: number } {
    const DAY = 86_400_000;

    // L'API SFM ne retourne pas de données pour aujourd'hui (délai capteurs).
    // Toutes les périodes se terminent à la fin d'hier (J-1 23:59:59.999).
    const now = new Date();
    const todayStart       = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayStartMs     = todayStart.getTime();
    const yesterdayStartMs = todayStartMs - DAY;
    const yesterdayEndMs   = todayStartMs - 1;  // hier 23:59:59.999

    if (p === 'daily')   return { startMs: yesterdayStartMs,          endMs: yesterdayEndMs };
    if (p === 'weekly')  return { startMs: todayStartMs - 7  * DAY,   endMs: yesterdayEndMs };
    /* monthly */        return { startMs: todayStartMs - 30 * DAY,   endMs: yesterdayEndMs };
  }

  /**
   * Construit un graphique à barres qui représente
   * la consommation sur la période avec des labels lisibles.
   */
  private buildChart(): void {
    setTimeout(() => {
      if (!this.chartCanvas) return;
      this.chart?.destroy();

      const DAY = 86_400_000;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

      const dayNames  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
      const monthsFr  = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];

      const avgDay  = this.zoneData?.avgDailyKwh  ?? 0;
      const avgCost = avgDay * (this.zoneData?.costPerKwh ?? 0);

      let labels: string[] = [];
      let kwhData: number[]  = [];
      let costData: number[] = [];

      if (this.activePeriod === 'daily') {
        // Un seul point : hier
        const yesterday = new Date(todayStart.getTime() - DAY);
        labels   = [`Hier (${yesterday.getDate()} ${monthsFr[yesterday.getMonth()]})`];
        kwhData  = [+(this.zoneData?.totalKwh    ?? 0).toFixed(2)];
        costData = [+(this.zoneData?.totalCostEur ?? 0).toFixed(2)];

      } else if (this.activePeriod === 'weekly') {
        // 7 jours : J-7 → hier
        for (let i = 7; i >= 1; i--) {
          const d = new Date(todayStart.getTime() - i * DAY);
          labels.push(`${dayNames[d.getDay()]} ${d.getDate()}`);
          kwhData.push(+avgDay.toFixed(2));
          costData.push(+avgCost.toFixed(2));
        }
        // Ajustement : dernier point (hier) = totalKwh - somme des 6 précédents
        const sumPrev  = +(avgDay  * 6).toFixed(2);
        kwhData[6]     = Math.max(0, +((this.zoneData?.totalKwh    ?? 0) - sumPrev).toFixed(2));
        const cSumPrev = +(avgCost * 6).toFixed(2);
        costData[6]    = Math.max(0, +((this.zoneData?.totalCostEur ?? 0) - cSumPrev).toFixed(2));

      } else {
        // Monthly : 4 semaines
        const weeks = 4;
        const avgWeekKwh  = +(avgDay * 7).toFixed(2);
        const avgWeekCost = +(avgCost * 7).toFixed(2);
        for (let w = 3; w >= 0; w--) {
          const weekStart = new Date(todayStart.getTime() - w * 7 * DAY);
          labels.push(`Sem. ${4 - w} (${weekStart.getDate()} ${monthsFr[weekStart.getMonth()]})`);
          kwhData.push(avgWeekKwh);
          costData.push(avgWeekCost);
        }
        // Ajustement total
        const sumW = kwhData.reduce((a, b) => a + b, 0);
        const diff = +((this.zoneData?.totalKwh ?? 0) - sumW).toFixed(2);
        kwhData[3]  = Math.max(0, +(kwhData[3]  + diff).toFixed(2));
        const cSumW = costData.reduce((a, b) => a + b, 0);
        const cDiff = +((this.zoneData?.totalCostEur ?? 0) - cSumW).toFixed(2);
        costData[3] = Math.max(0, +(costData[3] + cDiff).toFixed(2));
      }

      this.chart = new Chart(this.chartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'kWh',
              data: kwhData,
              backgroundColor: 'rgba(79,110,247,0.8)',
              borderRadius: 5,
              yAxisID: 'y'
            },
            {
              label: 'Coût (EUR)',
              data: costData,
              type: 'line' as any,
              borderColor: '#BA7517',
              backgroundColor: 'rgba(186,117,23,0.15)',
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointBackgroundColor: '#BA7517',
              yAxisID: 'y2'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'top', labels: { color: '#555', font: { size: 12 } } }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#8896b3', font: { size: 11 } }
            },
            y: {
              position: 'left',
              title: { display: true, text: 'kWh', color: '#4F6EF7', font: { size: 11 } },
              ticks: { color: '#4F6EF7' },
              grid: { color: 'rgba(128,128,128,0.1)' }
            },
            y2: {
              position: 'right',
              title: { display: true, text: 'EUR', color: '#BA7517', font: { size: 11 } },
              ticks: { color: '#BA7517' },
              grid: { display: false }
            }
          }
        }
      });
    }, 50);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
