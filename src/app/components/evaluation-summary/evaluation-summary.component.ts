import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Evaluation, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-evaluation-summary',
  templateUrl: './evaluation-summary.component.html',
  styleUrls: ['./evaluation-summary.component.css'],
})
export class EvaluationSummaryComponent {
  id: any = '';
  currentSolution: Solution = {};
  teamMembers: User[] = [];
  evaluationSummary: any = {};
  color: any = {};
  colors: any[] = [];
  evaluations: any[] = [];
  evaluators: User[] = [];
  timeElapsed: string = '';
  evaluatorDictionary: { [key: string]: User } = {};
  commentTimeElapsed: any;
  numberOfcomments: number = 0;
  commentUserNames: any;
  commentUserProfilePicturePath: any;
  private readonly greenPalette: string[] = [
    '#064E3B',
    '#047857',
    '#059669',
    '#10B981',
    '#34D399',
  ];

  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private time: TimeService
  ) {
    window.scroll(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    solution.getSolution(this.id).subscribe((data) => {
      this.currentSolution = data!;

      this.evaluationSummary = this.data.mapEvaluationToNumeric(
        this.currentSolution.evaluationSummary!
      );
      this.color = this.data.mapEvaluationToColors(
        this.currentSolution.evaluationSummary!
      );
      if (this.currentSolution) {
        this.getEvaluators();
        this.mapping();
        // this.getEvaluators().then(() => {
        //   this.mapping();
        // });
      }
    });
  }

  mapping() {
    console.log(' are there evaluators', this.evaluators);
    this.currentSolution!.evaluationDetails!.sort((a: any, b: any) => {
      if (a.evaluatorId < b.evaluatorId) {
        return -1;
      }
      if (a.evaluatorId > b.evaluatorId) {
        return 1;
      }
      return 0;
    });
    if (this.currentSolution.evaluationDetails!) {
      for (let a of this.currentSolution.evaluationDetails!) {
        console.log('here  ai m ', a.evaluator);
        this.colors.push(this.data.mapEvaluationToColors(a));
        this.evaluations.push(this.data.mapEvaluationToNumeric(a));
      }
    }
  }

  getEvaluators() {
    this.evaluators = [];

    if (this.currentSolution.evaluators) {
      let i = 0;
      for (const evaluator of this.currentSolution.evaluators) {
        let email = evaluator.name;
        if (email && evaluator.evaluated === 'true') {
          this.auth.getUserFromEmail(email).subscribe((data) => {
            // Check if the email of the incoming data is already in the teamMembers
            if (
              data &&
              data[0] &&
              !this.evaluators.some((member) => member.email === data[0].email)
            ) {
              this.currentSolution.evaluators![i]!.user! = data[0];
              this.evaluatorDictionary[data[0].uid!] = data[0]; // Store in dictionary
              console.log('here is theh dctionnary', this.evaluatorDictionary);
              this.evaluators.push(data[0]);

              // need to be looked at closely soon.
              this.evaluators.sort((a: any, b: any) => {
                if (a.uid < b.uid) {
                  return -1;
                }
                if (a.uid > b.uid) {
                  return 1;
                }
                return 0;
              });
            }
            i++;
          });
        }
      }
    }
  }

  /**
   * Formats a number to one decimal place
   * @param value - The value to format (can be string or number)
   * @returns Formatted string with one decimal place
   */
  formatToOneDecimal(value: string | number | undefined): string {
    if (value === undefined || value === null) {
      return '0.0';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return '0.0';
    }
    return numValue.toFixed(1);
  }

  /**
   * Gets the first letter of a name (uppercase)
   * @param name - The name to get the initial from
   * @returns The first letter in uppercase, or '?' if name is invalid
   */
  getInitial(name: string | undefined): string {
    if (!name || name.trim().length === 0) {
      return '?';
    }
    return name.trim().charAt(0).toUpperCase();
  }

  /**
   * Returns the best available evaluator display name for index
   */
  getEvaluatorDisplayName(index: number, evaluation: Evaluation): string {
    const evaluatorUser = this.evaluators[index];
    if (evaluatorUser) {
      const fullName = `${evaluatorUser.firstName ?? ''} ${
        evaluatorUser.lastName ?? ''
      }`.trim();
      return fullName || evaluatorUser.email || 'Evaluator';
    }

    if (evaluation?.evaluator) {
      const evaluationName = `${evaluation.evaluator.firstName ?? ''} ${
        evaluation.evaluator.lastName ?? ''
      }`.trim();
      return evaluationName || evaluation.evaluator.email || 'Evaluator';
    }

    const fallbackName = this.currentSolution.evaluators?.[index]?.name;
    if (fallbackName && fallbackName.trim().length > 0) {
      return fallbackName;
    }

    return 'Evaluator';
  }

  /**
   * Generates a consistent green badge color for the user's initial
   * @param name - The name to generate a color for
   * @returns A solid color string
   */
  getInitialColor(name: string | undefined): string {
    if (!name || name.trim().length === 0) {
      return this.greenPalette[0];
    }
    
    const initial = name.trim().charAt(0).toUpperCase();
    const charCode = initial.charCodeAt(0);
    const colorIndex = charCode % this.greenPalette.length;
    return this.greenPalette[colorIndex];
  }
}
