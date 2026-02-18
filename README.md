# @tokenring-ai/escalation

An abstract service to initiate communication with one or more users via escalation channels, enabling AI agents to request human assistance and await responses.

## Overview

The escalation package provides a pluggable system for AI agents to escalate decisions or requests to human users through various communication channels (Slack, Telegram, etc.). It supports both individual user targeting and group messaging, with a unified interface for sending messages and receiving responses.

## Features

- **Multi-Provider Support**: Pluggable providers for different communication platforms
- **User and Group Targeting**: Send messages to individual users or predefined groups
- **Communication Channel Pattern**: Use `CommunicationChannel` interface with async generators for bidirectional messaging
- **Flexible Addressing**: Use `service:userId` format for clear routing
- **Agent Command**: Built-in `/escalate` command for agent interactions
- **Group Broadcasting**: Built-in `GroupEscalationProvider` for group messaging with automatic broadcast

## Installation

```bash
bun add @tokenring-ai/escalation
```

## Configuration

Configure the escalation service in your TokenRing app configuration:

```typescript
import {defineConfig} from "@tokenring-ai/app";

export default defineConfig({
  escalation: {
    providers: {
      "group": {
        type: "group",
        members: {
          "dev-team": ["alice:telegram", "bob:slack"],
          "managers": ["manager1:telegram", "manager2:telegram"]
        }
      }
    }
  }
});
```

### Configuration Schema

```typescript
const packageConfigSchema = z.object({
  escalation: z.object({
    providers: z.record(z.string(), z.any())
  }).optional()
});

// For group providers specifically
const GroupEscalationProviderConfigSchema = z.object({
  type: z.literal('group'),
  members: z.record(z.string(), z.array(z.string()))
});
```

- **escalation.providers**: Map of provider names to their configurations
- **group members**: Map of group names to arrays of `service:userId` addresses

## Usage

### Using the /escalate Command

Agents can use the built-in command to escalate to users:

```
/escalate manager:telegram Need approval for production deployment
/escalate dev-team Code review needed for PR #123
```

### Programmatic Usage

```typescript
import {EscalationService} from '@tokenring-ai/escalation';

const escalationService = agent.requireServiceByType(EscalationService);

// Send to individual user and receive responses
const channel = await escalationService.initiateContactWithUser(
  'telegram:123456789',
  agent
);

// Receive messages using async generator
for await (const message of channel.receive()) {
  console.log('Received response:', message);
  // Process response
  // Send additional messages
  await channel.send('Additional information');
}

// Channel is automatically closed via Symbol.asyncDispose
```

### Group Communication

Groups allow broadcasting to multiple users across different platforms:

```typescript
{
  escalation: {
    providers: {
      "group": {
        type: "group",
        members: {
          "dev-team": ["alice:telegram", "bob:slack", "charlie:telegram"]
        }
      }
    }
  }
}
```

When messaging a group, all users receive the message and responses are collected:

```typescript
const channel = await escalationService.initiateContactWithUser(
  'group:dev-team',
  agent
);

for await (const message of channel.receive()) {
  console.log('Received response:', message);
}

// Broadcast to all group members
await channel.send('Need approval');
```

## Creating an Escalation Provider

Implement the `EscalationProvider` interface:

```typescript
import type {EscalationProvider} from '@tokenring-ai/escalation';
import type {Agent} from '@tokenring-ai/agent';

export class MyEscalationProvider implements EscalationProvider {
  async createCommunicationChannelWithUser(userId: string, agent: Agent) {
    // Create and return a CommunicationChannel for this user
    return {
      send: async (message: string) => {
        // Send message to user via your platform
      },
      receive: async function* () {
        // Generate incoming messages as an async generator
        yield 'Hello';
      },
      [Symbol.asyncDispose]: async () => {
        // Clean up resources
      }
    };
  }
}
```

Register your provider:

```typescript
import {EscalationService} from '@tokenring-ai/escalation';

const service = app.requireService(EscalationService);
service.registerProvider('myplatform', new MyEscalationProvider());
```

## Address Format

Addresses use the format `service:userId`:

- `service`: Registered provider name (e.g., `telegram`, `slack`, `group`)
- `userId`: Platform-specific user identifier or group ID

Examples:
- `telegram:123456789` - Telegram user by ID
- `slack:alice` - Slack user
- `group:dev-team` - Group name (with `group:` prefix)

## Communication Channel Interface

The `CommunicationChannel` type provides bidirectional messaging with async generators:

```typescript
type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  receive: () => AsyncGenerator<string>;
  [Symbol.asyncDispose]: () => Promise<void>;
};
```

### Methods

- **`send(message: string)`**: Send a message to the user or group
- **`receive()`**: Get async generator to receive incoming messages
- **`[Symbol.asyncDispose]`**: Async cleanup method (used with `await using`)

## Group Escalation Provider

The built-in `GroupEscalationProvider` enables group messaging with automatic broadcast:

### Features

- Broadcast messages to all group members
- Collect responses from all members
- Automatically broadcast responses to other group members with `@userId` prefix
- Clean resource management with AbortController

### Usage

```typescript
import GroupEscalationProvider from '@tokenring-ai/escalation/GroupEscalationProvider.js';
import {EscalationService} from '@tokenring-ai/escalation';

const service = app.requireService(EscalationService);
service.registerProvider('group', new GroupEscalationProvider({
  type: 'group',
  members: {
    'dev-team': ['alice:telegram', 'bob:slack']
  }
}));
```

### Group Messaging Behavior

When messaging a group, the provider:

1. Creates communication channels for all group members
2. Broadcasts messages to all members
3. Collects responses from all members
4. Broadcasts responses to other group members (via `@userId` prefix)
5. Passes native messages to the original listener

## Built-in Providers

- **Group Escalation Provider**: Available in `@tokenring-ai/escalation` as `GroupEscalationProvider`

## Command Reference

### /escalate

```
/escalate {service:userId|group:groupName} {message}
```

**Arguments:**
- `service:userId|group:groupName`: Target user address or group name
- `message`: Message content to send

**Examples:**
```
/escalate manager:telegram Project deadline extension request
/escalate group:dev-ops Production server experiencing high latency
/escalate group:dev-team Need code review for authentication module
```

## API Reference

### EscalationService

#### Methods

- **`registerProvider(name: string, provider: EscalationProvider)`**: Register a new escalation provider
- **`initiateContactWithUser(serviceNameAndUser: string, agent: Agent): Promise<CommunicationChannel>`**: Initiate contact with user or group and return a communication channel

### EscalationProvider Interface

```typescript
interface EscalationProvider {
  createCommunicationChannelWithUser: (userId: string, agent: Agent) => Promise<CommunicationChannel>;
}
```

### CommunicationChannel Type

```typescript
type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  receive: () => AsyncGenerator<string>;
  [Symbol.asyncDispose]: () => Promise<void>;
};
```

### GroupEscalationProvider

#### Constructor

- **`GroupEscalationProvider(config: { type: 'group', members: Record<string, string[]> })`**: Create a new group escalation provider

## Error Handling

The service throws errors for:

- Invalid address format (missing : separator)
- Unknown provider names
- Unknown group names
- Provider-specific errors (network issues, unauthorized users, etc.)

```typescript
try {
  const channel = await escalationService.initiateContactWithUser(
    'unknown:123',
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
- **Group Collaboration**: Broadcast messages to multiple team members and collect responses

## Package Structure

```
pkg/escalation/
├── index.ts                 # Main exports
├── plugin.ts                # Plugin definition for TokenRing integration
├── EscalationService.ts     # Core service implementation
├── EscalationProvider.ts    # Provider interface and types
├── GroupEscalationProvider.ts  # Built-in group provider implementation
├── schema.ts                # Configuration schemas
├── chatCommands.ts          # Command exports
├── commands/
│   └── escalate.ts          # /escalate command implementation
├── test/
│   └── *.test.ts            # Test files
└── vitest.config.ts         # Vitest configuration
```

## Testing

Run the test suite with vitest:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## Dependencies

### Production Dependencies

- `@tokenring-ai/agent` (0.2.0) - Agent orchestration system
- `@tokenring-ai/app` (0.2.0) - Application framework
- `@tokenring-ai/utility` (0.2.0) - Shared utilities and registry
- `zod` (^4.3.6) - Schema validation

### Development Dependencies

- `vitest` (^4.0.18) - Testing framework
- `typescript` (^5.9.3) - TypeScript compiler

## License

MIT License - see LICENSE file for details.