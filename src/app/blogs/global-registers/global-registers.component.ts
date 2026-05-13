import { Component } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { LanguageService } from 'src/app/services/language.service';
import { TimeService } from 'src/app/services/time.service';
import { GlobalRegisterComponent } from '../global-register/global-register.component';

@Component({
  selector: 'app-global-registers',
  templateUrl: './global-registers.component.html',
  styleUrl: './global-registers.component.css',
})
export class GlobalRegistersComponent extends GlobalRegisterComponent {
  constructor(
    auth: AuthService,
    data: DataService,
    router: Router,
    route: ActivatedRoute,
    fns: AngularFireFunctions,
    time: TimeService,
    languageService: LanguageService
  ) {
    super(auth, data, router, route, fns, time, languageService);
  }
}
