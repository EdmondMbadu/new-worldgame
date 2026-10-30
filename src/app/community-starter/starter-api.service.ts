import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom, timeout } from 'rxjs';
import { StarterBrief, parseStarterBrief } from '../../../functions/src/shared/starter-brief';
@Injectable({providedIn:'root'})
export class StarterApiService {
  constructor(private functions:AngularFireFunctions) {}
  private call<T>(name:string,input:unknown,wait=25000):Promise<T> {
    return firstValueFrom(this.functions.httpsCallable<unknown,T>(name)(input).pipe(timeout(wait)));
  }
  async generate(answers:Record<string,string>,sessionId:string) {
    const result=await this.call<{brief:unknown}>('generateStarterBrief',{answers,sessionId});
    return parseStarterBrief(result.brief);
  }
  manage(action:'publish'|'revoke'|'status',solutionId:string,brief?:StarterBrief) {
    return this.call<{url:string|null}>('manageStarterBrief',{action,solutionId,...(brief?{brief}:{}),appOrigin:location.origin});
  }
  read(token:string) { return this.call<{brief:StarterBrief;kind:'share'|'invite'}>('getStarterBrief',{token}); }
  team(input:Record<string,unknown>) {
    return this.call<{state?:string;solutionId?:string;requests?:{id:string;email:string}[];invites?:{email:string;state:string}[]}>('manageStarterTeam',{...input,appOrigin:location.origin},45000);
  }
}
