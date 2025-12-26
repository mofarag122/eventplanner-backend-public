import { Component, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ApiService } from './services/api.service';
import { ThemeService } from './services/theme.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LucideAngularModule],
  template: `
    <header class="site-header">
      <nav class="nav">
        <div class="nav-left">
          <a href="/" style="font-weight:700;font-size:1.125rem">Evoplanner</a>
          @if (token()) {
            <a routerLink="/app">Dashboard</a>
          }
        </div>
        <div class="nav-right">
          <button class="icon-btn" (click)="toggleTheme()" title="Toggle theme">
            @if (isDark()) {
              <lucide-icon name="sun" [size]="20"></lucide-icon>
            } @else {
              <lucide-icon name="moon" [size]="20"></lucide-icon>
            }
          </button>
          @if (token()) {
            <button class="btn-secondary btn" (click)="logout()">
              <lucide-icon name="log-out" [size]="16"></lucide-icon>
              Logout
            </button>
          }
        </div>
      </nav>
    </header>
    <main class="site-main">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.css'
})
export class App {
  private readonly api = inject(ApiService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  
  protected readonly title = signal('frontend');
  protected readonly token = this.api.accessToken;
  protected readonly isDark = this.theme.isDark;

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.api.logout();
    this.router.navigateByUrl('/login');
  }
}