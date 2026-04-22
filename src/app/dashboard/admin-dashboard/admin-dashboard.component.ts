import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
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
import { Router, RouterModule } from '@angular/router';

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
export class AdminDashboardComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['id', 'nomComplet', 'role', 'tel', 'telegram', 'areaName', 'zoneId', 'actions'];
  dataSource = new MatTableDataSource<UserDTO>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  pendingUsers: any[] = [];
  showPendingTab = false;

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
    private snackBar: MatSnackBar
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
      siteName: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadPendingUsers();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.dataSource.data = users;
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

  confirmApprove(): void {
    if (this.approveForm.invalid) return;
    const { zoneId, siteName } = this.approveForm.value;
    this.userService.approveUser(this.pendingApproveId!, { zoneId, siteName }).subscribe({
      next: () => {
        this.notify('Utilisateur approuvé ✓', 'success');
        this.showApproveDialog = false;
        this.loadPendingUsers();
        this.loadUsers();
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
          this.loadUsers();
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