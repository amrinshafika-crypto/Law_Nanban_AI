import { supabase } from '@/lib/supabase';

export type ProfessionalAgentName =
  | 'triage'
  | 'legal_research'
  | 'document_intelligence'
  | 'case_summary'
  | 'legal_drafting'
  | 'case_strategy';

export interface ProfessionalAgentResult {
  agent: ProfessionalAgentName;
  answer: string;
}

export interface ProfessionalAgentFailure {
  agent: ProfessionalAgentName;
  code: string;
  message: string;
}

export interface ProfessionalAgentBatch {
  orchestrator: {
    selectedAgents: ProfessionalAgentName[];
    completedAgents: ProfessionalAgentName[];
    failedAgents: ProfessionalAgentName[];
  };
  results: ProfessionalAgentResult[];
  failures: ProfessionalAgentFailure[];
}

const AGENT_NAMES: ProfessionalAgentName[] = ['triage', 'legal_research', 'document_intelligence', 'case_summary', 'legal_drafting', 'case_strategy'];

function isAgentName(value: unknown): value is ProfessionalAgentName {
  return typeof value === 'string' && AGENT_NAMES.includes(value as ProfessionalAgentName);
}

async function functionErrorMessage(error: unknown) {
  const context = error && typeof error === 'object' ? (error as { context?: unknown }).context : undefined;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: { message?: unknown } };
      if (typeof payload.error?.message === 'string' && payload.error.message.length <= 300) return payload.error.message;
    } catch { /* Fall back to a generic, sanitized message. */ }
  }
  return 'Professional AI could not complete the request. Check your account access and try again.';
}

export async function runProfessionalAgents(
  agents: ProfessionalAgentName[],
  context: Record<string, unknown>,
): Promise<ProfessionalAgentBatch> {
  const { data, error } = await supabase.functions.invoke('law-nanban-professional-ai', {
    body: { agents, context },
  });

  if (error) {
    throw new Error(await functionErrorMessage(error));
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.results) || !Array.isArray(data.failures)) {
    throw new Error('Professional AI returned an invalid response. Please try again.');
  }

  const results = data.results.filter((item: unknown): item is ProfessionalAgentResult =>
    Boolean(item && typeof item === 'object'
      && isAgentName((item as ProfessionalAgentResult).agent)
      && typeof (item as ProfessionalAgentResult).answer === 'string'),
  );
  const failures = data.failures.filter((item: unknown): item is ProfessionalAgentFailure =>
    Boolean(item && typeof item === 'object'
      && isAgentName((item as ProfessionalAgentFailure).agent)
      && typeof (item as ProfessionalAgentFailure).code === 'string'
      && typeof (item as ProfessionalAgentFailure).message === 'string'),
  );
  if (results.length === 0) {
    throw new Error(failures[0]?.message || 'Professional AI did not return an analysis. Please try again.');
  }

  return {
    orchestrator: data.orchestrator,
    results,
    failures,
  } as ProfessionalAgentBatch;
}
