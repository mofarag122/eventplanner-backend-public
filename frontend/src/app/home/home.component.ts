import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="center">
      <div class="dashboard">
        <div class="card welcome-card">
          <h2 style="margin:0 0 .5rem">Welcome to Evoplanner</h2>
          <p class="muted">Your intelligent planning assistant</p>
          <div class="health-status">
            @if (health()) {
            <span class="status-indicator" [class.healthy]="health() !== 'down'"></span>
            <span class="muted">Service: {{ health() }}</span>
            } @else {
            <span class="muted">Checking service status…</span>
            }
          </div>
        </div>

        <div class="cards-grid">
          <div class="card stat-card">
            <div class="stat-icon">📋</div>
            <h3 style="margin:0 0 .25rem">Events</h3>
            <p class="muted" style="font-size:0.875rem">Events you're part of</p>
            <p style="font-size:2rem;font-weight:700;margin:.5rem 0 0">{{ eventsCount() }}</p>
          </div>

          <div class="card stat-card">
            <div class="stat-icon">✉️</div>
            <h3 style="margin:0 0 .25rem">Invitations</h3>
            <p class="muted" style="font-size:0.875rem">Pending invitations</p>
            <p style="font-size:2rem;font-weight:700;margin:.5rem 0 0">{{ invitationsCount() }}</p>
          </div>

          <div class="card stat-card">
            <div class="stat-icon">👥</div>
            <h3 style="margin:0 0 .25rem">Organizing</h3>
            <p class="muted" style="font-size:0.875rem">Events you created</p>
            <p style="font-size:2rem;font-weight:700;margin:.5rem 0 0">{{ organizingCount() }}</p>
          </div>
        </div>

        <div class="card">
          <h3 style="margin:0 0 1rem">Quick Actions</h3>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap">
            <button class="btn" routerLink="/app/events/new">+ New Event</button>
            <button class="btn btn-secondary" routerLink="/app/events">View Events</button>
            <button class="btn btn-secondary" routerLink="/app/invitations">
              View Invitations
              @if (invitationsCount() > 0) {
                <span class="notification-badge">{{ invitationsCount() }}</span>
              }
            </button>
          </div>
        </div>

        @if (upcomingEvents().length > 0) {
          <div class="card">
            <h3 style="margin:0 0 1rem">Upcoming Events</h3>
            <div class="events-preview">
              @for (event of upcomingEvents().slice(0, 3); track event.id) {
                <div class="event-preview-item" (click)="viewEvent(event.id)">
                  <div>
                    <p style="margin:0;font-weight:500">{{ event.title }}</p>
                    <p class="muted" style="font-size:0.875rem;margin:.25rem 0 0">
                      {{ formatDate(event.startsAt) }}
                    </p>
                  </div>
                  <span class="badge" [class.badge-primary]="event.isOrganizer">
                    {{ event.isOrganizer ? 'Organizer' : event.myRole }}
                  </span>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
    .dashboard {
      width: 100%;
      max-width: 900px;
      display: grid;
      gap: 1.5rem;
    }
    
    .welcome-card {
      text-align: center;
      padding: 2rem 1.25rem;
    }
    
    .health-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: .5rem;
      margin-top: 1rem;
    }
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--error);
    }
    
    .status-indicator.healthy {
      background: var(--success);
    }
    
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      text-align: center;
    }
    
    .stat-icon {
      font-size: 2.5rem;
      margin-bottom: .75rem;
    }

    .notification-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.375rem;
      border-radius: 1rem;
      background: var(--error);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .events-preview {
      display: grid;
      gap: 0.75rem;
    }

    .event-preview-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--accent);
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .event-preview-item:hover {
      background: var(--accent-hover);
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--secondary);
      color: var(--text);
      text-transform: capitalize;
      white-space: nowrap;
    }

    .badge-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    `,
  ],
})
export class HomeComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly health = signal<string | null>(null);
  readonly token = computed(() => this.api.accessToken());

  readonly events = signal<any[]>([]);
  readonly invitations = signal<any[]>([]);
  readonly eventsCount = computed(() => this.events().length);
  readonly invitationsCount = computed(() => this.invitations().length);
  readonly organizingCount = computed(() => 
    this.events().filter(e => e.isOrganizer).length
  );
  readonly upcomingEvents = computed(() => 
    this.events()
      .filter(e => new Date(e.startsAt) > new Date())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  );

  constructor() {
    this.api
      .healthz()
      .then((h) => this.health.set(h))
      .catch(() => this.health.set('down'));
    
    if (!this.token()) {
      queueMicrotask(() => this.router.navigateByUrl('/login'));
    } else {
      this.loadDashboardData();
    }
  }

  async loadDashboardData() {
    try {
      const [events, invitations] = await Promise.all([
        this.api.listMyEvents(),
        this.api.listInvitations()
      ]);
      this.events.set(events);
      this.invitations.set(invitations);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  }

  viewEvent(eventId: number) {
    this.router.navigate(['/app/events', eventId]);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}