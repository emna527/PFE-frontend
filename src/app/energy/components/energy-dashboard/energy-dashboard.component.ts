import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { DailyChartComponent } from '../daily-chart/daily-chart.component';
import { WeeklyChartComponent } from '../weekly-chart/weekly-chart.component';
import { MonthlyChartComponent } from '../monthly-chart/monthly-chart.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SfmResponseDTO } from '../../models/energy.models';
import { EnergyService } from '../../../services/energy.service';

export type Period = 'daily' | 'weekly' | 'monthly';

@Component({
  selector: 'app-energy-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatSnackBarModule,RouterModule,
    DailyChartComponent, WeeklyChartComponent, MonthlyChartComponent
  ],
  templateUrl: './energy-dashboard.component.html',
  styleUrls: ['./energy-dashboard.component.css']
})
export class EnergyDashboardComponent implements OnInit {

  siteName   = 'SFM TUNISIE';
  reportData: SfmResponseDTO | null = null;
  loading    = false;
  error: string | null = null;

  activePeriod: Period = 'daily';
  readonly periods: { key: Period; label: string; icon: string }[] = [
    { key: 'daily',   label: 'Daily',   icon: 'today'          },
    { key: 'weekly',  label: 'Weekly',  icon: 'date_range'     },
    { key: 'monthly', label: 'Monthly', icon: 'calendar_month' }
  ];

  constructor(
    private energyService: EnergyService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void { this.loadReport(); }

  loadReport(): void {
    this.loading = true;
    this.error   = null;

    const { startMs, endMs } = EnergyService.getDateRange(this.activePeriod);

    // ✅ Logs temporaires
    console.log('Période:', this.activePeriod);
    console.log('startDate:', new Date(startMs).toLocaleString('fr-TN'), '→', startMs);
    console.log('endDate:',   new Date(endMs).toLocaleString('fr-TN'),   '→', endMs);

    this.energyService.getReport(this.siteName, startMs, endMs).subscribe({
      next: data => {
        console.log('totalKwh reçu:', data.globalConsumption?.totalKwh);
        this.reportData = data;
        this.loading    = false;
      },
      error: err => {
        this.error = err.error?.error ?? err.message ?? 'Erreur de connexion au service énergie';
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

  switchPeriod(period: Period): void {
    this.activePeriod = period;
    this.loadReport();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
