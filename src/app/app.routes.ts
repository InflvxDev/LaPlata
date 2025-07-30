import { Routes } from '@angular/router';
import { LandingPage } from './components/landing-page/landing-page';

export const routes: Routes = [
  { path: '', component: LandingPage },
  { path: 'home', component: LandingPage }
];
