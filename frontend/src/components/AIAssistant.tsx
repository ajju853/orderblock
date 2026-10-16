import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisResult, OrderBlockZone } from '../types';
import { Send, Bot, User, Loader2, Globe } from 'lucide-react';

interface AIAssistantProps {
  analysis: AnalysisResult | null;
  selectedZone: OrderBlockZone | null;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  executionTime?: number;
  timestamp: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  analysis,
  selectedZone,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Namaste! Main hoon aapka **BlockMind AI** assistant. Local Python engine ke verified market data aur structure breaks ke basis par main aapko order blocks aur setups explain karunga. Kis zone ya structure par analysis chahiye?',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [language, setLanguage] = useState<'hinglish' | 'hi' | 'en'>('hinglish');
  const [model, setModel] = useState<string>('qwen3:8b-fast');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle external prompts (e.g. from Zone Inspector button)
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) onClearExternalPrompt();
    }
  }, [externalPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const question = textToSend || input;
    if (!question.trim() || loading || !analysis) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: analysis.symbol,
          timeframe: analysis.timeframe,
          selected_zone_id: selectedZone?.id || null,
          question: question,
          language: language,
          model: model,
        }),
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        modelUsed: data.model_used,
        executionTime: data.execution_time_ms,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with local analysis backend: ${err.message}. Ensure backend is running at http://127.0.0.1:8000.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Bhai ye setup explain karo',
    'Invalidation & Stop Loss level kya hai?',
    'Market structure BOS & CHoCH review',
    'FVG confluence check karo',
  ];

  return (
    <div className="ai-chat-view">
      {/* Controls Bar */}
      <div
        style={{
          padding: '8px 14px',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Globe size={13} style={{ color: 'var(--accent)' }} />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: '0.75rem',
            }}
          >
            <option value="hinglish">Hinglish (Ajju style)</option>
            <option value="hi">Hindi</option>
            <option value="en">English (SMC)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Bot size={13} style={{ color: 'var(--bullish)' }} />
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: '0.75rem',
            }}
          >
            <option value="qwen3:8b-fast">qwen3:8b-fast (Accurate)</option>
            <option value="qwen3:8b">qwen3:8b (Standard)</option>
            <option value="llama3.2:1b">llama3.2:1b (Ultra Fast)</option>
          </select>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="chat-history">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`message-bubble ${m.role}`}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                  fontSize: '0.7rem',
                  color: isUser ? '#cbd5e1' : 'var(--text-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isUser ? <User size={12} /> : <Bot size={12} style={{ color: 'var(--accent)' }} />}
                  <span style={{ fontWeight: 600 }}>{isUser ? 'You' : 'BlockMind AI'}</span>
                  {m.modelUsed && (
                    <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>({m.modelUsed})</span>
                  )}
                </div>
                <span>{m.timestamp}</span>
              </div>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: isUser ? 'var(--font-main)' : 'var(--font-main)',
                }}
              >
                {m.content}
              </div>
              {m.executionTime && (
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    marginTop: 4,
                  }}
                >
                  ⚡ Verified in {m.executionTime}ms
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="message-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={16} className="pulse-dot" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Querying {model} with verified chart facts...
            </span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick chips and input box */}
      <div className="chat-input-box">
        <div className="quick-prompts">
          {quickPrompts.map((q, idx) => (
            <button key={idx} className="prompt-chip" onClick={() => handleSendMessage(q)}>
              {q}
            </button>
          ))}
        </div>

        <form
          className="input-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            className="chat-input"
            placeholder={
              selectedZone
                ? `Ask about selected ${selectedZone.type} zone...`
                : 'Ask about market structure, zones, or trend...'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};
