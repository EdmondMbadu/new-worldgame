import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TournamentService } from 'src/app/services/tournament.service';

@Component({
  selector: 'app-create-tournament',
  templateUrl: './create-tournament.component.html',
  styleUrl: './create-tournament.component.css',
})
export class CreateTournamentComponent implements OnInit {
  tournamentForm!: FormGroup;
  isLoading = false;
  imageDownloadUrl = '';
  private imagePath = '';

  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService,
    private fb: FormBuilder,
    private storage: AngularFireStorage,
    private cd: ChangeDetectorRef,
    private tourneySvc: TournamentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.tournamentForm = this.fb.group({
      title: ['', Validators.required],
      subtitle: [''],
      instructions: ['', Validators.required],
      prizeAmount: ['', Validators.required],
      prizeOther: [''],
      deadline: ['', Validators.required],
    });
  }
  get title() {
    return this.tournamentForm.get('title')!;
  }
  get instructions() {
    return this.tournamentForm.get('instructions')!;
  }
  get prizeAmount() {
    return this.tournamentForm.get('prizeAmount')!;
  }
  get deadline() {
    return this.tournamentForm.get('deadline')!;
  }

  /** Step 1 – upload cover, store download URL */
  async startUpload(files: FileList | null) {
    const file = files?.item(0);
    if (!file) {
      return;
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type) || file.size > 10_000_000) {
      alert('Unsupported type or file too large (< 10 MB please).');
      return;
    }

    this.imagePath = `tournament_covers/${Date.now()}_${file.name}`;
    const task = await this.storage.upload(this.imagePath, file);
    this.imageDownloadUrl = await task.ref.getDownloadURL();
    this.cd.detectChanges();
  }

  /** Step 2 – create Firestore document */
  async createTournament() {
    if (this.tournamentForm.invalid) {
      return;
    }
    this.isLoading = true;

    const { title, subtitle, instructions, prizeAmount, prizeOther, deadline } =
      this.tournamentForm.value;

    try {
      await this.tourneySvc.createdNewTournament(
        title,
        subtitle,
        instructions,
        this.imageDownloadUrl,
        prizeAmount,
        prizeOther,
        deadline
      );

      // success – reset form, go to join page
      this.tournamentForm.reset();
      this.imageDownloadUrl = '';
      this.router.navigate(['/join-tournament']);
    } catch (err) {
      console.error(err);
      alert('⛔️ Something went wrong – please try again.');
    } finally {
      this.isLoading = false;
    }
  }
}
