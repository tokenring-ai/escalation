import type { ConfigFieldMeta } from "@tokenring-ai/app/config/metadata";
import z from "zod";

export const GroupEscalationProviderConfigSchema = z.object({
  members: z
    .record(z.string(), z.array(z.string()))
    .meta({ label: "Members", description: "Escalation targets per member, keyed by member name" } satisfies ConfigFieldMeta),
});

export const EscalationServiceConfigSchema = z
  .object({
    groups: z
      .record(z.string(), GroupEscalationProviderConfigSchema)
      .meta({ label: "Groups", description: "Escalation groups, keyed by name" } satisfies ConfigFieldMeta),
  })
  .meta({ label: "Escalation", description: "Rules for escalating agent decisions to humans" } satisfies ConfigFieldMeta);
