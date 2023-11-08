import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { Avatar, User } from '../models/user';

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
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
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
}
