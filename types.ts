
export interface Character {
  id: string;
  name: string;
  description: string;
  type: 'character';
  imageUrl?: string;
  aliases?: string;
  age?: string;
  gender?: string;
  species?: string;
  occupation?: string;
  affiliations?: string;
  heightBuild?: string;
  faceHairEyes?: string;
  styleOutfit?: string;
  vocalTraits?: string;
  healthAbilities?: string;
  coreMotivation?: string;
  longTermGoal?: string;
  fearFlaw?: string;
  moralAlignment?: string;
  temperament?: string;
  emotionalTriggers?: string;
  originStory?: string;
  familyMentors?: string;
  secretsRegrets?: string;
  relationshipsTimeline?: string;
  storyRole?: string;
  introductionPoint?: string;
  arcSummary?: string;
  conflictContribution?: string;
  changeMetric?: string;
  dictionSlangTone?: string;
  gesturesHabits?: string;
  signaturePhrases?: string;
  internalThoughtStyle?: string;
  homeEnvironmentInfluence?: string;
  culturalReligiousBackground?: string;
  economicPoliticalStatus?: string;
  technologyMagicInteraction?: string;
  tiesToWorldEvents?: string;
  firstLastAppearance?: string;
  actorVisualReference?: string;
  symbolicObjectsThemes?: string;
  evolutionNotes?: string;
  crossLinks?: string;
  innerMonologueExample?: string;
  playlistSoundPalette?: string;
  colorPaletteMotifs?: string;
  aiGameReference?: string;
  developmentNotes?: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  content: string;
  type: 'outline';
  children?: OutlineSection[];
  characterIds?: string[];
  imageUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  description: string;
  outline: OutlineSection[];
  characters: Character[];
  notes: string;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export type SelectableItem = Character | OutlineSection;