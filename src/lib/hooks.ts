import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Case, Hearing, CaseEvent, DocumentRecord, LegalReference, LegalAidResource, AgentTask } from '@/types';

export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setCases((data || []) as Case[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { cases, loading, error, reload: load };
}

export function useCase(id: string | undefined) {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase.from('cases').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => {
        setCaseData(data as Case | null);
        setLoading(false);
      });
  }, [id]);

  return { caseData, loading };
}

export function useCaseEvents(caseId: string | undefined) {
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!caseId) { setLoading(false); return; }
    const { data } = await supabase
      .from('case_events')
      .select('*')
      .eq('case_id', caseId)
      .order('event_date', { ascending: false });
    setEvents((data || []) as CaseEvent[]);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);
  return { events, loading, reload: load };
}

export function useHearings() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('hearings')
      .select('*')
      .order('hearing_date', { ascending: true });
    setHearings((data || []) as Hearing[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { hearings, loading, reload: load };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    setDocuments((data || []) as DocumentRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { documents, loading, reload: load };
}

export function useLegalReferences() {
  const [references, setReferences] = useState<LegalReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('legal_references').select('*').order('title')
      .then(({ data }) => {
        setReferences((data || []) as LegalReference[]);
        setLoading(false);
      });
  }, []);

  return { references, loading };
}

export function useLegalAidResources() {
  const [resources, setResources] = useState<LegalAidResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('legal_aid_resources').select('*').order('authority_type')
      .then(({ data }) => {
        setResources((data || []) as LegalAidResource[]);
        setLoading(false);
      });
  }, []);

  return { resources, loading };
}

export function useAgentTasks(caseId?: string) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let query = supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(50);
    if (caseId) query = query.eq('case_id', caseId);
    const { data } = await query;
    setTasks((data || []) as AgentTask[]);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);
  return { tasks, loading, reload: load };
}

export async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true });
  const num = (count ?? 0) + 1;
  return `LNA-${year}-${String(num).padStart(4, '0')}`;
}

export async function logAgentTask(task: {
  case_id?: string | null;
  document_id?: string | null;
  agent_name: AgentTask['agent_name'];
  task_type: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: AgentTask['status'];
  error?: string | null;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('agent_tasks').insert({
    ...task,
    user_id: user.id,
    started_at: task.status === 'running' ? new Date().toISOString() : null,
    completed_at: task.status === 'completed' || task.status === 'failed' ? new Date().toISOString() : null,
  });
}
