import type { Agent } from "@tokenring-ai/agent";
import type { MaybePromise } from "bun";

export type CommunicationChannel = {
  send: (message: string) => Promise<void>;
  receive: () => AsyncGenerator<string>;
  close?: never;
} & (AsyncDisposable | Disposable);

export type EscalationProvider = {
  createCommunicationChannelWithUser: (userId: string, agent: Agent) => MaybePromise<CommunicationChannel>;
};
