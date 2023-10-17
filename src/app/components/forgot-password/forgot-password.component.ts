import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css'],
})
export class ForgotPasswordComponent {
  myForm: FormGroup;
  loading: boolean = false;
  constructor(public auth: AuthService, private fb: FormBuilder) {
    this.myForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  restorePassword() {
    this.auth.forgotPassword(this.myForm.value.email);
  }
  get email() {
    return this.myForm.get('email');
  }
}
