import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SignupComponent } from '../components/signup/signup.component';
import { ForgotPasswordComponent } from '../components/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from '../components/verify-email/verify-email.component';
import { SchoolSignupComponent } from '../components/school-signup/school-signup.component';
import { UnSignupFreeComponent } from '../components/un-signup-free/un-signup-free.component';
import { CommunitySignupComponent } from '../components/community-signup/community-signup.component';

const routes: Routes = [
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'signup-school', component: SchoolSignupComponent },
  { path: 'signup-school-free', redirectTo: '/create-class', pathMatch: 'full' },
  { path: 'community-signup', component: CommunitySignupComponent },
  { path: 'sign-un-free', component: UnSignupFreeComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
