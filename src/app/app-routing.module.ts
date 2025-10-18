import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { adminCanMatch } from './admin/admin-can-match.guard';
import { playgroundCanMatch } from './playground/playground-can-match.guard';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { authPathsCanMatch } from './auth/auth-paths.can-match';

const routes: Routes = [
  {
    path: '',
    canMatch: [authPathsCanMatch],
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: '',
    loadChildren: () =>
      import('./public/public.module').then((m) => m.PublicModule),
  },
  {
    path: '',
    loadChildren: () =>
      import('./protected/protected.module').then((m) => m.ProtectedModule),
  },
  {
    path: '',
    canMatch: [playgroundCanMatch],
    loadChildren: () =>
      import('./playground/playground.module').then(
        (m) => m.PlaygroundModule
      ),
  },
  {
    path: '',
    canMatch: [adminCanMatch],
    loadChildren: () =>
      import('./admin/admin.module').then((m) => m.AdminModule),
  },

  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      anchorScrolling: 'enabled', //  ← NEW
      scrollPositionRestoration: 'enabled', //  (nice to have)
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
