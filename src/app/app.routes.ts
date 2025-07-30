import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { LoginUser } from './components/login-user/login-user';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'home', component: LandingPage },
  { path: 'login', component: LoginUser }
];
