import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  HostListener,
} from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-whiteboard',
  templateUrl: './whiteboard.component.html',
  styleUrls: ['./whiteboard.component.css'], // or .scss
})
export class WhiteboardComponent implements OnInit {
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(public auth: AuthService) {}
  private ctx!: CanvasRenderingContext2D;

  // Drawing-related variables
  drawing: boolean = false;
  currentColor: string = '#000000'; // default color black
  brushSize: number = 4; // default brush size
  eraserMode: boolean = false;

  // Track last position
  lastPos = { x: 0, y: 0 };

  ngOnInit(): void {
    this.setupCanvas();
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

  endDrawing(): void {
    this.drawing = false;
    this.ctx.beginPath(); // reset
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
