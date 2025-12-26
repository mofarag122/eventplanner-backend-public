import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-signup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="center">
      <div class="card auth-card">
        <h2>Sign up</h2>
        <p class="muted" style="margin-top:.25rem;font-size:0.875rem">
          Create your Evoplanner account
        </p>
        <form (submit)="onSubmit($event)" class="form">
          <label class="field">
            <span class="muted">Email</span>
            <input
              class="input"
              type="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              required
            />
          </label>
          <label class="field">
            <span class="muted">Password</span>
            <input
              class="input"
              type="password"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
              required
            />
          </label>
          <button class="btn" type="submit" [disabled]="loading()">
            @if (loading()) { Creating account… } @else { Create account }
          </button>
        </form>
        @if (error()) {
        <p class="error">{{ error() }}</p>
        }
        <p class="muted">Already have an account? <a routerLink="/login">Login</a></p>
      </div>
    </section>
  `,
  styles: [
    `
      h2 {
        margin: 0 0 0.5rem;
      }
      .auth-card {
        width: 100%;
        max-width: 420px;
      }
      .form {
        display: grid;
        gap: 0.9rem;
        margin: 1rem 0;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class SignupComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly password = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  async onSubmit(event: Event) {
    event.preventDefault();
    this.error.set(null);
    this.loading.set(true);
    try {
      await this.api.signup(this.email(), this.password());
      // Auto-login after successful signup
      await this.api.login(this.email(), this.password());
      await this.router.navigateByUrl('/app');
    } catch (e) {
      this.error.set((e as Error).message || 'Signup failed');
    } finally {
      this.loading.set(false);
    }
  }
}
