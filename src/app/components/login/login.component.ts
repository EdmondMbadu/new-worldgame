import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import { of } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  myForm: FormGroup;
  loading: boolean = false;
  ngOnInit() {
    window.scroll(0, 0);
    this.auth.logingError = of(null);
  }

  constructor(public auth: AuthService, private fb: FormBuilder) {
    this.myForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  SignIn() {
    this.loading = true;
    this.auth.SignIn(this.myForm.value.email, this.myForm.value.password);
  }

  get email() {
    return this.myForm.get('email');
  }
  get password() {
    return this.myForm.get('password');
  }
}
