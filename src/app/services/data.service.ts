import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { Avatar, User } from '../models/user';
import { Evaluation } from '../models/solution';

@Injectable({
  providedIn: 'root',
})
export class DataService implements OnInit {
  constructor(private auth: AuthService, private afs: AngularFirestore) {}
  sdgsPaths: { [key: string]: string } = {
    None: '../../../assets/img/global-network.png',
    'SDG1   No Poverty': '../../../assets/img/sdg1.png',
    'SDG2   Zero Hunger': '../../../assets/img/sdg2.png',
    'SDG3   Good Health And Well Being': '../../../assets/img/sdg3.png',
    'SDG4   Quality Education': '../../../assets/img/sdg4.png',
    'SDG5   Gender Equality': '../../../assets/img/sdg5.png',
    'SDG6   Clean Water And Sanitation': '../../../assets/img/sdg6.png',
    'SDG7   Affordable And Clean Energy': '../../../assets/img/sdg7.png',
    'SDG8   Decent Work And Economic Growth': '../../../assets/img/sdg8.png',
    'SDG9   Industry Innovation And Infrastructure':
      '../../../assets/img/sdg9.png',
    'SDG10  Reduced Inequalities': '../../../assets/img/sdg10.png',
    'SDG11  Sustainable Cities And Communities':
      '../../../assets/img/sdg11.png',
    'SDG12  Responsible Consumption And Production':
      '../../../assets/img/sdg12.png',
    'SDG13  Climate Action': '../../../assets/img/sdg13.png',
    'SDG14  Life Below Water': '../../../assets/img/sdg14.png',
    'SDG15  Life And Land': '../../../assets/img/sdg15.png',
    'SDG16  Peace, Justice And Strong Institutions':
      '../../../assets/img/sdg16.png',
    'SDG17  Partnership For ThE Goals': '../../../assets/img/sdg17.png',
  };
  ngOnInit(): void {}

  uploadPictureToCloudStorage(user: User, avatar: Avatar) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${user.uid}`
    );
    const data = {
      profilePicture: avatar,
    };
    return userRef.set(data, { merge: true });
  }
  getAllUsers() {
    return this.afs.collection<User>(`users`).valueChanges();
  }
  mapEvaluationToNumeric(evaluation: Evaluation) {
    if (evaluation) {
      return {
        average: Math.floor(parseFloat(evaluation.average!) * 10),
        achievable: Math.floor(parseFloat(evaluation.achievable!) * 10),
        feasible: parseFloat(evaluation.feasible!) * 10,
        ecological: parseFloat(evaluation.ecological!) * 10,
        economical: parseFloat(evaluation.economical!) * 10,
        equitable: parseFloat(evaluation.equitable!) * 10,
        understandable: parseFloat(evaluation.understandable!) * 10,
      };
    } else {
      return {};
    }
  }

  getColorForValue(value: number): string {
    if (value >= 0 && value <= 60) {
      return 'bg-red-700';
    } else if (value >= 61 && value <= 70) {
      return 'bg-orange-500';
    } else if (value >= 71 && value <= 80) {
      return 'bg-amber-400';
    } else if (value >= 81 && value <= 90) {
      return 'bg-yellow-300';
    } else if (value >= 91 && value <= 100) {
      return 'bg-green-500';
    } else {
      return 'unknown'; // for values outside the range or NaN
    }
  }
  mapEvaluationToColors(evaluation: Evaluation) {
    if (evaluation) {
      return {
        average: this.getColorForValue(parseFloat(evaluation.average!) * 10),
        achievable: this.getColorForValue(
          parseFloat(evaluation.achievable!) * 10
        ),
        feasible: this.getColorForValue(parseFloat(evaluation.feasible!) * 10),
        ecological: this.getColorForValue(
          parseFloat(evaluation.ecological!) * 10
        ),
        economical: this.getColorForValue(
          parseFloat(evaluation.economical!) * 10
        ),
        equitable: this.getColorForValue(
          parseFloat(evaluation.equitable!) * 10
        ),
        understandable: this.getColorForValue(
          parseFloat(evaluation.understandable!) * 10
        ),
      };
    } else {
      return {};
    }
  }

  UnfollowUser() {}
}
