import z from "zod";

export const GroupEscalationProviderConfigSchema = z.object({
  members: z.record(z.string(), z.array(z.string())),
});

export const EscalationServiceConfigSchema = z.object({
  groups: z.record(z.string(), GroupEscalationProviderConfigSchema),
});
