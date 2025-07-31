import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';
import { LoginUser } from './components/login-user/login-user';
import { RegisterUser } from './components/register-user/register-user';
import { TermsAndConditions } from './components/terms-and-conditions/terms-and-conditions';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'home', component: LandingPage },
  { path: 'login', component: LoginUser },
  { path: 'register', component: RegisterUser },
  { path: 'terms', component: TermsAndConditions }
];
