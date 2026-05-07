import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { RoleGuard } from './guards/role.guard';
import { AdminDashboardComponent } from './dashboard/admin-dashboard/admin-dashboard.component';
import { authGuard } from './guards/auth.guard';
import { EnergyDashboardComponent } from './energy/components/energy-dashboard/energy-dashboard.component';
import { ZoneDashboardComponent } from './energy/user/zone-dashboard/zone-dashboard.component';
import { userGuard } from './guards/user.guard';
import { EnergyHistoryComponent } from './energy/components/energy-history/energy-history.component';

export const routes: Routes = [
    {path:'', redirectTo: 'login', pathMatch: 'full'},
    {path: 'login', component:LoginComponent},
    {path: 'register', component: RegisterComponent},
    {
      path: 'admin-dashboard',
      component: AdminDashboardComponent,
      canActivate: [authGuard, RoleGuard],
      children: [
        { path: 'consommation', component: EnergyDashboardComponent },
        { path: 'energy-history', component: EnergyHistoryComponent },
        { path: 'energy-dashboard', redirectTo: 'consommation' }
      ]
    },
    { path: 'zone-dashboard', component: ZoneDashboardComponent, canActivate: [authGuard, userGuard] },
    {path:'**', redirectTo: 'login'}
];