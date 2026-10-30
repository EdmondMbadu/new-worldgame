import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StarterBrief } from '../../../functions/src/shared/starter-brief';
@Component({selector:'app-starter-brief-view',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./starter-brief-view.component.html',styleUrls:['./starter-brief-view.component.css']})
export class StarterBriefViewComponent {
  @Input({required:true}) brief!:StarterBrief;
  @Input() editable=false;
  @Input() canAdopt=false;
  @Input() hasFuture=false;
  @Input() hasFirstAction=false;
  @Output() briefChange=new EventEmitter<StarterBrief>();
  @Output() adopt=new EventEmitter<{field:string;text:string}>();
  editing=false;
  update(field:'title'|'summary'|'challenge'|'success'|'firstTest'|'invitation',text:string) {this.briefChange.emit({...this.brief,[field]:text});}
  updateIdea(index:number,field:'title'|'text',text:string) {this.briefChange.emit({...this.brief,approaches:this.brief.approaches.map((idea,i)=>i===index?{...idea,[field]:text}:idea)});}
  updateQuestion(index:number,text:string) {this.briefChange.emit({...this.brief,questions:this.brief.questions.map((value,i)=>i===index?text:value)});}
}
