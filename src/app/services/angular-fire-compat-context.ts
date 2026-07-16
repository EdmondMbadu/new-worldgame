import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';

type AnyMethod = (this: unknown, ...args: any[]) => unknown;

const patched = Symbol('angularFireCompatInjectionContextPatched');

/**
 * AngularFire 20's legacy compat wrappers use inject() in their instance field
 * initializers, while the compat factories still construct those wrappers with
 * `new`. Keep wrapper creation inside the application's injection context until
 * the app can migrate to AngularFire's modular API.
 */
export function initializeAngularFireCompatContext(
  injector: EnvironmentInjector
): () => void {
  return () => {
    patchPrototypeMethod(AngularFirestore.prototype, 'doc', injector);
    patchPrototypeMethod(AngularFirestore.prototype, 'collection', injector);
    patchPrototypeMethod(AngularFirestore.prototype, 'collectionGroup', injector);

    patchPrototypeMethod(
      AngularFirestoreCollection.prototype,
      'doc',
      injector
    );
    patchPrototypeMethod(
      AngularFirestoreDocument.prototype,
      'collection',
      injector
    );
  };
}

function patchMethod(
  target: object,
  methodName: string,
  injector: EnvironmentInjector
): void {
  const mutableTarget = target as Record<PropertyKey, unknown>;
  const marker = `${methodName}:${patched.description}`;
  if (mutableTarget[marker]) {
    return;
  }

  const original = mutableTarget[methodName] as AnyMethod;
  mutableTarget[methodName] = function (this: unknown, ...args: any[]) {
    return runInInjectionContext(injector, () => original.apply(this, args));
  };
  mutableTarget[marker] = true;
}

function patchPrototypeMethod(
  prototype: object,
  methodName: string,
  injector: EnvironmentInjector
): void {
  patchMethod(prototype, methodName, injector);
}
