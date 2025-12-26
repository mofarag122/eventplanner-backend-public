import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, EventDetails, Guest } from '../../services/api.service';

@Component({
  selector: 'app-event-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="center">
      <div class="event-container">
        @if (loading()) {
          <div class="card">
            <p class="muted">Loading event details...</p>
          </div>
        } @else if (error()) {
          <div class="card">
            <p class="error">{{ error() }}</p>
            <button class="btn" routerLink="/app/events" style="margin-top:1rem">
              Back to Events
            </button>
          </div>
        } @else if (event()) {
          <div class="event-header-actions">
            <button class="btn-secondary btn" routerLink="/app/events">← Back to Events</button>
            <div style="display:flex;gap:.75rem;flex-wrap:wrap">
              @if (isOrganizer()) {
                <button class="btn-secondary btn" (click)="showInviteModal.set(true)">
                  ✉️ Invite User
                </button>
                <button class="btn-secondary btn" (click)="loadGuests()">
                  👥 View Guests
                </button>
                <button class="btn" style="background:var(--error)" (click)="confirmDelete()">
                  🗑️ Delete Event
                </button>
              }
            </div>
          </div>

          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:1rem;flex-wrap:wrap">
              <div>
                <h2 style="margin:0 0 .5rem">{{ event()!.event.title }}</h2>
                @if (myRole()) {
                  <span class="badge" [class.badge-organizer]="myRole() === 'organizer'">
                    {{ myRole() }}
                  </span>
                }
              </div>
            </div>
            <p style="white-space:pre-wrap;margin-top:1rem">{{ event()!.event.description }}</p>
            
            <div class="info-grid">
              <div>
                <span class="muted" style="font-size:0.875rem;font-weight:600">Start Time</span>
                <p style="margin:.25rem 0 0">{{ formatDate(event()!.event.startsAt) }}</p>
              </div>
              @if (event()!.event.endsAt) {
                <div>
                  <span class="muted" style="font-size:0.875rem;font-weight:600">End Time</span>
                  <p style="margin:.25rem 0 0">{{ formatDate(event()!.event.endsAt) }}</p>
                </div>
              }
            </div>
          </div>

          <div class="card">
            <h3 style="margin:0 0 1rem">📍 Location</h3>
            <p style="margin:0">{{ formatLocation(event()!.location) }}</p>
            <p class="muted" style="font-size:0.875rem;margin-top:.5rem">
              Coordinates: {{ event()!.location.latitude }}, {{ event()!.location.longitude }}
            </p>
            @if (event()!.location.notes) {
              <p class="muted" style="font-size:0.875rem;margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border)">
                Note: {{ event()!.location.notes }}
              </p>
            }
          </div>

          <div class="card">
            <h3 style="margin:0 0 1rem">👥 Attendees ({{ event()!.attendees.length }})</h3>
            @if (event()!.attendees.length === 0) {
              <p class="muted">No attendees yet</p>
            } @else {
              <div class="attendees-list">
                @for (attendee of event()!.attendees; track attendee.id) {
                  <div class="attendee-item">
                    <span style="font-weight:500">{{ attendee && attendee.name || attendee.email }}</span>
                    <span class="badge" [class.badge-organizer]="attendee.role === 'organizer'">
                      {{ attendee.role }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Invite Modal -->
          @if (showInviteModal()) {
            <div class="modal-overlay" (click)="showInviteModal.set(false)">
              <div class="modal" (click)="$event.stopPropagation()">
                <h3 style="margin:0 0 .5rem">Invite User to Event</h3>
                <p class="muted" style="font-size:0.875rem;margin-bottom:1rem">
                  Enter the email address of the person you'd like to invite
                </p>
                <form (submit)="sendInvite($event)" class="form">
                  <label class="field">
                    <span class="muted">Email Address</span>
                    <input
                      class="input"
                      type="email"
                      [value]="inviteEmail()"
                      (input)="inviteEmail.set($any($event.target).value)"
                      placeholder="user@example.com"
                      required
                      autofocus
                    />
                  </label>
                  <label class="field">
                    <span class="muted">Role</span>
                    <select class="input" [value]="inviteRole()" (change)="inviteRole.set($any($event.target).value)">
                      <option value="attendee">Attendee</option>
                      <option value="collaborator">Collaborator</option>
                    </select>
                    <p class="muted" style="font-size:0.75rem;margin:.25rem 0 0">
                      Collaborators can help manage the event
                    </p>
                  </label>
                  @if (inviteError()) {
                    <p class="error" style="font-size:0.875rem">{{ inviteError() }}</p>
                  }
                  @if (inviteSuccess()) {
                    <p class="success" style="font-size:0.875rem">{{ inviteSuccess() }}</p>
                  }
                  <div style="display:flex;gap:.75rem;margin-top:.5rem">
                    <button class="btn" type="submit" [disabled]="inviteLoading()">
                      @if (inviteLoading()) { Sending... } @else { Send Invitation }
                    </button>
                    <button class="btn-secondary btn" type="button" (click)="closeInviteModal()">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          }

          <!-- Guests Modal -->
          @if (showGuestsModal()) {
            <div class="modal-overlay" (click)="showGuestsModal.set(false)">
              <div class="modal" (click)="$event.stopPropagation()">
                <h3 style="margin:0 0 .5rem">Guest List & Invitation Status</h3>
                <p class="muted" style="font-size:0.875rem;margin-bottom:1rem">
                  Track who you've invited and their response status
                </p>
                @if (guestsLoading()) {
                  <p class="muted">Loading guest list...</p>
                } @else if (guests().length === 0) {
                  <div style="text-align:center;padding:2rem">
                    <p class="muted">No invitations sent yet</p>
                    <button class="btn" (click)="openInviteFromGuests()" style="margin-top:1rem">
                      Send First Invitation
                    </button>
                  </div>
                } @else {
                  <div class="guests-list">
                    @for (guest of guests(); track guest.id) {
                      <div class="guest-item">
                        <div>
                          <p style="margin:0;font-weight:500">{{ guest.name }}</p>
                          <p class="muted" style="font-size:0.875rem;margin:.25rem 0 0">
                            {{ guest.email }}
                          </p>
                        </div>
                        <div style="text-align:right">
                          <span class="status-badge" 
                                [class.status-going]="guest.status === 'going'"
                                [class.status-maybe]="guest.status === 'maybe'"
                                [class.status-not-going]="guest.status === 'not_going'"
                                [class.status-pending]="guest.status === 'pending'">
                            {{ formatStatus(guest.status) }}
                          </span>
                          <p class="muted" style="font-size:0.75rem;margin:.25rem 0 0">
                            Role: {{ guest.role }}
                          </p>
                        </div>
                      </div>
                    }
                  </div>
                  
                  <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
                    <div class="stats-summary">
                      <div>
                        <span style="color:var(--success);font-weight:600">{{ countByStatus('going') }}</span>
                        <span class="muted" style="font-size:0.875rem"> Going</span>
                      </div>
                      <div>
                        <span style="color:var(--muted);font-weight:600">{{ countByStatus('maybe') }}</span>
                        <span class="muted" style="font-size:0.875rem"> Maybe</span>
                      </div>
                      <div>
                        <span style="color:var(--error);font-weight:600">{{ countByStatus('not_going') }}</span>
                        <span class="muted" style="font-size:0.875rem"> Not Going</span>
                      </div>
                      <div>
                        <span style="font-weight:600">{{ countByStatus('pending') }}</span>
                        <span class="muted" style="font-size:0.875rem"> Pending</span>
                      </div>
                    </div>
                  </div>
                }
                <button class="btn-secondary btn" style="margin-top:1rem;width:100%" (click)="showGuestsModal.set(false)">
                  Close
                </button>
              </div>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .event-container {
      width: 100%;
      max-width: 900px;
      display: grid;
      gap: 1.5rem;
    }

    .event-header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: .75rem;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
    }

    .attendees-list {
      display: grid;
      gap: 0.75rem;
    }

    .attendee-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      background: var(--accent);
      border-radius: 0.5rem;
      transition: background 0.2s ease;
    }

    .attendee-item:hover {
      background: var(--accent-hover);
    }

    .guests-list {
      display: grid;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
      padding: 0.25rem;
    }

    .guest-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: var(--accent);
      border-radius: 0.5rem;
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
      text-transform: capitalize;
    }

    .badge-organizer {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .status-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      white-space: nowrap;
    }

    .status-going {
      background: var(--success);
      color: white;
    }

    .status-maybe {
      background: #f59e0b;
      color: white;
    }

    .status-not-going {
      background: var(--error);
      color: white;
    }

    .status-pending {
      background: var(--secondary);
      color: var(--text);
    }

    .stats-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 1rem;
      text-align: center;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: grid;
      place-items: center;
      z-index: 50;
      padding: 1rem;
      backdrop-filter: blur(4px);
    }

    .modal {
      background: var(--card);
      border-radius: 0.75rem;
      padding: 1.5rem;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .form {
      display: grid;
      gap: 0.9rem;
    }

    @media (max-width: 640px) {
      .event-header-actions {
        flex-direction: column;
        align-items: stretch;
      }
      
      .event-header-actions > div {
        width: 100%;
      }
      
      .event-header-actions button {
        flex: 1;
      }
    }
  `]
})
export class EventDetailsComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly event = signal<EventDetails | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  
  readonly showInviteModal = signal(false);
  readonly inviteEmail = signal('');
  readonly inviteRole = signal<'attendee' | 'collaborator'>('attendee');
  readonly inviteLoading = signal(false);
  readonly inviteError = signal<string | null>(null);
  readonly inviteSuccess = signal<string | null>(null);

  readonly showGuestsModal = signal(false);
  readonly guests = signal<Guest[]>([]);
  readonly guestsLoading = signal(false);

  readonly myRole = computed(() => {
    const evt = this.event();
    if (!evt) return null;
    const me = evt.attendees.find(a => a.role === 'organizer' || a.role === 'collaborator' || a.role === 'attendee');
    return me?.role || null;
  });

  constructor() {
    const eventId = this.route.snapshot.paramMap.get('id');
    if (eventId) {
      this.loadEvent(+eventId);
    }
  }

  isOrganizer(): boolean {
    return this.myRole() === 'organizer';
  }

  async loadEvent(eventId: number) {
    this.loading.set(true);
    this.error.set(null);
    try {
      const event = await this.api.getEventDetails(eventId);
      this.event.set(event);
    } catch (e) {
      this.error.set((e as Error).message || 'Failed to load event');
    } finally {
      this.loading.set(false);
    }
  }

  async sendInvite(e: Event) {
    e.preventDefault();
    const eventId = this.event()?.event.id;
    if (!eventId) return;

    this.inviteLoading.set(true);
    this.inviteError.set(null);
    this.inviteSuccess.set(null);

    try {
      await this.api.inviteUser(eventId, this.inviteEmail(), this.inviteRole());
      this.inviteSuccess.set(`Invitation sent to ${this.inviteEmail()}`);
      
      // Reset form after short delay
      setTimeout(() => {
        this.inviteEmail.set('');
        this.inviteRole.set('attendee');
        this.inviteSuccess.set(null);
      }, 2000);
    } catch (e) {
      this.inviteError.set((e as Error).message || 'Failed to send invite');
    } finally {
      this.inviteLoading.set(false);
    }
  }

  closeInviteModal() {
    this.showInviteModal.set(false);
    this.inviteEmail.set('');
    this.inviteRole.set('attendee');
    this.inviteError.set(null);
    this.inviteSuccess.set(null);
  }

  openInviteFromGuests() {
    this.showGuestsModal.set(false);
    this.showInviteModal.set(true);
  }

  async loadGuests() {
    const eventId = this.event()?.event.id;
    if (!eventId) return;

    this.showGuestsModal.set(true);
    this.guestsLoading.set(true);
    try {
      const guests = await this.api.listEventGuests(eventId);
      this.guests.set(guests);
    } catch (e) {
      console.error('Failed to load guests:', e);
      this.guests.set([]);
    } finally {
      this.guestsLoading.set(false);
    }
  }

  async confirmDelete() {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    const eventId = this.event()?.event.id;
    if (!eventId) return;

    try {
      await this.api.deleteEvent(eventId);
      this.router.navigate(['/app/events']);
    } catch (e) {
      alert((e as Error).message || 'Failed to delete event');
    }
  }

  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
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

  formatLocation(loc: EventDetails['location']): string {
    const parts = [
      loc.street,
      loc.buildingNumber,
      loc.apartmentNumber,
      loc.region,
      loc.postalCode
    ].filter(Boolean);
    return parts.join(', ');
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ');
  }

  countByStatus(status: string): number {
    return this.guests().filter(g => g.status === status).length;
  }
}