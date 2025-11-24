import React, { useState, useRef, useEffect } from 'react';
import { Project, SelectableItem, OutlineSection, Character, Note, TaskList, Task } from '../types';
import { ActiveTab } from './WritingWorkspace';
import { getImage } from '../services/imageDbService';
import Dropdown from './Dropdown';
import { v4 as uuidv4 } from 'uuid';


interface MainContentProps {
  item: SelectableItem | null;
  project: Project;
  activeTab: ActiveTab;
  onUpdateOutlineContent: (sectionId: string, newContent: string) => void;
  onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
  onDeleteCharacterRequest: (character: Character) => void;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNoteRequest: (note: Note) => void;
  onUpdateTaskList: (listId: string, updates: Partial<TaskList>) => void;
  onDeleteTaskListRequest: (list: TaskList) => void;
  onToggleCharacterAssociation: (sectionId: string, characterId: string) => void;
  onConsistencyCheck: (section: OutlineSection) => void;
  onReadingLevelCheck: (section: OutlineSection) => void;
  onCleanUpText: (section: OutlineSection) => void;
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

const PlusIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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

const CollapsibleSection: React.FC<{
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    exportId?: string;
    isExportable?: boolean;
    isIncludedInExport?: boolean;
    onToggleExport?: (id: string) => void;
}> = ({ title, children, defaultOpen = true, exportId, isExportable, isIncludedInExport, onToggleExport }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 mb-6 overflow-hidden transition-all duration-300">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left text-lg font-bold text-gray-200 hover:bg-gray-700/50 focus:outline-none transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center">
                    {isExportable && (
                         <input
                            type="checkbox"
                            checked={isIncludedInExport ?? true}
                            onChange={(e) => { e.stopPropagation(); onToggleExport?.(exportId!); }}
                            aria-label={`Include ${title} in export`}
                            title="Include in export"
                            className="mr-3 form-checkbox h-4 w-4 bg-gray-600 border-gray-500 rounded text-cyan-500 focus:ring-cyan-600 cursor-pointer"
                        />
                    )}
                    <span>{title}</span>
                </div>
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
    onUpdateCharacter: (characterId: string, updatedData: Partial<Character>) => void;
    placeholder?: string;
}> = ({ character, field, onUpdateCharacter, placeholder = "Enter details..." }) => {
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
            <textarea
                ref={textareaRef}
                key={`${character.id}-${field}`}
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={() => onUpdateCharacter(character.id, { [field]: currentValue })}
                placeholder={placeholder}
                aria-label={field}
                className="w-full bg-transparent p-2 rounded-md text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-gray-800 transition-all resize-none min-h-[4rem]"
            />
            <div className="text-right text-xs text-gray-400 mt-1 pr-2">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
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
    
    const handleToggleExport = (sectionId: string) => {
        onUpdateCharacter(item.id, {
            exportConfig: {
                ...(item.exportConfig || {}),
                [sectionId]: !(item.exportConfig?.[sectionId] ?? true),
            }
        });
    };

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
            
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 mb-6">
                 <div className="flex items-center mb-2">
                    <input
                        type="checkbox"
                        checked={item.exportConfig?.description ?? true}
                        onChange={() => handleToggleExport('description')}
                        aria-label="Include Description in export"
                        title="Include in export"
                        className="mr-3 form-checkbox h-4 w-4 bg-gray-600 border-gray-500 rounded text-cyan-500 focus:ring-cyan-600 cursor-pointer"
                    />
                    <h2 className="text-lg font-semibold text-gray-300">Description</h2>
                </div>
                <EditableCharacterField character={item} field="description" onUpdateCharacter={onUpdateCharacter} placeholder="Enter character description..."/>
            </div>

            <CollapsibleSection title="Core Identity" defaultOpen={false} exportId="coreIdentity" isExportable isIncludedInExport={item.exportConfig?.coreIdentity ?? true} onToggleExport={handleToggleExport}>
                <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Aliases / Titles</h3><EditableCharacterField character={item} field="aliases" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Age / Birthdate</h3><EditableCharacterField character={item} field="age" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Gender / Pronouns</h3><EditableCharacterField character={item} field="gender" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Species / Race</h3><EditableCharacterField character={item} field="species" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Occupation / Rank</h3><EditableCharacterField character={item} field="occupation" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Affiliations</h3><EditableCharacterField character={item} field="affiliations" onUpdateCharacter={onUpdateCharacter} /></div>
                </div>
            </CollapsibleSection>
            
            <CollapsibleSection title="Physical Description" defaultOpen={false} exportId="physicalDescription" isExportable isIncludedInExport={item.exportConfig?.physicalDescription ?? true} onToggleExport={handleToggleExport}>
                <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Height / Build / Posture</h3><EditableCharacterField character={item} field="heightBuild" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Face / Hair / Eyes</h3><EditableCharacterField character={item} field="faceHairEyes" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Style / Outfit</h3><EditableCharacterField character={item} field="styleOutfit" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Vocal Traits</h3><EditableCharacterField character={item} field="vocalTraits" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Health / Abilities</h3><EditableCharacterField character={item} field="healthAbilities" onUpdateCharacter={onUpdateCharacter} /></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Psychology & Motivation" defaultOpen={false} exportId="psychology" isExportable isIncludedInExport={item.exportConfig?.psychology ?? true} onToggleExport={handleToggleExport}>
                 <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Core Motivation</h3><EditableCharacterField character={item} field="coreMotivation" onUpdateCharacter={onUpdateCharacter} placeholder="What drives them every day?"/></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Long-Term Goal</h3><EditableCharacterField character={item} field="longTermGoal" onUpdateCharacter={onUpdateCharacter} placeholder="What do they think will fulfill them?"/></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Fear / Flaw</h3><EditableCharacterField character={item} field="fearFlaw" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Moral Alignment</h3><EditableCharacterField character={item} field="moralAlignment" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Temperament</h3><EditableCharacterField character={item} field="temperament" onUpdateCharacter={onUpdateCharacter} placeholder="MBTI, Enneagram, archetype, etc." /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Emotional Triggers</h3><EditableCharacterField character={item} field="emotionalTriggers" onUpdateCharacter={onUpdateCharacter} /></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Voice & Behavior" defaultOpen={false} exportId="voiceBehavior" isExportable isIncludedInExport={item.exportConfig?.voiceBehavior ?? true} onToggleExport={handleToggleExport}>
                 <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Diction / Slang / Tone</h3><EditableCharacterField character={item} field="dictionSlangTone" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Gestures / Habits</h3><EditableCharacterField character={item} field="gesturesHabits" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Signature Phrases</h3><EditableCharacterField character={item} field="signaturePhrases" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Internal Thought Style</h3><EditableCharacterField character={item} field="internalThoughtStyle" onUpdateCharacter={onUpdateCharacter} placeholder="e.g., pragmatic, poetic, paranoid" /></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Backstory" defaultOpen={false} exportId="backstory" isExportable isIncludedInExport={item.exportConfig?.backstory ?? true} onToggleExport={handleToggleExport}>
                 <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Origin Story</h3><EditableCharacterField character={item} field="originStory" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Family / Mentors / Enemies</h3><EditableCharacterField character={item} field="familyMentors" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Secrets / Regrets</h3><EditableCharacterField character={item} field="secretsRegrets" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Relationships Timeline</h3><EditableCharacterField character={item} field="relationshipsTimeline" onUpdateCharacter={onUpdateCharacter} /></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Narrative Function" defaultOpen={false} exportId="narrativeFunction" isExportable isIncludedInExport={item.exportConfig?.narrativeFunction ?? true} onToggleExport={handleToggleExport}>
                 <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Story Role / Archetype</h3><EditableCharacterField character={item} field="storyRole" onUpdateCharacter={onUpdateCharacter} placeholder="e.g., mentor, trickster, foil, love interest"/></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Introduction Point</h3><EditableCharacterField character={item} field="introductionPoint" onUpdateCharacter={onUpdateCharacter} placeholder="Where do they first appear in the story?"/></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Arc Summary</h3><EditableCharacterField character={item} field="arcSummary" onUpdateCharacter={onUpdateCharacter} placeholder="beginning → midpoint → end"/></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Conflict Contribution</h3><EditableCharacterField character={item} field="conflictContribution" onUpdateCharacter={onUpdateCharacter} placeholder="How do they drive tension?"/></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Change Metric</h3><EditableCharacterField character={item} field="changeMetric" onUpdateCharacter={onUpdateCharacter} placeholder="What lesson do they learn, or fail to learn?"/></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Context & World Integration" defaultOpen={false} exportId="context" isExportable isIncludedInExport={item.exportConfig?.context ?? true} onToggleExport={handleToggleExport}>
                 <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Home / Environment Influence</h3><EditableCharacterField character={item} field="homeEnvironmentInfluence" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Cultural / Religious Background</h3><EditableCharacterField character={item} field="culturalReligiousBackground" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Economic / Political Status</h3><EditableCharacterField character={item} field="economicPoliticalStatus" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Technology or Magic Interaction</h3><EditableCharacterField character={item} field="technologyMagicInteraction" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Ties to Major World Events</h3><EditableCharacterField character={item} field="tiesToWorldEvents" onUpdateCharacter={onUpdateCharacter} /></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Continuity Aids" defaultOpen={false} exportId="continuityAids" isExportable isIncludedInExport={item.exportConfig?.continuityAids ?? true} onToggleExport={handleToggleExport}>
                <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">First & Last Appearance</h3><EditableCharacterField character={item} field="firstLastAppearance" onUpdateCharacter={onUpdateCharacter} placeholder="chapter/scene" /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Actor / Visual Reference</h3><EditableCharacterField character={item} field="actorVisualReference" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Symbolic Objects / Themes</h3><EditableCharacterField character={item} field="symbolicObjectsThemes" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Evolution Notes</h3><EditableCharacterField character={item} field="evolutionNotes" onUpdateCharacter={onUpdateCharacter} placeholder="planned vs. realized arc" /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Cross-links</h3><EditableCharacterField character={item} field="crossLinks" onUpdateCharacter={onUpdateCharacter} placeholder="Appears in: other books, timelines, etc." /></div>
                </div>
            </CollapsibleSection>

            <CollapsibleSection title="Optional Extras" defaultOpen={false} exportId="extras" isExportable isIncludedInExport={item.exportConfig?.extras ?? true} onToggleExport={handleToggleExport}>
                <div className="space-y-4">
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Inner Monologue Example</h3><EditableCharacterField character={item} field="innerMonologueExample" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Character Playlist / Sound Palette</h3><EditableCharacterField character={item} field="playlistSoundPalette" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Color Palette / Symbolic Motifs</h3><EditableCharacterField character={item} field="colorPaletteMotifs" onUpdateCharacter={onUpdateCharacter} /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">AI or Game Reference Data</h3><EditableCharacterField character={item} field="aiGameReference" onUpdateCharacter={onUpdateCharacter} placeholder="For transmedia or interactive formats" /></div>
                    <div><h3 className="text-sm font-semibold text-gray-400 mb-1">Development Notes</h3><EditableCharacterField character={item} field="developmentNotes" onUpdateCharacter={onUpdateCharacter} placeholder="How the concept changed over drafts" /></div>
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
  onReadingLevelCheck: (section: OutlineSection) => void;
  onCleanUpText: (section: OutlineSection) => void;
  onGenerateIllustration: (sectionId: string) => void;
  onDeleteIllustration: (sectionId: string) => void;
  isGeneratingIllustration: boolean;
}> = ({ item, project, onUpdateOutlineContent, onToggleCharacterAssociation, onConsistencyCheck, onReadingLevelCheck, onCleanUpText, onGenerateIllustration, onDeleteIllustration, isGeneratingIllustration }) => {
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
        <textarea
            key={item.id} // Re-mount to reflect state changes if another item is selected
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={() => onUpdateOutlineContent(item.id, content)}
            placeholder="Start writing the content for this section..."
            aria-label="Outline section content"
            className="w-full min-h-[20rem] bg-gray-800 border border-gray-700 rounded-md p-4 text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y"
        />
        <div className="mt-2 flex justify-between items-center">
            <div className="relative inline-block text-left">
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
                                onClick={() => handleToolClick(() => onReadingLevelCheck(item), close)}
                                className="w-full text-left text-gray-300 block px-4 py-2 text-sm hover:bg-gray-700 hover:text-white"
                                role="menuitem"
                            >
                                Get reading level
                            </button>
                            <button
                                onClick={() => handleToolClick(() => onCleanUpText(item), close)}
                                className="w-full text-left text-gray-300 block px-4 py-2 text-sm hover:bg-gray-700 hover:text-white"
                                role="menuitem"
                            >
                                Clean up text
                            </button>
                        </div>
                    )}
                </Dropdown>
            </div>
            <div className="text-xs text-gray-400">
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </div>
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

const NoteView: React.FC<{
  item: Note;
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void;
  onDeleteNoteRequest: (note: Note) => void;
}> = ({ item, onUpdateNote, onDeleteNoteRequest }) => {
  const [content, setContent] = useState(item.content);
  const wordCount = (content || '').trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    // Sync local state when the project changes
    setContent(item.content);
  }, [item.id, item.content]);
  
  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <input
            key={`${item.id}-title`}
            defaultValue={item.title}
            onBlur={(e) => e.target.value.trim() && onUpdateNote(item.id, { title: e.target.value.trim() })}
            aria-label="Note title"
            className="w-full text-4xl font-bold text-cyan-300 bg-transparent rounded-md p-2 -m-2 focus:outline-none focus:bg-gray-800 focus:ring-2 focus:ring-cyan-500"
        />
      </div>
      <p className="text-gray-400 mb-6">A scratchpad for your unstructured thoughts, ideas, and snippets of research.</p>
      <div>
        <textarea
            key={item.id}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={() => onUpdateNote(item.id, { content })}
            placeholder="Jot down your ideas here..."
            aria-label="Project notes"
            className="w-full min-h-[70vh] bg-gray-800 border border-gray-700 rounded-md p-6 text-gray-300 leading-relaxed focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow resize-y"
        />
        <div className="text-right mt-2 pr-4 text-xs text-gray-400">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      </div>
       <div className="mt-8 pt-6 border-t border-gray-700">
            <button
                onClick={() => onDeleteNoteRequest(item)}
                className="w-full max-w-xs mx-auto flex items-center justify-center p-3 rounded-md text-sm bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={`Delete note ${item.title}`}
            >
                <TrashIcon className="h-5 w-5 mr-2" />
                Delete Note
            </button>
        </div>
    </>
  );
};

const TaskListView: React.FC<{
    item: TaskList;
    onUpdateTaskList: (listId: string, updates: Partial<TaskList>) => void;
    onDeleteTaskListRequest: (list: TaskList) => void;
}> = ({ item, onUpdateTaskList, onDeleteTaskListRequest }) => {
    const [newTaskText, setNewTaskText] = useState('');

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskText.trim()) return;

        const newTask: Task = {
            id: uuidv4(),
            text: newTaskText.trim(),
            isCompleted: false,
        };

        const updatedTasks = [...item.tasks, newTask];
        onUpdateTaskList(item.id, { tasks: updatedTasks });
        setNewTaskText('');
    };

    const handleToggleTask = (taskId: string) => {
        const updatedTasks = item.tasks.map(t => 
            t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
        );
        onUpdateTaskList(item.id, { tasks: updatedTasks });
    };

    const handleDeleteTask = (taskId: string) => {
        const updatedTasks = item.tasks.filter(t => t.id !== taskId);
        onUpdateTaskList(item.id, { tasks: updatedTasks });
    };

    const completedCount = item.tasks.filter(t => t.isCompleted).length;
    const totalCount = item.tasks.length;
    const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return (
        <>
            <div className="mb-8">
                 <input
                    key={`${item.id}-title`}
                    defaultValue={item.title}
                    onBlur={(e) => e.target.value.trim() && onUpdateTaskList(item.id, { title: e.target.value.trim() })}
                    aria-label="List title"
                    className="w-full text-4xl font-bold text-cyan-300 bg-transparent rounded-md p-2 -m-2 focus:outline-none focus:bg-gray-800 focus:ring-2 focus:ring-cyan-500"
                />
            </div>

            <div className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                        className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            <form onSubmit={handleAddTask} className="mb-8 flex gap-2">
                <input 
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Add a new task..."
                    className="flex-grow bg-gray-800 border border-gray-700 rounded-md p-3 text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button 
                    type="submit"
                    disabled={!newTaskText.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PlusIcon className="h-6 w-6" />
                </button>
            </form>

            <ul className="space-y-3">
                {item.tasks.map(task => (
                    <li key={task.id} className="group flex items-center bg-gray-800/30 rounded-md p-3 border border-gray-700 hover:border-gray-600 transition-all">
                        <button
                            onClick={() => handleToggleTask(task.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded border mr-4 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 ${task.isCompleted ? 'bg-cyan-600 border-cyan-600 text-white' : 'border-gray-500 hover:border-cyan-400'}`}
                            aria-label={task.isCompleted ? "Mark as incomplete" : "Mark as complete"}
                        >
                            {task.isCompleted && (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        <span className={`flex-grow text-lg transition-all ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                            {task.text}
                        </span>
                        <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            aria-label="Delete task"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </li>
                ))}
                {item.tasks.length === 0 && (
                    <li className="text-center text-gray-500 py-8 italic">
                        No tasks yet. Add one above to get started!
                    </li>
                )}
            </ul>

            <div className="mt-12 pt-6 border-t border-gray-700">
                <button
                    onClick={() => onDeleteTaskListRequest(item)}
                    className="w-full max-w-xs mx-auto flex items-center justify-center p-3 rounded-md text-sm bg-transparent border border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    Delete List
                </button>
            </div>
        </>
    );
}

const MainContent: React.FC<MainContentProps> = ({ item, project, activeTab, onUpdateOutlineContent, onUpdateCharacter, onDeleteCharacterRequest, onUpdateNote, onDeleteNoteRequest, onUpdateTaskList, onDeleteTaskListRequest, onToggleCharacterAssociation, onConsistencyCheck, onReadingLevelCheck, onCleanUpText, onGenerateCharacterImage, isGeneratingImage, onGenerateIllustration, isGeneratingIllustration, onDeleteCharacterImage, onDeleteIllustration }) => {
  const renderContent = () => {
    if (activeTab === 'notes') {
        if (item?.type === 'note') {
            return <NoteView item={item} onUpdateNote={onUpdateNote} onDeleteNoteRequest={onDeleteNoteRequest} />;
        }
        return <p className="text-gray-500">Select a note from the sidebar, or create a new one.</p>;
    }

    if (activeTab === 'tasks') {
        if (item?.type === 'taskList') {
             return <TaskListView item={item} onUpdateTaskList={onUpdateTaskList} onDeleteTaskListRequest={onDeleteTaskListRequest} />;
        }
        return <p className="text-gray-500">Select a list from the sidebar, or create a new one.</p>;
    }

    if (!item) {
        let message = 'Select an item from the sidebar to view its details.';
        if (activeTab === 'characters' && project.characters.length === 0) {
            message = 'No characters in this project yet. Add one using the AI Assistant!';
        } else if (activeTab === 'outline' && project.outline.length === 0) {
            message = 'This project has no outline. Add a section to get started.';
        }
        return <p className="text-gray-500">{message}</p>;
    }
  
    if (item.type === 'character') {
      return <CharacterView 
              item={item}
              onGenerateImage={onGenerateCharacterImage}
              onDeleteImage={onDeleteCharacterImage}
              isGeneratingImage={isGeneratingImage}
              onUpdateCharacter={onUpdateCharacter}
              onDeleteCharacterRequest={onDeleteCharacterRequest}
            />;
    }
    
    if (item.type === 'outline') {
      return <OutlineView 
              item={item} 
              project={project}
              onUpdateOutlineContent={onUpdateOutlineContent}
              onToggleCharacterAssociation={onToggleCharacterAssociation}
              onConsistencyCheck={onConsistencyCheck}
              onReadingLevelCheck={onReadingLevelCheck}
              onCleanUpText={onCleanUpText}
              onGenerateIllustration={onGenerateIllustration}
              onDeleteIllustration={onDeleteIllustration}
              isGeneratingIllustration={isGeneratingIllustration}
            />;
    }

    return null;
  };

  return (
    <main className="flex-1 p-10 overflow-y-auto bg-gray-900">
        {renderContent()}
    </main>
  );
};

export default MainContent;