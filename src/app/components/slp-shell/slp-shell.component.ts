import { Component, Input } from '@angular/core';
import {
  SlpLane,
  SlpNavItem,
  SlpShellViewModel,
} from 'src/app/services/slp-context.service';

@Component({
  selector: 'app-slp-shell',
  templateUrl: './slp-shell.component.html',
  styleUrls: ['./slp-shell.component.css'],
})
export class SlpShellComponent {
  @Input() activeLane: SlpLane = 'publish';
  @Input() shell!: SlpShellViewModel;

  isActive(item: SlpNavItem): boolean {
    return item.lane === this.activeLane;
  }

  get avatarInitials(): string {
    const source = this.shell?.solutionTitle?.trim() || 'SLP';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  }
}
