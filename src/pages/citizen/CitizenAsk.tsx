import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, MessageCircle, RotateCcw, Send, User } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { Lang } from '@/i18n';
import { Card, PageHeader } from '@/components/ui';
import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';

type ChatMessage = { role: 'user' | 'model'; text: string };

const starters = [
  ['What are my rights if I am arrested?', 'கைது செய்யப்பட்டால் எனக்கு என்ன உரிமைகள் உள்ளன?'],
  ['What should I do if I face online fraud?', 'இணைய மோசடியை எதிர்கொண்டால் நான் என்ன செய்ய வேண்டும்?'],
  ['How can I file a consumer complaint?', 'நுகர்வோர் புகார் அளிப்பது எப்படி?'],
  ['What legal protection is available for women?', 'பெண்களுக்கு என்ன சட்டப் பாதுகாப்பு உள்ளது?'],
  ['How can I get free legal aid in India?', 'இந்தியாவில் இலவச சட்ட உதவி பெறுவது எப்படி?'],
];

export function CitizenAsk({ lang }: { lang: Lang }) {
  const t = useTranslations(lang);
  const location = useLocation();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedQuestion, setFailedQuestion] = useState('');
  const controller = useRef<AbortController | null>(null);
  const busy = useRef(false);

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
    const timer = window.setTimeout(() => aborter.abort(), 35_000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${supabaseUrl}/functions/v1/law-nanban-chat`, {
        method: 'POST',
        signal: aborter.signal,
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${session?.access_token ?? supabaseAnonKey}`,
        },
        body: JSON.stringify({ question: query, history: requestHistory }),
      });
      let data: { answer?: unknown; error?: unknown };
      try { data = await response.json(); } catch { throw new Error('invalid_response'); }
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `http_${response.status}`);
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('empty_response');
      const answer = data.answer as string;
      setMessages((previous) => [...previous, { role: 'model', text: answer.trim() }]);
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : '';
      const timedOut = aborter.signal.aborted;
      console.error('Law Nanban chat request failed', { reason: timedOut ? 'timeout' : reason.slice(0, 80) });
      setMessages((previous) => {
        const last = previous[previous.length - 1];
        return last?.role === 'user' && last.text === query ? previous.slice(0, -1) : previous;
      });
      setFailedQuestion(query);
      const errorMessage = reason.toLowerCase();
      const tamil = lang === 'ta';
      setError(timedOut
        ? (tamil ? 'பதில் பெற தாமதமாகிறது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.' : 'Law Nanban is taking longer than expected. Please try again.')
        : errorMessage.includes('credentials')
          ? (tamil ? 'AI சேவையின் அமைப்பைச் சரிபார்க்க வேண்டும். பின்னர் மீண்டும் முயற்சிக்கவும்.' : 'The AI service credentials need attention. Please try again later.')
          : errorMessage.includes('not configured')
            ? (tamil ? 'சட்ட உதவியாளர் இன்னும் அமைக்கப்படவில்லை. பின்னர் முயற்சிக்கவும்.' : 'The legal assistant is not configured yet. Please try again later.')
            : errorMessage.includes('busy')
              ? (tamil ? 'AI சேவை இப்போது பிஸியாக உள்ளது. சிறிது நேரம் கழித்து முயற்சிக்கவும்.' : 'The AI service is busy. Please try again shortly.')
              : errorMessage.includes('model is unavailable')
                ? (tamil ? 'AI மாதிரி தற்காலிகமாக கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.' : 'The configured AI model is unavailable. Please try again later.')
                : (tamil ? 'பதில் பெற முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' : 'Unable to get a response. Check your connection and try again.'));
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
    setLoading(false);
  }

  return <>
    <PageHeader title={t.ask.title} subtitle={t.ask.subtitle} action={messages.length > 0 ? <button className="btn-outline" type="button" onClick={clearChat} disabled={loading}>{lang === 'ta' ? 'உரையாடலை அழி' : 'Clear chat'}</button> : undefined} />
    <Card className="p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3 border-b border-navy-100 pb-4">
        <div className="rounded-full bg-accent-100 p-3"><Bot size={23} className="text-accent-700" /></div>
        <div><h2 className="font-semibold text-navy-900">Law Nanban AI</h2><p className="text-xs text-navy-500">{lang === 'ta' ? 'இந்தியச் சட்டத் தகவல் உதவியாளர் · Gemini' : 'Indian legal information assistant · Gemini'}</p></div>
      </div>
      <div className="max-h-[55vh] min-h-32 space-y-5 overflow-y-auto py-2" aria-live="polite" aria-relevant="additions text">
        {messages.length === 0 && <div className="py-5 text-center"><MessageCircle size={36} className="mx-auto mb-3 text-accent-600" /><h3 className="font-semibold text-navy-900">{lang === 'ta' ? 'உங்கள் கேள்வியைக் கேளுங்கள்' : 'How can I help you?'}</h3><p className="mt-2 text-sm text-navy-500">{lang === 'ta' ? 'இந்தியச் சட்டம் மற்றும் உரிமைகள் குறித்து தமிழிலோ ஆங்கிலத்திலோ கேளுங்கள்.' : 'Ask about Indian law and your rights in English or Tamil.'}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">{starters.map(([en, ta]) => <button key={en} type="button" disabled={loading} onClick={() => void sendQuestion(lang === 'ta' ? ta : en)} className="rounded-full border border-navy-200 px-3 py-2 text-left text-xs text-navy-700 hover:border-accent-500 hover:text-accent-700 disabled:opacity-50">{lang === 'ta' ? ta : en}</button>)}</div>
        </div>}
        {messages.map((message, index) => <div key={`${index}-${message.role}`} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`h-fit shrink-0 rounded-full p-2 ${message.role === 'user' ? 'bg-navy-100 text-navy-700' : 'bg-accent-100 text-accent-700'}`}>{message.role === 'user' ? <User size={17} /> : <Bot size={17} />}</div>
          <div className={`max-w-[88%] break-words rounded-xl p-4 text-sm leading-7 whitespace-pre-wrap ${message.role === 'user' ? 'bg-navy-800 text-white' : 'bg-navy-50 text-navy-800'}`}>{message.text}</div>
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
