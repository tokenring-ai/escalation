import Agent from "@tokenring-ai/agent/Agent";
import {TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import type {CommunicationChannel} from "@tokenring-ai/escalation/EscalationProvider";
import EscalationService from "../EscalationService.js";

const description = "/escalate {user@service|group} {message} - Send escalation request";
async function execute(remainder: string, agent: Agent): Promise<void> {
  const parts = remainder.trim().split(/\s+/);
  if (parts.length < 2) {
    agent.errorMessage("Usage: /escalate {user@service|group} {message}");
    return;
  }

  const target = parts[0];
  const message = parts.slice(1).join(' ');

  const escalationService = agent.requireServiceByType(EscalationService);
  
  const channel: CommunicationChannel = await escalationService.initiateContactWithUser(target, agent);

  await channel.send(message);
  agent.infoMessage(`Escalation sent to ${target}.`);
  await channel.close()
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
  help,
  description,
  execute,
} satisfies TokenRingAgentCommand;
