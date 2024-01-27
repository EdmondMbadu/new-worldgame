import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignupComponent implements OnInit {
  email: string = '';
  password: string = '';
  firstName: string = '';
  lastName: string = '';
  rePassword: string = '';
  createAccountSuccess: boolean = false;
  createAccountPopUp: boolean = false;
  createAccountError: boolean = false;
  ngOnInit(): void {
    window.scroll(0, 0);
  }
  constructor(private auth: AuthService, private router: Router) {}
  createAccount() {
    if (
      this.email === '' ||
      this.password === '' ||
      this.firstName === '' ||
      this.lastName === '' ||
      this.rePassword === ''
    ) {
      alert('Fill all the fields');
      return;
    } else if (this.password !== this.rePassword) {
      alert(' Both Passwords need to match');
      return;
    }
    this.auth.register(
      this.firstName,
      this.lastName,
      this.email,
      this.password
    );
    this.resetFields();
  }

  resetFields() {
    this.email = '';
    this.password = '';
    this.rePassword = '';
    this.firstName = '';
    this.lastName = '';
  }

  closeAccountCreatedSuccess() {
    this.createAccountSuccess = false;
  }
  closeAccountCreatedError() {
    this.createAccountError = false;
  }
}
