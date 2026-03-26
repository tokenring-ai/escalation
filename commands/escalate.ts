import {AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand} from "@tokenring-ai/agent/types";
import type {CommunicationChannel} from "@tokenring-ai/escalation/EscalationProvider";
import EscalationService from "../EscalationService.ts";

const description = "Send escalation request";

const inputSchema = {
  args: {},
  positionals: [{name: "target", description: "Target user or group in service:userId format (e.g., slack:U123ABC, group:dev-team)", required: true}],
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

/escalate {service:userId|group:groupName} {message}

## Example

/escalate slack:U123ABC Production server experiencing high latency
/escalate telegram:123456789 Project deadline extension request
/escalate group:dev-team Need code review for authentication module`;

export default {
  name: "escalate",
  help,
  description,
  inputSchema,
  execute,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
