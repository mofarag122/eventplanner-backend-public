import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, EventSummary } from '../../services/api.service';

@Component({
  selector: 'app-events-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="center">
      <div class="events-container">
        <div class="events-header">
          <h2 style="margin:0">My Events</h2>
          <button class="btn" routerLink="/app/events/new">+ New Event</button>
        </div>

        @if (loading()) {
          <div class="card">
            <p class="muted">Loading events...</p>
          </div>
        } @else if (error()) {
          <div class="card">
            <p class="error">{{ error() }}</p>
          </div>
        } @else if (events().length === 0) {
          <div class="card empty-state">
            <div class="stat-icon">📅</div>
            <h3 style="margin:.5rem 0">No events yet</h3>
            <p class="muted">Create your first event to get started</p>
            <button class="btn" routerLink="/app/events/new" style="margin-top:1rem">
              Create Event
            </button>
          </div>
        } @else {
          <div class="events-grid">
            @for (event of events(); track event.id) {
              <div class="card event-card" (click)="viewEvent(event.id)">
                <div class="event-header">
                  <h3 style="margin:0">{{ event.title }}</h3>
                  @if (event.isOrganizer) {
                    <span class="badge badge-primary">Organizer</span>
                  } @else {
                    <span class="badge">{{ event.myRole }}</span>
                  }
                </div>
                <p class="muted" style="margin-top:.5rem;font-size:0.875rem">
                  {{ formatDate(event.startsAt) }}
                </p>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .events-container {
      width: 100%;
      max-width: 900px;
    }

    .events-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .events-grid {
      display: grid;
      gap: 1rem;
    }

    .event-card {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .event-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px var(--shadow);
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 1rem;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--secondary);
      color: var(--text);
      white-space: nowrap;
    }

    .badge-primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
    }

    .stat-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
  `]
})
export class EventsListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly events = signal<EventSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.loadEvents();
  }

  async loadEvents() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const events = await this.api.listMyEvents();
      this.events.set(events);
    } catch (e) {
      this.error.set((e as Error).message || 'Failed to load events');
    } finally {
      this.loading.set(false);
    }
  }

  viewEvent(eventId: number) {
    this.router.navigate(['/app/events', eventId]);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}