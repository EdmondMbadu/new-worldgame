# Multi-agent discussion rooms

The existing `solutions/{solutionId}.discussion` field remains the permanent
`#General` room. This preserves existing links, messages, reactions, and
notifications. Custom rooms are stored at:

```text
solutions/{solutionId}/discussionRooms/{roomId}
```

The `general` document in that collection stores settings only. Firestore rules
prohibit deleting it. Custom rooms store their own `discussion` array and may be
deleted by their creator, a solution owner/admin, or a platform administrator.
All solution teammates can access every room in the first release; AI membership
and participation settings are room-specific.

## Participation modes

- **Chat + mentions:** people may post normally. Only AI agents explicitly
  named with `@Agent Name` respond. `@everyone` notifies people and never starts
  AI responses.
- **Roundtable:** every AI selected for the current room replies sequentially,
  once per configured round. The user may stop the run after the response in
  progress. Generated AI mentions are inert and cannot recursively start agents.

`#General` retains all existing Global Solutions Lab personas so the old mention
behavior remains available. A new room starts with a smaller four-agent team
unless its creator copies the current room team. The picker only shows agents
that are available in the product, and provider branding is omitted from the
participant interface so the focus stays on each agent's role.

## Provider configuration

Provider calls are server-side. Never place API keys in Angular configuration
or room documents. If the optional xAI participant is enabled, the Firebase
Functions runtime configuration expects both a key and an
administrator-selected model:

```bash
firebase functions:config:set xai.key="..." xai.model="..."
```

Deploy the functions after configuring a provider. If an external provider has
not been configured, its room message finishes with a clear non-secret error and
the rest of a Roundtable continues.

xAI uses its Responses endpoint. The configured model value is deliberately not
controlled by room members.

## Operational limits

- One or two rounds per user-initiated Roundtable.
- One response per selected agent per round.
- Provider requests time out before the Firebase function timeout.
- Room context is isolated with a `conversationId`; prompts from another room
  are not loaded into the provider request.
- Provider keys and technical errors remain server-side.
