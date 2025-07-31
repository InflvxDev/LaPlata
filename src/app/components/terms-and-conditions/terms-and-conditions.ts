import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terms-and-conditions',
  standalone: true,
  imports: [RouterLink, CommonModule, MatIconModule],
  templateUrl: './terms-and-conditions.html',
  styleUrl: './terms-and-conditions.css'
})
export class TermsAndConditions {

}
