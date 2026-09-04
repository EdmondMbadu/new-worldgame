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
  let roomSet: jasmine.Spy;
  let transactionSet: jasmine.Spy;
  let transactionDiscussion: any[];

  const currentUser = {
    uid: 'creator-1',
    email: 'creator@example.com',
    firstName: 'Room',
    lastName: 'Creator',
  };

  beforeEach(async () => {
    roomSet = jasmine.createSpy('set').and.resolveTo();
    transactionSet = jasmine.createSpy('transactionSet');
    transactionDiscussion = [];
    await TestBed.configureTestingModule({
      declarations: [FullDiscussionComponent],
      providers: [
        {
          provide: AngularFirestore,
          useValue: {
            createId: () => 'generated-id',
            doc: () => ({ set: roomSet, ref: { path: 'discussion-doc' } }),
            firestore: {
              runTransaction: async (handler: any) =>
                handler({
                  get: async () => ({
                    exists: true,
                    data: () => ({ discussion: transactionDiscussion }),
                  }),
                  set: transactionSet,
                }),
            },
          },
        },
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

  it('creates a permanent General room with a four-agent starter team', () => {
    expect(component.activeRoom.id).toBe('general');
    expect(component.canDeleteRoom(component.activeRoom)).toBeFalse();
    expect(component.selectedRoomAIAgents.length).toBe(4);
    expect(component.participationMode).toBe('mentions');
  });

  it('recommends a deterministic balanced team from selected SDGs', () => {
    component.currentSolution = {
      solutionId: 'solution-1',
      sdgs: [
        'SDG11  Sustainable Cities And Communities',
        'SDG 13 Climate Action',
      ],
    };

    expect(component.solutionSdgNumbers).toEqual([11, 13]);
    expect(component.recommendedAIKeys).toEqual([
      'li',
      'rachel',
      'arjun',
      'sofia',
    ]);
    expect(component.recommendedAIAgents.map((agent) => agent.collectionKey)).toEqual(
      component.recommendedAIKeys
    );
  });

  it('refreshes recommended teams when SDGs change but preserves manual teams', () => {
    component.currentSolution = {
      solutionId: 'solution-1',
      sdgs: ['SDG13  Climate Action'],
    };
    const previouslyRecommended = ['li', 'arjun', 'albert', 'zara'];

    const refreshed = (component as any).buildGeneralRoom({
      id: 'general',
      settingsVersion: 2,
      aiMemberKeys: previouslyRecommended,
      aiSelectionSource: 'recommended',
      recommendedSdgNumbers: [11],
    });
    const manual = (component as any).buildGeneralRoom({
      id: 'general',
      settingsVersion: 2,
      aiMemberKeys: previouslyRecommended,
      aiSelectionSource: 'manual',
      recommendedSdgNumbers: [11],
    });

    expect(refreshed.aiMemberKeys).toEqual(component.recommendedAIKeys);
    expect(manual.aiMemberKeys).toEqual(previouslyRecommended);
  });

  it('reduces the legacy 15-agent General roster to a recommended team', () => {
    const legacy = (component as any).buildGeneralRoom({
      id: 'general',
      settingsVersion: 1,
      aiMemberKeys: component.availableAIAgents.map((agent) => agent.collectionKey),
    });

    expect(legacy.aiMemberKeys.length).toBe(4);
    expect(legacy.aiSelectionSource).toBe('recommended');
  });

  it('lets General use one roundtable question and then resets to mentions', async () => {
    component.setParticipationMode('roundtable');
    expect(component.participationMode).toBe('roundtable');
    component.participants = [
      {
        email: 'ai-zara@system',
        displayName: 'Zara Nkosi',
        isAI: true,
        collectionKey: 'zara',
      },
    ];
    spyOn(component as any, 'generateAIResponse').and.resolveTo();

    await (component as any).startRoundtable('What should we prioritize?');

    expect(component.participationMode).toBe('mentions');
    expect(component.activeRoom.participationMode).toBe('mentions');
  });

  it('creates focused rooms in one-round roundtable mode', async () => {
    component.newRoomName = 'Research';
    spyOn(component, 'selectRoom');

    await component.createRoom();

    const savedRoom = roomSet.calls.mostRecent().args[0];
    expect(savedRoom.participationMode).toBe('roundtable');
    expect(savedRoom.roundLimit).toBe(1);
    expect(savedRoom.aiMemberKeys).toEqual(['zara', 'arjun', 'sofia', 'bucky']);
    expect(savedRoom.aiSelectionSource).toBe('recommended');
  });

  it('only offers the available Global Solutions Lab agents', () => {
    const agentNames = component.availableAIAgents.map((agent) => agent.name);

    expect(agentNames).not.toContain('Synthesis');
    expect(agentNames).not.toContain('Claude');
    expect(agentNames).not.toContain('Gemini');
    expect(agentNames).not.toContain('Grok');
    expect(agentNames.length).toBe(15);
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
    expect(component.participationHelpText).toContain('Only @mentioned agents reply');

    component.participationMode = 'roundtable';
    component.roundLimit = 1;
    expect(component.participationHelpText).toContain('agents reply once, in order');
  });

  it('preserves the next AI placeholder when an older room snapshot arrives', () => {
    const discussionPath =
      'solutions/solution-1/discussionRooms/research-room';
    const pending = {
      messageId: 'ai-response-2',
      authorId: 'ai-arjun',
      authorName: 'Arjun Patel',
      content: '',
      isAI: true,
      isLoading: true,
    };
    (component as any).pendingAIComments.set(pending.messageId, {
      comment: pending,
      discussionPath,
    });

    const merged = (component as any).mergeDiscussionSnapshot(
      [
        {
          messageId: 'ai-response-1',
          authorId: 'ai-zara',
          authorName: 'Zara Nkosi',
          content: 'First response',
          isAI: true,
        },
      ],
      discussionPath
    );

    expect(merged.map((comment: any) => comment.messageId)).toEqual([
      'ai-response-1',
      'ai-response-2',
    ]);
    expect(merged[1].isLoading).toBeTrue();
  });

  it('appends and transactionally saves a completed reply if its placeholder was displaced', async () => {
    transactionDiscussion = [
      {
        messageId: 'human-question',
        authorId: currentUser.uid,
        authorName: 'Room Creator',
        content: 'What should we research?',
      },
      {
        messageId: 'ai-response-1',
        authorId: 'ai-zara',
        authorName: 'Zara Nkosi',
        content: 'First response',
        isAI: true,
      },
    ];
    component.comments = [...transactionDiscussion];
    const placeholder = {
      messageId: 'ai-response-2',
      authorId: 'ai-arjun',
      authorName: 'Arjun Patel',
      content: '',
      isAI: true,
      isLoading: true,
    };

    await (component as any).finishAIPlaceholder(
      placeholder,
      'Second response',
      'solutions/solution-1'
    );

    expect(component.comments.some(
      (comment) =>
        comment.messageId === 'ai-response-2' &&
        comment.content === 'Second response' &&
        !comment.isLoading
    )).toBeTrue();
    const savedDiscussion = transactionSet.calls.mostRecent().args[1].discussion;
    expect(savedDiscussion.map((comment: any) => comment.messageId)).toEqual([
      'human-question',
      'ai-response-1',
      'ai-response-2',
    ]);
  });
});
