import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { GuestGuard } from './core/guards/guest-guard';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { BoardActivity } from './features/board/board-activity/board-activity';
import { BoardMembers } from './features/board/board-members/board-members';
import { Board } from './features/board/board/board';
import { Home } from './features/home/home';
import { Invite } from './features/invite/invite';
import { Landing } from './features/landing/landing';
import { NotFound } from './features/not-found/not-found';
import { Notifications } from './features/notifications/notifications';
import { Profile } from './features/profile/profile';
import { Workspace } from './features/workspace/workspace';

export const routes: Routes = [
  {
    path: '',
    component: Landing,
    canActivate: [GuestGuard],
    data: { title: 'TaskFlow | Organizuj rad bez haosa' },
  },
  {
    path: 'login',
    component: Login,
    canActivate: [GuestGuard],
    data: { title: 'Prijava | TaskFlow' },
  },
  {
    path: 'register',
    component: Register,
    canActivate: [GuestGuard],
    data: { title: 'Registracija | TaskFlow' },
  },
  { path: 'invite/:token', component: Invite, data: { title: 'Pozivnica | TaskFlow' } },
  { path: 'invites/:token', component: Invite, data: { title: 'Pozivnica | TaskFlow' } },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'home', component: Home, data: { title: 'Početna | TaskFlow' } },
      { path: 'w/:workspaceId', component: Workspace, data: { title: 'Workspace | TaskFlow' } },
      { path: 'b/:boardId', component: Board, data: { title: 'Board | TaskFlow' } },
      { path: 'b/:boardId/members', component: BoardMembers, data: { title: 'Članovi boarda | TaskFlow' } },
      { path: 'b/:boardId/activity', component: BoardActivity, data: { title: 'Aktivnost boarda | TaskFlow' } },
      { path: 'notifications', component: Notifications, data: { title: 'Notifikacije | TaskFlow' } },
      { path: 'profile', component: Profile, data: { title: 'Profil | TaskFlow' } },
    ],
  },
  { path: '**', component: NotFound, data: { title: 'Stranica nije pronadjena | TaskFlow' } },
];
