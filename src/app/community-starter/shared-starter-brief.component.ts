import {CommonModule} from '@angular/common';
import {Component,OnDestroy,OnInit} from '@angular/core';
import {FormsModule,NgForm} from '@angular/forms';
import {ActivatedRoute,Router,RouterModule} from '@angular/router';
import {Subscription} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {User} from '../models/user';
import {StarterApiService} from './starter-api.service';
import {StarterBriefViewComponent} from './starter-brief-view.component';
import {StarterBrief,parseStarterBrief} from '../../../functions/src/shared/starter-brief';
@Component({selector:'app-shared-starter-brief',standalone:true,imports:[CommonModule,FormsModule,RouterModule,StarterBriefViewComponent],templateUrl:'./shared-starter-brief.component.html',styleUrls:['./starter-sharing.css']})
export class SharedStarterBriefComponent implements OnInit,OnDestroy {
  brief:StarterBrief|null=null;
  kind='share';loading=true;busy=false;error='';notice='';joinedId='';user:User|null=null;
  emailSignup=false;account={firstName:'',lastName:'',email:'',password:'',agreed:false};
  private subscription?:Subscription;
  private destroyed=false;
  readonly token:string;
  constructor(private route:ActivatedRoute,private router:Router,public auth:AuthService,private api:StarterApiService){this.token=this.route.snapshot.paramMap.get('token')||'';}
  ngOnInit(){this.subscription=this.auth.user$.subscribe(user=>this.user=user);void this.load();}
  ngOnDestroy(){this.destroyed=true;this.subscription?.unsubscribe();this.account.password='';}
  async load(){this.loading=true;this.error='';try{const result=await this.api.read(this.token);if(!this.destroyed){this.brief=parseStarterBrief(result.brief);this.kind=result.kind;}}catch(error:any){this.error=/not-found/.test(String(error?.code))?'This brief has expired or its owner has turned off the link.':'We couldn’t load the brief yet. Check your connection and try again.';}finally{if(!this.destroyed)this.loading=false;}}
  private returnTo(){const target=`/community-brief/${this.token}`;this.auth.setRedirectUrl(target);try{sessionStorage.setItem('redirectTo',target);}catch{}return target;}
  async google(){if(this.busy)return;this.busy=true;this.error='';this.returnTo();try{await this.auth.signInWithGoogle();}catch{this.error='Sign-in didn’t finish. You can try again or use email.';}finally{if(!this.destroyed)this.busy=false;}}
  login(){void this.router.navigate(['/login'],{queryParams:{redirectTo:this.returnTo()}});}
  async register(form:NgForm){if(this.busy)return;form.control.markAllAsTouched();if(form.invalid||!this.account.firstName.trim()||!this.account.lastName.trim()||!this.account.agreed)return;this.busy=true;this.error='';this.returnTo();try{const result=await this.auth.register(this.account.firstName.trim(),this.account.lastName.trim(),this.account.email.trim(),this.account.password,'Join a community solution and help develop its implementation.',[]);this.emailSignup=false;this.notice=result.status==='recovered-verified'?'Your account exists. Log in to accept this invitation.':'Check your inbox to verify your email, then return to this tab.';}catch{this.error='Account setup did not finish. Try again, or log in if you already have an account.';}finally{this.account.password='';if(!this.destroyed)this.busy=false;}}
  async verify(){if(this.busy)return;this.busy=true;this.error='';try{if(await this.auth.syncEmailVerified()){if(this.user)this.user={...this.user,verified:true};this.notice='Email verified. You can join the solution.';}else this.error='Open the verification link in your inbox, then return here and check again.';}catch{this.error='Verification could not be checked yet. Please retry.';}finally{if(!this.destroyed)this.busy=false;}}
  async join(){if(this.busy||!this.user)return;this.busy=true;this.error='';try{const result=await this.api.team({action:'join',token:this.token});if(result.state==='joined'&&result.solutionId){this.joinedId=result.solutionId;this.notice='You’re on the team. Open the workspace to build the details together.';}else this.notice='Your request has been sent to the owner. Come back to this link to check approval and enter the workspace.';}catch(error:any){this.error=/permission-denied/.test(String(error?.code))?'Use the email address this invitation was sent to.':'Joining didn’t finish. Please retry; an account is never added twice.';}finally{if(!this.destroyed)this.busy=false;}}
  open(){if(this.joinedId)void this.router.navigate(['/playground-steps',this.joinedId]);}
}
