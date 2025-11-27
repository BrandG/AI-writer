
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChatMessage, Project, AiPersonality } from '../types';

interface ChatSidebarProps {
  project: Project;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (userInput: string, isCouncilMode: boolean) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  aiPersonality: AiPersonality;
  onAiPersonalityChange: (personality: AiPersonality) => void;
  width: number;
  isResizing: boolean;
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

const ScaleIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
  </svg>
);


const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  project, messages, isLoading, onSendMessage, isCollapsed, onToggleCollapse, 
  aiPersonality, onAiPersonalityChange, width, isResizing 
}) => {
  const [userInput, setUserInput] = useState('');
  const [isCouncilMode, setIsCouncilMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const submitForm = () => {
    if (!userInput.trim() || isLoading) return;
    onSendMessage(userInput, isCouncilMode);
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
    <aside 
      className={`bg-gray-800 flex flex-col overflow-hidden relative ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
      style={{ width: isCollapsed ? '0px' : `${width}px`, padding: isCollapsed ? '0px' : '1rem' }}
    >
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
            <div className="flex flex-col mb-4 border-b border-gray-700 pb-2 pl-8 pr-2">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold truncate">AI Assistant</h2>
                    <button
                        onClick={() => setIsCouncilMode(!isCouncilMode)}
                        className={`p-1.5 rounded-md transition-all duration-200 border ${isCouncilMode ? 'bg-purple-900/50 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' : 'bg-transparent border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                        title={isCouncilMode ? "Council Mode Active" : "Enable Council Mode"}
                    >
                        <ScaleIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="relative">
                    <select
                        id="ai-personality"
                        value={aiPersonality}
                        onChange={(e) => onAiPersonalityChange(e.target.value as AiPersonality)}
                        disabled={isCouncilMode} // Disable personality when council is active
                        className={`w-full text-xs rounded-md py-1 pl-2 pr-6 border-0 focus:ring-2 focus:ring-cyan-500 focus:outline-none appearance-none transition-colors ${isCouncilMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-gray-300'}`}
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
                {isCouncilMode && (
                    <div className="text-[10px] text-purple-400 mt-1 flex items-center gap-1 font-semibold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                        THE COUNCIL IS CONVENED
                    </div>
                )}
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
            <form onSubmit={handleSubmit} className="flex mt-auto relative">
                <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isCouncilMode ? "Ask the Council..." : "Ask about your project..."}
                className={`flex-grow text-white rounded-l-md p-3 border-2 focus:outline-none resize-none transition-all duration-300 ${
                    isCouncilMode 
                    ? 'bg-gray-800 border-purple-600 focus:ring-0 placeholder-purple-400/50' 
                    : 'bg-gray-700 border-transparent focus:ring-2 focus:ring-cyan-500'
                }`}
                disabled={isLoading}
                rows={1}
                style={{ maxHeight: '150px' }}
                />
                <button
                type="submit"
                disabled={isLoading || !userInput.trim()}
                className={`p-3 rounded-r-md text-white transition-colors duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed ${
                    isCouncilMode 
                    ? 'bg-purple-600 hover:bg-purple-500' 
                    : 'bg-cyan-600 hover:bg-cyan-500'
                }`}
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
