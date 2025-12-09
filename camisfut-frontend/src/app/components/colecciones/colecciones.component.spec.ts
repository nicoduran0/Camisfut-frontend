import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColeccionesComponent } from './colecciones.component';

describe('ColeccionesComponent', () => {
  let component: ColeccionesComponent;
  let fixture: ComponentFixture<ColeccionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColeccionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ColeccionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
