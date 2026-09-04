import { NgZone } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';
import { DiscussionNotificationsService } from 'src/app/services/discussion-notifications.service';
import { PresenceService } from 'src/app/services/presence.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import { FullDiscussionComponent } from './full-discussion.component';

describe('FullDiscussionComponent room behavior', () => {
  let component: FullDiscussionComponent;
  let fixture: ComponentFixture<FullDiscussionComponent>;

  const currentUser = {
    uid: 'creator-1',
    email: 'creator@example.com',
    firstName: 'Room',
    lastName: 'Creator',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FullDiscussionComponent],
      providers: [
        { provide: AngularFirestore, useValue: { createId: () => 'generated-id' } },
        { provide: AngularFireStorage, useValue: {} },
        { provide: AngularFireFunctions, useValue: {} },
        { provide: AuthService, useValue: { currentUser, currentAuthUid: currentUser.uid } },
        { provide: SolutionService, useValue: {} },
        { provide: TimeService, useValue: {} },
        { provide: PresenceService, useValue: { clearTyping: () => Promise.resolve() } },
        { provide: DiscussionNotificationsService, useValue: {} },
        { provide: Router, useValue: {} },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: {},
              paramMap: { get: () => 'solution-1' },
              queryParamMap: { get: () => null },
            },
          },
        },
        {
          provide: NgZone,
          useValue: new NgZone({ enableLongStackTrace: false }),
        },
      ],
    })
      .overrideComponent(FullDiscussionComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(FullDiscussionComponent);
    component = fixture.componentInstance;
    component.currentSolution = { solutionId: 'solution-1' };
  });

  it('creates a permanent General room with the legacy AI roster', () => {
    expect(component.activeRoom.id).toBe('general');
    expect(component.canDeleteRoom(component.activeRoom)).toBeFalse();
    expect(component.selectedRoomAIAgents.length).toBe(15);
  });

  it('does not offer unavailable OpenAI or Anthropic agents', () => {
    const agentNames = component.availableAIAgents.map((agent) => agent.name);

    expect(agentNames).not.toContain('Synthesis');
    expect(agentNames).not.toContain('Claude');
  });

  it('allows a room creator to delete a custom room', () => {
    const customRoom = {
      id: 'research',
      name: 'Research',
      createdBy: currentUser.uid,
    };

    expect(component.canDeleteRoom(customRoom)).toBeTrue();
  });

  it('explains the difference between mentions and roundtable participation', () => {
    component.participationMode = 'mentions';
    expect(component.participationHelpText).toContain('Only AI agents you @mention');

    component.participationMode = 'roundtable';
    component.roundLimit = 1;
    expect(component.participationHelpText).toContain('Every AI in this room replies once');
  });
});
