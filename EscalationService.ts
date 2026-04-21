import type { Agent } from "@tokenring-ai/agent";
import type { TokenRingService } from "@tokenring-ai/app/types";
import KeyedRegistry from "@tokenring-ai/utility/registry/KeyedRegistry";
import type { z } from "zod";
import type { CommunicationChannel, EscalationProvider } from "./EscalationProvider.ts";

import type { EscalationServiceConfigSchema } from "./schema.ts";

export default class EscalationService implements TokenRingService {
  readonly name = "EscalationService";
  description = "Service for escalating messages to users and receiving responses";

  private providers = new KeyedRegistry<EscalationProvider>();

  constructor(readonly config: z.output<typeof EscalationServiceConfigSchema>) {}

  registerProvider = this.providers.set;

  async initiateContactWithUser(serviceNameAndUser: string, agent: Agent): Promise<CommunicationChannel> {
    const [, serviceName, userId] = serviceNameAndUser.match(/^(.*?):(.*)$/) ?? [];
    if (userId && serviceName) {
      const provider = this.providers.require(serviceName);
      return await provider.createCommunicationChannelWithUser(userId, agent);
    }

    throw new Error(`Invalid user or group ID: ${serviceNameAndUser}`);
  }
}
