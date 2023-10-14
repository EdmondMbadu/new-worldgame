import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TimeService {
  constructor() {}
  getCurrentDate(): string {
    const today: Date = new Date();
    const day: string = String(today.getDate()).padStart(2, '0'); // get day and format as 2 digits
    const month: string = String(today.getMonth() + 1).padStart(2, '0'); // get month (0-indexed, so +1) and format as 2 digits
    const year: string = String(today.getFullYear()); // get year as 4 digits
    return `${month}-${day}-${year}`;
  }
  getMonthYear(dateString: string): string {
    // Split the date string into its components
    const [month, , year] = dateString
      .split('-')
      .map((part) => parseInt(part, 10));

    // Month names array
    const monthNames: string[] = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    // Get month name using the month number (subtract 1 since arrays are 0-indexed)
    const monthName: string = monthNames[month - 1];

    return `${monthName} ${year}`;
  }
}
