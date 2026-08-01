import { UserManagementComponent } from './user-management.component';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;

  beforeEach(() => {
    component = new UserManagementComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { parseDateMMDDYYYY: (value: string) => Date.parse(value) } as any,
      {} as any,
      {} as any
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds a video-script prompt from Strategy Review content without people or email fields', () => {
    component.allUsers = [
      {
        email: 'author@example.com',
        firstName: 'Private',
        lastName: 'Author',
        dateJoined: '01/01/2026',
      } as User,
    ];
    component.everySolution = [
      {
        solutionId: 'clean-water',
        title: 'Clean Water Access',
        description: 'Private Author is developing neighborhood water hubs.',
        solutionArea: 'Public health',
        strategyReview:
          '<h2>Preferred future</h2><p>Reliable water for every household.</p><p>Contact author@example.com for details.</p>',
        authorEmail: 'author@example.com',
        authorName: 'Private Author',
        participants: { 'author@example.com': 'Private Author' },
        lastSubstantiveEditAt: new Date(Date.now() - 60_000).toISOString(),
      } as Solution,
    ];

    component.generateWeeklyVideoScriptPrompt();

    expect(component.weeklyVideoScriptPrompt).toContain('Clean Water Access');
    expect(component.weeklyVideoScriptPrompt).toContain(
      'Reliable water for every household.'
    );
    expect(component.weeklyVideoScriptPrompt).toContain(
      '[team member omitted] is developing neighborhood water hubs.'
    );
    expect(component.weeklyVideoScriptPrompt).toContain('[email omitted]');
    expect(component.weeklyVideoScriptPrompt).not.toContain('Private Author');
    expect(component.weeklyVideoScriptPrompt).not.toContain(
      'author@example.com'
    );
    expect(component.weeklyVideoScriptPrompt).not.toContain('<h2>');
  });
});
