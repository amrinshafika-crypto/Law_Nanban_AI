import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Case, Hearing, CaseEvent, DocumentRecord, LegalReference, LegalAidResource, AgentTask } from '@/types';

const fallbackLegalAidResources: LegalAidResource[] = [
  {
    id: 'nalsa-national',
    name: 'NALSA — National Legal Services Authority',
    authority_type: 'national',
    state: 'India',
    district: null,
    address: 'NALSA Secretariat, Supreme Court Complex, New Delhi',
    phone: '+91-11-2338-2124',
    email: 'nalsa-dte@nic.in',
    website: 'https://nalsa.gov.in/',
    description: 'National legal-aid body responsible for legal services and legal-aid policy in India.',
    services: ['Legal advice', 'Legal representation', 'Lok Adalat guidance'],
    eligibility: 'Eligible persons include women, children, SC/ST communities, disabled persons, migrants, industrial workers and persons with limited means.',
    language: ['en', 'hi'],
    verified: true,
  },
  {
    id: 'tnslsa',
    name: 'Tamil Nadu State Legal Services Authority',
    authority_type: 'state',
    state: 'Tamil Nadu',
    district: null,
    address: 'High Court Campus, Chennai',
    phone: '+91-44-2534-9000',
    email: 'tlsa@nic.in',
    website: 'https://tamilnadulegalservicesauthority.tn.gov.in/',
    description: 'State legal-services authority for Tamil Nadu, including legal aid, lok adalats and legal awareness.',
    services: ['Free legal aid', 'Legal advice', 'Lok Adalat support'],
    eligibility: 'Eligible persons can apply based on income limits, vulnerability and legal need as set out by the legal-services authorities.',
    language: ['en', 'ta'],
    verified: true,
  },
  {
    id: 'tn-dlsa-chennai',
    name: 'Chennai District Legal Services Authority',
    authority_type: 'district',
    state: 'Tamil Nadu',
    district: 'Chennai',
    address: 'Chennai District Court Complex',
    phone: '+91-44-2524-3000',
    email: 'dlsc-chennai@tn.gov.in',
    website: 'https://tnslsa.tn.gov.in/',
    description: 'District-level legal-aid authority for Chennai.',
    services: ['Legal aid', 'Advice', 'Case assistance'],
    eligibility: 'Income and vulnerability criteria apply; eligible persons should contact the authority directly.',
    language: ['en', 'ta'],
    verified: true,
  },
];

export function useCases() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setCaseData(null);
    if (!id) { setLoading(false); return; }
    supabase.from('cases').select('*').eq('id', id).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        else setCaseData(data as Case | null);
        setLoading(false);
      });
  }, [id]);

  return { caseData, loading, error };
}

export function useCaseEvents(caseId: string | undefined) {
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) { setEvents([]); setError(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('case_events')
      .select('*')
      .eq('case_id', caseId)
      .order('event_date', { ascending: false });
    if (queryError) setError(queryError.message);
    else setEvents((data || []) as CaseEvent[]);
    setLoading(false);
  }, [caseId]);

  useEffect(() => { load(); }, [load]);
  return { events, loading, error, reload: load };
}

export function useHearings() {
  const [hearings, setHearings] = useState<Hearing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('hearings')
      .select('*')
      .order('hearing_date', { ascending: true });
    if (queryError) setError(queryError.message);
    else setHearings((data || []) as Hearing[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { hearings, loading, error, reload: load };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setDocuments((data || []) as DocumentRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  return { documents, loading, error, reload: load };
}

export function useLegalReferences() {
  const [references, setReferences] = useState<LegalReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase.from('legal_references').select('*').order('title');
      if (queryError) setError(queryError.message);
      else setReferences((data || []) as LegalReference[]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load legal references.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { references, loading, error, reload: load };
}

export function useLegalAidResources() {
  const [resources, setResources] = useState<LegalAidResource[]>(fallbackLegalAidResources);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase.from('legal_aid_resources').select('*').order('authority_type');
      if (queryError) {
        setError(queryError.message);
        setResources(fallbackLegalAidResources);
        return;
      }
      const nextResources = ((data && data.length > 0 ? data : fallbackLegalAidResources) as LegalAidResource[]).map((resource) => ({
        ...resource,
        services: Array.isArray(resource.services) ? resource.services : [],
        language: Array.isArray(resource.language) ? resource.language : ['en'],
      }));
      setResources(nextResources);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load legal-aid resources.');
      setResources(fallbackLegalAidResources);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { resources, loading, error, reload: load };
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
