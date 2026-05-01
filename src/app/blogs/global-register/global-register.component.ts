import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LanguageService } from 'src/app/services/language.service';
import { TimeService } from 'src/app/services/time.service';
import {
  GLOBAL_REGISTER_CONTENT,
  GlobalRegisterContent,
  RegisterBenefit,
  RegisterTargetGroupOption,
} from './global-register.content';

@Component({
  selector: 'app-global-register',

  templateUrl: './global-register.component.html',
  styleUrl: './global-register.component.css',
})
export class GlobalRegisterComponent implements OnInit, OnDestroy {
  isDrexelOnly: boolean = false;
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
  heardAboutUs: string = '';
  heardAboutUsOther: string = '';
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
  currentLanguage: 'en' | 'fr' = 'en';
  private readonly destroy$ = new Subject<void>();
  private countdownIntervalId?: ReturnType<typeof setInterval>;

  constructor(
    public auth: AuthService,
    private data: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private fns: AngularFireFunctions,
    private time: TimeService,
    private readonly languageService: LanguageService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.currentLanguage = this.resolveLanguage(this.languageService.currentLanguage);
    this.languageService.languageChanges$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ lang }) => {
        this.currentLanguage = this.resolveLanguage(lang);
      });
    this.isDrexelOnly = !!this.route.snapshot.data['drexelOnly'];
    if (this.isDrexelOnly) {
      this.targetGroup = 'drexelStudent';
    }
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

  ngOnDestroy(): void {
    if (this.countdownIntervalId) {
      clearInterval(this.countdownIntervalId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get copy(): GlobalRegisterContent {
    return GLOBAL_REGISTER_CONTENT[this.currentLanguage];
  }

  get modeCopy() {
    return this.labMode === 'online' ? this.copy.online : this.copy.inPerson;
  }

  get formTitle(): string {
    if (this.labMode === 'online') {
      return this.isDrexelOnly
        ? this.copy.online.drexelFormTitle
        : this.copy.online.formTitle;
    }

    return this.isDrexelOnly
      ? this.copy.inPerson.drexelFormTitle
      : this.copy.inPerson.formTitle;
  }

  get tuitionTitle(): string {
    if (this.labMode === 'online') {
      return this.isDrexelOnly
        ? this.copy.online.drexelTuitionTitle
        : this.copy.online.tuitionTitle;
    }

    return this.isDrexelOnly
      ? this.copy.inPerson.drexelTuitionTitle
      : this.copy.inPerson.tuitionTitle;
  }

  get targetGroupOptions(): RegisterTargetGroupOption[] {
    return this.labMode === 'online'
      ? this.copy.form.onlineTargetGroupOptions
      : this.copy.form.inPersonTargetGroupOptions;
  }

  get registrationSteps(): string[] {
    if (this.labMode !== 'online') {
      return [];
    }

    if (!this.isDrexelOnly) {
      return this.copy.online.steps;
    }

    return [
      this.copy.online.steps[0],
      this.currentLanguage === 'fr'
        ? 'Nous vous enverrons une confirmation après votre inscription.'
        : 'We will send you a confirmation after you register.',
      this.copy.online.steps[2],
    ];
  }

  get benefits(): RegisterBenefit[] {
    if (!this.isDrexelOnly) {
      return this.copy.benefits.items;
    }

    return this.copy.benefits.items.map((item, index) => {
      if (index === 3) {
        return {
          ...item,
          description:
            this.currentLanguage === 'fr'
              ? 'Apprenez à utiliser l’IA pour le bien commun, à mobiliser des IA avancées et des jeux de données mondiaux pour développer de vraies stratégies évolutives alignées avec vos valeurs et les objectifs de développement durable de l’ONU.'
              : 'Learn to harness AI for good, use advanced AIs and global datasets to develop real, scalable strategies aligned with your values and the UN Sustainable Development Goals.',
        };
      }

      if (index === 4) {
        return {
          ...item,
          description:
            this.currentLanguage === 'fr'
              ? 'Travaillez aux côtés de professionnels, de chercheurs, d’autres étudiants et d’experts internationaux qui vous apporteront des conseils précieux et des retours pour faire avancer vos idées.'
              : 'Work alongside professionals, researchers, other students, and global experts who will provide valuable guidance and review to shape your ideas.',
        };
      }

      if (index === 5) {
        return {
          ...item,
          title:
            this.currentLanguage === 'fr'
              ? 'Visibilité dans le tournoi et prix'
              : 'Tournament Visibility & Awards',
          description:
            this.currentLanguage === 'fr'
              ? 'Soumettez votre projet au tournoi NewWorld, où les solutions gagnantes obtiennent de la visibilité et parfois des prix qui aident à concrétiser votre idée.'
              : 'Submit your project to the NewWorld Tournament where winning solutions gain visibility and possible awards that help bring your idea to life.',
        };
      }

      return item;
    });
  }

  async submitGlobalLabRegistration() {
    if (this.firstName.trim() === '' || this.lastName.trim() === '') {
      alert(this.copy.alerts.firstLastName);
      return;
    } else if (!this.data.isValidEmail(this.email)) {
      alert(this.copy.alerts.invalidEmail);
      return;
    } else if (
      (this.age === null || this.age <= 17) &&
      this.labMode === 'inPerson'
    ) {
      alert(this.copy.alerts.ageInPerson);
      return;
    } else if (this.organization.trim() === '') {
      alert(this.copy.alerts.organization);
      return;
    } else if (this.phone.trim() === '') {
      alert(this.copy.alerts.phone);
      return;
    } else if (this.address.trim() === '') {
      alert(this.copy.alerts.address);
      return;
    } else if (this.city.trim() === '') {
      alert(this.copy.alerts.city);
      return;
    } else if (this.stateProvince.trim() === '') {
      alert(this.copy.alerts.stateProvince);
      return;
    }
    // else if (this.postalCode.trim() === '') {
    //   alert('Enter your postal code.');
    //   return;
    // }
    else if (this.country.trim() === '') {
      alert(this.copy.alerts.country);
      return;
    } else if (this.occupation.trim() === '') {
      alert(this.copy.alerts.occupation);
      return;
    } else if (this.whyAttend.trim() === '') {
      alert(this.copy.alerts.whyAttend);
      return;
    } else if (this.focusTopic.trim() === '') {
      alert(this.copy.alerts.focusTopic);
      return;
    } else if (this.targetGroup.trim() === '') {
      console.log('target group', this.targetGroup);
      alert(this.copy.alerts.targetGroup);
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
          heardAboutUs: this.heardAboutUs,
          heardAboutUsOther:
            this.heardAboutUs === 'other' ? this.heardAboutUsOther.trim() : '',
          targetGroup: this.getRegistrationTargetGroup(),
          labMode: this.labMode, // pass the new field
          letterOfInvitation: this.letterOfInvitation, // pass the new field
          registerDate: this.time.todaysDate(),
          pid: this.pid,
          registrationType: this.isDrexelOnly ? 'drexel' : 'standard',
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
        alert(this.copy.alerts.submissionError);
        console.log('Error while entering Global Lab registration data', error);
        this.isLoading = false;
      }
    }
  }
  async submitGlobalLabRegistrationWithoutPaying() {
    if (this.firstName.trim() === '' || this.lastName.trim() === '') {
      alert(this.copy.alerts.firstLastName);
      return;
    } else if (!this.data.isValidEmail(this.email)) {
      alert(this.copy.alerts.invalidEmail);
      return;
    } else if (
      (this.age === null || this.age <= 17) &&
      this.labMode === 'inPerson'
    ) {
      alert(this.copy.alerts.ageInPerson);
      return;
    } else if (this.organization.trim() === '') {
      alert(this.copy.alerts.organization);
      return;
    } else if (this.phone.trim() === '') {
      alert(this.copy.alerts.phone);
      return;
    } else if (this.address.trim() === '') {
      alert(this.copy.alerts.address);
      return;
    } else if (this.city.trim() === '') {
      alert(this.copy.alerts.city);
      return;
    } else if (this.stateProvince.trim() === '') {
      alert(this.copy.alerts.stateProvince);
      return;
    }
    // else if (this.postalCode.trim() === '') {
    //   alert('Enter your postal code.');
    //   return;
    // }
    else if (this.country.trim() === '') {
      alert(this.copy.alerts.country);
      return;
    } else if (this.occupation.trim() === '') {
      alert(this.copy.alerts.occupation);
      return;
    } else if (this.whyAttend.trim() === '') {
      alert(this.copy.alerts.whyAttend);
      return;
    } else if (this.focusTopic.trim() === '') {
      alert(this.copy.alerts.focusTopic);
      return;
    } else if (this.targetGroup.trim() === '') {
      console.log('target group', this.targetGroup);
      alert(this.copy.alerts.targetGroup);
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
          heardAboutUs: this.heardAboutUs,
          heardAboutUsOther:
            this.heardAboutUs === 'other' ? this.heardAboutUsOther.trim() : '',
          targetGroup: this.getRegistrationTargetGroup(),
          labMode: this.labMode,
          letterOfInvitation: this.letterOfInvitation,
          registerDate: this.time.todaysDate(),
          pid: this.pid,
          registrationType: this.isDrexelOnly ? 'drexel' : 'standard',
        };

        this.globalLabData.push(registrationData);

        await this.data.globalLabSignUp(this.pid, this.globalLabData);
        // Then do a separate function call to your cloud function
        this.fns
          .httpsCallable('gslRegistrationEmail')({
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            subject: 'Thanks for registering for the Global Solutions Lab 2026',
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
              subject: this.isDrexelOnly
                ? 'New GSL 2026 Drexel Registration'
                : 'New GSL 2026 Registration (Pay Later)',
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
        alert(this.copy.alerts.submissionError);
        console.log('Error while entering Global Lab registration data', error);
        this.isLoading = false;
      }
    }
  }
  // Method to figure out the cost
  // UPDATED to factor in labMode
  getPrice(): number {
    if (this.isDrexelOnly) {
      return 0;
    }
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
    this.heardAboutUs = '';
    this.heardAboutUsOther = '';
    this.readyToSubmit = false;
    this.success = false;
    this.labMode = 'inPerson';
    this.letterOfInvitation = false;

    this.targetGroup = this.isDrexelOnly ? 'drexelStudent' : 'professional';
    this.reachOutEmail = 'newworld@newworld-game.org';
  }

  getRegistrationTargetGroup(): string {
    return this.isDrexelOnly ? 'drexelStudent' : this.targetGroup;
  }

  formatScholarshipNote(template: string): string {
    return template.replace('{email}', this.reachOutEmail);
  }

  formatTeamDiscountNotice(template: string): string {
    return template.replace('{email}', this.reachOutEmail);
  }

  formatPayAndRegisterLabel(price: number): string {
    return this.copy.form.payAndRegisterLabel.replace('{price}', `$${price}`);
  }

  onHeardAboutUsChange(value: string): void {
    this.heardAboutUs = value;
    if (value !== 'other') {
      this.heardAboutUsOther = '';
    }
  }

  private initializeCountdown(): void {
    const eventDate = new Date('June 15, 2026 12:00:00 EST').getTime();
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');

    const pad = (value: number): string => {
      return value < 10 ? `0${value}` : `${value}`;
    };

    const updateTimer = () => {
      const now = new Date().getTime();
      const timeLeft = eventDate - now;

      if (timeLeft < 0) {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
          countdownElement.innerHTML = this.copy.countdown.started;
        }
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
    };

    updateTimer();
    this.countdownIntervalId = setInterval(updateTimer, 1000);
  }

  private resolveLanguage(language: string): 'en' | 'fr' {
    return language === 'fr' ? 'fr' : 'en';
  }
}
