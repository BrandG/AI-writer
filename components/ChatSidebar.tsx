import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Project } from '../types';

interface ChatSidebarProps {
  project: Project;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (userInput: string) => void;
}

const SendIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);


const ChatSidebar: React.FC<ChatSidebarProps> = ({ project, messages, isLoading, onSendMessage }) => {
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    onSendMessage(userInput);
    setUserInput('');
  };

  return (
    <aside className="w-1/3 max-w-md bg-gray-800 flex flex-col p-4 border-l border-gray-700">
      <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">AI Assistant</h2>
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
      <form onSubmit={handleSubmit} className="flex items-center mt-auto">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask about your project..."
          className="flex-grow bg-gray-700 text-white rounded-l-md p-3 border-0 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          disabled={isLoading}
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
    </aside>
  );
};

export default ChatSidebar;