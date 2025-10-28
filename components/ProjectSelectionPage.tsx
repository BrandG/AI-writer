import React, { useState, useRef } from 'react';
import { Project, AiProvider } from '../types';

interface ProjectSelectionPageProps {
  savedProjects: Project[];
  onSelectProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProjectTitle: (projectId: string, newTitle: string) => void;
  onAddProject: (data: { title: string; genre: string; description: string; }) => Promise<void>;
  onImportProjects: (projects: Project[]) => Promise<void>;
  aiProvider: AiProvider;
  onAiProviderChange: (provider: AiProvider) => void;
}

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);


const ProjectCard: React.FC<{ project: Project; onSelect: () => void; onDelete?: () => void; onUpdateTitle?: (newTitle: string) => void; }> = ({ project, onSelect, onDelete, onUpdateTitle }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(project.title);

    const handleTitleUpdate = () => {
        const trimmedTitle = currentTitle.trim();
        if (trimmedTitle && trimmedTitle !== project.title) {
            onUpdateTitle?.(trimmedTitle);
        } else {
            setCurrentTitle(project.title); // Revert if empty or unchanged
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleTitleUpdate();
        } else if (e.key === 'Escape') {
            setCurrentTitle(project.title);
            setIsEditing(false);
        }
    };

    const handleStartEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onUpdateTitle) {
            setIsEditing(true);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col hover:bg-gray-700 transition-colors duration-200 transform hover:-translate-y-1">
            {isEditing ? (
                 <div className="mb-2">
                    <input
                        type="text"
                        value={currentTitle}
                        onChange={(e) => setCurrentTitle(e.target.value)}
                        onBlur={handleTitleUpdate}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full text-xl font-bold text-cyan-400 bg-gray-700 border border-cyan-500 rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ) : (
                <div 
                    className={`group flex items-center justify-between gap-2 mb-2 ${onUpdateTitle ? 'cursor-pointer rounded-md -m-1 p-1 hover:bg-gray-700/50' : ''}`}
                    onClick={handleStartEditing}
                >
                    <h3 className="text-xl font-bold text-cyan-400 truncate" title={project.title}>
                        {project.title}
                    </h3>
                    {onUpdateTitle && (
                        <EditIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    )}
                </div>
            )}
            <p className="text-sm font-semibold text-gray-400 mb-4">{project.genre}</p>
            <p className="text-gray-300 flex-grow mb-6 line-clamp-3">{project.description}</p>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-700/50">
                <button
                onClick={onSelect}
                className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
                >
                Open Project
                </button>
                {onDelete && (
                    <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    aria-label={`Delete project ${project.title}`}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 rounded-full hover:bg-gray-700"
                    >
                        <TrashIcon className="h-5 w-5" />
                    </button>
                )}
            </div>
        </div>
    );
};

const AddProjectModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAddProject: (data: { title: string; genre: string; description: string; }) => Promise<void>;
    isCreating: boolean;
}> = ({ isOpen, onClose, onAddProject, isCreating }) => {
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('Novel');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || isCreating) {
            return;
        }
        await onAddProject({ title: title.trim(), genre, description: description.trim() });
    };

    const handleClose = () => {
        if (isCreating) return;
        // Reset form state on close
        setTitle('');
        setGenre('Novel');
        setDescription('');
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity" 
            aria-modal="true" 
            role="dialog"
            onClick={handleClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full transform transition-all relative"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
                {isCreating && (
                    <div className="absolute inset-0 bg-gray-800 bg-opacity-80 flex flex-col items-center justify-center z-10 rounded-lg">
                        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mt-4 text-lg text-gray-300">AI is generating your project...</p>
                        <p className="text-sm text-gray-500">This may take a moment.</p>
                    </div>
                )}
                <h2 className="text-2xl font-bold mb-6 text-white">Create New Project</h2>
                <form onSubmit={handleSubmit}>
                    <fieldset disabled={isCreating}>
                        <div className="mb-4">
                            <label htmlFor="project-title" className="block text-sm font-medium text-gray-300 mb-1">Project Title</label>
                            <input
                                type="text"
                                id="project-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="project-genre" className="block text-sm font-medium text-gray-300 mb-1">Format</label>
                            <select
                                id="project-genre"
                                value={genre}
                                onChange={(e) => setGenre(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                            >
                                <option>Novel</option>
                                <option>Short Story</option>
                                <option>TV Script</option>
                                <option>Theater Script</option>
                                <option>Game design</option>
                            </select>
                        </div>
                        <div className="mb-6">
                            <label htmlFor="project-description" className="block text-sm font-medium text-gray-300 mb-1">Elevator Pitch</label>
                            <textarea
                                id="project-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none disabled:opacity-50"
                                placeholder="A brief summary of your project..."
                            />
                        </div>
                        <div className="flex justify-end gap-4">
                            <button type="button" onClick={handleClose} className="px-4 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors disabled:opacity-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 rounded-md font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Create Project</button>
                        </div>
                    </fieldset>
                </form>
            </div>
        </div>
    );
};

const ConfirmDeleteModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    projectName: string;
}> = ({ isOpen, onClose, onConfirm, projectName }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            aria-modal="true"
            role="dialog"
            onClick={onClose}
        >
            <div
                className="bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-2xl font-bold mb-4 text-red-400">Confirm Deletion</h2>
                <p className="text-gray-300 mb-6">
                    Are you sure you want to permanently delete the project <strong className="font-semibold text-white">"{projectName}"</strong>? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                    <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">Delete Project</button>
                </div>
            </div>
        </div>
    );
};


const ProjectSelectionPage: React.FC<ProjectSelectionPageProps> = ({ savedProjects, onSelectProject, onDeleteProject, onUpdateProjectTitle, onAddProject, onImportProjects, aiProvider, onAiProviderChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleCreateProject = async (data: { title: string; genre: string; description: string; }) => {
    setIsCreating(true);
    try {
        await onAddProject(data);
        setIsModalOpen(false); // Close modal on success
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error("Project creation failed:", error);
        alert(`There was an error creating your project with the AI:\n${errorMessage}\nPlease try again.`);
    } finally {
        setIsCreating(false);
    }
  };

  const handleExportClick = () => {
    if (savedProjects.length === 0) {
        alert("There are no projects to export.");
        return;
    }
    const dataStr = JSON.stringify(savedProjects, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    link.download = `ai-writing-assistant-backup-${timestamp}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') {
                throw new Error("File content is not readable text.");
            }
            const data = JSON.parse(text);

            // Basic validation
            if (!Array.isArray(data) || data.some(item => typeof item.id !== 'string' || typeof item.title !== 'string')) {
                throw new Error("Invalid file format. The file should be an array of projects.");
            }
            
            await onImportProjects(data);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            console.error("Import failed:", error);
            alert(`Error importing projects:\n${errorMessage}`);
        } finally {
            // Reset the input value to allow importing the same file again
            if (importInputRef.current) {
                importInputRef.current.value = '';
            }
        }
    };
    reader.onerror = () => {
        alert("Failed to read the file.");
    };
    reader.readAsText(file);
  };
  
  const handleConfirmDelete = () => {
    if (projectToDelete) {
        onDeleteProject(projectToDelete.id);
        setProjectToDelete(null); // Close modal after action
    }
  };

  return (
    <div className="container mx-auto p-8">
      <AddProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddProject={handleCreateProject}
        isCreating={isCreating}
      />
      <ConfirmDeleteModal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        projectName={projectToDelete?.title || ''}
      />
      <input
        type="file"
        ref={importInputRef}
        onChange={handleFileSelect}
        accept=".json,application/json"
        className="hidden"
        aria-hidden="true"
      />
      
      <header className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white mb-2">AI Writing Assistant</h1>
        <p className="text-lg text-gray-400">{savedProjects.length > 0 ? "Continue your work or start a new project." : "Create a new project to begin your creative journey."}</p>
        <div className="mt-4 flex justify-center items-center gap-2 text-sm text-gray-400">
            <span>AI Provider:</span>
            <select
                value={aiProvider}
                onChange={(e) => onAiProviderChange(e.target.value as AiProvider)}
                className="bg-gray-700 border border-gray-600 rounded-md p-1 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
            </select>
        </div>
      </header>

      <section>
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-3 flex-wrap gap-4">
          <h2 className="text-3xl font-bold text-white">Your Projects</h2>
          <div className="flex items-center gap-3">
            <button
                onClick={handleImportClick}
                className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
            >
                Import
            </button>
             <button
                onClick={handleExportClick}
                className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75"
            >
                Export All
            </button>
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-cyan-600 text-white font-bold py-2 px-4 rounded-md hover:bg-cyan-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 flex items-center"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Project
            </button>
          </div>
        </div>
        {savedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onSelect={() => onSelectProject(project)} 
                onDelete={() => setProjectToDelete(project)}
                onUpdateTitle={(newTitle) => onUpdateProjectTitle(project.id, newTitle)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-8 bg-gray-800 rounded-lg">
            <h3 className="text-xl font-semibold text-gray-300">No projects yet</h3>
            <p className="text-gray-400 mt-2">Click "New Project" to get started on your next masterpiece.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProjectSelectionPage;