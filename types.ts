
export interface Character {
  id: string;
  name: string;
  description: string;
  backstory: string;
  relationships: string;
  type: 'character';
  imageUrl?: string;
}

export interface OutlineSection {
  id: string;
  title: string;
  content: string;
  type: 'outline';
  children?: OutlineSection[];
  characterIds?: string[];
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  description: string;
  outline: OutlineSection[];
  characters: Character[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export type SelectableItem = Character | OutlineSection;