import React, { useState, useEffect, useCallback } from 'react';
import { Project } from './types';
import ProjectSelectionPage from './components/ProjectSelectionPage';
import WritingWorkspace from './components/WritingWorkspace';
import { v4 as uuidv4 } from 'uuid';
import { generateInitialProjectData } from './services/geminiService';
import { getAllProjects, createProject as createProjectApi, updateProject as updateProjectApi, deleteProject as deleteProjectApi } from './services/apiService';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // For initial load
  const [error, setError] = useState<string | null>(null);


  // Load projects from "database" on initial render
  useEffect(() => {
    const fetchProjects = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const fetchedProjects = await getAllProjects();
            setProjects(fetchedProjects);
        } catch (err) {
            setError("Failed to load projects.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    fetchProjects();
  }, []);


  const handleSelectProject = useCallback((project: Project) => {
    // Selects a project to open in the workspace
    setSelectedProject(project);
  }, []);

  const handleAddProject = useCallback(async (data: { title: string; genre: string; description: string; }) => {
    try {
      const { outline, characters } = await generateInitialProjectData(data.title, data.genre, data.description);
      
      const newProject: Project = {
        id: uuidv4(),
        title: data.title,
        genre: data.genre,
        description: data.description,
        outline: outline,
        characters: characters,
      };

      const savedProject = await createProjectApi(newProject);
      setProjects(prevProjects => [...prevProjects, savedProject]);
    } catch (error) {
        console.error("Failed to create project with AI:", error);
        // Re-throw the error to be caught by the UI component
        throw error;
    }
  }, []);

  const handleUpdateProject = useCallback(async (updatedProject: Project) => {
    try {
      const savedProject = await updateProjectApi(updatedProject);
      setProjects(prevProjects => 
        prevProjects.map(p => p.id === savedProject.id ? savedProject : p)
      );
      // Also update the selected project if it's the one being changed
      if (selectedProject?.id === savedProject.id) {
        // Use a functional update to avoid stale closures with selectedProject
        setSelectedProject(currentSelected => 
            currentSelected && currentSelected.id === savedProject.id ? savedProject : currentSelected
        );
      }
    } catch (error) {
      console.error("Failed to update project:", error);
      // Re-throw the error so the calling component can handle it (e.g., show a status indicator)
      throw error;
    }
  }, [selectedProject?.id]);
  
  const handleDeleteProject = useCallback(async (projectId: string) => {
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
        try {
            await deleteProjectApi(projectId);
            setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
        } catch (error) {
            console.error("Failed to delete project:", error);
            alert("Error: Could not delete project from the database.");
        }
    }
  }, []);

  const handleUpdateProjectTitle = useCallback(async (projectId: string, newTitle: string) => {
    const projectToUpdate = projects.find(p => p.id === projectId);
    if (projectToUpdate) {
      const updatedProject = { ...projectToUpdate, title: newTitle };
      await handleUpdateProject(updatedProject);
    }
  }, [projects, handleUpdateProject]);

  const handleGoBack = () => {
    setSelectedProject(null);
  }

  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-lg">Loading Projects...</p>
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-red-400">
            <p className="text-lg">{error}</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {selectedProject ? (
        <WritingWorkspace 
          project={selectedProject} 
          onBack={handleGoBack}
          onUpdateProject={handleUpdateProject}
        />
      ) : (
        <ProjectSelectionPage 
          savedProjects={projects}
          onSelectProject={handleSelectProject} 
          onDeleteProject={handleDeleteProject}
          onUpdateProjectTitle={handleUpdateProjectTitle}
          onAddProject={handleAddProject}
        />
      )}
    </div>
  );
};

export default App;