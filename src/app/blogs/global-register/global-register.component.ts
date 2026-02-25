import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-global-register',

  templateUrl: './global-register.component.html',
  styleUrl: './global-register.component.css',
})
export class GlobalRegisterComponent implements OnInit {
  email: string = '';
  firstName: string = '';
  lastName: string = '';
  phone: string = '';
  address: string = '';
  city: string = '';
  stateProvince: string = '';
  postalCode: string = '';
  country: string = '';
  age: number | null = null;
  organization: string = '';
  occupation: string = '';
  whyAttend: string = '';
  focusTopic: string = '';
  readyToSubmit: boolean = false;
  success = false;
  isLoggedIn: boolean = false;
  globalLabData: any[] = [];
  pid: string = '';
  targetGroup: string = 'professional';
  labMode: string = 'inPerson'; // NEW: 'inPerson' or 'online'
  letterOfInvitation: boolean = false; // NEW: visa invitation needed?
  reachOutEmail: string = 'info@newworld-game.org';
  reachOutVisa: string = 'info@1earthgame.org';

  isLoading: boolean = false;

  constructor(
    public auth: AuthService,
    private data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private time: TimeService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
    this.data.getGlobalLab2025Data().subscribe((data: any) => {
      console.log('data', data);
      if (data[0].registrations) {
        this.globalLabData = data[0].registrations;
      }
      this.pid = data[0].id;
      console.log('globalLabData', this.globalLabData);
      console.log('pid', this.pid);
    });
  }
  ngAfterViewInit(): void {
    this.initializeCountdown();
  }

  async submitGlobalLabRegistration() {
    if (this.firstName.trim() === '' || this.lastName.trim() === '') {
      alert('Enter your first and last name.');
      return;
    } else if (!this.data.isValidEmail(this.email)) {
      alert('Enter a valid email.');
      return;
    } else if (
      (this.age === null || this.age <= 17) &&
      this.labMode === 'inPerson'
    ) {
      alert(
        'You should be at least 18 years old to participate to the In Person Lab.'
      );
      return;
    } else if (this.organization.trim() === '') {
      alert('Enter your organization, school, or employer.');
      return;
    } else if (this.phone.trim() === '') {
      alert('Enter your phone number.');
      return;
    } else if (this.address.trim() === '') {
      alert('Enter your address.');
      return;
    } else if (this.city.trim() === '') {
      alert('Enter your city.');
      return;
    } else if (this.stateProvince.trim() === '') {
      alert('Enter your state or province.');
      return;
    }
    // else if (this.postalCode.trim() === '') {
    //   alert('Enter your postal code.');
    //   return;
    // }
    else if (this.country.trim() === '') {
      alert('Enter your country.');
      return;
    } else if (this.occupation.trim() === '') {
      alert('Enter what you do.');
      return;
    } else if (this.whyAttend.trim() === '') {
      alert('Enter why you want to attend the Lab.');
      return;
    } else if (this.focusTopic.trim() === '') {
      alert('Enter a specific topic you want to focus on.');
      return;
    } else if (this.targetGroup.trim() === '') {
      console.log('target group', this.targetGroup);
      alert('Enter your target group. (Professionals, Students, etc.)');
      return;
    } else {
      try {
        this.isLoading = true;
        console.log('target group', this.targetGroup);

        const registrationData = {
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          phone: this.phone,
          address: this.address,
          city: this.city,
          stateProvince: this.stateProvince,
          postalCode: this.postalCode,
          country: this.country,
          age: this.age,
          organization: this.organization,
          occupation: this.occupation,
          whyAttend: this.whyAttend,
          focusTopic: this.focusTopic,
          targetGroup: this.targetGroup,
          labMode: this.labMode, // pass the new field
          letterOfInvitation: this.letterOfInvitation, // pass the new field
          registerDate: this.time.todaysDate(),
          pid: this.pid,
        };

        this.globalLabData.push(registrationData);

        // 2) Call the Cloud Function to create a checkout session
        this.fns
          .httpsCallable('createCheckoutSession')(registrationData)
          .subscribe({
            next: (result: any) => {
              console.log('Got session URL', result.url);
              // 3) Redirect the user to the Stripe Checkout
              window.location.href = result.url;
            },
            error: (err) => {
              console.error('Error creating checkout session:', err);
              // handle error, show user an error message
            },
          });
        // await this.data.globalLabSignUp(this.pid, this.globalLabData);
        console.log('registration data', registrationData);
        this.success = true;

        // this.resetFields();
        // alert('Registration successful! We will contact you soon.');
        // this.router.navigate(['/thank-you']);
      } catch (error) {
        alert(
          'There was an error during the registration process. Please try again.'
        );
        console.log('Error while entering Global Lab registration data', error);
        this.isLoading = false;
      }
    }
  }
  async submitGlobalLabRegistrationWithoutPaying() {
    if (this.firstName.trim() === '' || this.lastName.trim() === '') {
      alert('Enter your first and last name.');
      return;
    } else if (!this.data.isValidEmail(this.email)) {
      alert('Enter a valid email.');
      return;
    } else if (
      (this.age === null || this.age <= 17) &&
      this.labMode === 'inPerson'
    ) {
      alert(
        'You should be at least 18 years old to participate to the In Person Lab.'
      );
      return;
    } else if (this.organization.trim() === '') {
      alert('Enter your organization, school, or employer.');
      return;
    } else if (this.phone.trim() === '') {
      alert('Enter your phone number.');
      return;
    } else if (this.address.trim() === '') {
      alert('Enter your address.');
      return;
    } else if (this.city.trim() === '') {
      alert('Enter your city.');
      return;
    } else if (this.stateProvince.trim() === '') {
      alert('Enter your state or province.');
      return;
    }
    // else if (this.postalCode.trim() === '') {
    //   alert('Enter your postal code.');
    //   return;
    // }
    else if (this.country.trim() === '') {
      alert('Enter your country.');
      return;
    } else if (this.occupation.trim() === '') {
      alert('Enter what you do.');
      return;
    } else if (this.whyAttend.trim() === '') {
      alert('Enter why you want to attend the Lab.');
      return;
    } else if (this.focusTopic.trim() === '') {
      alert('Enter a specific topic you want to focus on.');
      return;
    } else if (this.targetGroup.trim() === '') {
      console.log('target group', this.targetGroup);
      alert('Enter your target group. (Professionals, Students, etc.)');
      return;
    } else {
      try {
        this.isLoading = true;
        console.log('target group', this.targetGroup);

        const registrationData = {
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          phone: this.phone,
          address: this.address,
          city: this.city,
          stateProvince: this.stateProvince,
          postalCode: this.postalCode,
          country: this.country,
          age: this.age,
          organization: this.organization,
          occupation: this.occupation,
          whyAttend: this.whyAttend,
          focusTopic: this.focusTopic,
          targetGroup: this.targetGroup,
          labMode: this.labMode,
          letterOfInvitation: this.letterOfInvitation,
          registerDate: this.time.todaysDate(),
          pid: this.pid,
        };

        this.globalLabData.push(registrationData);

        await this.data.globalLabSignUp(this.pid, this.globalLabData);
        // Then do a separate function call to your cloud function
        this.fns
          .httpsCallable('gslRegistrationEmail')({
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            subject: 'Thanks for registering for GSL 2026 (Pay Later)',
          })
          .subscribe(() => {
            console.log('User email sent');
          });

        // For admins, do the same with `gslAdminNotificationEmail`
        const emails = [
          'mbadungoma@gmail.com',
          // 'enm58@drexel.edu',
          'medard@1earthgame.org',
          'jimwalker@mindpalace.com',
          'newworld@newworld-game.org',
        ];

        emails.forEach((email) => {
          this.fns
            .httpsCallable('gslAdminNotificationEmail')({
              emailAdmin: email, // Dynamically assign the email
              subject: 'New GSL 2026 Registration (Pay Later)',
              ...registrationData, // Ensure this object contains the needed fields
            })
            .subscribe({
              next: () => console.log(`Admin email sent to ${email}`),
              error: (err) =>
                console.error(`Error sending email to ${email}:`, err),
            });
        });

        console.log('registration data', registrationData);
        this.success = true;

        // this.resetFields();
        // alert('Registration successful! We will contact you soon.');
        this.router.navigate(['/thank-you']);
      } catch (error) {
        alert(
          'There was an error during the registration process. Please try again.'
        );
        console.log('Error while entering Global Lab registration data', error);
        this.isLoading = false;
      }
    }
  }
  // Method to figure out the cost
  // UPDATED to factor in labMode
  getPrice(): number {
    if (this.labMode === 'inPerson') {
      // In-person
      if (this.targetGroup === 'professional') return 800;
      if (this.targetGroup === 'student' || this.targetGroup === 'senior')
        return 400;
    } else {
      // Online
      if (this.targetGroup === 'professional') return 250;
      if (this.targetGroup === 'student' || this.targetGroup === 'senior')
        return 200;
    }
    return 0; // fallback
  }
  resetFields() {
    this.email = '';
    this.firstName = '';
    this.lastName = '';
    this.phone = '';
    this.address = '';
    this.city = '';
    this.stateProvince = '';
    this.postalCode = '';
    this.country = '';
    this.age = null;
    this.organization = '';
    this.occupation = '';
    this.whyAttend = '';
    this.focusTopic = '';
    this.readyToSubmit = false;
    this.success = false;
    this.labMode = 'inPerson';
    this.letterOfInvitation = false;

    this.targetGroup = 'professional';
    this.reachOutEmail = 'newworld@newworld-game.org';
  }

  private initializeCountdown(): void {
    const eventDate = new Date('June 15, 2026 12:00:00 EST').getTime();
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');

    function pad(value: number): string {
      return value < 10 ? `0${value}` : `${value}`;
    }

    function updateTimer() {
      const now = new Date().getTime();
      const timeLeft = eventDate - now;

      if (timeLeft < 0) {
        const countdownElement = document.getElementById('countdown');
        countdownElement!.innerHTML = 'The event has started!';
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      if (daysElement && hoursElement && minutesElement && secondsElement) {
        daysElement.innerHTML = pad(days);
        hoursElement.innerHTML = pad(hours);
        minutesElement.innerHTML = pad(minutes);
        secondsElement.innerHTML = pad(seconds);
      }
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }
}
