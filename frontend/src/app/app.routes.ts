import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login.component';
import { SignupComponent } from './features/auth/signup.component';
import { HomeComponent } from './home/home.component';
import { EventsListComponent } from './features/events/events-list.component';
import { EventDetailsComponent } from './features/events/event-details.component';
import { CreateEventComponent } from './features/events/create-event.component';
import { InvitationsComponent } from './features/invitations/invitations-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'app', component: HomeComponent },
  { path: 'app/events', component: EventsListComponent },
  { path: 'app/events/new', component: CreateEventComponent },
  { path: 'app/events/:id', component: EventDetailsComponent },
  { path: 'app/invitations', component: InvitationsComponent },
  { path: '**', redirectTo: '' }
];
