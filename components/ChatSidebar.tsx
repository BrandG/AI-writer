import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChatMessage, Project, AiPersonality } from '../types';

interface ChatSidebarProps {
  project: Project;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (userInput: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  aiPersonality: AiPersonality;
  onAiPersonalityChange: (personality: AiPersonality) => void;
}

const SendIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const ChevronDoubleLeftIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
    </svg>
);

const ChevronDoubleRightIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5-7.5" />
    </svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);


const ChatSidebar: React.FC<ChatSidebarProps> = ({ project, messages, isLoading, onSendMessage, isCollapsed, onToggleCollapse, aiPersonality, onAiPersonalityChange }) => {
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const submitForm = () => {
    if (!userInput.trim() || isLoading) return;
    onSendMessage(userInput);
    setUserInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitForm();
    }
  };

  // Effect to auto-resize textarea based on content
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to allow shrinking
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to new scroll height
    }
  }, [userInput, isCollapsed]);

  return (
    <aside className={`bg-gray-800 flex flex-col border-l border-gray-700 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-0 p-0 border-none' : 'w-1/3 max-w-md p-4'}`}>
       <button
        onClick={onToggleCollapse}
        className={`absolute z-10 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
            isCollapsed
            ? 'top-1/2 -translate-y-1/2 left-[-16px] bg-gray-700 text-gray-300 hover:bg-cyan-600 hover:text-white h-8 w-8 rounded-full flex items-center justify-center border-2 border-gray-800'
            : 'top-4 left-4 p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white'
        }`}
        aria-label={isCollapsed ? 'Expand chat sidebar' : 'Collapse chat sidebar'}
      >
        {isCollapsed ? <ChevronDoubleLeftIcon className="h-5 w-5" /> : <ChevronDoubleRightIcon className="h-5 w-5" />}
      </button>

      {!isCollapsed && (
        <>
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2 pl-8 pr-2">
                <h2 className="text-xl font-bold">AI Assistant</h2>
                <div className="relative">
                    <select
                        id="ai-personality"
                        value={aiPersonality}
                        onChange={(e) => onAiPersonalityChange(e.target.value as AiPersonality)}
                        className="bg-gray-700 text-xs text-gray-300 rounded-md py-1 pl-2 pr-6 border-0 focus:ring-2 focus:ring-cyan-500 focus:outline-none appearance-none"
                        title="Change AI Personality"
                    >
                        <option value="assistant">Helpful Assistant</option>
                        <option value="muse">Creative Muse</option>
                        <option value="editor">Critical Editor</option>
                        <option value="peer">Supportive Peer</option>
                        <option value="oracle">The Oracle</option>
                    </select>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            </div>
            <div className="flex-grow overflow-y-auto mb-4 pr-2">
                <div className="space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-sm lg:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-700 text-white' : 'bg-gray-700 text-gray-200'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                    <div className="max-w-xs p-3 rounded-lg bg-gray-700 text-gray-200">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
                </div>
            </div>
            <form onSubmit={handleSubmit} className="flex mt-auto">
                <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your project..."
                className="flex-grow bg-gray-700 text-white rounded-l-md p-3 border-0 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                disabled={isLoading}
                rows={1}
                style={{ maxHeight: '150px' }}
                />
                <button
                type="submit"
                disabled={isLoading || !userInput.trim()}
                className="bg-cyan-600 text-white p-3 rounded-r-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
                aria-label="Send message to AI assistant"
                >
                <SendIcon className="h-6 w-6" />
                </button>
            </form>
        </>
      )}
    </aside>
  );
};

export default ChatSidebar;