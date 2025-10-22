import React, { useState, useRef, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection, Character } from '../types';

interface MainContentProps {
  item: SelectableItem | null;
  project: Project;
  onUpdateOutlineContent: (sectionId: string, newContent: string) => void;
  onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
  onToggleCharacterAssociation: (sectionId: string, characterId: string) => void;
  onConsistencyCheck: (section: OutlineSection) => void;
  onGenerateCharacterImage: (characterId: string) => void;
  isGeneratingImage: boolean;
}

const SparklesIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const PhotoIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const CharacterView: React.FC<{ 
    item: Extract<SelectableItem, { type: 'character' }>;
    onGenerateImage: (characterId: string) => void;
    isGeneratingImage: boolean;
    onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
}> = ({ item, onGenerateImage, isGeneratingImage, onUpdateCharacter }) => {
    const descRef = useRef<HTMLTextAreaElement>(null);
    const backstoryRef = useRef<HTMLTextAreaElement>(null);

    const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
    };

    useEffect(() => {
        // Adjust height on initial load and when switching characters
        adjustTextareaHeight(descRef.current);
        adjustTextareaHeight(backstoryRef.current);
    }, [item.id]);

    return (
        <>
            <div className="mb-8 aspect-square w-full max-w-md mx-auto bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-700">
            {item.imageUrl ? (
                <img 
                src={`data:image/png;base64,${item.imageUrl}`} 
                alt={`Portrait of ${item.name}`}
                className="w-full h-full object-cover"
                />
            ) : (
                <div className="text-center text-gray-500">
                <PhotoIcon className="h-24 w-24 mx-auto" />
                <p>No image generated yet.</p>
                </div>
            )}
            </div>
            <h1 className="text-4xl font-bold text-cyan-300 mb-6">{item.name}</h1>
            <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold text-gray-400 border-b border-gray-600 pb-2 mb-2">Description</h2>
                <textarea
                    ref={descRef}
                    key={`${item.id}-description`}
                    defaultValue={item.description}
                    onBlur={(e) => onUpdateCharacter(item.id, { description: e.target.value })}
                    onInput={(e) => adjustTextareaHeight(e.currentTarget)}
                    placeholder="Enter character description..."
                    aria-label="Character description"
                    className="w-full bg-transparent p-2 rounded-md text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-gray-800 transition-all resize-none min-h-[4rem]"
                />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-400 border-b border-gray-600 pb-2 mb-2">Backstory</h2>
                <textarea
                    ref={backstoryRef}
                    key={`${item.id}-backstory`}
                    defaultValue={item.backstory}
                    onBlur={(e) => onUpdateCharacter(item.id, { backstory: e.target.value })}
                    onInput={(e) => adjustTextareaHeight(e.currentTarget)}
                    placeholder="Enter character backstory..."
                    aria-label="Character backstory"
                    className="w-full bg-transparent p-2 rounded-md text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-gray-800 transition-all resize-none min-h-[4rem]"
                />
            </div>
            <div>
                <h2 className="text-lg font-semibold text-gray-400 border-b border-gray-600 pb-2 mb-2">Relationships</h2>
                <p className="text-gray-300 leading-relaxed p-2">{item.relationships}</p>
            </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-700">
                <button
                    onClick={() => onGenerateImage(item.id)}
                    disabled={isGeneratingImage}
                    className="w-full flex items-center justify-center p-3 rounded-md text-sm bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    aria-label={`Generate new image for ${item.name}`}
                >
                    {isGeneratingImage ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Generating...
                    </>
                    ) : (
                    <>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Generate New Image
                    </>
                    )}
                </button>
            </div>
        </>
    )
};

const OutlineView: React.FC<{
  item: Extract<SelectableItem, { type: 'outline' }>;
  project: Project;
  onUpdateOutlineContent: (sectionId: string, newContent: string) => void;
  onToggleCharacterAssociation: (sectionId: string, characterId: string) => void;
  onConsistencyCheck: (section: OutlineSection) => void;
}> = ({ item, project, onUpdateOutlineContent, onToggleCharacterAssociation, onConsistencyCheck }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToolClick = (toolAction: () => void) => {
    toolAction();
    setDropdownOpen(false);
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-cyan-300 mb-6">{item.title}</h1>
      
      <textarea
        key={item.id} // Re-mount to reflect state changes if another item is selected
        defaultValue={item.content}
        onBlur={(e) => onUpdateOutlineContent(item.id, e.target.value)}
        placeholder="Start writing the content for this section..."
        aria-label="Outline section content"
        className="w-full h-80 bg-gray-800 border border-gray-700 rounded-md p-4 text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
      />

      <div className="mt-6 relative inline-block text-left" ref={dropdownRef}>
        <div>
            <button
                type="button"
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                className="inline-flex items-center justify-center rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-colors"
                id="ai-tools-menu"
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
            >
                <SparklesIcon className="h-5 w-5 mr-2 -ml-1" />
                AI Tools
                <ChevronDownIcon className="h-5 w-5 ml-2 -mr-1" />
            </button>
        </div>

        {isDropdownOpen && (
            <div 
                className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="ai-tools-menu"
            >
                <div className="py-1" role="none">
                    <button
                        onClick={() => handleToolClick(() => onConsistencyCheck(item))}
                        className="w-full text-left text-gray-300 block px-4 py-2 text-sm hover:bg-gray-700 hover:text-white"
                        role="menuitem"
                    >
                        Check consistency
                    </button>
                    <button
                        disabled
                        className="w-full text-left text-gray-500 block px-4 py-2 text-sm cursor-not-allowed"
                        role="menuitem"
                    >
                        Get reading level
                    </button>
                    <button
                        disabled
                        className="w-full text-left text-gray-500 block px-4 py-2 text-sm cursor-not-allowed"
                        role="menuitem"
                    >
                        Clean up text
                    </button>
                </div>
            </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-700">
        <h2 className="text-lg font-semibold text-gray-400 pb-2 mb-4">Associated Characters</h2>
        <div className="flex flex-wrap gap-3">
          {project.characters.map(character => {
            const isAssociated = item.characterIds?.includes(character.id);
            return (
              <button
                key={character.id}
                onClick={() => onToggleCharacterAssociation(item.id, character.id)}
                aria-pressed={isAssociated}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-400 ${
                  isAssociated
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {character.name}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

const MainContent: React.FC<MainContentProps> = ({ item, project, onUpdateOutlineContent, onUpdateCharacter, onToggleCharacterAssociation, onConsistencyCheck, onGenerateCharacterImage, isGeneratingImage }) => {
  if (!item) {
    return (
      <main className="flex-1 p-8 flex items-center justify-center">
        <p className="text-gray-500">Select an item from the sidebar to view its details.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-10 overflow-y-auto bg-gray-900">
        {item.type === 'character' 
          ? <CharacterView 
              item={item}
              onGenerateImage={onGenerateCharacterImage}
              isGeneratingImage={isGeneratingImage}
              onUpdateCharacter={onUpdateCharacter}
            /> 
          : <OutlineView 
              item={item} 
              project={project}
              onUpdateOutlineContent={onUpdateOutlineContent}
              onToggleCharacterAssociation={onToggleCharacterAssociation}
              onConsistencyCheck={onConsistencyCheck}
            />
        }
    </main>
  );
};

export default MainContent;