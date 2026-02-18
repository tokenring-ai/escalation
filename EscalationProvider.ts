import type {Agent} from "@tokenring-ai/agent";

export type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  receive: () => AsyncGenerator<string>;
  close?: never;
  [Symbol.asyncDispose]: () => Promise<void>;
}

export type EscalationProvider = {
  createCommunicationChannelWithUser: (userId: string, agent: Agent) => Promise<CommunicationChannel>;
}
