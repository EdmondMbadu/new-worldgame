import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

// Define a type for the day object used in the calendar
interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isPast: boolean;
  isValidBookingDay: boolean;
}

@Component({
  selector: 'app-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrl: './scheduler.component.css',
})
export class SchedulerComponent implements OnInit {
  // --- State Management ---
  public step = 1; // Controls which step of the scheduler is visible: 1: Time, 2: Details, 3: Confirm

  // --- Date & Time Selection (Step 1) ---
  public selectedDate: Date | null = null;
  public selectedTime: string | null = null;
  public availableTimes: string[] = [];

  // --- Calendar Properties ---
  public currentMonthDate: Date = new Date();
  public monthDays: CalendarDay[] = [];
  public readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- User Details (Step 2) ---
  public userName = '';
  public userEmail = '';
  public notes = '';
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }

  ngOnInit(): void {
    // Initialize the calendar with the current month and year
    this.generateCalendar();
  }

  // --- Calendar Logic ---

  /**
   * Generates the array of days for the current month view.
   * Includes padding days from previous and next months.
   */
  generateCalendar(): void {
    this.monthDays = [];
    const year = this.currentMonthDate.getFullYear();
    const month = this.currentMonthDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date for accurate past-day checking

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const lastDayOfPrevMonth = new Date(year, month, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const totalDaysInMonth = lastDayOfMonth.getDate();

    // 1. Add days from the previous month for padding
    for (let i = startingDayOfWeek; i > 0; i--) {
      const day = lastDayOfPrevMonth.getDate() - i + 1;
      const date = new Date(year, month - 1, day);
      // For previous month padding
      this.monthDays.push({
        day,
        date,
        isCurrentMonth: false,
        isPast: true,
        isValidBookingDay: false,
      });
    }

    // 2. Add days for the current month
    // 2. Add only Fridays (5) and Saturdays (6) for the current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay(); // 5 = Friday, 6 = Saturday

      this.monthDays.push({
        day: i,
        date: date,
        isCurrentMonth: true,
        isPast: date < today,
        isValidBookingDay: dayOfWeek === 5 || dayOfWeek === 6,
      });
    }

    // 3. Add days from the next month for padding to fill the grid (6 rows * 7 days = 42)
    const gridEndFiller = 42 - this.monthDays.length;
    for (let i = 1; i <= gridEndFiller; i++) {
      const date = new Date(year, month + 1, i);
      // For next month padding
      this.monthDays.push({
        day: i,
        date,
        isCurrentMonth: false,
        isPast: false,
        isValidBookingDay: false,
      });
    }
  }

  /**
   * Changes the calendar to the previous or next month.
   * @param direction -1 for previous, 1 for next.
   */
  changeMonth(direction: number): void {
    this.currentMonthDate.setMonth(
      this.currentMonthDate.getMonth() + direction
    );
    this.currentMonthDate = new Date(this.currentMonthDate); // Create a new object to trigger change detection
    this.generateCalendar();
    this.selectedDate = null; // Reset selection when changing month
    this.selectedTime = null;
  }

  // --- Selection Logic ---

  /**
   * Handles the click event on a calendar day.
   * @param date The full Date object of the selected day.
   */
  selectDate(date: Date): void {
    this.selectedDate = date;
    this.selectedTime = null; // Reset time when a new date is selected
    // In a real app, you would fetch available times for the selected date from a backend.
    // Here, we generate dummy times for demonstration.
    this.availableTimes = [
      // '09:00 AM',
      // '09:30 AM',
      // '10:00 AM',
      // '10:30 AM',
      '02:00 PM',
      '02:30 PM',
      '03:00 PM',
      '03:30 PM',
      '04:00 PM',
    ];
  }

  /**
   * Checks if a given date is the currently selected one to apply styling.
   * @param date The date to check.
   */
  isDateSelected(date: Date): boolean {
    if (!this.selectedDate) return false;
    return date.toDateString() === this.selectedDate.toDateString();
  }

  /**
   * Handles the click event on a time slot.
   * @param time The selected time string (e.g., "09:00 AM").
   */
  selectTime(time: string): void {
    this.selectedTime = time;
  }

  // --- Step Navigation ---

  /**
   * Moves from the time selection step to the details step.
   */
  nextStep(): void {
    if (this.step === 1 && this.selectedTime) {
      this.step = 2;
    }
  }

  /**
   * Moves back from the details step to the time selection step.
   */
  prevStep(): void {
    if (this.step === 2) {
      this.step = 1;
    }
  }

  /**
   * "Submits" the form data and moves to the final confirmation step.
   * In a real-world application, this is where you would make an API call
   * to your backend to save the appointment details.
   */
  async submitDemo(): Promise<void> {
    if (
      !this.userName ||
      !this.userEmail ||
      !this.selectedDate ||
      !this.selectedTime
    ) {
      return;
    }

    // Combine date + time into a single UTC millisecond value for sorting
    const [time, meridian] = this.selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridian === 'PM' && hours < 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;

    const fullDateTime = new Date(this.selectedDate);
    fullDateTime.setHours(hours, minutes, 0, 0);

    await this.auth.addDemoScheduled({
      demoDate: this.selectedDate.toISOString().substring(0, 10),
      demoTime: this.selectedTime,
      demoDateTime: fullDateTime.getTime(),
      name: this.userName,
      email: this.userEmail,
      notes: this.notes || '',
      uid: this.auth.currentUser?.uid || null,
      createdAt: Date.now(), // will be overwritten by serverTimestamp()
    });

    this.step = 3; // Confirmation view
    // setTimeout(() => (this.step = 4), 1600); // 1.6-second pop to step 4
  }
}
