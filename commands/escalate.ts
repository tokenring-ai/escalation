import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import type {CommunicationChannel} from "@tokenring-ai/escalation/EscalationProvider";
import EscalationService from "../EscalationService.js";

const description = "Send escalation request";

const inputSchema = {
  args: {},
  positionals: [{name: "target", description: "Target user or group (user@service or group)", required: true}],
  remainder: {name: "message", description: "Message to send", required: true}
} as const satisfies AgentCommandInputSchema;

async function execute({positionals: {target}, remainder, agent}: AgentCommandInputType<typeof inputSchema>): Promise<string> {

  const escalationService = agent.requireServiceByType(EscalationService);
  await using channel: CommunicationChannel = await escalationService.initiateContactWithUser(target, agent);
  await channel.send(remainder);
  return `Escalation sent to ${target}.`;
}

const help = `Send a message to a specific user or group for further assistance or oversight.

## Usage

/escalate {user@service|group} {message}

## Example

/escalate manager@slack Project deadline extension request
/escalate dev-ops The production server is experiencing high latency`;

export default {
  name: "escalate",
  help,
  description,
  inputSchema,
  execute,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
