import { Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment.development';

type LoginResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type City = {
  id: number;
  name: string;
  country?: string;
};

export type EventLocation = {
  id?: number;
  cityId: number;
  region?: string;
  street: string;
  buildingNumber: string;
  apartmentNumber?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  notes?: string;
};

export type CreateEventRequest = {
  title: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  location: Omit<EventLocation, 'id'>;
};

export type EventSummary = {
  id: number;
  title: string;
  startsAt: string;
  myRole: string;
  isOrganizer: boolean;
};

export type EventDetails = {
  event: {
    id: number;
    title: string;
    description: string;
    startsAt: string;
    endsAt?: string;
    locationId: number;
    organizerId: number;
  };
  location: EventLocation & { id: number };
  attendees: Array<{
email: string;
    id: number;
    name: string;
    role: 'organizer' | 'collaborator' | 'attendee';
  }>;
};

export type Invitation = {
  invitationId: number;
  eventId: number;
  eventName: string;
  inviterName: string;
  role: 'collaborator' | 'attendee';
};

export type Guest = {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'going' | 'maybe' | 'not_going';
  role: 'collaborator' | 'attendee';
};

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly apiBase = environment.apiUrl;
  readonly accessToken = signal<string | null>(this.getStoredToken());

  constructor() {
    const stored = this.getStoredToken();
    if (stored) {
      this.accessToken.set(stored);
    }
  }

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private storeToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.accessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  logout(): void {
    this.accessToken.set(null);
    localStorage.removeItem('access_token');
  }

  // Health Check
  async healthz(): Promise<string> {
    const res = await fetch('http://localhost:8080/healthz');
    if (!res.ok) throw new Error('Health check failed');
    return await res.text();
  }

  // Authentication
  async signup(email: string, password: string): Promise<{ id: number; email: string }> {
    const res = await fetch(`${this.apiBase}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${this.apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    const data = (await res.json()) as LoginResponse;
    this.accessToken.set(data.access_token);
    this.storeToken(data.access_token);
    return data;
  }

  // Cities & Location
  async searchCities(query: string): Promise<City[]> {
    const url = `${this.apiBase}/cities?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  async reverseGeocode(lat: number, lng: number): Promise<City> {
    const url = `${this.apiBase}/cities/reverse?lat=${lat}&lng=${lng}`;
    const res = await fetch(url, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  // Event Management
  async createEvent(request: CreateEventRequest): Promise<{ id: number; message: string }> {
    const res = await fetch(`${this.apiBase}/events`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  async listMyEvents(): Promise<EventSummary[]> {
    const res = await fetch(`${this.apiBase}/events`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  async getEventDetails(eventId: number): Promise<EventDetails> {
    const res = await fetch(`${this.apiBase}/events/${eventId}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  async deleteEvent(eventId: number): Promise<void> {
    const res = await fetch(`${this.apiBase}/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
  }

  // Invitations - Organizer Side
  async inviteUser(
    eventId: number, 
    email: string, 
    role: 'collaborator' | 'attendee'
  ): Promise<void> {
    const res = await fetch(`${this.apiBase}/events/${eventId}/invite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email, role })
    });
    if (!res.ok) throw new Error(await this.extractError(res));
  }

  async listEventGuests(eventId: number): Promise<Guest[]> {
    const res = await fetch(`${this.apiBase}/events/${eventId}/guests`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  // Invitations - Invitee Side
  async listInvitations(): Promise<Invitation[]> {
    const res = await fetch(`${this.apiBase}/invitations`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error(await this.extractError(res));
    return await res.json();
  }

  async respondToInvitation(
    invitationId: number,
    response: 'going' | 'maybe' | 'not_going'
  ): Promise<void> {
    const res = await fetch(`${this.apiBase}/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ response })
    });
    if (!res.ok) throw new Error(await this.extractError(res));
  }

  // Error Handling
  private async extractError(res: Response): Promise<string> {
    try {
      const data = await res.json();
      return (data && (data.message || data.error)) || res.statusText;
    } catch {
      return res.statusText;
    }
  }
}