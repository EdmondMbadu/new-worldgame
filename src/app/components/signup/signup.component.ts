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
  agree: boolean = false;
  solverEvaluator: boolean = false;
  rePassword: string = '';
  goal: string = '';
  createAccountSuccess: boolean = false;
  createAccountPopUp: boolean = false;
  createAccountError: boolean = false;

  // Bot protection fields
  honeypot: string = ''; // Hidden field - bots will fill this
  formLoadTime: number = 0; // Track when form loaded

  ngOnInit(): void {
    window.scroll(0, 0);
    this.formLoadTime = Date.now(); // Record form load time
  }
  constructor(private auth: AuthService, private router: Router) {}

  /**
   * Validates that a name looks like a real human name.
   * Detects gibberish patterns common in bot signups.
   */
  isValidName(name: string): boolean {
    const trimmed = name.trim();

    // Must be at least 2 characters
    if (trimmed.length < 2) return false;

    // Must not be too long (reasonable name limit)
    if (trimmed.length > 50) return false;

    // Check for excessive consecutive consonants (4+ is suspicious)
    const consecutiveConsonants = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/;
    if (consecutiveConsonants.test(trimmed)) return false;

    // Check for excessive uppercase letters (more than 3 uppercase in a row)
    const excessiveUppercase = /[A-Z]{4,}/;
    if (excessiveUppercase.test(trimmed)) return false;

    // Check for mixed case gibberish pattern (alternating case like "aBcDeF")
    const mixedCaseGibberish = /([a-z][A-Z]){3,}|([A-Z][a-z]){3,}[A-Z]/;
    if (mixedCaseGibberish.test(trimmed)) return false;

    // Must contain at least one vowel
    const hasVowel = /[aeiouAEIOU]/;
    if (!hasVowel.test(trimmed)) return false;

    // Check ratio of uppercase to total letters (names shouldn't be mostly uppercase)
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    const uppercaseCount = (letters.match(/[A-Z]/g) || []).length;
    if (letters.length > 3 && uppercaseCount / letters.length > 0.5) return false;

    return true;
  }

  /**
   * Checks if the form was filled too quickly (bot behavior).
   * Humans typically take at least 10 seconds to fill a signup form.
   */
  isFormFilledTooQuickly(): boolean {
    const timeSpent = Date.now() - this.formLoadTime;
    const minimumTimeMs = 5000; // 5 seconds minimum
    return timeSpent < minimumTimeMs;
  }

  createAccount() {
    // Bot detection: honeypot field should be empty
    if (this.honeypot !== '') {
      console.log('Bot detected: honeypot filled');
      // Silently reject - don't alert bots to detection
      this.createAccountError = true;
      return;
    }

    // Bot detection: form filled too quickly
    if (this.isFormFilledTooQuickly()) {
      console.log('Bot detected: form filled too quickly');
      alert('Please take your time filling out the form.');
      return;
    }

    if (
      this.email === '' ||
      this.password === '' ||
      this.firstName === '' ||
      this.lastName === '' ||
      this.rePassword === ''
    ) {
      alert('Fill all the fields');
      return;
    }

    // Validate names aren't gibberish
    if (!this.isValidName(this.firstName)) {
      alert('Please enter a valid first name.');
      return;
    }
    if (!this.isValidName(this.lastName)) {
      alert('Please enter a valid last name.');
      return;
    }

    // Require goal/reason with minimum length
    if (this.goal.trim().length < 20) {
      alert(
        'Please tell us why you want to join (at least 20 characters). This helps us understand our community better.'
      );
      return;
    }

    if (!this.agree || !this.solverEvaluator) {
      alert('You must check both checkbox conditions to proceed.');
      return;
    } else if (this.password !== this.rePassword) {
      alert(' Both Passwords need to match');
      return;
    }
    this.auth.register(
      this.firstName,
      this.lastName,
      this.email,
      this.password,
      this.goal.trim(),
      []
    );
    this.resetFields();
  }
  onCheckboxChangeAgree(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.agree = true;
      console.log('Agree on terms and conditions is checked');
    } else {
      this.agree = false;
      console.log('Agree to be an evaluator is unchecked');
    }
  }
  onCheckboxChangeAgreeEvaluator(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.solverEvaluator = true;
      console.log('CAgree to be an evaluator is checked');
    } else {
      this.solverEvaluator = false;
      console.log('Agree to be an evaluator is unchecked');
    }
  }

  resetFields() {
    this.email = '';
    this.password = '';
    this.rePassword = '';
    this.firstName = '';
    this.lastName = '';
    this.goal = '';
    this.honeypot = '';
  }

  closeAccountCreatedSuccess() {
    this.createAccountSuccess = false;
  }
  closeAccountCreatedError() {
    this.createAccountError = false;
  }
}
