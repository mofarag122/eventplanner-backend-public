import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Invitation } from '../../services/api.service';

@Component({
  selector: 'app-invitations',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="center">
      <div class="invitations-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:.75rem">
          <h2 style="margin:0">My Invitations</h2>
          <button class="btn-secondary btn" routerLink="/app">← Back to Dashboard</button>
        </div>

        @if (loading()) {
          <div class="card">
            <p class="muted">Loading invitations...</p>
          </div>
        } @else if (error()) {
          <div class="card">
            <p class="error">{{ error() }}</p>
            <button class="btn" (click)="loadInvitations()" style="margin-top:1rem">
              Retry
            </button>
          </div>
        } @else if (invitations().length === 0) {
          <div class="card empty-state">
            <div class="stat-icon">✉️</div>
            <h3 style="margin:.5rem 0">No pending invitations</h3>
            <p class="muted">You're all caught up!</p>
            <button class="btn" routerLink="/app/events" style="margin-top:1rem">
              View My Events
            </button>
          </div>
        } @else {
          <div class="invitations-grid">
            @for (invite of invitations(); track invite.invitationId) {
              <div class="card invitation-card">
                <div class="invitation-header">
                  <div>
                    <h3 style="margin:0">{{ invite.eventName }}</h3>
                    <p class="muted" style="font-size:0.875rem;margin-top:.25rem">
                      Invited by {{ invite.inviterName }}
                    </p>
                  </div>
                  <span class="badge" [class.badge-collaborator]="invite.role === 'collaborator'">
                    {{ invite.role }}
                  </span>
                </div>

                <div class="invitation-actions">
                  <button 
                    class="btn btn-accept" 
                    (click)="respond(invite.invitationId, 'going')"
                    [disabled]="respondingId() === invite.invitationId"
                  >
                    ✓ Accept
                  </button>
                  <button 
                    class="btn-secondary btn"
                    (click)="respond(invite.invitationId, 'maybe')"
                    [disabled]="respondingId() === invite.invitationId"
                  >
                    ? Maybe
                  </button>
                  <button 
                    class="btn-secondary btn btn-decline"
                    (click)="respond(invite.invitationId, 'not_going')"
                    [disabled]="respondingId() === invite.invitationId"
                  >
                    ✗ Decline
                  </button>
                </div>

                @if (respondError() && respondingId() === invite.invitationId) {
                  <p class="error" style="margin-top:.75rem;font-size:0.875rem">
                    {{ respondError() }}
                  </p>
                }

                @if (respondingId() === invite.invitationId) {
                  <p class="muted" style="margin-top:.75rem;font-size:0.875rem">
                    Processing your response...
                  </p>
                }
              </div>
            }
          </div>
        }

        @if (successMessage()) {
          <div class="success-banner">
            <span>✓</span>
            <span>{{ successMessage() }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .invitations-container {
      width: 100%;
      max-width: 900px;
    }

    .invitations-grid {
      display: grid;
      gap: 1rem;
    }

    .invitation-card {
      display: grid;
      gap: 1rem;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .invitation-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px var(--shadow);
    }

    .invitation-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 1rem;
    }

    .invitation-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
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

    .badge-collaborator {
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .btn-accept {
      background: var(--success);
      color: white;
    }

    .btn-accept:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-decline:hover:not(:disabled) {
      background: var(--error);
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
    }

    .stat-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .btn:disabled,
    .btn-secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .success-banner {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--success);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn 0.3s ease;
      z-index: 100;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 640px) {
      .success-banner {
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
      }
    }
  `]
})
export class InvitationsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly invitations = signal<Invitation[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly respondingId = signal<number | null>(null);
  readonly respondError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  constructor() {
    this.loadInvitations();
  }

  async loadInvitations() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const invitations = await this.api.listInvitations();
      this.invitations.set(invitations);
    } catch (e) {
      this.error.set((e as Error).message || 'Failed to load invitations');
    } finally {
      this.loading.set(false);
    }
  }

  async respond(invitationId: number, response: 'going' | 'maybe' | 'not_going') {
    this.respondingId.set(invitationId);
    this.respondError.set(null);
    this.successMessage.set(null);

    try {
      await this.api.respondToInvitation(invitationId, response);
      
      // Remove the invitation from the list
      this.invitations.set(
        this.invitations().filter(inv => inv.invitationId !== invitationId)
      );

      // Show success message
      const messages = {
        going: "You've accepted the invitation!",
        maybe: "You've marked yourself as 'Maybe'",
        not_going: "You've declined the invitation"
      };
      this.successMessage.set(messages[response]);

      // Clear success message after 3 seconds
      setTimeout(() => this.successMessage.set(null), 3000);

      // If going, optionally navigate to events after a delay
      if (response === 'going') {
        setTimeout(() => {
          this.router.navigate(['/app/events']);
        }, 2000);
      }
    } catch (e) {
      this.respondError.set((e as Error).message || 'Failed to respond to invitation');
    } finally {
      this.respondingId.set(null);
    }
  }
}