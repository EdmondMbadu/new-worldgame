import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService implements OnInit {
  constructor(private auth: AuthService, private afs: AngularFirestore) {}

  ngOnInit(): void {}
}
