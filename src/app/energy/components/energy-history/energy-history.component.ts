import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnergyService } from '../../../services/energy.service';
import { EnergyReportHistory } from '../../models/energy.models';

@Component({
  selector: 'app-energy-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule
  ],
  templateUrl: './energy-history.component.html',
  styleUrls: ['./energy-history.component.css']
})
export class EnergyHistoryComponent implements OnInit {

  displayedColumns = ['fetchedAt', 'siteName', 'period', 'totalKwh', 'totalCostEur', 'avgDailyKwh', 'carbonFootprintKgCo2', 'durationDays', 'status'];
  dataSource = new MatTableDataSource<EnergyReportHistory>();
  loading = true;
  error = '';
  searchText = '';
  filterSite = '';
  sites: string[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private energyService: EnergyService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadHistory(): void {
  this.loading = true;
  this.error = '';
  this.energyService.getHistory('SFM TUNISIE').subscribe({
    next: (data) => {
      // ✅ Trier par date décroissante (nouvelles données en haut)
      this.dataSource.data = data.sort((a, b) =>
        new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
      );
      this.sites = [...new Set(data.map(h => h.siteName))];
      this.loading = false;
    },
    error: () => {
      this.error = 'Impossible de charger l\'historique.';
      this.loading = false;
    }
  });
}

  applyFilter(): void {
    const search = this.searchText.trim().toLowerCase();
    const site = this.filterSite;
    this.dataSource.filterPredicate = (row) => {
      const matchSite = !site || row.siteName === site;
      const matchSearch = !search ||
        row.siteName?.toLowerCase().includes(search) ||
        row.status?.toLowerCase().includes(search);
      return matchSite && matchSearch;
    };
    this.dataSource.filter = search + site;
  }

  resetFilters(): void {
    this.searchText = '';
    this.filterSite = '';
    this.dataSource.filter = '';
  }

  formatDate(ts: number): string {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatDateTime(dt: string): string {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}