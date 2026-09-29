import { t } from '../../../../content/last-light-locale';
import { clearAuthReturn, gameAuthReturn } from 'src/app/services/auth-return';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css'],
    standalone: false
})
export class ForgotPasswordComponent {
  readonly tr = t;
  cancelGameReturn() { clearAuthReturn(); this.auth.setRedirectUrl(''); }
  gameReturnUrl = gameAuthReturn();
  resetNotice = '';
  myForm: FormGroup;
  loading: boolean = false;
  constructor(public auth: AuthService, private fb: FormBuilder) {
    this.myForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }
  async restorePassword() {
    if (this.myForm.invalid || this.loading) { this.myForm.markAllAsTouched(); return; }
    this.loading = true;
    try { await this.auth.forgotPassword(this.myForm.value.email); this.resetNotice = 'Reset instructions have been requested. Check your inbox, then return to log in.'; }
    catch { this.resetNotice = 'Unable to send reset instructions. Please try again.'; }
    finally { this.loading = false; }
  }
  get email() {
    return this.myForm.get('email');
  }
}
