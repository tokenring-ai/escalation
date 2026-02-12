# @tokenring-ai/escalation

An abstract service to initiate communication with one or more users via escalation channels, enabling AI agents to request human assistance and await responses.

## Overview

The escalation package provides a pluggable system for AI agents to escalate decisions or requests to human users through various communication channels (Slack, Telegram, etc.). It supports both individual user targeting and group messaging, with a unified interface for sending messages and receiving responses.

## Features

- **Multi-Provider Support**: Pluggable providers for different communication platforms
- **User and Group Targeting**: Send messages to individual users or predefined groups
- **Communication Channel Pattern**: Use `CommunicationChannel` interface for bidirectional messaging
- **Flexible Addressing**: Use `user@service` format for clear routing
- **Agent Command**: Built-in `/escalate` command for agent interactions

## Installation

```bash
bun add @tokenring-ai/escalation
```

## Configuration

Configure the escalation service in your TokenRing app configuration:

```javascript
export default {
  escalation: {
    providers: {
      telegram: {
        // Provider-specific configuration
      },
      slack: {
        // Provider-specific configuration
      }
    },
    groups: {
      "dev-team": ["alice@telegram", "bob@slack"],
      "managers": ["manager1@telegram", "manager2@telegram"]
    }
  }
};
```

### Configuration Schema

```typescript
const EscalationConfigSchema = z.object({
  providers: z.record(z.string(), z.any()),
  groups: z.record(z.string(), z.array(z.string())).optional()
}).optional();
```

- **providers**: Map of provider names to their configurations
- **groups**: Optional map of group names to arrays of user addresses

## Usage

### Using the /escalate Command

Agents can use the built-in command to escalate to users:

```
/escalate manager@telegram Need approval for production deployment
/escalate dev-team Code review needed for PR #123
```

### Programmatic Usage

```typescript
import {EscalationService} from '@tokenring-ai/escalation';

const escalationService = agent.requireServiceByType(EscalationService);

// Send to individual user and listen for responses
const channel = await escalationService.initiateContactWithUserOrGroup(
  'user@telegram',
  'Please review this change',
  agent
);

// Listen for responses
channel.listen((message) => {
  console.log('Received response:', message);
  // Process response
});

// Send additional messages
await channel.send('Additional information');

// Close channel when done
await channel.close();
```

### Group Communication

Groups allow broadcasting to multiple users across different platforms:

```javascript
groups: {
  "dev-team": [
    "alice@telegram",
    "bob@slack",
    "charlie@telegram"
  ]
}
```

When messaging a group, all users receive the message and all responses are collected:

```typescript
const channel = await escalationService.initiateContactWithUserOrGroup(
  'dev-team',
  'Need approval',
  agent
);

channel.listen((message) => {
  console.log('Received response:', message);
});

await channel.send('Additional information');
await channel.close();
```

## Creating an Escalation Provider

Implement the `EscalationProvider` interface:

```typescript
import type {EscalationProvider} from '@tokenring-ai/escalation';
import type {Agent} from '@tokenring-ai/agent';

export class MyEscalationProvider implements EscalationProvider {
  async initiateContactWithUser(userId: string, agent: Agent): Promise<CommunicationChannel> {
    // Create and return a CommunicationChannel for this user
    return {
      send: async (message: string) => {
        // Send message to user via your platform
      },
      listen: (callback: (message: string) => void) => {
        // Set up callback for incoming messages
      },
      unlisten: (callback: (message: string) => void) => {
        // Remove callback for incoming messages
      },
      close: async () => {
        // Clean up resources
      }
    };
  }
}
```

Register your provider:

```typescript
import {EscalationService} from '@tokenring-ai/escalation';

const escalationService = app.requireService(EscalationService);
escalationService.registerProvider({
  name: 'myplatform',
  item: new MyEscalationProvider()
});
```

## Address Format

Addresses use the format `user@service`:

- `user`: Platform-specific user identifier (user ID, username, etc.)
- `service`: Registered provider name

Examples:
- `123456789@telegram` - Telegram user by ID
- `alice@slack` - Slack user
- `dev-team` - Group name (no @ symbol)

## Communication Channel Interface

The `CommunicationChannel` type provides bidirectional messaging:

```typescript
type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  listen: (callback: (message: string) => void) => void;
  unlisten: (callback: (message: string) => void) => void;
  close: () => Promise<void>;
};
```

### Methods

- **`send(message: string)`**: Send a message to the user or group
- **`listen(callback)`**: Register a callback to receive incoming messages
- **`unlisten(callback)`**: Remove a previously registered callback
- **`close()`**: Clean up and close the channel

## Group Messaging Behavior

When messaging a group, the service:

1. Creates communication channels for all group members
2. Broadcasts messages to all members
3. Collects responses from all members
4. Broadcasts responses to other group members (via `@userId` prefix)
5. Passes native messages to the original listener

## API Reference

### EscalationService

#### Methods

- **`registerProvider(provider: {name: string, item: EscalationProvider})`**: Register a new escalation provider
- **`getProviderByName(name: string): EscalationProvider`**: Get provider by name
- **`initiateContactWithUserOrGroup(target: string, message: string, agent: Agent): Promise<CommunicationChannel>`**: Initiate contact with user or group and return a communication channel

### EscalationProvider Interface

```typescript
interface EscalationProvider {
  initiateContactWithUser: (userId: string, agent: Agent) => Promise<CommunicationChannel>;
}
```

### CommunicationChannel Type

```typescript
type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  listen: (callback: (message: string) => void) => void;
  unlisten: (callback: (message: string) => void) => void;
  close: () => Promise<void>;
};
```

## Built-in Providers

- **Telegram**: Available via `@tokenring-ai/telegram` package

## Command Reference

### /escalate

```
/escalate {user@service|group} {message}
```

**Arguments:**
- `user@service|group`: Target user address or group name
- `message`: Message content to send

**Examples:**
```
/escalate manager@telegram Project deadline extension request
/escalate dev-ops Production server experiencing high latency
/escalate dev-team Need code review for authentication module
```

## Error Handling

The service throws errors for:
- Invalid address format (missing @ or service name)
- Unknown provider names
- Unknown group names
- Provider-specific errors (network issues, unauthorized users, etc.)

```typescript
try {
  const channel = await escalationService.initiateContactWithUserOrGroup(
    'user@unknown',
    'message',
    agent
  );
} catch (error) {
  // Handle error
}
```

## Use Cases

- **Approval Workflows**: Request human approval for critical operations
- **Decision Support**: Get human input on ambiguous situations
- **Error Resolution**: Escalate errors that require human intervention
- **Code Review**: Request human review of generated code
- **Deployment Approval**: Get sign-off before production deployments
- **Content Moderation**: Flag content for human review

## License

MIT License - see [LICENSE](./LICENSE) file for details.