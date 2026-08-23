import { TestBed } from '@angular/core/testing';
import { provideStore } from '@ngrx/store';
import { App } from './app';
import { uiFeatureKey, uiReducer } from './state/ui/ui.state';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideStore({ [uiFeatureKey]: uiReducer })],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should set a data-theme attribute on the document element', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toMatch(/^(dark|light)$/);
  });
});
