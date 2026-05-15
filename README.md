# @tokenring-ai/escalation

## Overview

The `@tokenring-ai/escalation` package provides a pluggable protocol for AI agents to hand off complex tasks to humans
or senior agents. It enables bidirectional communication channels with users through various platforms (Slack, Telegram,
etc.), supporting both individual user targeting and group messaging.

This package implements a service-based architecture with the `EscalationService` as the core orchestrator, managing
multiple `EscalationProvider` implementations for different communication platforms. The built-in
`GroupEscalationProvider` enables broadcasting messages to predefined groups and collecting responses from all members.

### Key Features

- **Multi-Provider Support**: Pluggable providers for different communication platforms
- **User and Group Targeting**: Send messages to individual users or predefined groups
- **Communication Channel Pattern**: Bidirectional messaging using async generators
- **Flexible Addressing**: Use `service:userId` format for clear routing
- **Built-in /escalate Command**: Chat command for agent interactions
- **Group Broadcasting**: Built-in `GroupEscalationProvider` for group messaging with automatic broadcast
- **Async Resource Management**: Automatic cleanup using `Symbol.asyncDispose`

### Integration Points

- **@tokenring-ai/agent**: Agent orchestration and command execution
- **@tokenring-ai/app**: Application framework and plugin system
- **@tokenring-ai/utility**: KeyedRegistry and utility functions

## Installation

```bash
bun add @tokenring-ai/escalation
```

## Chat Commands

The package provides the following chat command for agent interactions:

| Command     | Description                          |
|-------------|--------------------------------------|
| `/escalate` | Send escalation request to user/group |

### /escalate

Send an escalation request to a user or group.

**Usage:**

```bash
/escalate {target} {message}
```

**Arguments:**

| Argument  | Type     | Required | Description                                                                                                  |
|-----------|----------|----------|--------------------------------------------------------------------------------------------------------------|
| `target`  | `string` | Yes      | Target user or group in `service:userId` format (e.g., `slack:U123ABC`, `telegram:123456`, `group:dev-team`) |
| `message` | `string` | Yes      | Message content to send                                                                                      |

**Examples:**

```bash
/escalate slack:U123ABC Production server experiencing high latency
/escalate telegram:123456789 Project deadline extension request
/escalate group:dev-team Need code review for authentication module
/escalate group:managers Approval needed for budget increase
```

**Notes:**

- This command sends the message and returns immediately
- Responses from recipients will be displayed in the chat once received
- Use `await using` for proper resource cleanup

## Tools

This package does not define any tools.

## Configuration

Configure the escalation service in your TokenRing app configuration:

```yaml
escalation:
  groups:
    dev-team:
      type: group
      members:
        dev-team:
          - telegram:123456
          - slack:U123ABC
    managers:
      type: group
      members:
        - telegram:789012
        - telegram:345678
```

### Configuration Schema

```typescript
const GroupEscalationProviderConfigSchema = z.object({
  members: z.record(z.string(), z.array(z.string())),
});

const EscalationServiceConfigSchema = z.object({
  groups: z.record(z.string(), GroupEscalationProviderConfigSchema),
});
```

**Configuration Options:**

| Option                        | Type                                            | Description                                                |
|-------------------------------|-------------------------------------------------|------------------------------------------------------------|
| `escalation.groups`           | `Record<string, GroupEscalationProviderConfig>` | Map of group names to their configurations                 |
| `groups.<name>.type`          | `'group'`                                       | Provider type (currently only 'group' is supported)        |
| `groups.<name>.members`       | `Record<string, string[]>`                      | Map of group names to arrays of `service:userId` addresses |

### ENV Variables

This package does not define any environment variables.

## License

MIT License - see LICENSE file for details.

---

## Developer Reference

### Core Components

#### EscalationService

The core service that manages escalation providers and initiates contact with users.

**Implements:** `TokenRingService`

**Properties:**

| Property      | Type     | Description                       |
|---------------|----------|-----------------------------------|
| `name`        | `string` | Service name: `"EscalationService"` |
| `description` | `string` | Service description               |
| `config`      | `object` | Service configuration             |

**Methods:**

| Method                                                                                             | Description                                                              |
|----------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `registerProvider(name: string, provider: EscalationProvider)`                                     | Register a new escalation provider                                       |
| `initiateContactWithUser(serviceNameAndUser: string, agent: Agent): Promise<CommunicationChannel>` | Initiate contact with a user or group and return a communication channel |

**Constructor:**

```typescript
constructor(config: z.output<typeof EscalationServiceConfigSchema>)
```

#### EscalationProvider

Interface for creating communication channels with users.

```typescript
export type EscalationProvider = {
  createCommunicationChannelWithUser: (
    userId: string,
    agent: Agent
  ) => MaybePromise<CommunicationChannel>;
};
```

#### CommunicationChannel

Type for bidirectional messaging with async resource management.

```typescript
export type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  receive: () => AsyncGenerator<string>;
  close?: never;
} & (AsyncDisposable | Disposable);
```

**Properties:**

| Property                  | Type                     | Description                                      |
|---------------------------|--------------------------|--------------------------------------------------|
| `send(message: string)`   | `Promise<void>`          | Send a message to the user or group              |
| `receive()`               | `AsyncGenerator<string>` | Get async generator to receive incoming messages |
| `[Symbol.asyncDispose]()` | `Promise<void>`          | Async cleanup method (used with `await using`)   |

**Note:** The `close` property is set to `never` to indicate it should not be used. Resource cleanup is handled
through the `Symbol.asyncDispose` pattern.

#### GroupEscalationProvider

Built-in provider for group messaging with automatic broadcast capabilities.

**Constructor:**

```typescript
constructor(config: { type: 'group', members: Record<string, string[]> })
```

**Features:**

- Broadcast messages to all group members
- Collect responses from all members
- Automatically broadcast responses to other group members with `@userId` prefix
- Clean resource management with AbortController

### Services

#### EscalationService Implementation

The `EscalationService` implements the `TokenRingService` interface and provides:

- Provider registry using `KeyedRegistry<EscalationProvider>`
- User/group contact initiation with address parsing
- Error handling for invalid addresses and unknown providers

**Address Format:**

Addresses use the `service:userId` format:

- `service`: Registered provider name (e.g., `slack`, `telegram`, `group`)
- `userId`: Platform-specific user identifier or group name

**Examples:**

- `telegram:123456789` - Telegram user by ID
- `slack:U123ABC` - Slack user
- `group:dev-team` - Group name (defined in group provider's `members` configuration)

### Provider Documentation

#### Creating a Custom Escalation Provider

Implement the `EscalationProvider` interface:

```typescript
import type { EscalationProvider } from '@tokenring-ai/escalation';
import type { Agent } from '@tokenring-ai/agent';
import type { CommunicationChannel } from '@tokenring-ai/escalation/EscalationProvider';

export class MyEscalationProvider implements EscalationProvider {
  async createCommunicationChannelWithUser(
    userId: string,
    agent: Agent
  ): Promise<CommunicationChannel> {
    // Create and return a CommunicationChannel for this user
    return {
      send: async (message: string) => {
        // Send message to user via your platform
        console.log(`Sending to ${userId}: ${message}`);
      },
      receive: async function* () {
        // Generate incoming messages as an async generator
        // This should yield messages as they arrive
        yield 'Hello from user';
      },
      [Symbol.asyncDispose]: async () => {
        // Clean up resources
        console.log(`Cleaning up channel for ${userId}`);
      }
    };
  }
}
```

**Register your provider:**

```typescript
import { EscalationService } from '@tokenring-ai/escalation';
import { MyEscalationProvider } from './MyEscalationProvider';

const service = app.requireService(EscalationService);
service.registerProvider('myplatform', new MyEscalationProvider());
```

### RPC Endpoints

This package does not define any RPC endpoints.

### Usage Examples

#### Using the Plugin

```typescript
import escalationPlugin from '@tokenring-ai/escalation/plugin';

app.installPlugin(escalationPlugin, {
  escalation: {
    groups: {
      'dev-team': {
        type: 'group',
        members: {
          'dev-team': ['telegram:123456', 'slack:U123ABC']
        }
      }
    }
  }
});
```

#### Programmatic Usage

```typescript
import { EscalationService } from '@tokenring-ai/escalation';

const escalationService = agent.requireServiceByType(EscalationService);

// Send to individual user and receive responses
await using channel = await escalationService.initiateContactWithUser(
  'telegram:123456789',
  agent
);

// Send a message
await channel.send('Need approval for production deployment');

// Receive responses using async generator
for await (const message of channel.receive()) {
  console.log('Received response:', message);
  // Process response
  // Send additional messages if needed
  await channel.send('Additional information');
}

// Channel is automatically closed via Symbol.asyncDispose
```

#### Group Communication

Groups allow broadcasting to multiple users across different platforms:

```typescript
import { defineConfig } from "@tokenring-ai/app";

export default defineConfig({
  escalation: {
    groups: {
      "dev-team": {
        type: "group",
        members: {
          "dev-team": ["telegram:123456", "slack:U123ABC", "telegram:789012"]
        }
      },
      "managers": {
        type: "group",
        members: {
          "managers": ["telegram:345678", "slack:U456DEF"]
        }
      }
    }
  }
});
```

When messaging a group, all users receive the message and responses are collected:

```typescript
await using channel = await escalationService.initiateContactWithUser(
  'group:dev-team',
  agent
);

// Broadcast to all group members
await channel.send('Need approval for production deployment');

// Receive responses from all members
for await (const message of channel.receive()) {
  console.log('Received response:', message);
}
```

#### Manual Service Registration

```typescript
import EscalationService from '@tokenring-ai/escalation/EscalationService';
import GroupEscalationProvider from '@tokenring-ai/escalation/GroupEscalationProvider';

const service = new EscalationService({
  groups: {}
});

app.addServices(service);

// Register group provider
service.registerProvider('dev-team', new GroupEscalationProvider({
  type: 'group',
  members: {
    'dev-team': ['telegram:123456', 'slack:U123ABC']
  }
}));
```

#### Manual Command Registration

Commands are automatically registered when using the plugin. For manual registration:

```typescript
import { AgentCommandService } from '@tokenring-ai/agent';
import agentCommands from '@tokenring-ai/escalation/commands';

app.waitForService(AgentCommandService, agentCommandService =>
  agentCommandService.addAgentCommands(agentCommands)
);
```

### Testing

Run the test suite with vitest:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

### Dependencies

#### Production Dependencies

| Package                 | Version     | Description                   |
|-------------------------|-------------|-------------------------------|
| `@tokenring-ai/agent`   | `workspace:*` | Agent orchestration system    |
| `@tokenring-ai/app`     | `workspace:*` | Application framework         |
| `@tokenring-ai/utility` | `workspace:*` | Shared utilities and registry |
| `zod`                   | `^4.3.6`    | Schema validation             |

#### Development Dependencies

| Package      | Version     | Description         |
|--------------|-------------|---------------------|
| `vitest`     | `^4.1.1`    | Testing framework   |
| `typescript` | `^6.0.2`    | TypeScript compiler |

### Related Components

- **@tokenring-ai/agent**: Agent orchestration and command execution
- **@tokenring-ai/app**: Application framework and plugin system
- **@tokenring-ai/utility**: KeyedRegistry and utility functions

### Error Handling

The service throws errors for:

- **Invalid address format**: Missing `:` separator in address
- **Unknown provider**: Provider name not registered
- **Unknown group**: Group name not found in provider configuration
- **Provider-specific errors**: Network issues, unauthorized users, etc.

```typescript
import { EscalationService } from '@tokenring-ai/escalation';

try {
  const escalationService = agent.requireServiceByType(EscalationService);
  const channel = await escalationService.initiateContactWithUser(
    'unknown:123',
    agent
  );
} catch (error) {
  if (error.message.includes('Invalid user or group ID')) {
    console.error('Invalid address format');
  } else if (error.message.includes('Provider')) {
    console.error('Unknown provider');
  } else {
    console.error('Escalation failed:', error);
  }
}
```

### State Management

The escalation service itself does not maintain state, but communication channels are managed through the async dispose
pattern. Channels are automatically cleaned up when:

- The `await using` block exits
- The `[Symbol.asyncDispose]` method is called
- An error occurs during communication

### Best Practices

1. **Always use `await using`**: Ensure proper cleanup of communication channels
2. **Validate addresses**: Check address format before calling `initiateContactWithUser`
3. **Handle errors gracefully**: Wrap escalation calls in try/catch blocks
4. **Use groups for collaboration**: Leverage group messaging for team decisions
5. **Set timeouts**: Consider implementing timeouts for long-running conversations
6. **Monitor resource usage**: Be mindful of multiple concurrent channels

### Use Cases

- **Approval Workflows**: Request human approval for critical operations
- **Decision Support**: Get human input on ambiguous situations
- **Error Resolution**: Escalate errors that require human intervention
- **Code Review**: Request human review of generated code
- **Deployment Approval**: Get sign-off before production deployments
- **Content Moderation**: Flag content for human review
- **Group Collaboration**: Broadcast messages to multiple team members and collect responses

### Package Structure

```text
pkg/escalation/
├── index.ts                    # Main exports
├── plugin.ts                   # Plugin definition for TokenRing integration
├── EscalationService.ts        # Core service implementation
├── EscalationProvider.ts       # Provider interface and types
├── GroupEscalationProvider.ts  # Built-in group provider implementation
├── schema.ts                   # Configuration schemas
├── commands.ts                 # Command exports
├── commands/
│   └── escalate.ts             # /escalate command implementation
├── vitest.config.ts            # Vitest configuration
└── LICENSE                     # MIT License
```

### Exports

The package exports the following:

```typescript
// Main exports from index.ts
export type { EscalationProvider };
export { default as EscalationService };
export { default as GroupEscalationProvider };
export {
  EscalationServiceConfigSchema,
  GroupEscalationProviderConfigSchema,
};
```
