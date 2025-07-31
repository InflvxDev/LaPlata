import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCartera } from './add-cartera';

describe('AddCartera', () => {
  let component: AddCartera;
  let fixture: ComponentFixture<AddCartera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCartera]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddCartera);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
