import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { UserService, UserDTO } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatIconModule,
    MatButtonModule, MatSelectModule, MatTooltipModule,
    MatSnackBarModule, MatBadgeModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns: string[] = ['id', 'nomComplet', 'role', 'tel', 'telegram', 'areaName', 'zoneId', 'statut', 'actions'];
  roleFilter: string = '';
  roles: string[] = ['Tous les rôles', 'ADMIN', 'USER'];
  dataSource = new MatTableDataSource<UserDTO>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  pendingUsers: any[] = [];
  showPendingTab = false;

  activeView: string = 'users';

isEnergyRoute = false;

zoneData = [
  { name: 'Zone 1', kwh: '18.45 kWh', pct: '34.1%', color: '#3b82f6' },
  { name: 'Zone 2', kwh: '14.32 kWh', pct: '26.4%', color: '#22c55e' },
  { name: 'Zone 3', kwh: '11.08 kWh', pct: '20.5%', color: '#eab308' },
  { name: 'Zone 4', kwh: '7.21 kWh',  pct: '13.3%', color: '#a855f7' },
  { name: 'Zone 5', kwh: '3.07 kWh',  pct: '5.7%',  color: '#ef4444' },
];

equipData = [
  { name: 'Climatisation', kwh: '24.18 kWh', pct: '78%',  color: '#3b82f6' },
  { name: 'Éclairage',     kwh: '12.45 kWh', pct: '50%',  color: '#22c55e' },
  { name: 'Machines',      kwh: '9.21 kWh',  pct: '38%',  color: '#eab308' },
  { name: 'Autres',        kwh: '8.29 kWh',  pct: '34%',  color: '#a855f7' },
];
  private routerSub!: Subscription;

  showDialog = false;
  isEditMode = false;
  selectedId: number | null = null;
  userForm: FormGroup;

  showApproveDialog = false;
  pendingApproveId: number | null = null;
  approveForm: FormGroup;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef   // ✅ ajouté pour forcer la détection
  ) {
    this.userForm = this.fb.group({
      nomComplet: ['', Validators.required],
      email:      ['', [Validators.required, Validators.email]],
      password:   ['', Validators.required],
      role:       ['USER', Validators.required],
      tel:        [''],
      telegram:   [''],
      areaName:   [''],
      zoneId:     ['']
    });

    this.approveForm = this.fb.group({
      zoneId:   ['', Validators.required],
      siteName: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadPendingUsers();

    this.isEnergyRoute = this.router.url.includes('consommation') ||
                     this.router.url.includes('energy-history');

    this.routerSub = this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isEnergyRoute = (e.urlAfterRedirects as string).includes('consommation') ||
                     (e.urlAfterRedirects as string).includes('energy-history');
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  // ✅ CORRIGÉ — spread + réassignation paginator/sort + detectChanges
  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.dataSource.data = [...users];
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.cdr.detectChanges();
      },
      error: () => this.notify('Erreur récupération users', 'error')
    });
  }

  loadPendingUsers(): void {
    this.userService.getPendingUsers().subscribe({
      next: (users) => this.pendingUsers = users,
      error: () => this.notify('Erreur récupération demandes', 'error')
    });
  }

  openApproveDialog(id: number): void {
    this.pendingApproveId = id;
    this.approveForm.reset();
    this.showApproveDialog = true;
  }

  // ✅ CORRIGÉ — setTimeout pour laisser le backend terminer avant reload
  confirmApprove(): void {
    if (this.approveForm.invalid) return;
    const { zoneId, siteName } = this.approveForm.value;
    this.userService.approveUser(this.pendingApproveId!, {
      zoneId: Number(zoneId),
      siteName: siteName || ''
    }).subscribe({
      next: () => {
        this.notify('Utilisateur approuvé ✓', 'success');
        this.showApproveDialog = false;
        this.loadPendingUsers();
        setTimeout(() => this.loadUsers(), 300);
      },
      error: () => this.notify('Erreur approbation', 'error')
    });
  }

  rejectUser(id: number): void {
    if (!confirm('Confirmer le refus de cette demande ?')) return;
    this.userService.rejectUser(id).subscribe({
      next: () => {
        this.notify('Demande refusée', 'error');
        this.loadPendingUsers();
      },
      error: () => this.notify('Erreur refus', 'error')
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  applyRoleFilter(role: string): void {
    this.roleFilter = role === 'Tous les rôles' ? '' : role;
    this.dataSource.filterPredicate = (data: UserDTO, filter: string) => {
      if (!filter) return true;
      return data.role?.toLowerCase() === filter.toLowerCase();
    };
    this.dataSource.filter = this.roleFilter;
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.selectedId = null;
    this.userForm.reset({ role: 'USER' });
    this.userForm.get('password')?.setValidators(Validators.required);
    this.userForm.get('password')?.updateValueAndValidity();
    this.showDialog = true;
  }

  openEditDialog(user: UserDTO): void {
    this.isEditMode = true;
    this.selectedId = user.id;
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.patchValue(user);
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.userForm.reset();
  }

  saveUser(): void {
    if (this.userForm.invalid) return;
    if (this.isEditMode && this.selectedId !== null) {
      const { password, ...payload } = this.userForm.value;
      this.userService.updateUser(this.selectedId, payload).subscribe({
        next: () => {
          this.notify('Utilisateur mis à jour', 'success');
          this.closeDialog();
          this.loadUsers();
        },
        error: () => this.notify('Erreur lors de la mise à jour', 'error')
      });
    } else {
      this.userService.createUser(this.userForm.value).subscribe({
        next: () => {
          this.notify('Utilisateur ajouté', 'success');
          this.closeDialog();
          setTimeout(() => this.loadUsers(), 300);
        },
        error: () => this.notify('Erreur lors de l\'ajout', 'error')
      });
    }
  }

  deleteUser(id: number): void {
    if (!confirm('Confirmer la suppression ?')) return;
    this.userService.deleteUser(id).subscribe({
      next: () => {
        this.notify('Utilisateur supprimé', 'success');
        this.loadUsers();
      },
      error: (err) => {
        if (err.status === 204 || err.status === 200) {
          this.notify('Utilisateur supprimé', 'success');
          this.loadUsers();
        } else {
          this.notify('Erreur lors de la suppression', 'error');
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private notify(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: type === 'success' ? ['snack-success'] : ['snack-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top'
    });
  }

  goToUsers(): void {
    this.showPendingTab = false;
    this.activeView = 'users';
    this.router.navigate(['/admin-dashboard']);
  }

  openDemandes(): void {
    this.showPendingTab = true;
    this.activeView = 'users';
    this.router.navigate(['/admin-dashboard']);
  }
  get adminCount(): number {
    return this.dataSource.data.filter(user => user.role === 'ADMIN').length;
  }

  get userCount(): number {
    return this.dataSource.data.filter(user => user.role === 'USER').length;
  }

  getAvatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg,#FF6B1A,#FFB347)',
      'linear-gradient(135deg,#2563EB,#60A5FA)',
      'linear-gradient(135deg,#10B981,#34D399)',
      'linear-gradient(135deg,#8B5CF6,#C4B5FD)',
      'linear-gradient(135deg,#F59E0B,#FCD34D)',
      'linear-gradient(135deg,#EF4444,#F87171)'
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  }
  
}