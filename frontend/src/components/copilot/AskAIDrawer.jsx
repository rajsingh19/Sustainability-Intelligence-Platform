import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Maximize2,
  Minimize2,
  ArrowRight
} from 'lucide-react';
import { askCopilot } from '../../services/api';

export default function AskAIDrawer({
  isOpen,
  onClose,
  activeDocument,
  document: docProp,
  onNavigateToDocument
}) {
  const effectiveDocument = activeDocument || docProp;
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your Sensible Sustainability AI Copilot. Ask me anything about your uploaded bills, emissions calculations, reduction opportunities, or compliance disclosures.',
      suggestions: [
        'What is our total carbon footprint across posted documents?',
        'Which documents currently need review?',
        'What are the highest priority emission reduction opportunities?',
        'Summarize Scope 1 vs Scope 2 emissions breakdown'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    setError(null);
    setInput('');

    // Prepare history payload (last 6 turns)
    const historyPayload = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content }));

    const userMsg = { role: 'user', content: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const docId = effectiveDocument?.id || null;
      const res = await askCopilot(query, historyPayload, docId);
      
      const assistantMsg = {
        role: 'assistant',
        content: res.answer || 'Analysis complete.',
        sources: res.sources || [],
        actions: res.actions || [],
        recommendations: res.recommendations || []
      };

      setMessages([...updatedMessages, assistantMsg]);
    } catch (err) {
      console.error('Ask AI error:', err);
      setError('Unable to reach the sustainability AI service. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content, index) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation cleared. How can I help you analyze your sustainability data today?',
        suggestions: [
          'What is our total carbon footprint across posted documents?',
          'Which documents currently need review?',
          'What are the highest priority emission reduction opportunities?'
        ]
      }
    ]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end pointer-events-auto">
      {/* Dim backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div 
        className={`relative w-full ${isExpanded ? 'max-w-2xl' : 'max-w-md'} bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full z-10 transition-all duration-200 ease-out`}
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#0F6B56] text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                  Ask Sustainability AI
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Deterministic
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {effectiveDocument ? `Scoped to Doc #${effectiveDocument.id}` : 'Cross-document intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
              title={isExpanded ? 'Collapse width' : 'Expand width'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
              title="Clear conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-3.5 py-2.5 shadow-2xs leading-relaxed ${
                    isUser
                      ? 'bg-[#0F6B56] text-white font-medium rounded-br-none'
                      : 'bg-slate-100/90 text-slate-900 border border-slate-200/70 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Sources Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Verified Sources ({msg.sources.length}):
                      </span>
                      <div className="space-y-1">
                        {msg.sources.map((src, sIdx) => (
                          <div
                            key={sIdx}
                            onClick={() => {
                              if (src.document_id && onNavigateToDocument) {
                                onNavigateToDocument(src.document_id);
                                onClose();
                              }
                            }}
                            className="p-1.5 bg-white rounded border border-slate-200 text-[11px] hover:border-emerald-500 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center space-x-1.5 truncate">
                              <FileText className="w-3 h-3 text-[#0F6B56] shrink-0" />
                              <span className="truncate font-medium text-slate-800">
                                {src.filename || `Doc #${src.document_id}`}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                              #{src.document_id}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Recommendations */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/80 space-y-1">
                      {msg.actions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSend(typeof action === 'string' ? action : action.label)}
                          className="w-full text-left p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold rounded text-[11px] border border-emerald-200/70 flex items-center justify-between transition-colors"
                        >
                          <span className="truncate">{typeof action === 'string' ? action : action.label}</span>
                          <ArrowRight className="w-3 h-3 text-emerald-700 shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message footer with copy button */}
                  {!isUser && (
                    <div className="mt-1.5 flex justify-end">
                      <button
                        onClick={() => handleCopy(msg.content, idx)}
                        className="text-[10px] text-slate-400 hover:text-slate-700 inline-flex items-center space-x-1"
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggestions Pills for first welcome message */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 w-full space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 block px-1">
                      Suggested questions:
                    </span>
                    <div className="space-y-1.5">
                      {msg.suggestions.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSend(sug)}
                          className="w-full text-left px-3 py-2 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-[#0F6B56] rounded-lg text-xs transition-colors shadow-2xs flex items-center justify-between group"
                        >
                          <span className="truncate">{sug}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-[#0F6B56] shrink-0 ml-1 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-500 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <Loader2 className="w-4 h-4 animate-spin text-[#0F6B56]" />
              <span className="text-xs">Analyzing documents and calculating answers...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about emissions, bills, factors..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0F6B56] focus:border-[#0F6B56] transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-[#0F6B56] hover:bg-[#0c5947] text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-slate-400">
            Powered by Sensible Sustainability AI Engine &bull; Strictly Auditable
          </div>
        </div>
      </div>
    </div>
  );
}
