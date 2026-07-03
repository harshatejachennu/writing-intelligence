import type { AgentDef } from "./types";
import { analyzerAgent } from "./analyzer";
import { extractorAgent } from "./extractor";
import { goalProfileAgent } from "./goal-profile";
import { plannerAgent } from "./planner";
import { generatorAgent } from "./generator";
import { criticAgent } from "./critic";
import { reviserAgent } from "./reviser";
import { curatorAgent } from "./curator";
import { voiceAgent } from "./voice";
import { compareAgent } from "./compare";
import { inspirationAgent } from "./inspiration";

/**
 * Central registry of all agents. Later phases register planner, generator,
 * critic, reviser, etc. The execution core and API routes look agents up by id,
 * so adding an agent is additive.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AGENTS: Record<string, AgentDef<any, any>> = {
  [analyzerAgent.id]: analyzerAgent,
  [extractorAgent.id]: extractorAgent,
  [goalProfileAgent.id]: goalProfileAgent,
  [plannerAgent.id]: plannerAgent,
  [generatorAgent.id]: generatorAgent,
  [criticAgent.id]: criticAgent,
  [reviserAgent.id]: reviserAgent,
  [curatorAgent.id]: curatorAgent,
  [voiceAgent.id]: voiceAgent,
  [compareAgent.id]: compareAgent,
  [inspirationAgent.id]: inspirationAgent,
};

export function getAgent(id: string) {
  const agent = AGENTS[id];
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}
