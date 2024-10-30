import { WeekDay } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-workshop-register',
  templateUrl: './workshop-register.component.html',
  styleUrl: './workshop-register.component.css'
})
export class WorkshopRegisterComponent implements OnInit{
  ngOnInit(): void {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
  email:string=''
  workshopData:any[]=[]
  firstName:string=''
  lastName:string=''
  readyToSubmit:boolean = false;
  loading:boolean= false;
  wid:string=''
  success=false
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private data:DataService, private router: Router, private fns: AngularFireFunctions) {

    this.data.getWorkshopData().subscribe((data: any) => {
      this.workshopData=data[0].signUps;
      this.wid =data[0].wid
  
    });
  }

  async submitWorkshopRegistration(){
    if(this.firstName==='' || this.lastName===''){
      alert("Enter your first and last name to register for the event.");
      return
    ;
   
    }else if(!this.data.isValidEmail(this.email)){
      alert("Enter a valid email");
      return
    }else{

      try {
        const wData={firstName:this.firstName, lastName:this.lastName, email:this.email};
        this.workshopData.push(wData)
        let workshop = await this.data.workshopSignUp(this.wid, this.workshopData);
        this.sendConfirmationEmail();
        this.router.navigate(['/thank-you']);
        
        
      } catch (error) {
        alert("There was an error during the  registration process. Please tryagain. ")
        return;
      }
    }

  }
  sendConfirmationEmail(){
    const workshopConfirmation = this.fns.httpsCallable(
      'workshopRegistrationEmail'
    );

  
      const emailData = {
        email: this.email,
        subject: `Registration Confirmation.`,
        firstName: this.firstName,
        lastName: this.lastName
      };

      workshopConfirmation(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
  
  }

}
