import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiService, City } from '../../services/api.service';

type AddressSuggestion = {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  addrDetails?: any;
};

@Component({
  selector: 'app-create-event',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="center">
      <div class="form-container">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
          <h2 style="margin:0">Create New Event</h2>
          <button class="btn-secondary btn" routerLink="/app/events">Cancel</button>
        </div>

        <div class="card">
          <form (submit)="onSubmit($event)" class="form">
            <label class="field">
              <span class="muted">Event Title *</span>
              <input
                class="input"
                type="text"
                [value]="title()"
                (input)="title.set($any($event.target).value)"
                required
                placeholder="Summer BBQ Party"
              />
            </label>

            <label class="field">
              <span class="muted">Description *</span>
              <textarea
                class="input"
                rows="4"
                [value]="description()"
                (input)="description.set($any($event.target).value)"
                required
                placeholder="Join us for a fun evening..."
                style="resize:vertical;height:auto"
              ></textarea>
            </label>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem">
              <label class="field">
                <span class="muted">Start Date & Time *</span>
                <input
                  class="input"
                  type="datetime-local"
                  [value]="startsAt()"
                  (input)="startsAt.set($any($event.target).value)"
                  required
                />
              </label>

              <label class="field">
                <span class="muted">End Date & Time</span>
                <input
                  class="input"
                  type="datetime-local"
                  [value]="endsAt()"
                  (input)="endsAt.set($any($event.target).value)"
                />
              </label>
            </div>

            <h3 style="margin:1.5rem 0 1rem;font-size:1.125rem;display:flex;align-items:center;gap:.5rem">
              📍 Location
            </h3>

            <!-- City autocomplete (human-friendly) -->
            <label class="field">
              <span class="muted">City *</span>
              <div style="position:relative">
                <input
                  class="input"
                  type="text"
                  [value]="cityQuery()"
                  (input)="onCityInput($any($event.target).value)"
                  (focus)="showCitySuggestions.set(true)"
                  placeholder="Start typing city name..."
                  required
                />
                <input type="hidden" [value]="selectedCity() ? selectedCity()!.id : ''" />
                @if (citySearchLoading()) {
                  <div style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%)">
                    <span class="muted" style="font-size:0.875rem">Searching...</span>
                  </div>
                }
                @if (showCitySuggestions() && citySuggestions().length > 0) {
                  <div class="suggestions-dropdown">
                    @for (c of citySuggestions(); track $index) {
                      <button type="button" class="suggestion-item" (click)="selectCity(c)">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                          <div>
                            <div style="font-weight:500">{{ c.name }}</div>
                            <div class="muted" style="font-size:0.875rem">{{ c.country }}</div>
                          </div>
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>

              @if (selectedCity()) {
                <div style="display:flex;align-items:center;gap:.5rem;margin-top:.5rem">
                  <span style="color:var(--success)">✓</span>
                  <span class="muted" style="font-size:0.875rem">
                    Selected: {{ selectedCity()?.name }} ({{ selectedCity()?.country }})
                  </span>
                  <button type="button" class="btn-text" (click)="clearCity()">Change</button>
                </div>
              }
            </label>

            <!-- Address Search with Geocoding (Nominatim) -->
            <div class="field">
              <span class="muted">Search Address</span>
              <div style="position:relative">
                <input
                  class="input"
                  type="text"
                  [value]="addressSearch()"
                  (input)="onAddressInput($any($event.target).value)"
                  placeholder="Type to search address..."
                  (focus)="showSuggestions.set(true)"
                />
                @if (searchLoading()) {
                  <div style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%)">
                    <span class="muted" style="font-size:0.875rem">Searching...</span>
                  </div>
                }
                @if (showSuggestions() && suggestions().length > 0) {
                  <div class="suggestions-dropdown">
                    @for (suggestion of suggestions(); track $index) {
                      <button
                        type="button"
                        class="suggestion-item"
                        (click)="selectSuggestion(suggestion)"
                      >
                        <span style="font-weight:500">{{ suggestion.name }}</span>
                        @if (suggestion.address) {
                          <span class="muted" style="font-size:0.875rem">{{ suggestion.address }}</span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
              <div style="display:flex;gap:.75rem;margin-top:.5rem">
                <button type="button" class="btn-secondary btn" (click)="useCurrentLocation()" [disabled]="locationLoading()">
                  @if (locationLoading()) {
                    Getting location...
                  } @else {
                    📍 Use My Location
                  }
                </button>
              </div>
            </div>

            @if (coordinatesSet()) {
              <div class="coordinates-preview">
                <div style="display:flex;align-items:center;gap:.5rem">
                  <span style="color:var(--success)">✓</span>
                  <span class="muted" style="font-size:0.875rem">
                    Coordinates: {{ latitude() }}, {{ longitude() }}
                  </span>
                </div>
                <button type="button" class="btn-text" (click)="clearCoordinates()">Clear</button>
              </div>
            }

            <label class="field">
              <span class="muted">Region</span>
              <input
                class="input"
                type="text"
                [value]="region()"
                (input)="region.set($any($event.target).value)"
                placeholder="Downtown"
              />
            </label>

            <div style="display:grid;grid-template-columns:2fr 1fr;gap:1rem">
              <label class="field">
                <span class="muted">Street *</span>
                <input
                  class="input"
                  type="text"
                  [value]="street()"
                  (input)="street.set($any($event.target).value)"
                  required
                  placeholder="123 Main St"
                />
              </label>

              <label class="field">
                <span class="muted">Building # *</span>
                <input
                  class="input"
                  type="text"
                  [value]="buildingNumber()"
                  (input)="buildingNumber.set($any($event.target).value)"
                  required
                  placeholder="12A"
                />
              </label>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <label class="field">
                <span class="muted">Apartment Number</span>
                <input
                  class="input"
                  type="text"
                  [value]="apartmentNumber()"
                  (input)="apartmentNumber.set($any($event.target).value)"
                  placeholder="Apt 5B"
                />
              </label>

              <label class="field">
                <span class="muted">Postal Code</span>
                <input
                  class="input"
                  type="text"
                  [value]="postalCode()"
                  (input)="postalCode.set($any($event.target).value)"
                  placeholder="12345"
                />
              </label>
            </div>

            <label class="field">
              <span class="muted">Notes</span>
              <textarea
                class="input"
                rows="3"
                [value]="notes()"
                (input)="notes.set($any($event.target).value)"
                placeholder="Additional location details..."
                style="resize:vertical;height:auto"
              ></textarea>
            </label>

            @if (error()) {
              <p class="error">{{ error() }}</p>
            }

            <button class="btn" type="submit" [disabled]="loading() || !coordinatesSet() || !selectedCity()">
              @if (loading()) { Creating Event... } @else { Create Event }
            </button>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* (keep your existing styles; unchanged) */
    .form-container { width: 100%; max-width: 700px; }
    .form { display: grid; gap: 1rem; }
    textarea.input { font-family: inherit; padding: 0.75rem; }
    .btn:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
    .suggestions-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px var(--shadow);
      max-height: 300px;
      overflow-y: auto;
      z-index: 10;
    }
    .suggestion-item {
      width: 100%;
      padding: 0.75rem;
      text-align: left;
      border: none;
      background: transparent;
      color: var(--text);
      cursor: pointer;
      transition: background 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .suggestion-item:hover { background: var(--accent); }
    .coordinates-preview { display:flex;justify-content:space-between;align-items:center;padding:0.75rem;background:var(--accent);border-radius:0.5rem; }
    .btn-text { background:none;border:none;color:var(--primary);cursor:pointer;font-size:0.875rem;padding:0.25rem 0.5rem;transition:opacity 0.2s ease; }
    .btn-text:hover { opacity:0.7; }
  `]
})
export class CreateEventComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  // event fields
  readonly title = signal('');
  readonly description = signal('');
  readonly startsAt = signal('');
  readonly endsAt = signal('');

  // city & location fields
  // legacy numeric cityId removed — users pick by name
  readonly cityQuery = signal('');
  readonly citySuggestions = signal<City[]>([]);
  readonly showCitySuggestions = signal(false);
  readonly citySearchLoading = signal(false);
  readonly selectedCity = signal<City | null>(null);

  readonly region = signal('');
  readonly street = signal('');
  readonly buildingNumber = signal('');
  readonly apartmentNumber = signal('');
  readonly postalCode = signal('');
  // store coords as strings or null
  readonly latitude = signal<string | null>(null);
  readonly longitude = signal<string | null>(null);
  readonly notes = signal('');

  // address search (Nominatim)
  readonly addressSearch = signal('');
  readonly suggestions = signal<AddressSuggestion[]>([]);
  readonly showSuggestions = signal(false);
  readonly searchLoading = signal(false);
  readonly locationLoading = signal(false);

  // coordinates computed state
  readonly coordinatesSet = computed(() => {
    const lat = this.latitude();
    const lng = this.longitude();
    return lat !== null && lng !== null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // internal debouncers
  private addressTimeout: any;
  private cityTimeout: any;

  // -------------------------
  // City autocomplete methods
  // -------------------------
  onCityInput(value: string) {
    this.cityQuery.set(value);
    // clear any previously selected city while typing
    if (this.selectedCity()) this.selectedCity.set(null);

    if (this.cityTimeout) clearTimeout(this.cityTimeout);
    if (!value || value.length < 2) {
      this.citySuggestions.set([]);
      return;
    }

    this.cityTimeout = setTimeout(() => this.searchCities(value), 300);
  }

  private async searchCities(q: string) {
    this.citySearchLoading.set(true);
    try {
      const res = await this.api.searchCities(q);
      this.citySuggestions.set(res || []);
      this.showCitySuggestions.set(true);
    } catch (err) {
      console.error('city search error', err);
      this.citySuggestions.set([]);
    } finally {
      this.citySearchLoading.set(false);
    }
  }

  selectCity(c: City) {
    this.selectedCity.set(c);
    // update visible query
    this.cityQuery.set(`${c.name}${c.country ? ', ' + c.country : ''}`);
    this.showCitySuggestions.set(false);
  }

  clearCity() {
    this.selectedCity.set(null);
    this.cityQuery.set('');
    this.citySuggestions.set([]);
  }

  // -------------------------
  // Address search (Nominatim)
  // -------------------------
  onAddressInput(value: string) {
    this.addressSearch.set(value);
    if (this.addressTimeout) clearTimeout(this.addressTimeout);
    if (!value || value.length < 3) {
      this.suggestions.set([]);
      return;
    }
    this.addressTimeout = setTimeout(() => this.searchAddress(value), 400);
  }

  private async searchAddress(query: string) {
    this.searchLoading.set(true);
    try {
      // Nominatim public search. We request addressdetails to parse components.
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });
      if (!res.ok) {
        throw new Error('Address search failed');
      }
      const data = await res.json();
      const mapped: AddressSuggestion[] = (data || []).map((item: any) => {
        const display = item.display_name as string;
        return {
          name: display.split(',')[0] || display,
          address: display,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          addrDetails: item.address
        };
      });
      this.suggestions.set(mapped);
      this.showSuggestions.set(true);
    } catch (err) {
      console.error('address search error', err);
      this.suggestions.set([]);
    } finally {
      this.searchLoading.set(false);
    }
  }

  selectSuggestion(s: AddressSuggestion) {
    this.latitude.set(String(s.lat));
    this.longitude.set(String(s.lng));
    this.showSuggestions.set(false);
    this.addressSearch.set(s.address || s.name);

    // Try to set street / region / postal code from address details if present
    const ad = s.addrDetails || {};
    const road = ad.road || ad.pedestrian || ad.cycleway || ad.footway || '';
    const house = ad.house_number || '';
    const streetVal = [house, road].filter(Boolean).join(' ').trim();
    if (streetVal) this.street.set(streetVal);

    // region: first prefer city / town / village then state
    const regionVal = ad.city || ad.town || ad.village || ad.state || '';
    if (regionVal) this.region.set(regionVal);

    if (ad.postcode) this.postalCode.set(ad.postcode);

    // call backend reverse geocode to find nearest city (your DB)
    this.tryFillCityFromCoordinates(s.lat, s.lng);
  }

  // Use current device location, populate coords and try to reverse geocode address + city
  async useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    this.locationLoading.set(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        this.latitude.set(String(lat));
        this.longitude.set(String(lng));

        // reverse geocode address via Nominatim to fill street/region/postal
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          if (res.ok) {
            const data = await res.json();
            const display = data.display_name || '';
            this.addressSearch.set(display);
            const ad = data.address || {};
            const road = ad.road || ad.pedestrian || ad.cycleway || '';
            const house = ad.house_number || '';
            const streetVal = [house, road].filter(Boolean).join(' ').trim();
            if (streetVal) this.street.set(streetVal);
            const regionVal = ad.city || ad.town || ad.village || ad.state || '';
            if (regionVal) this.region.set(regionVal);
            if (ad.postcode) this.postalCode.set(ad.postcode);
          } else {
            this.addressSearch.set(`Current location: ${lat}, ${lng}`);
          }
        } catch (err) {
          console.warn('reverse geocode failed', err);
          this.addressSearch.set(`Current location: ${lat}, ${lng}`);
        } finally {
          // try to fill city from backend
          await this.tryFillCityFromCoordinates(lat, lng);
          this.locationLoading.set(false);
        }
      },
      (error) => {
        this.locationLoading.set(false);
        alert('Unable to get your location: ' + error.message);
      }
    );
  }

  clearCoordinates() {
    this.latitude.set(null);
    this.longitude.set(null);
    this.addressSearch.set('');
  }

  // -------------------------
  // Reverse geocode using backend to find nearest city
  // -------------------------
  private async tryFillCityFromCoordinates(lat: number, lng: number) {
    try {
      const city = await this.api.reverseGeocode(lat, lng);
      if (city && city.id) {
        this.selectedCity.set(city);
        this.cityQuery.set(`${city.name}${city.country ? ', ' + city.country : ''}`);
      }
    } catch (err) {
      // not fatal — user can choose city manually
      console.warn('backend reverse geocode failed', err);
    }
  }

  // timezone-safe ISO conversion for datetime-local
  private toIsoWithLocalTimezone(value: string): string {
    const d = new Date(value);
    const tzOffsetMs = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffsetMs).toISOString();
  }

  // -------------------------
  // Submit
  // -------------------------
  async onSubmit(event: Event) {
    event.preventDefault();
    this.error.set(null);

    // basic validation
    if (!this.title().trim()) {
      this.error.set('Title is required');
      return;
    }
    if (!this.description().trim()) {
      this.error.set('Description is required');
      return;
    }
    if (!this.startsAt()) {
      this.error.set('Start date/time required');
      return;
    }
    if (!this.coordinatesSet()) {
      this.error.set('Please select an address or use "Use My Location" to set coordinates.');
      return;
    }
    if (!this.selectedCity()) {
      this.error.set('Please pick a city from the city dropdown.');
      return;
    }

    this.loading.set(true);
    try {
      const request = {
        title: this.title(),
        description: this.description(),
        startsAt: this.toIsoWithLocalTimezone(this.startsAt()),
        endsAt: this.endsAt() ? this.toIsoWithLocalTimezone(this.endsAt()) : undefined,
        location: {
          cityId: Number(this.selectedCity()!.id),
          region: this.region() || undefined,
          street: this.street(),
          buildingNumber: this.buildingNumber(),
          apartmentNumber: this.apartmentNumber() || undefined,
          postalCode: this.postalCode() || undefined,
          latitude: Number(this.latitude()),
          longitude: Number(this.longitude()),
          notes: this.notes() || undefined
        }
      };

      const result = await this.api.createEvent(request);
      // navigate to event page
      await this.router.navigate(['/app/events', result.id]);
    } catch (e: any) {
      this.error.set((e && e.message) || 'Failed to create event');
    } finally {
      this.loading.set(false);
    }
  }
}
