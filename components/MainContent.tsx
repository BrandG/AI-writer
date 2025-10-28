import React, { useState, useRef, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection, Character } from '../types';
import { ActiveTab } from './WritingWorkspace';
import { getImage } from '../services/imageDbService';
import Dropdown from './Dropdown';


interface MainContentProps {
  item: SelectableItem | null;
  project: Project;
  activeTab: ActiveTab;
  onUpdateOutlineContent: (sectionId: string, newContent: string) => void;
  onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
  onDeleteCharacterRequest: (character: Character) => void;
  onUpdateNotes: (newNotes: string) => void;
  onToggleCharacterAssociation: (sectionId: string, characterId: string) => void;
  onConsistencyCheck: (section: OutlineSection) => void;
  onGenerateCharacterImage: (characterId: string) => void;
  isGeneratingImage: boolean;
  onGenerateIllustration: (sectionId: string) => void;
  isGeneratingIllustration: boolean;
  onDeleteCharacterImage: (characterId: string) => void;
  onDeleteIllustration: (sectionId: string) => void;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

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

const ImageViewer: React.FC<{ imageUrl?: string, alt: string, className: string, placeholder: React.ReactNode }> = ({ imageUrl, alt, className, placeholder }) => {
    const [displaySrc, setDisplaySrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        if (!imageUrl) {
            setDisplaySrc(null);
            return;
        }

        // If it starts with 'image-', it's a key for IndexedDB
        if (imageUrl.startsWith('image-')) {
            setIsLoading(true);
            setDisplaySrc(null); // Clear previous image
            getImage(imageUrl)
                .then(b64data => {
                    if (isMounted && b64data) {
                        setDisplaySrc(`data:image/png;base64,${b64data}`);
                    }
                })
                .catch(err => console.error("Failed to load image from DB", err))
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        } else {
            // Otherwise, assume it's a fresh base64 string from the AI
            setDisplaySrc(`data:image/png;base64,${imageUrl}`);
            setIsLoading(false);
        }
        
        return () => { isMounted = false; };
    }, [imageUrl]);

    if (isLoading) {
        return (
            <div className={`${className.replace('object-cover', '')} flex items-center justify-center bg-gray-800`}>
                <div className="w-8 h-8 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (displaySrc) {
        return <img src={displaySrc} alt={alt} className={className} />;
    }
    
    return <>{placeholder}</>;
};

const CollapsibleSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 mb-6 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left text-lg font-bold text-gray-200 hover:bg-gray-700/50 focus:outline-none transition-colors"
                aria-expanded={isOpen}
            >
                <span>{title}</span>
                <ChevronDownIcon className={`h-5 w-5 transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-4 border-t border-gray-700">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable component for editable character fields to reduce boilerplate
const EditableCharacterField: React.FC<{
    character: Character;
    field: keyof Character;
    label: string;
    onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
    placeholder?: string;
}> = ({ character, field, label, onUpdateCharacter, placeholder = "Enter details..." }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [currentValue, setCurrentValue] = useState(character[field] as string || '');

    const wordCount = (currentValue || '').trim().split(/\s+/).filter(Boolean).length;

    const adjustTextareaHeight = (element: HTMLTextAreaElement | null) => {
        if (!element) return;
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
    };

    useEffect(() => {
        // Sync local state if character or field content changes from props
        setCurrentValue(character[field] as string || '');
    }, [character.id, character[field], field]);

    useEffect(() => {
        // Adjust height on initial render and when content changes
        adjustTextareaHeight(textareaRef.current);
    }, [currentValue]);


    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-400 border-b border-gray-600 pb-2 mb-2">{label}</h2>
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    key={`${character.id}-${field}`}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    onBlur={() => onUpdateCharacter(character.id, { [field]: currentValue })}
                    placeholder={placeholder}
                    aria-label={label}
                    className="w-full bg-transparent p-2 pb-8 rounded-md text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-gray-800 transition-all resize-none min-h-[4rem]"
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-900/50 px-1 rounded">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                </div>
            </div>
        </div>
    );
};

const CharacterView: React.FC<{ 
    item: Extract<SelectableItem, { type: 'character' }>;
    onGenerateImage: (characterId: string) => void;
    onDeleteImage: (characterId: string) => void;
    isGeneratingImage: boolean;
    onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
    onDeleteCharacterRequest: (character: Character) => void;
}> = ({ item, onGenerateImage, onDeleteImage, isGeneratingImage, onUpdateCharacter, onDeleteCharacterRequest }) => {
    return (
        <>
            <div className="group relative mb-8 aspect-square w-full max-w-md mx-auto bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-700">
                <ImageViewer
                    imageUrl={item.imageUrl}
                    alt={`Portrait of ${item.name}`}
                    className="w-full h-full object-cover"
                    placeholder={
                        <div className="text-center text-gray-500">
                            <PhotoIcon className="h-24 w-24 mx-auto" />
                            <p>No image generated yet.</p>
                        </div>
                    }
                />
                 {item.imageUrl && (
                    <button
                        onClick={() => onDeleteImage(item.id)}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white/80 hover:bg-red-600 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Delete image for ${item.name}`}
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

             <input
                key={`${item.id}-name`}
                defaultValue={item.name}
                onBlur={(e) => e.target.value.trim() && onUpdateCharacter(item.id, { name: e.target.value.trim() })}
                aria-label="Character name"
                className="w-full text-4xl font-bold text-cyan-300 mb-6 bg-transparent rounded-md p-2 -m-2 focus:outline-none focus:bg-gray-800 focus:ring-2 focus:ring-cyan-500"
            />
            
            <div className="mb-6">
                <EditableCharacterField character={item} field="description" label="Description" onUpdateCharacter={onUpdateCharacter} placeholder="Enter character description..."/>
            </div>

            <CollapsibleSection title="Core Identity" defaultOpen={false}>
                <div className="space-y-6">
                    <EditableCharacterField character={item} field="aliases" label="Aliases / Titles" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="age" label="Age / Birthdate / Timeline Notes" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="gender" label="Gender / Pronouns" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="species" label="Species / Race / Origin" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="occupation" label="Occupation / Social Role / Rank" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="affiliations" label="Affiliations" onUpdateCharacter={onUpdateCharacter} />
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title="Physical Description" defaultOpen={false}>
                <div className="space-y-6">
                    <EditableCharacterField character={item} field="heightBuild" label="Height / Build / Posture / Movement style" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="faceHairEyes" label="Face / Hair / Eyes / Distinguishing Features" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="styleOutfit" label="Style / Typical Outfit / Accessories" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="vocalTraits" label="Vocal Traits / Speech Patterns" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="healthAbilities" label="Health / Physical Limitations / Abilities" onUpdateCharacter={onUpdateCharacter} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Psychology & Motivation" defaultOpen={false}>
                 <div className="space-y-6">
                    <EditableCharacterField character={item} field="coreMotivation" label="Core Motivation / Primary Desire" onUpdateCharacter={onUpdateCharacter} placeholder="What drives them every day?"/>
                    <EditableCharacterField character={item} field="longTermGoal" label="Long-Term Goal" onUpdateCharacter={onUpdateCharacter} placeholder="What do they think will fulfill them?"/>
                    <EditableCharacterField character={item} field="fearFlaw" label="Fear / Flaw / Blind Spot" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="moralAlignment" label="Moral Alignment / Values / Boundaries" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="temperament" label="Temperament / Personality Type" onUpdateCharacter={onUpdateCharacter} placeholder="MBTI, Enneagram, archetype, etc." />
                    <EditableCharacterField character={item} field="emotionalTriggers" label="Emotional Triggers / Habits / Quirks" onUpdateCharacter={onUpdateCharacter} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Voice & Behavior" defaultOpen={false}>
                 <div className="space-y-6">
                    <EditableCharacterField character={item} field="dictionSlangTone" label="Diction / Slang / Tone" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="gesturesHabits" label="Common Gestures / Physical Habits" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="signaturePhrases" label="Signature Phrases / Speech Tics" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="internalThoughtStyle" label="Internal Thought Style" onUpdateCharacter={onUpdateCharacter} placeholder="e.g., pragmatic, poetic, paranoid" />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Backstory" defaultOpen={false}>
                 <div className="space-y-6">
                    <EditableCharacterField character={item} field="originStory" label="Origin Story / Key Formative Events" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="familyMentors" label="Family / Mentors / Enemies / Lovers" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="secretsRegrets" label="Secrets / Regrets / Turning Points" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="relationshipsTimeline" label="Major Relationships Timeline" onUpdateCharacter={onUpdateCharacter} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Narrative Function" defaultOpen={false}>
                 <div className="space-y-6">
                    <EditableCharacterField character={item} field="storyRole" label="Story Role / Archetype" onUpdateCharacter={onUpdateCharacter} placeholder="e.g., mentor, trickster, foil, love interest"/>
                    <EditableCharacterField character={item} field="introductionPoint" label="Introduction Point" onUpdateCharacter={onUpdateCharacter} placeholder="Where do they first appear in the story?"/>
                    <EditableCharacterField character={item} field="arcSummary" label="Arc Summary" onUpdateCharacter={onUpdateCharacter} placeholder="beginning → midpoint → end"/>
                    <EditableCharacterField character={item} field="conflictContribution" label="Conflict Contribution" onUpdateCharacter={onUpdateCharacter} placeholder="How do they drive tension?"/>
                    <EditableCharacterField character={item} field="changeMetric" label="Change Metric" onUpdateCharacter={onUpdateCharacter} placeholder="What lesson do they learn, or fail to learn?"/>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Context & World Integration" defaultOpen={false}>
                 <div className="space-y-6">
                    <EditableCharacterField character={item} field="homeEnvironmentInfluence" label="Home / Environment Influence" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="culturalReligiousBackground" label="Cultural / Religious Background" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="economicPoliticalStatus" label="Economic / Political Status" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="technologyMagicInteraction" label="Technology or Magic Interaction" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="tiesToWorldEvents" label="Ties to Major World Events" onUpdateCharacter={onUpdateCharacter} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Continuity Aids" defaultOpen={false}>
                <div className="space-y-6">
                    <EditableCharacterField character={item} field="firstLastAppearance" label="First & Last Appearance" onUpdateCharacter={onUpdateCharacter} placeholder="chapter/scene" />
                    <EditableCharacterField character={item} field="actorVisualReference" label="Actor / Visual Reference" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="symbolicObjectsThemes" label="Symbolic Objects / Themes" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="evolutionNotes" label="Evolution Notes" onUpdateCharacter={onUpdateCharacter} placeholder="planned vs. realized arc" />
                    <EditableCharacterField character={item} field="crossLinks" label="Cross-links" onUpdateCharacter={onUpdateCharacter} placeholder="Appears in: other books, timelines, etc." />
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Optional Extras" defaultOpen={false}>
                <div className="space-y-6">
                    <EditableCharacterField character={item} field="innerMonologueExample" label="Inner Monologue Example" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="playlistSoundPalette" label="Character Playlist / Sound Palette" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="colorPaletteMotifs" label="Color Palette / Symbolic Motifs" onUpdateCharacter={onUpdateCharacter} />
                    <EditableCharacterField character={item} field="aiGameReference" label="AI or Game Reference Data" onUpdateCharacter={onUpdateCharacter} placeholder="For transmedia or interactive formats" />
                    <EditableCharacterField character={item} field="developmentNotes" label="Development Notes" onUpdateCharacter={onUpdateCharacter} placeholder="How the concept changed over drafts" />
                </div>
            </CollapsibleSection>

            <div className="mt-8 pt-6 border-t border-gray-700 space-y-4">
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
                 <button
                    onClick={() => onDeleteCharacterRequest(item)}
                    className="w-full flex items-center justify-center p-3 rounded-md text-sm bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Delete character ${item.name}`}
                >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    Delete Character
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
  onGenerateIllustration: (sectionId: string) => void;
  onDeleteIllustration: (sectionId: string) => void;
  isGeneratingIllustration: boolean;
}> = ({ item, project, onUpdateOutlineContent, onToggleCharacterAssociation, onConsistencyCheck, onGenerateIllustration, onDeleteIllustration, isGeneratingIllustration }) => {
  const [content, setContent] = useState(item.content);
  const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
      // Sync local state when the selected item changes
      setContent(item.content);
  }, [item.id, item.content]);
  
  const handleToolClick = (toolAction: () => void, closeDropdown: () => void) => {
    toolAction();
    closeDropdown();
  };

  return (
    <>
      <h1 className="text-4xl font-bold text-cyan-300 mb-8">{item.title}</h1>

      <CollapsibleSection title="Illustration" defaultOpen={false}>
         <div className="group relative aspect-video w-full bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-700">
            <ImageViewer
                imageUrl={item.imageUrl}
                alt={`Illustration for ${item.title}`}
                className="w-full h-full object-cover"
                placeholder={
                     <div className="text-center text-gray-500">
                        <PhotoIcon className="h-24 w-24 mx-auto" />
                        <p>No illustration for this section.</p>
                    </div>
                }
            />
            {item.imageUrl && (
                <button
                    onClick={() => onDeleteIllustration(item.id)}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white/80 hover:bg-red-600 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Delete illustration for ${item.title}`}
                >
                    <TrashIcon className="h-5 w-5" />
                </button>
            )}
            <button
                onClick={() => onGenerateIllustration(item.id)}
                disabled={isGeneratingIllustration}
                className="absolute bottom-4 right-4 flex items-center justify-center p-3 rounded-md text-sm bg-cyan-600/80 backdrop-blur-sm hover:bg-cyan-500 text-white font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Generate new illustration for ${item.title}`}
            >
                {isGeneratingIllustration ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Generating...
                    </>
                ) : (
                    <>
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        Generate Illustration
                    </>
                )}
            </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Text" defaultOpen={true}>
        <div className="relative">
            <textarea
                key={item.id} // Re-mount to reflect state changes if another item is selected
                value={content}
                onChange={e => setContent(e.target.value)}
                onBlur={() => onUpdateOutlineContent(item.id, content)}
                placeholder="Start writing the content for this section..."
                aria-label="Outline section content"
                className="w-full h-80 bg-gray-800 border border-gray-700 rounded-md p-4 pb-8 text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
            />
             <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800/80 px-2 py-1 rounded">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </div>
        </div>

        <div className="mt-4 relative inline-block text-left">
            <Dropdown
                trigger={
                    <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md shadow-sm px-4 py-2 text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition-colors"
                        id="ai-tools-menu"
                        aria-haspopup="true"
                    >
                        <SparklesIcon className="h-5 w-5 mr-2 -ml-1" />
                        AI Tools
                        <ChevronDownIcon className="h-5 w-5 ml-2 -mr-1" />
                    </button>
                }
            >
                {(close) => (
                    <div className="py-1" role="none">
                        <button
                            onClick={() => handleToolClick(() => onConsistencyCheck(item), close)}
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
                )}
            </Dropdown>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Associated Characters" defaultOpen={false}>
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
      </CollapsibleSection>
    </>
  );
};

const NotesView: React.FC<{
  notes: string;
  onUpdateNotes: (newNotes: string) => void;
}> = ({ notes, onUpdateNotes }) => {
  const [currentNotes, setCurrentNotes] = useState(notes);
  const wordCount = (currentNotes || '').trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    // Sync local state when the project changes
    setCurrentNotes(notes);
  }, [notes]);
  
  return (
    <>
      <h1 className="text-4xl font-bold text-cyan-300 mb-4">Notes</h1>
      <p className="text-gray-400 mb-6">A scratchpad for your unstructured thoughts, ideas, and snippets of research.</p>
      <div className="relative h-[70vh]">
        <textarea
            value={currentNotes}
            onChange={(e) => setCurrentNotes(e.target.value)}
            onBlur={() => onUpdateNotes(currentNotes)}
            placeholder="Jot down your ideas here..."
            aria-label="Project notes"
            className="w-full h-full bg-gray-800 border border-gray-700 rounded-md p-6 pb-8 text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-gray-800/80 px-2 py-1 rounded">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      </div>
    </>
  );
};

const MainContent: React.FC<MainContentProps> = ({ item, project, activeTab, onUpdateOutlineContent, onUpdateCharacter, onDeleteCharacterRequest, onUpdateNotes, onToggleCharacterAssociation, onConsistencyCheck, onGenerateCharacterImage, isGeneratingImage, onGenerateIllustration, isGeneratingIllustration, onDeleteCharacterImage, onDeleteIllustration }) => {
  if (activeTab === 'notes') {
    return (
        <main className="flex-1 p-10 overflow-y-auto bg-gray-900">
            <NotesView notes={project.notes} onUpdateNotes={onUpdateNotes} />
        </main>
    );
  }
  
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
              onDeleteImage={onDeleteCharacterImage}
              isGeneratingImage={isGeneratingImage}
              onUpdateCharacter={onUpdateCharacter}
              onDeleteCharacterRequest={onDeleteCharacterRequest}
            /> 
          : <OutlineView 
              item={item} 
              project={project}
              onUpdateOutlineContent={onUpdateOutlineContent}
              onToggleCharacterAssociation={onToggleCharacterAssociation}
              onConsistencyCheck={onConsistencyCheck}
              onGenerateIllustration={onGenerateIllustration}
              onDeleteIllustration={onDeleteIllustration}
              isGeneratingIllustration={isGeneratingIllustration}
            />
        }
    </main>
  );
};

export default MainContent;