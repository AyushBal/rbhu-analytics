import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { Button, formErrorMessage } from '../components/ui';

interface Turn { role: 'user' | 'assistant' | 'error'; text: string }
const SESSION_KEY = 'rbhu.chat.session';
const SUGGESTIONS = ['Give me a status summary', 'Where is shipment RBHU-DEMO1001?', 'How many shipments are delivered?'];

export function AssistantPage() {
  const [sessionId, setSessionId] = useState<string | undefined>(() => localStorage.getItem(SESSION_KEY) ?? undefined);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    api<{ messages: { role: 'user' | 'assistant'; content: string }[] }>(`/chat/${sessionId}`)
      .then((r) => setTurns(r.messages.map((m) => ({ role: m.role, text: m.content }))))
      .catch(() => { localStorage.removeItem(SESSION_KEY); setSessionId(undefined); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns, busy]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || busy) return;
    setTurns((t) => [...t, { role: 'user', text: m }]);
    setText('');
    setBusy(true);
    try {
      const r = await api<{ sessionId: string; reply: string }>('/chat', { method: 'POST', body: { sessionId, message: m } });
      localStorage.setItem(SESSION_KEY, r.sessionId);
      setSessionId(r.sessionId);
      setTurns((t) => [...t, { role: 'assistant', text: r.reply }]);
    } catch (e) {
      setTurns((t) => [...t, { role: 'error', text: formErrorMessage(e) }]);
    } finally { setBusy(false); }
  };

  const reset = async () => {
    if (sessionId) await api(`/chat/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    localStorage.removeItem(SESSION_KEY); setSessionId(undefined); setTurns([]);
  };

  return (
    <>
      <div className="page-head"><h1>Assistant</h1>{turns.length > 0 && <Button variant="ghost" onClick={reset}>New conversation</Button>}</div>
      <div className="chat">
        <div className="chat-log" aria-live="polite">
          {turns.length === 0 && (
            <div className="empty"><strong>Ask about shipments or operations</strong>
              <div className="chips">{SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div>
            </div>
          )}
          {turns.map((t, i) => <div key={i} className={`bubble bubble-${t.role}`}>{t.text}</div>)}
          {busy && <div className="bubble bubble-assistant typing">Thinking…</div>}
          <div ref={end} />
        </div>
        <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <input className="input" value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="Type your question" aria-label="Message" />
          <Button type="submit" disabled={!text.trim()} loading={busy}>Send</Button>
        </form>
      </div>
    </>
  );
}
