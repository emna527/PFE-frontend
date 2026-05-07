import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../services/user.service';

Chart.register(...registerables);

type Period = 'daily' | 'weekly' | 'monthly';

interface DonutItem {
  label: string;
  pct:   number;
  kwh:   number;
  color: string;
}

@Component({
  selector: 'app-zone-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSnackBarModule,FormsModule],
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
  userName             = '';
  today                = '';
  yesterdayLabel       = '';
  showEditProfile = false;
  showPwdFields   = false;
  editLoading     = false;
  editNom         = '';
  editEmail       = '';
  editTel         = '';
  editTelegram    = '';
  editNewPwd      = '';
  editConfirmPwd  = '';

  donutItems: DonutItem[] = [];

  activePeriod: Period = 'daily';
  readonly periods: { key: Period; label: string }[] = [
    { key: 'daily',   label: "Aujourd'hui" },
    { key: 'weekly',  label: '7 jours'     },
    { key: 'monthly', label: '30 jours'    }
  ];

  private lineChart:  Chart | null = null;
  private donutChart: Chart | null = null;

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.zoneId   = Number(localStorage.getItem('zoneId'));
    this.areaName = localStorage.getItem('siteName') || 'Ma Zone';
    this.userName = localStorage.getItem('nomComplet') || localStorage.getItem('username') || 'Utilisateur';

    const now      = new Date();
    const monthsFr = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];
    this.today = `${now.getDate()} ${monthsFr[now.getMonth()]} ${now.getFullYear()}`;

    const yesterday = new Date(now.getTime() - 86_400_000);
    this.yesterdayLabel = `${yesterday.getDate()} ${monthsFr[yesterday.getMonth()]}`;

    this.loadAll();
  }

  ngOnDestroy(): void {
    this.lineChart?.destroy();
    this.donutChart?.destroy();
  }

  switchPeriod(p: Period): void {
    this.activePeriod = p;
    this.loadAll();
  }

  loadAll(): void {
    if (!this.zoneId) {
      this.error = "Zone non assignée. Contactez l'administrateur.";
      return;
    }

    this.loading  = true;
    this.error    = null;
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
        if (res.areaInfo?.areaName) this.areaName = res.areaInfo.areaName;

        this.loading = false;
        this.buildDonut();
        this.buildLineChart(res);
      },
      error: err => {
        this.error = err.error?.message ?? err.error?.error ?? 'Erreur de chargement des données';
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

  private rangeForPeriod(p: Period): { startMs: number; endMs: number } {
    const DAY              = 86_400_000;
    const now              = new Date();
    const todayStart       = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayStartMs     = todayStart.getTime();
    const yesterdayStartMs = todayStartMs - DAY;
    const yesterdayEndMs   = todayStartMs - 1;

    if (p === 'daily')  return { startMs: yesterdayStartMs,        endMs: yesterdayEndMs };
    if (p === 'weekly') return { startMs: todayStartMs - 7  * DAY, endMs: yesterdayEndMs };
    /* monthly */       return { startMs: todayStartMs - 30 * DAY, endMs: yesterdayEndMs };
  }

  // ── Donut vide ──────────────────────────────────────────────────────────
  private buildDonut(): void {
    setTimeout(() => {
      if (!this.donutCanvas) return;
      this.donutChart?.destroy();
      this.donutItems = [];

      this.donutChart = new Chart(this.donutCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [1],
            backgroundColor: ['rgba(255,255,255,0.06)'],
            borderColor:     ['rgba(255,255,255,0.04)'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: false,
          cutout: '72%',
          plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
      });
    }, 60);
  }

  // ── Line chart ──────────────────────────────────────────────────────────
  private buildLineChart(res: any): void {
    setTimeout(() => {
      if (!this.chartCanvas) return;
      this.lineChart?.destroy();

      const DAY        = 86_400_000;
      const now        = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const monthsFr   = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];

      const totalKwh = +(this.zoneData?.totalKwh    ?? 0);
      const avgDay   = +(this.zoneData?.avgDailyKwh  ?? totalKwh);

      let labels:  string[] = [];
      let kwhData: number[] = [];

      const dailyData: any[] = res.dailyData ?? res.dailyConsumption ?? res.data ?? [];

      if (dailyData.length > 0) {
        dailyData.forEach((d: any) => {
          const date = new Date(d.date ?? d.timestamp ?? d.day);
          labels.push(`${date.getDate()} ${monthsFr[date.getMonth()]}`);
          kwhData.push(+(d.kwh ?? d.totalKwh ?? d.consumption ?? 0).toFixed(2));
        });

      } else if (this.activePeriod === 'daily') {
        // 24 points horaires
        for (let h = 0; h < 24; h++) {
          labels.push(`${String(h).padStart(2, '0')}:00`);
          const factor = (h >= 6 && h <= 22)
            ? 1 + 0.6 * Math.sin(Math.PI * (h - 6) / 16)
            : 0.3;
          kwhData.push(+(avgDay / 24 * factor).toFixed(3));
        }
        const sum   = kwhData.reduce((a, b) => a + b, 0);
        const ratio = sum > 0 ? totalKwh / sum : 1;
        kwhData     = kwhData.map(v => +(v * ratio).toFixed(2));

      } else {
        const nbDays = this.activePeriod === 'weekly' ? 7 : 30;
        for (let i = nbDays; i >= 1; i--) {
          const d = new Date(todayStart.getTime() - i * DAY);
          labels.push(`${d.getDate()} ${monthsFr[d.getMonth()]}`);
          kwhData.push(+avgDay.toFixed(2));
        }
        const sum = kwhData.slice(0, -1).reduce((a, b) => a + b, 0);
        kwhData[kwhData.length - 1] = Math.max(0, +(totalKwh - sum).toFixed(2));
      }

      // ── Plugin custom : valeurs au-dessus + lignes verticales pointillées ──
      const isDailyMode = this.activePeriod === 'daily';
      const customPlugin = {
        id: 'customLabelsAndLines',
        afterDatasetsDraw: (chart: any) => {
          const c2      = chart.ctx;
          const dataset = chart.data.datasets[0];
          const meta    = chart.getDatasetMeta(0);

          meta.data.forEach((point: any, i: number) => {
            const val    = dataset.data[i];
            if (val === null || val === undefined) return;

            const x      = point.x;
            const y      = point.y;
            const bottom = chart.scales['y'].bottom;

            // Ligne verticale pointillée
            c2.save();
            c2.setLineDash([4, 4]);
            c2.strokeStyle = 'rgba(255,255,255,0.10)';
            c2.lineWidth   = 1;
            c2.beginPath();
            c2.moveTo(x, y + 8);
            c2.lineTo(x, bottom);
            c2.stroke();
            c2.restore();

            // Valeur au-dessus (seulement en weekly/monthly pour ne pas surcharger)
            if (!isDailyMode) {
              c2.save();
              c2.font         = '600 10.5px Sora, sans-serif';
              c2.fillStyle    = '#c8cde0';
              c2.textAlign    = 'center';
              c2.textBaseline = 'bottom';
              c2.fillText(Number(val).toFixed(1), x, y - 5);
              c2.restore();
            }
          });
        }
      };

      this.lineChart = new Chart(this.chartCanvas.nativeElement, {
        type: 'line',
        plugins: [customPlugin],
        data: {
          labels,
          datasets: [{
            label: 'kWh',
            data: kwhData,
            borderColor: '#4f7cff',
            backgroundColor: (context: any) => {
              const ch = context.chart;
              const { ctx: c, chartArea } = ch;
              if (!chartArea) return 'rgba(59,130,246,0.15)';
              const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0,   'rgba(59,130,246,0.40)');
              gradient.addColorStop(0.6, 'rgba(59,130,246,0.08)');
              gradient.addColorStop(1,   'rgba(59,130,246,0.00)');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            pointRadius:      isDailyMode ? 3 : 5,
            pointHoverRadius: isDailyMode ? 5 : 7,
            pointBackgroundColor: '#4f7cff',
            pointBorderColor:     '#141720',
            pointBorderWidth: 2,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: isDailyMode ? 8 : 28 } },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1a1e2a',
              borderColor:     'rgba(255,255,255,0.08)',
              borderWidth: 1,
              titleColor: '#f0f2f8',
              bodyColor:  '#8b90a7',
              padding: 12,
              titleFont: { family: 'Sora', size: 12, weight: 'bold' },
              bodyFont:  { family: 'Sora', size: 12 },
              callbacks: {
                label: (ctx: any) => ` ${ctx.parsed.y.toFixed(2)} kWh`
              }
            }
          },
          scales: {
            x: {
              grid:   { display: false },
              border: { display: false },
              ticks: {
                color: '#555b72',
                font:  { size: 11, family: 'Sora' },
                maxTicksLimit: isDailyMode ? 8 : 10
              }
            },
            y: {
              position: 'left',
              grid:   { color: 'rgba(255,255,255,0.05)' },
              border: { display: false },
              title: {
                display: true, text: 'kWh',
                color: '#8b90a7', font: { size: 11, family: 'Sora' }
              },
              ticks: { color: '#555b72', font: { size: 11 }, padding: 8 },
              min: 0
            }
          }
        }
      });
    }, 50);
  }
  openEditProfile(): void {
  // Décoder le token JWT pour avoir les vraies infos de l'utilisateur connecté
  const token = localStorage.getItem('token');
  let emailFromToken = '';
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      emailFromToken = payload.sub || payload.email || '';
    } catch (e) {}
  }

  this.editNom      = localStorage.getItem('nomComplet') || this.userName;
  this.editEmail    = emailFromToken;
  this.editTel      = localStorage.getItem('tel') || '';
  this.editTelegram = localStorage.getItem('telegram') || '';
  this.editNewPwd   = '';
  this.editConfirmPwd = '';
  this.showPwdFields  = false;
  this.showEditProfile = true;
}

closeEditProfile(): void {
  this.showEditProfile = false;
}

saveProfile(): void {
  if (!this.editNom) {
    this.snackBar.open('Le nom est obligatoire.', 'Fermer', { duration: 3000 });
    return;
  }
  if (this.showPwdFields && this.editNewPwd !== this.editConfirmPwd) {
    this.snackBar.open('Les mots de passe ne correspondent pas.', 'Fermer', { duration: 3000 });
    return;
  }

  this.editLoading = true;
  const userId = Number(localStorage.getItem('userId'));

  const payload: any = {
  nomComplet: this.editNom
};

if (this.editEmail && this.editEmail.trim())       payload.email    = this.editEmail;
if (this.editTel && this.editTel.trim())           payload.tel      = this.editTel;
if (this.editTelegram && this.editTelegram.trim()) payload.telegram = this.editTelegram;

if (this.showPwdFields && this.editNewPwd) {
  payload.password = this.editNewPwd;
}

  this.userService.updateUser(userId, payload).subscribe({
    next: (u) => {
      localStorage.setItem('nomComplet', u.nomComplet);
      if (u.email)    localStorage.setItem('email', u.email);
      if (u.tel)      localStorage.setItem('tel', u.tel);
      if (u.telegram) localStorage.setItem('telegram', u.telegram);
      this.userName = u.nomComplet;
      this.snackBar.open('Profil mis à jour !', 'Fermer', { duration: 3000 });
      this.editLoading = false;
      this.closeEditProfile();
    },
    error: () => {
      this.snackBar.open('Erreur lors de la mise à jour.', 'Fermer', { duration: 3000 });
      this.editLoading = false;
    }
  });
}

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}