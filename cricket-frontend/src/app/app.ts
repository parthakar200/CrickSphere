import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { uiFeature } from './state/ui/ui.state';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private store = inject(Store);
  private auth = inject(AuthService);
  private theme = toSignal(this.store.select(uiFeature.selectTheme), { initialValue: 'dark' as const });

  constructor() {
    this.auth.restoreSessionIfPresent();

    // Reflect the NgRx theme state onto the document element so the
    // `[data-theme='light']` CSS custom-property overrides in styles.scss
    // take effect immediately whenever the store value changes.
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });
  }
}
