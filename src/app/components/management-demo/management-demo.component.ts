import { Component, OnInit } from '@angular/core';
import {
  DemoBooking,
  GslPrepEmailTemplate,
} from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';

interface BookingEditDraft {
  id: string;
  name: string;
  email: string;
  teamName: string;
  demoDate: string;
  demoTime: string;
  demoStartTime: string;
  notes: string;
}

@Component({
  selector: 'app-management-demo',
  templateUrl: './management-demo.component.html',
  styleUrl: './management-demo.component.css',
})
export class ManagementDemoComponent implements OnInit {
  readonly defaultGslPrepEmailTemplate: GslPrepEmailTemplate = {
    subject:
      'Global Solutions Lab 2026 final presentation prep - {{date}} {{time}} ET',
    eyebrow: 'Global Solutions Lab 2026',
    headline: 'Final Presentation Prep Meeting',
    subhead:
      'A focused team meeting with Medard Gabel before the final presentations on Wednesday, June 24, 2026.',
    intro:
      'Your team prep meeting with Medard Gabel is confirmed. This session is for sharpening your Global Solutions Lab 2026 final presentation and clarifying the points your team wants to review before Wednesday.',
    discussionHeading: 'Please come ready to discuss:',
    discussionItems: [
      "Your team's main solution and final presentation story.",
      'The strongest points to make on Wednesday, June 24.',
      "One or two questions where Medard's feedback would help most.",
    ],
    ctaLabel: 'Join the Google Meet',
    signoff: 'Thank you,\nMedard Gabel and the NewWorld Team',
  };

  bookings: DemoBooking[] = [];
  filtered: DemoBooking[] = [];
  search = '';
  isLoggedIn = false;
  expandedNotes: Set<string> = new Set();
  bookingView: 'all' | 'demo' | 'gsl2026Prep' = 'all';
  editingId: string | null = null;
  editDraft: BookingEditDraft | null = null;
  savingId: string | null = null;
  deletingId: string | null = null;
  templateDraft: GslPrepEmailTemplate = {
    ...this.defaultGslPrepEmailTemplate,
    discussionItems: [...this.defaultGslPrepEmailTemplate.discussionItems],
  };
  templateDiscussionItemsText =
    this.defaultGslPrepEmailTemplate.discussionItems.join('\n');
  templateSaving = false;
  templateStatus = '';

  constructor(public auth: AuthService) {}

  sortBy: 'createdAt' | 'demoDateTime' = 'createdAt';

  ngOnInit(): void {
    window.scroll(0, 0);
    this.isLoggedIn = !!this.auth.currentUser?.email;

    this.auth.listAll().subscribe((list) => {
      this.bookings = [...list].map((b) => ({
        ...b,
        createdAt: this.normalizeTimestamp(b.createdAt),
      }));
      this.sortBookings();
      this.applyFilter();
    });

    this.auth.getGslPrepEmailTemplate().subscribe((template) => {
      this.setTemplateDraft(template || this.defaultGslPrepEmailTemplate);
    });
  }

  toggleSort(): void {
    this.sortBy = this.sortBy === 'createdAt' ? 'demoDateTime' : 'createdAt';
    this.sortBookings();
    this.applyFilter(); // re-apply after sort
  }

  private sortBookings(): void {
    if (this.sortBy === 'createdAt') {
      // Newest first
      this.bookings.sort((a, b) => b.createdAt - a.createdAt);
    } else if (this.sortBy === 'demoDateTime') {
      // Soonest first
      this.bookings.sort((a, b) => a.demoDateTime - b.demoDateTime);
    }
  }

  private normalizeTimestamp(timestamp: any): number {
    if (typeof timestamp === 'number') return timestamp;
    if (timestamp?.seconds) return timestamp.seconds * 1000;
    return Date.now();
  }

  applyFilter(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.bookings.filter((b) => {
      const bookingType = b.bookingType || 'demo';
      const matchesView =
        this.bookingView === 'all' || bookingType === this.bookingView;
      const matchesSearch =
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        (b.teamName || '').toLowerCase().includes(q) ||
        (b.eventTitle || '').toLowerCase().includes(q) ||
        b.demoDate.includes(q) ||
        b.demoTime.toLowerCase().includes(q);

      return matchesView && matchesSearch;
    });
  }

  setBookingView(view: 'all' | 'demo' | 'gsl2026Prep'): void {
    this.bookingView = view;
    this.applyFilter();
  }

  resetTemplateToDefault(): void {
    const confirmed = window.confirm(
      'Reset the team meeting email template to the default Medard/GSL copy? Save after resetting to make it active.'
    );
    if (!confirmed) return;
    this.setTemplateDraft(this.defaultGslPrepEmailTemplate);
    this.templateStatus = 'Default template loaded. Click Save Template to use it.';
  }

  async saveTemplate(): Promise<void> {
    const template = this.normalizedTemplateDraft();
    if (
      !template.subject ||
      !template.headline ||
      !template.intro ||
      template.discussionItems.length === 0
    ) {
      alert('Subject, headline, intro, and at least one discussion item are required.');
      return;
    }

    this.templateSaving = true;
    this.templateStatus = '';
    try {
      await this.auth.saveGslPrepEmailTemplate(template);
      this.templateStatus = 'Template saved. New team meeting signups will use it.';
    } catch (error) {
      console.error('Could not save GSL prep email template', error);
      alert('Could not save the template. Please try again.');
    } finally {
      this.templateSaving = false;
    }
  }

  private setTemplateDraft(template: GslPrepEmailTemplate): void {
    const discussionItems =
      Array.isArray(template.discussionItems) && template.discussionItems.length
        ? template.discussionItems
        : this.defaultGslPrepEmailTemplate.discussionItems;
    this.templateDraft = {
      ...this.defaultGslPrepEmailTemplate,
      ...template,
      discussionItems: [...discussionItems],
    };
    this.templateDiscussionItemsText = this.templateDraft.discussionItems.join('\n');
  }

  private normalizedTemplateDraft(): GslPrepEmailTemplate {
    return {
      ...this.templateDraft,
      subject: this.templateDraft.subject.trim(),
      eyebrow: this.templateDraft.eyebrow.trim(),
      headline: this.templateDraft.headline.trim(),
      subhead: this.templateDraft.subhead.trim(),
      intro: this.templateDraft.intro.trim(),
      discussionHeading: this.templateDraft.discussionHeading.trim(),
      discussionItems: this.templateDiscussionItemsText
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      ctaLabel: this.templateDraft.ctaLabel.trim(),
      signoff: this.templateDraft.signoff.trim(),
    };
  }

  getBookingTypeLabel(booking: DemoBooking): string {
    return booking.bookingType === 'gsl2026Prep' ? 'GSL Team Meeting' : 'Demo';
  }

  getBookingKey(booking: DemoBooking): string {
    // Use id if available, otherwise use email + createdAt as unique identifier
    return booking.id || `${booking.email}_${booking.createdAt}`;
  }

  toggleNotesExpansion(booking: DemoBooking): void {
    const key = this.getBookingKey(booking);
    if (this.expandedNotes.has(key)) {
      this.expandedNotes.delete(key);
    } else {
      this.expandedNotes.add(key);
    }
  }

  isNotesExpanded(booking: DemoBooking): boolean {
    return this.expandedNotes.has(this.getBookingKey(booking));
  }

  shouldShowExpandButton(notes: string | undefined): boolean {
    // Always show expand button for any non-empty notes since CSS truncation 
    // can happen based on width, not just character count
    return !!notes && notes.trim().length > 0;
  }

  startEdit(booking: DemoBooking): void {
    if (!booking.id) return;
    this.editingId = booking.id;
    this.editDraft = {
      id: booking.id,
      name: booking.name || '',
      email: booking.email || '',
      teamName: booking.teamName || '',
      demoDate: booking.demoDate || '',
      demoTime: booking.demoTime || '',
      demoStartTime:
        booking.demoStartTime || this.getStartTimeFromDemoTime(booking.demoTime),
      notes: booking.notes || '',
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editDraft = null;
  }

  async saveEdit(): Promise<void> {
    if (!this.editDraft) return;
    const draft = this.editDraft;
    if (!draft.name.trim() || !draft.email.trim() || !draft.demoDate || !draft.demoTime.trim()) {
      alert('Name, email, date, and slot are required.');
      return;
    }

    this.savingId = draft.id;
    const demoStartTime = this.getStartTimeFromDemoTime(draft.demoTime);
    try {
      await this.auth.updateDemoBooking(draft.id, {
        name: draft.name.trim(),
        email: draft.email.trim(),
        teamName: draft.teamName.trim(),
        demoDate: draft.demoDate,
        demoTime: draft.demoTime.trim(),
        demoStartTime,
        demoDateTime: this.buildDemoDateTime(
          draft.demoDate,
          demoStartTime || draft.demoTime
        ),
        notes: draft.notes.trim(),
      });
      this.cancelEdit();
    } catch (error) {
      console.error('Could not update booking', error);
      alert('Could not update this booking. Please try again.');
    } finally {
      this.savingId = null;
    }
  }

  async deleteBooking(booking: DemoBooking): Promise<void> {
    if (!booking.id) return;
    const label = booking.teamName || booking.name || booking.email;
    const confirmed = window.confirm(`Delete this booking for ${label}?`);
    if (!confirmed) return;

    this.deletingId = booking.id;
    try {
      await this.auth.deleteDemoBooking(booking.id);
      if (this.editingId === booking.id) {
        this.cancelEdit();
      }
    } catch (error) {
      console.error('Could not delete booking', error);
      alert('Could not delete this booking. Please try again.');
    } finally {
      this.deletingId = null;
    }
  }

  private getStartTimeFromDemoTime(demoTime = ''): string {
    return demoTime.split('-')[0].trim();
  }

  private buildDemoDateTime(dateValue: string, timeValue: string): number {
    const startTime = this.getStartTimeFromDemoTime(timeValue);
    const [time, meridian] = startTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    const date = new Date(`${dateValue}T00:00:00`);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date.getTime();
  }

  /** Download visible rows to CSV */
  downloadCsv(): void {
    const rows = this.filtered.map((b, i) =>
      [
        `${i + 1}. ${b.name}`,
        b.email,
        this.getBookingTypeLabel(b),
        b.teamName || '',
        `${b.demoDate} ${b.demoTime}`,
        `"${b.notes?.replace(/"/g, '""') || ''}"`,
        new Date(b.createdAt).toLocaleString(), // <-- Add this line
      ].join(',')
    );
    const csv = [
      'Name,Email,Type,Team,Slot,Notes,Scheduled At',
      ...rows,
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo_signups_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
