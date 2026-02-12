import {AgentCommandService} from "@tokenring-ai/agent";
import {TokenRingPlugin} from "@tokenring-ai/app";
import {z} from "zod";
import chatCommands from "./chatCommands.ts";
import EscalationService from "./EscalationService.js";
import GroupEscalationProvider from "./GroupEscalationProvider.ts";
import packageJSON from "./package.json" with {type: "json"};
import {EscalationServiceConfigSchema, GroupEscalationProviderConfigSchema} from "./schema.ts";

const packageConfigSchema = z.object({
  escalation: EscalationServiceConfigSchema.optional(),
});

export default {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    if (config.escalation) {
      const service = new EscalationService(config.escalation);
      app.addServices(service);

      for (const [providerName, provider] of Object.entries(config.escalation.providers)) {
        if (provider.type === 'group') {
          service.registerProvider(providerName, new GroupEscalationProvider(GroupEscalationProviderConfigSchema.parse(provider)));
        }
      }

      app.waitForService(AgentCommandService, agentCommandService =>
        agentCommandService.addAgentCommands(chatCommands)
      );
    }
  },
  config: packageConfigSchema
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
