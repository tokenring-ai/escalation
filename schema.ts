import z from "zod";

export const EscalationServiceConfigSchema = z.object({
  providers: z.record(z.string(), z.any()),
});

export const GroupEscalationProviderConfigSchema = z.object({
  type: z.literal('group'),
  members: z.record(z.string(), z.array(z.string()))
});
