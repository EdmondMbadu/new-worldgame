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

  // timeAgo(dateString: string) {
  //   if (!dateString) return '';
  //   const [month, day, year, hours, minutes, seconds] = dateString
  //     .split('-')
  //     .map(Number);
  //   const givenDate = new Date(year, month - 1, day, hours, minutes, seconds);
  //   const now = new Date();

  //   const secondsDiff = Math.floor(
  //     (now.getTime() - givenDate.getTime()) / 1000
  //   );
  //   if (secondsDiff < 60) {
  //     return `${secondsDiff} second${secondsDiff > 1 ? 's' : ''} ago`;
  //   }

  //   const minutesDiff = Math.floor(secondsDiff / 60);
  //   if (minutesDiff < 60) {
  //     return `${minutesDiff} minute${minutesDiff > 1 ? 's' : ''} ago`;
  //   }

  //   const hoursDiff = Math.floor(minutesDiff / 60);
  //   if (hoursDiff < 24) {
  //     return `${hoursDiff} hour${hoursDiff > 1 ? 's' : ''} ago`;
  //   }

  //   const daysDiff = Math.floor(hoursDiff / 24);
  //   if (daysDiff < 30) {
  //     return `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
  //   }

  //   // Rough estimate for months, not accounting for varying days in months
  //   const monthsDiff = Math.floor(daysDiff / 30);
  //   if (monthsDiff < 12) {
  //     return `${monthsDiff} month${monthsDiff > 1 ? 's' : ''} ago`;
  //   }

  //   const yearsDiff = Math.floor(monthsDiff / 12);
  //   return `${yearsDiff} year${yearsDiff > 1 ? 's' : ''} ago`;
  // }
  timeAgo(dateString: string) {
    if (!dateString) return '';

    const [month, day, year, hours, minutes, seconds] = dateString
      .split('-')
      .map(Number);
    const givenDate = new Date(year, month - 1, day, hours, minutes, seconds);

    // Format the date as "Month day, year"
    const options: any = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = givenDate.toLocaleDateString('en-US', options);

    return formattedDate;
  }

  todaysDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let date = `${month}-${day}-${year}-${hours}-${minutes}-${seconds}`;

    return date;
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

  formatDateString(input: string) {
    // Extract individual date components directly from the string
    const parts = input.toString().split(' ');
    const month = new Date(Date.parse(`${parts[1]} 1, 1970`)).getMonth() + 1; // Convert month name to month number
    const day = parseInt(parts[2], 10);
    const year = parseInt(parts[3], 10);

    const timeParts = parts[4].split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1], 10);
    const second = parseInt(timeParts[2], 10);

    // Extract the three-letter timezone abbreviation using a regex
    const timezoneRegex = /\b([A-Z]{3})-\d{4}\b/;
    const match = input.toString().match(timezoneRegex);
    const timezone = match ? match[1] : 'Unknown';

    // Create the desired output format
    const formatted = `${month}-${day}-${year}-${hour}-${minute}-${second}-${timezone}`;
    return formatted;
  }
  formatDate(dateString: string): string {
    // If the input is empty or null, return a fallback
    if (!dateString) {
      return '';
    }

    const parts = dateString.split('-');
    // Ensure we have exactly 6 parts (month, day, year, hour, minute, second)
    if (parts.length < 6) {
      return '';
    }

    const year = parseInt(parts[2], 10);
    const month = parseInt(parts[0], 10) - 1; // JS months are zero-indexed
    const day = parseInt(parts[1], 10);
    const hour = parseInt(parts[3], 10);
    const minute = parseInt(parts[4], 10);
    const second = parseInt(parts[5], 10);

    const date = new Date(year, month, day, hour, minute, second);

    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return '';
    }

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    }).format(date);

    const formattedTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);

    return `${formattedDate}, ${formattedTime}`;
  }

  // public formatDateStringComment(rawDate: string): string {
  //   // rawDate e.g. "1-13-2025-15-54-12"
  //   const parts = rawDate.split('-');
  //   // parts: [month, day, year, hours, minutes, seconds]
  //   const month = parseInt(parts[0], 10);
  //   const day = parseInt(parts[1], 10);
  //   const year = parseInt(parts[2], 10);
  //   const hour = parseInt(parts[3], 10);
  //   const minute = parseInt(parts[4], 10);
  //   const second = parseInt(parts[5], 10);

  //   // Create a Date object
  //   const dateObj = new Date(year, month - 1, day, hour, minute, second);

  //   // Format using toLocaleString to get "M/D/YY, h:mm AM/PM"
  //   // e.g. "1/13/25, 11:10 AM"
  //   return dateObj.toLocaleString('en-US', {
  //     year: '2-digit',
  //     month: 'numeric',
  //     day: 'numeric',
  //     hour: 'numeric',
  //     minute: '2-digit',
  //     hour12: true,
  //   });
  // }
  // time.service.ts
  formatDateStringComment(raw: string): string {
    // raw is now ISO, so let the Date constructor do the work
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      // still fall back gracefully if something is really broken
      return '';
    }

    // “Tue, May 6, 9:09 PM”
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
}
