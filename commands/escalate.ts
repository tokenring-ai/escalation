import {CommandFailedError} from "@tokenring-ai/agent/AgentError";
import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import type {CommunicationChannel} from "@tokenring-ai/escalation/EscalationProvider";
import EscalationService from "../EscalationService.js";

const description = "Send escalation request";

const inputSchema = {
  args: {},
  prompt: {
    description: "Target and message: {user@service|group} {message}",
    required: true,
  },
  allowAttachments: false,
} as const satisfies AgentCommandInputSchema;

async function execute({prompt, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const parts = prompt.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new CommandFailedError("Usage: /escalate {user@service|group} {message}");
  }

  const target = parts[0];
  const message = parts.slice(1).join(' ');

  const escalationService = agent.requireServiceByType(EscalationService);
  
  await using channel: CommunicationChannel = await escalationService.initiateContactWithUser(target, agent);

  await channel.send(message);
  return `Escalation sent to ${target}.`;
}

const help = `# 🚀 ESCALATE COMMAND

## Usage

\`/escalate {user@service|group} {message}\`

The escalate command allows you to send a message to a specific user or group for further assistance or oversight.

## Arguments

- **{user@service|group}** - The identifier of the recipient. This can be a specific user address (e.g., \`human@slack\`) or a predefined group.
- **{message}** - The detailed content or context of the escalation request.

## Examples

- \`/escalate manager@slack Project deadline extension request\`
- \`/escalate dev-ops The production server is experiencing high latency\`

## Notes

- This command is synchronous: it sends the message and waits for a response from the escalation target.
- The response from the recipient will be displayed in the chat once received.`;

export default {
  name: "escalate",
  help,
  description,
  inputSchema,
  execute,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
