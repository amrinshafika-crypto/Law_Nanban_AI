import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageCircle, RotateCcw, Send, User, Plus, History } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Card, PageHeader } from '@/components/ui';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { MarkdownMessage } from '@/components/MarkdownMessage';

type ChatMessage = { role: 'user' | 'model'; text: string };
type Conversation = { id: string; title: string; updated_at: string };

const starters = [
  ['What are my rights if I am arrested?', 'கைது செய்யப்பட்டால் எனக்கு என்ன உரிமைகள் உள்ளன?'],
  ['What should I do if I face online fraud?', 'இணைய மோசடியை எதிர்கொண்டால் நான் என்ன செய்ய வேண்டும்?'],
  ['How can I file a consumer complaint?', 'நுகர்வோர் புகார் அளிப்பது எப்படி?'],
  ['What legal protection is available for women?', 'பெண்களுக்கு என்ன சட்டப் பாதுகாப்பு உள்ளது?'],
  ['How can I get free legal aid in India?', 'இந்தியாவில் இலவச சட்ட உதவி பெறுவது எப்படி?'],
];

export function CitizenAsk({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const { user } = useAuth();
  const location = useLocation();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedQuestion, setFailedQuestion] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState('');
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    if (!user) { setConversations([]); return; }
    void supabase.from('citizen_conversations').select('id,title,updated_at').order('updated_at', { ascending: false }).limit(30)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setHistoryError(lang === 'ta' ? 'உரையாடல் வரலாற்றை ஏற்ற முடியவில்லை.' : 'Conversation history could not be loaded.');
        else setConversations((data || []) as Conversation[]);
      });
    return () => { active = false; };
  }, [user, lang]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prompt = params.get('prompt');
    if (prompt && !question) {
      setQuestion(prompt);
    }
  }, [location.search, question]);

  async function sendQuestion(rawQuestion: string) {
    const query = rawQuestion.trim();
    if (!query || busy.current) return;
    busy.current = true;
    setError('');
    setFailedQuestion('');
    setQuestion('');
    setLoading(true);
    setMessages((previous) => [...previous, { role: 'user', text: query }]);
    const requestHistory = messages.slice(-10).map(({ role, text }) => ({ role, text }));
    if (requestHistory[0]?.role === 'model') requestHistory.shift();
    const aborter = new AbortController();
    controller.current = aborter;
    const timer = window.setTimeout(() => aborter.abort(), 80_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${supabaseUrl}/functions/v1/law-nanban-chat`, {
        method: 'POST',
        signal: aborter.signal,
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ question: query, history: requestHistory }),
      });
      const responseText = await response.text();
      let data: { answer?: unknown; error?: unknown; code?: unknown };
      try { data = JSON.parse(responseText) as typeof data; } catch {
        throw new Error(`The assistant endpoint returned HTTP ${response.status} without a readable response.`);
      }
      if (!response.ok) throw new Error(`${typeof data.code === 'string' ? `${data.code}: ` : ''}${typeof data.error === 'string' ? data.error : `http_${response.status}`}`);
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('empty_response');
      const answer = data.answer as string;
      setMessages((previous) => [...previous, { role: 'model', text: answer.trim() }]);
      if (user) {
        let activeConversationId = conversationId;
        if (!activeConversationId) {
          const { data: created, error: createError } = await supabase.from('citizen_conversations')
            .insert({ title: query.slice(0, 150), language: lang }).select('id,title,updated_at').single();
          if (createError || !created) {
            setHistoryError(lang === 'ta' ? 'பதில் கிடைத்தது; உரையாடலைச் சேமிக்க முடியவில்லை.' : 'Answer received, but the conversation could not be saved.');
            return;
          }
          activeConversationId = created.id;
          setConversationId(created.id);
          setConversations((previous) => [created as Conversation, ...previous]);
        }
        const { error: saveError } = await supabase.from('citizen_messages').insert([
          { conversation_id: activeConversationId, role: 'user', content: query },
          { conversation_id: activeConversationId, role: 'model', content: answer.trim() },
        ]);
        if (saveError) setHistoryError(lang === 'ta' ? 'பதில் கிடைத்தது; ஆனால் வரலாற்றைச் சேமிக்க முடியவில்லை.' : 'Answer received, but this exchange could not be saved to history.');
        else {
          setHistoryError('');
          void supabase.from('citizen_conversations').select('id,title,updated_at').order('updated_at', { ascending: false }).limit(30)
            .then(({ data: refreshed }) => { if (refreshed) setConversations(refreshed as Conversation[]); });
        }
      }
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : '';
      const timedOut = aborter.signal.aborted;
      console.error('Law Nanban chat request failed', { reason: timedOut ? 'timeout' : reason.slice(0, 80) });
      setMessages((previous) => {
        const last = previous[previous.length - 1];
        return last?.role === 'user' && last.text === query ? previous.slice(0, -1) : previous;
      });
      setQuestion(query);
      setFailedQuestion(query);
      const errorMessage = reason.toLowerCase();
      const tamil = lang === 'ta';
      const returnedStatus = Number(/http[_ ](\d{3})/i.exec(reason)?.[1] || 0);
      if (errorMessage.includes('ai_response_incomplete')) {
        setError(tamil ? 'AI பதில் முழுமையடையாமல் நிறுத்தப்பட்டது. குறுகிய கேள்வியுடன் மீண்டும் முயற்சிக்கவும்.' : 'The AI response was cut off and could not be completed. Please retry with a shorter question.');
        return;
      }
      setError(timedOut || returnedStatus === 504 || errorMessage.includes('ai_timeout') || errorMessage.includes('taking longer') || errorMessage.includes('http_504')
        ? (tamil ? 'பதில் பெற தாமதமாகிறது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.' : 'Law Nanban is taking longer than expected. Please try again.')
        : errorMessage.includes('ai_auth') || errorMessage.includes('credentials')
          ? (tamil ? 'AI சேவையின் அமைப்பைச் சரிபார்க்க வேண்டும். பின்னர் மீண்டும் முயற்சிக்கவும்.' : 'The AI service credentials need attention. Please try again later.')
          : errorMessage.includes('not configured')
            ? (tamil ? 'சட்ட உதவியாளர் இன்னும் அமைக்கப்படவில்லை. பின்னர் முயற்சிக்கவும்.' : 'The legal assistant is not configured yet. Please try again later.')
          : errorMessage.includes('ai_rate_limit') || errorMessage.includes('busy') || errorMessage.includes('http_429') || returnedStatus === 429
              ? (tamil ? 'AI சேவை இப்போது பிஸியாக உள்ளது. சிறிது நேரம் கழித்து முயற்சிக்கவும்.' : 'The AI service is busy. Please try again shortly.')
              : errorMessage.includes('ai_upstream') || errorMessage.includes('temporarily unavailable') || errorMessage.includes('http_5') || (returnedStatus >= 500 && returnedStatus <= 599)
                ? (tamil ? 'AI à®šà¯‡à®µà¯ˆà®¯à®¿à®©à¯ à®µà¯‡à®£à¯à®Ÿà¯à®•à¯‹à®³à¯ˆ à®®à¯à®Ÿà®¿à®•à¯à®•à®µà®¿à®²à¯à®²à¯ˆ. à®šà®¿à®±à®¿à®¤à¯ à®¨à¯‡à®°à®®à¯ à®•à®´à®¿à®¤à¯à®¤à¯ à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯à®®à¯.' : 'Groq returned a server error. Please retry later.')
              : errorMessage.includes('ai_network')
                ? (tamil ? 'AI à®šà¯‡à®µà¯ˆà®¯à¯ˆ à®…à®£à¯à®• à®®à¯à®Ÿà®¿à®¯à®µà®¿à®²à¯à®²à¯ˆ. à®‡à®£à¯ˆà®ªà¯à®ªà¯ˆà®šà¯ à®šà®°à®¿à®ªà®¾à®°à¯à®¤à¯à®¤à¯ à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯®®à¯.' : 'Could not reach Groq from the Edge Function. Please retry later.')
              : errorMessage.includes('ai_request_rejected') || (returnedStatus >= 400 && returnedStatus <= 499)
                ? (tamil ? 'AI à®šà¯‡à®µà¯ˆ à®•à¯‡à®³à¯à®µà®¿à®¯à¯ˆ à®à®±à¯à®•à®µà®¿à®²à¯à®²à¯ˆ. à®ªà®¿à®©à¯à®©à®°à¯ à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯à®®à¯.' : 'Groq rejected the request. Check the Edge Function logs for the sanitized provider detail.')
              : errorMessage.includes('model is unavailable') || errorMessage.includes('ai_model_unavailable')
                ? (tamil ? 'AI மாதிரி தற்காலிகமாக கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.' : 'The configured AI model is unavailable. Please try again later.')
                : (tamil ? 'பதில் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' : 'The assistant request failed. Please retry; if it continues, check the Edge Function logs.'));
    } finally {
      window.clearTimeout(timer);
      if (controller.current === aborter) controller.current = null;
      busy.current = false;
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!loading && question.trim()) void sendQuestion(question);
    }
  }

  function clearChat() {
    controller.current?.abort();
    busy.current = false;
    setMessages([]);
    setQuestion('');
    setError('');
    setFailedQuestion('');
    setConversationId(null);
    setHistoryError('');
    setLoading(false);
  }

  async function openConversation(id: string) {
    if (loading) return;
    setHistoryError('');
    const { data, error: queryError } = await supabase.from('citizen_messages').select('role,content').eq('conversation_id', id).order('created_at');
    if (queryError) { setHistoryError(lang === 'ta' ? 'உரையாடலைத் திறக்க முடியவில்லை.' : 'Could not open this conversation.'); return; }
    setConversationId(id);
    setMessages((data || []).map((message) => ({ role: message.role as ChatMessage['role'], text: message.content })));
    setQuestion(''); setError(''); setFailedQuestion('');
  }

  return <>
    <PageHeader title={t.ask.title} subtitle={t.ask.subtitle} action={<button className="btn-outline" type="button" onClick={clearChat} disabled={loading}><Plus size={15} />{lang === 'ta' ? 'புதிய உரையாடல்' : 'New conversation'}</button>} />
    {user && conversations.length > 0 && <Card className="mb-4 p-4"><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy-800"><History size={16} />{lang === 'ta' ? 'முந்தைய உரையாடல்கள்' : 'Conversation history'}</h2><div className="flex gap-2 overflow-x-auto pb-1">{conversations.map((item) => <button key={item.id} type="button" onClick={() => void openConversation(item.id)} className={`max-w-64 shrink-0 truncate rounded-lg border px-3 py-2 text-left text-xs ${conversationId === item.id ? 'border-accent-500 bg-accent-50 text-accent-800' : 'border-navy-200 text-navy-700 hover:border-accent-400'}`}>{item.title}</button>)}</div></Card>}
    {historyError && <p className="mb-3 text-xs text-gold-800" role="status">{historyError}</p>}
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-navy-100 pb-4">
        <div className="rounded-full bg-accent-100 p-3"><Bot size={23} className="text-accent-700" /></div>
        <div><h2 className="font-semibold text-navy-900">Law Nanban AI</h2><p className="text-xs text-navy-500">{lang === 'ta' ? 'இந்தியச் சட்டத் தகவல் உதவியாளர் · Groq' : 'Indian legal information assistant · Groq'}</p></div>
      </div>
      <div className="max-h-[55vh] min-h-32 space-y-5 overflow-y-auto py-2" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <div className="py-5 text-center"><MessageCircle size={36} className="mx-auto mb-3 text-accent-600" /><h3 className="font-semibold text-navy-900">{lang === 'ta' ? 'உங்கள் கேள்வியைக் கேளுங்கள்' : 'How can I help you?'}</h3><p className="mt-2 text-sm text-navy-500">{lang === 'ta' ? 'இந்தியச் சட்டம் மற்றும் உரிமைகள் குறித்து தமிழிலோ ஆங்கிலத்திலோ கேளுங்கள்.' : 'Ask about Indian law and your rights in English or Tamil.'}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">{starters.map(([en, ta]) => <button key={en} type="button" disabled={loading} onClick={() => void sendQuestion(lang === 'ta' ? ta : en)} className="rounded-full border border-navy-200 px-3 py-2 text-left text-xs text-navy-700 hover:border-accent-500 hover:text-accent-700 disabled:opacity-50">{lang === 'ta' ? ta : en}</button>)}</div>
        </div>}
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`h-fit shrink-0 rounded-full p-2 ${message.role === 'user' ? 'bg-navy-100 text-navy-700' : 'bg-accent-100 text-accent-700'}`}>{message.role === 'user' ? <User size={17} /> : <Bot size={17} />}</div>
          <div className={`max-w-[88%] break-words rounded-xl p-4 text-sm leading-7 ${message.role === 'user' ? 'bg-navy-800 text-white whitespace-pre-wrap' : 'bg-navy-50 text-navy-800 whitespace-normal'}`}>
            {message.role === 'user' ? message.text : <MarkdownMessage content={message.text} />}
          </div>
        </div>)}
        {loading && <div className="flex items-center gap-3 text-sm text-navy-500"><span className="animate-pulse rounded-full bg-accent-100 p-2 text-accent-700"><Bot size={17} /></span>{lang === 'ta' ? 'பதில் தயாராகிறது...' : 'Law Nanban is thinking...'}</div>}
      </div>
      {error && <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-danger-700"><span>{error}</span><button type="button" className="inline-flex items-center gap-1 underline" onClick={() => void sendQuestion(failedQuestion)} disabled={loading}><RotateCcw size={14} />{lang === 'ta' ? 'மீண்டும் முயற்சி' : 'Retry'}</button></div>}
      <form onSubmit={submit} className="mt-5 border-t border-navy-100 pt-5">
        <label htmlFor="citizen-question" className="label">{lang === 'ta' ? 'உங்கள் கேள்வி' : 'Your question'}</label>
        <textarea id="citizen-question" className="input min-h-24" required maxLength={4000} value={question} disabled={loading} onChange={(event) => setQuestion(event.target.value)} onKeyDown={onKeyDown} placeholder={t.ask.placeholder} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-navy-500">{lang === 'ta' ? 'Enter அனுப்பும் · Shift+Enter புதிய வரி' : 'Enter to send · Shift+Enter for a new line'}</p><button type="submit" disabled={loading || !question.trim()} className="btn-primary disabled:opacity-50"><Send size={16} />{loading ? (lang === 'ta' ? 'அனுப்புகிறது...' : 'Sending...') : t.ask.send}</button></div>
      </form>
    </Card>
    <p className="mt-4 text-xs text-navy-500">{t.ask.disclaimer}</p>
  </>;
}
