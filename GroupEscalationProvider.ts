import type {Agent} from "@tokenring-ai/agent";
import {z} from "zod";
import {EscalationService} from "./index.ts";

import {GroupEscalationProviderConfigSchema} from "./schema.ts";

export type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  receive: () => AsyncGenerator<string>;
  close: () => Promise<void>;
}

export type EscalationProvider = {
  createCommunicationChannelWithUser: (userId: string, agent: Agent) => Promise<CommunicationChannel>;
}


export default class GroupEscalationProvider implements EscalationProvider {
  constructor(readonly config: z.output<typeof GroupEscalationProviderConfigSchema>) {
  }

  async createCommunicationChannelWithUser(groupId: string, agent: Agent): Promise<CommunicationChannel> {
    const escalationService = agent.requireServiceByType(EscalationService);

    const members = this.config.members[groupId as any] ?? null;
    if (!members) throw new Error("Invalid group ID: " + groupId + ".")

    const channels: { userOrGroupId: string; channel: CommunicationChannel }[] = [];

    for (const userOrGroupId of members) {
      //TODO: It is possible for the user to nest groups, which will likely cause problems

      channels.push({userOrGroupId, channel: await escalationService.initiateContactWithUser(userOrGroupId, agent)});
    }

    const abortController = new AbortController();

    return {
      send: async (msg: string) => {
        await Promise.all(channels.map(c => c.channel.send(msg)));
      },
      receive: async function* () {
        const producers = channels.map(async function* ({userOrGroupId, channel}) {
          for await (const incomingMsg of channel.receive()) {
            if (abortController.signal.aborted) return;

            // Broadcast to other group members
            const broadcastMsg = `@${userOrGroupId} ${incomingMsg}`;
            const others = channels.filter(c => c.userOrGroupId !== userOrGroupId);
            await Promise.all(others.map(c => c.channel.send(broadcastMsg)));

            yield incomingMsg;
          }
        });

        // Merge all generators into one stream
        const activeProducers = new Set(producers.map(p => p[Symbol.asyncIterator]()));

        while (activeProducers.size > 0 && !abortController.signal.aborted) {
          const nexts = Array.from(activeProducers).map(it => it.next().then(res => ({it, res})));
          const {it, res} = await Promise.race(nexts);

          if (res.done) {
            activeProducers.delete(it);
          } else {
            yield res.value;
          }
        }
      },
      close: async () => {
        abortController.abort();
        await Promise.all(channels.map(c => c.channel.close()));
      }
    };
  }
}