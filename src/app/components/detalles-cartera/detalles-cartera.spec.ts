import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallesCartera } from './detalles-cartera';

describe('DetallesCartera', () => {
  let component: DetallesCartera;
  let fixture: ComponentFixture<DetallesCartera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallesCartera]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetallesCartera);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
