
import { Project } from './types';

export const PROJECTS_DATA: Project[] = [
  {
    id: 'proj-1',
    title: 'Chronoscape: Echoes of Aethel',
    genre: 'Sci-Fi Epic',
    description: 'In a future where humanity has colonized the stars, a renegade historian discovers a temporal anomaly that threatens to unravel reality itself.',
    characters: [
      {
        id: 'char-1-1',
        name: 'Kaelen Vance',
        description: 'A brilliant but disgraced chronophysicist, haunted by a past failure. He is cynical but driven by a deep sense of responsibility.',
        backstory: 'Once a leading mind at the Temporal Research Institute, Kaelen was scapegoated for an accident that cost lives. He now operates on the fringes of scientific society.',
        relationships: 'Estranged from his former mentor, Dr. Aris Thorne. Has a complicated professional rivalry with Commander Eva Rostova.',
        type: 'character',
      },
      {
        id: 'char-1-2',
        name: 'Commander Eva Rostova',
        description: 'A pragmatic and decorated officer of the Interstellar Concordance Fleet. She is tasked with containing the anomaly, putting her at odds with Kaelen.',
        backstory: 'Rose through the ranks due to her strategic acumen and unwavering resolve. Believes order and control are paramount to galactic stability.',
        relationships: 'Sees Kaelen as a dangerous wildcard but respects his intellect. Reports directly to the Concordance High Council.',
        type: 'character',
      },
    ],
    outline: [
      {
        id: 'out-1-1',
        title: 'Part I: The Anomaly',
        content: 'The story opens on the backwater planet of Xylos, where Kaelen Vance detects a strange temporal signature. He traces it to an ancient, abandoned alien structure. Inside, he finds a device that shows him fragmented visions of a collapsed timeline. Simultaneously, the Concordance Fleet, led by Commander Rostova, arrives to quarantine the planet, citing a hazardous energy surge.',
        type: 'outline',
        characterIds: ['char-1-1', 'char-1-2'],
      },
      {
        id: 'out-1-2',
        title: 'Part II: The Chase',
        content: 'Kaelen, realizing the danger is far greater than the Concordance understands, escapes the quarantine with his fragmented data. Rostova is ordered to pursue him. The chase spans several star systems, from the neon-drenched markets of Cygnus X-1 to the desolate asteroid fields of the Outer Rim. Kaelen must stay one step ahead while trying to decipher the alien data.',
        type: 'outline',
        characterIds: ['char-1-1', 'char-1-2'],
      },
       {
        id: 'out-1-3',
        title: 'Part III: Convergence',
        content: 'Kaelen discovers the anomaly is not a natural phenomenon but a weapon, created by a long-dead civilization to erase their enemies from time. The weapon is malfunctioning and threatens to consume everything. He realizes he cannot stop it alone and must convince Rostova of the true threat before it\'s too late. The climax occurs at the heart of the anomaly, where they must form an uneasy alliance to prevent total temporal collapse.',
        type: 'outline',
        characterIds: ['char-1-1', 'char-1-2'],
      },
    ],
  },
  {
    id: 'proj-2',
    title: 'The Serpent\'s Shadow',
    genre: 'Fantasy Mystery',
    description: 'In the gaslit city of Silverwood, a magically-gifted detective must solve a series of ritualistic murders tied to a forgotten dark god.',
    characters: [
      {
        id: 'char-2-1',
        name: 'Elias Thorne',
        description: 'A sharp-witted private investigator with a minor magical affinity for sensing echoes of past events. Wears a trench coat and is perpetually tired.',
        backstory: 'Exiled from the Mages\' Guild for practicing "unsanctioned methods." Now he takes on cases the city watch won\'t touch.',
        relationships: 'Maintains a grudging respect for Captain Isolde of the City Watch. Often consults with Lyra, an informant from the city\'s underbelly.',
        type: 'character',
      },
      {
        id: 'char-2-2',
        name: 'Lyra',
        description: 'A cunning and enigmatic information broker who operates out of a hidden tavern called The Gilded Cage. Knows all the city\'s secrets.',
        backstory: 'Her origins are a mystery. She appeared in Silverwood a decade ago and quickly established herself as the go-to person for information no one else could find.',
        relationships: 'Has a transactional but surprisingly loyal relationship with Elias Thorne. Feared and respected by the criminal element.',
        type: 'character',
      },
    ],
    outline: [
      {
        id: 'out-2-1',
        title: 'Chapter 1: The First Victim',
        content: 'A high-ranking city official is found dead in his locked study, marked with a strange, serpentine symbol. The City Watch is baffled. Elias Thorne is hired by the victim\'s family to investigate discreetly. Using his powers, Elias senses a residue of dark, ancient magic at the crime scene.',
        type: 'outline',
        characterIds: ['char-2-1'],
      },
      {
        id: 'out-2-2',
        title: 'Chapter 2: The Whispering Cult',
        content: 'Elias\'s investigation leads him to Lyra, who connects the symbol to a forgotten cult that worshipped a serpent god. More bodies turn up, each murder more audacious than the last. Elias realizes the killer is following a ritualistic pattern, and the victims are all connected to a past city conspiracy.',
        type: 'outline',
        characterIds: ['char-2-1', 'char-2-2'],
      },
    ],
  },
];