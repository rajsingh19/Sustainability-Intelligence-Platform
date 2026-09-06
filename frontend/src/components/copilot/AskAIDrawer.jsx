import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Bot,
  User,
  ExternalLink,
  Layers,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { askCopilot } from '../../services/api';

export default function AskAIDrawer({ isOpen, onClose, document: activeDoc }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastQuestion, setLastQuestion] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});
  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Scroll to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Escape key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const docId = activeDoc?.id || null;
  const docFilename = activeDoc?.original_filename || activeDoc?.filename || null;
  const docType = activeDoc?.document_type || null;

  // Dynamic suggested prompts
  const getSuggestions = () => {
    if (activeDoc) {
      const type = (docType || '').toLowerCase();
      if (type.includes('electr') || type.includes('power') || type.includes('energy')) {
        return [
          'Summarize energy consumption & demand',
          'What are the greenhouse gas emissions?',
          'Which extracted fields need verification?',
          'How can we reduce electricity costs?'
        ];
      }
      if (type.includes('esg') || type.includes('audit') || type.includes('carbon')) {
        return [
          'Summarize this ESG audit report',
          'What are the total Scope 1 and Scope 2 emissions?',
          'What compliance gaps are identified?',
          'Compare metrics against industry standards'
        ];
      }
      if (type.includes('waste') || type.includes('fuel')) {
        return [
          'Summarize quantities and material types',
          'What are the calculated carbon emissions?',
          'Explain the extraction quality score',
          'What actions does the AI agent recommend?'
        ];
      }
      return [
        'Summarize this document',
        'What key sustainability metrics are recorded?',
        'Which fields are missing or low confidence?',
        'What are the calculated emissions?'
      ];
    }

    // Portfolio-wide prompts
    return [
      'What is our total carbon footprint across all documents?',
      'Which documents currently need review or verification?',
      'What are our top decarbonization opportunities?',
      'How are Scope 1 vs Scope 2 emissions distributed?'
    ];
  };

  const suggestions = getSuggestions();

  const handleSendMessage = async (textToSend) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || isLoading) return;

    setInput('');
    setErrorMessage(null);
    setLastQuestion(queryText);

    const userMessage = {
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      // Format history for backend
      const formattedHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await askCopilot(queryText, formattedHistory, docId);

      const assistantMessage = {
        role: 'assistant',
        content: response.answer || response.content || response.response || 'No answer generated.',
        sources: response.sources || response.evidence || [],
        confidence: response.confidence_level || 'HIGH',
        calculated_insights: response.calculated_insights || [],
        timestamp: new Date().toISOString(),
      };

      setMessages([...newHistory, assistantMessage]);
    } catch (err) {
      console.error('Error in AI Assistant request:', err);
      const errDetail = err.response?.data?.detail || err.message || 'Failed to get answer from AI Assistant.';
      setErrorMessage(errDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (index, text) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleSources = (index) => {
    setExpandedSources((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    setLastQuestion(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-drawer">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EAF7F2] text-[#0F6B56] flex items-center justify-center font-bold border border-[#c4eedf]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">Sensible AI Assistant</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EAF7F2] text-[#0F6B56] border border-[#c4eedf]">
                  Hybrid RAG
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                {activeDoc ? `Scoped to #${activeDoc.id}: ${docFilename}` : 'Portfolio Intelligence & Analytics'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Context Status Banner */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Layers className="w-3.5 h-3.5 text-[#0F6B56]" />
            <span className="font-medium">
              {activeDoc ? `Document Context: ${docType || 'Utility Bill'}` : 'Scope: All Verified Data & Reports'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Strict Lineage</span>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-6 pt-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-[#EAF7F2] text-[#0F6B56] flex items-center justify-center mx-auto shadow-xs border border-[#c4eedf]">
                  <Bot className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-900">
                  How can I help with your sustainability data?
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Ask questions about extracted metrics, emission calculations, compliance gaps, or decarbonization opportunities.
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Suggested Prompts
                </span>
                <div className="space-y-1.5">
                  {suggestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="w-full text-left p-2.5 rounded-lg bg-slate-50 hover:bg-[#EAF7F2]/60 hover:border-[#c4eedf] border border-slate-200 text-xs text-slate-700 hover:text-[#0F6B56] transition-all flex items-center justify-between group"
                    >
                      <span className="truncate pr-2">{q}</span>
                      <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0F6B56] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-2.5 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border ${
                        isUser
                          ? 'bg-slate-900 text-white border-slate-800'
                          : 'bg-[#EAF7F2] text-[#0F6B56] border-[#c4eedf]'
                      }`}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>

                    {/* Content Box */}
                    <div
                      className={`max-w-[85%] rounded-xl p-3.5 text-xs space-y-2 ${
                        isUser
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 border border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>

                      {/* Assistant Actions & Source Lineage */}
                      {!isUser && (
                        <div className="pt-2 border-t border-slate-200/60 flex flex-col space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Verified Extraction Lineage</span>
                            </span>

                            <button
                              onClick={() => handleCopyMessage(index, msg.content)}
                              className="p-1 hover:text-slate-600 transition-colors flex items-center space-x-1"
                              title="Copy answer"
                            >
                              {copiedIndex === index ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-[10px] text-emerald-600">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-[10px]">Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Expandable Citations */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleSources(index)}
                                className="text-[11px] text-[#0F6B56] hover:underline flex items-center space-x-1 font-medium"
                              >
                                <span>{msg.sources.length} Evidence Source{msg.sources.length > 1 ? 's' : ''}</span>
                                {expandedSources[index] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {expandedSources[index] && (
                                <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-[#0F6B56]/30">
                                  {msg.sources.map((src, sIdx) => (
                                    <div key={sIdx} className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                                      <div className="font-semibold text-slate-800">{src.title || src.field || 'Evidence'}</div>
                                      {src.snippet && <div className="italic text-slate-500 mt-0.5">"{src.snippet}"</div>}
                                      {src.page_number && <div className="text-[9px] text-slate-400 mt-0.5">Page {src.page_number}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EAF7F2] text-[#0F6B56] border border-[#c4eedf] flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-500 flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F6B56]" />
                    <span>Analyzing documents & resolving emission lineage...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Assistant Error</p>
                      <p className="text-[11px] text-rose-600 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                  {lastQuestion && (
                    <button
                      onClick={() => handleSendMessage(lastQuestion)}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 rounded text-[10px] font-semibold text-rose-800 flex items-center space-x-1 shrink-0 ml-2"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activeDoc ? `Ask about #${activeDoc.id}...` : 'Ask about carbon, metrics, or documents...'}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F6B56] focus:bg-white transition-colors"
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-[#0F6B56] hover:bg-[#0c5947] text-white rounded-xl transition-colors disabled:opacity-40 shadow-xs shrink-0"
              title="Send message"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Powered by Deterministic Verification + Copilot RAG</span>
            <span>Esc to close</span>
          </div>
        </div>

      </div>
    </div>
  );
}
