import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LoginComponent } from '../components/login/login.component';
import { SignupComponent } from '../components/signup/signup.component';
import { ForgotPasswordComponent } from '../components/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from '../components/verify-email/verify-email.component';
import { SchoolSignupComponent } from '../components/school-signup/school-signup.component';
import { SchoolSignupFreeComponent } from '../components/school-signup-free/school-signup-free.component';
import { UnSignupFreeComponent } from '../components/un-signup-free/un-signup-free.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'signup-school', component: SchoolSignupComponent },
  { path: 'signup-school-free', component: SchoolSignupFreeComponent },
  { path: 'community-signup', component: SignupComponent },
  { path: 'sign-un-free', component: UnSignupFreeComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
