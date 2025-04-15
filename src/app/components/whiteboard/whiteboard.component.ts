import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-whiteboard',
  templateUrl: './whiteboard.component.html',
  styleUrls: ['./whiteboard.component.css'], // or .scss
})
export class WhiteboardComponent implements OnInit {
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    public auth: AuthService,
    private solutionService: SolutionService,
    private activatedRoute: ActivatedRoute
  ) {}
  private ctx!: CanvasRenderingContext2D;

  // Drawing-related variables
  drawing: boolean = false;
  currentColor: string = '#000000'; // default color black
  brushSize: number = 4; // default brush size
  eraserMode: boolean = false;

  // Track last position
  lastPos = { x: 0, y: 0 };
  solutionId: any = '';
  ngOnInit(): void {
    this.setupCanvas();
    this.solutionId = this.activatedRoute.snapshot.paramMap.get('id');

    // 1) Subscribe to Firestore updates for the board field
    this.solutionService
      .getSolution(this.solutionId)
      .subscribe((solutionData: Solution | undefined) => {
        if (!solutionData) return;

        // If board (base64 image) exists in Firestore, redraw
        if (solutionData.board) {
          this.drawFromBase64(solutionData.board);
        }
      });
  }

  setupCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    // Adjust canvas dimensions (bigger workspace)
    canvas.width = 1200;
    canvas.height = 800;

    // Default line styles
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = this.brushSize;

    // Fill the canvas background with white (important for dark mode pages)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  toggleEraser(): void {
    this.eraserMode = !this.eraserMode;
    if (this.eraserMode) {
      this.ctx.strokeStyle = '#FFFFFF'; // Eraser is white
    } else {
      this.ctx.strokeStyle = this.currentColor;
    }
  }

  changeColor(color: string): void {
    this.currentColor = color;
    if (!this.eraserMode) {
      this.ctx.strokeStyle = this.currentColor;
    }
  }

  changeSize(size: number): void {
    this.brushSize = size;
    this.ctx.lineWidth = this.brushSize;
  }

  startDrawing(event: MouseEvent): void {
    this.drawing = true;
    this.lastPos = this.getMousePos(event);
  }
  // Simple re-draw method that clears the canvas and draws the new image
  drawFromBase64(boardDataUrl: string): void {
    // Create an <img> so we can draw it onto canvas
    const image = new Image();
    image.src = boardDataUrl;
    image.onload = () => {
      // Clear and draw fresh
      this.ctx.clearRect(
        0,
        0,
        this.canvasRef.nativeElement.width,
        this.canvasRef.nativeElement.height
      );
      this.ctx.drawImage(image, 0, 0);
    };
  }
  endDrawing(): void {
    this.drawing = false;
    this.ctx.beginPath(); // reset
    // 2) Once the user finishes a stroke (mouse up), you could push the new board to Firestore
    //    (Alternatively, do this in a debounced way or “every few seconds” to avoid spamming)
    this.saveBoardToFirestore();
  }

  draw(event: MouseEvent): void {
    if (!this.drawing) return;
    const { x, y } = this.getMousePos(event);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.lastPos = { x, y };
  }

  // Get the mouse position relative to the canvas
  getMousePos(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  // Clear the board (fill with white again)
  clearCanvas(): void {
    this.ctx.clearRect(
      0,
      0,
      this.canvasRef.nativeElement.width,
      this.canvasRef.nativeElement.height
    );
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(
      0,
      0,
      this.canvasRef.nativeElement.width,
      this.canvasRef.nativeElement.height
    );
    // If you want to reflect clearing across everyone:
    this.saveBoardToFirestore();
  }
  saveBoardToFirestore(): void {
    const dataURL = this.canvasRef.nativeElement.toDataURL('image/png');
    this.solutionService
      .updateSolutionBoard(this.solutionId, dataURL)
      .catch((err) => console.error('Error updating board in Firestore:', err));
  }

  // Save the canvas as an image
  saveCanvas(): void {
    const dataURL = this.canvasRef.nativeElement.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = 'whiteboard.png';
    downloadLink.click();
  }
  @HostListener('touchstart', ['$event'])
  onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.lastPos = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    this.drawing = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(e: TouchEvent) {
    if (!this.drawing) return;
    const touch = e.touches[0];
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(e: TouchEvent) {
    this.drawing = false;
    this.ctx.beginPath();
  }
}
