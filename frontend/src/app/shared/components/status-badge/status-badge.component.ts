import { Component, Input } from '@angular/core';
import { IssueStatus, STATUS_LABELS } from '../../../core/models/issue.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span class="cp-status" [style.--status-color]="'var(--cp-status-' + status + ')'">{{ label }}</span>`,
  styles: [
    `
      .cp-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--status-color);
        background: color-mix(in srgb, var(--status-color) 16%, transparent);
      }
      .cp-status::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--status-color);
      }
    `,
  ],
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: IssueStatus;

  get label(): string {
    return STATUS_LABELS[this.status] ?? this.status;
  }
}
