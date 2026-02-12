import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AuthRoutingModule } from './auth-routing.module';
import { SharedModule } from '../shared/shared.module';

import { LoginComponent } from '../components/login/login.component';
import { SignupComponent } from '../components/signup/signup.component';
import { ForgotPasswordComponent } from '../components/forgot-password/forgot-password.component';
import { VerifyEmailComponent } from '../components/verify-email/verify-email.component';
import { SchoolSignupComponent } from '../components/school-signup/school-signup.component';
import { SchoolSignupFreeComponent } from '../components/school-signup-free/school-signup-free.component';
import { UnSignupFreeComponent } from '../components/un-signup-free/un-signup-free.component';
import { CommunitySignupComponent } from '../components/community-signup/community-signup.component';

@NgModule({
  declarations: [
    LoginComponent,
    SignupComponent,
    ForgotPasswordComponent,
    VerifyEmailComponent,
    SchoolSignupComponent,
    SchoolSignupFreeComponent,
    CommunitySignupComponent,
    UnSignupFreeComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SharedModule,
    AuthRoutingModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AuthModule {}
