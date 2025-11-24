
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Project, OutlineSection, Character, Note, SelectableItem, AiService } from '../types';

interface StoryGraphProps {
    project: Project;
    onNodeClick: (item: SelectableItem) => void;
    aiService: AiService;
}

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    group: string; // 'character', 'outline', 'note'
    label: string;
    radius: number;
    color: string;
    data: SelectableItem;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    value: number;
}

const StoryGraph: React.FC<StoryGraphProps> = ({ project, onNodeClick, aiService }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Transform project data into graph data
    const getGraphData = () => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        // Add Characters
        project.characters.forEach(char => {
            nodes.push({
                id: char.id,
                group: 'character',
                label: char.name,
                radius: 25,
                color: '#34d399', // green-400
                data: char
            });
        });

        // Add Notes
        project.notes.forEach(note => {
            nodes.push({
                id: note.id,
                group: 'note',
                label: note.title,
                radius: 15,
                color: '#facc15', // yellow-400
                data: note
            });
        });

        // Add Outline Sections (Recursively)
        const processOutline = (sections: OutlineSection[], parentId?: string) => {
            sections.forEach(section => {
                nodes.push({
                    id: section.id,
                    group: 'outline',
                    label: section.title,
                    radius: 20,
                    color: '#22d3ee', // cyan-400
                    data: section
                });

                // Link to Parent
                if (parentId) {
                    links.push({
                        source: parentId,
                        target: section.id,
                        value: 2
                    });
                }

                // Link to Associated Characters
                if (section.characterIds) {
                    section.characterIds.forEach(charId => {
                        // Only add link if character exists (safety check)
                        if (project.characters.find(c => c.id === charId)) {
                            links.push({
                                source: section.id,
                                target: charId,
                                value: 1
                            });
                        }
                    });
                }

                if (section.children) {
                    processOutline(section.children, section.id);
                }
            });
        };
        processOutline(project.outline);

        return { nodes, links };
    };

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const { nodes, links } = getGraphData();
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Clear previous SVG content
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove();

        // Add Zoom behavior
        const zoomGroup = svg.append("g");
        
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                zoomGroup.attr("transform", event.transform);
            });

        svg.call(zoom);

        // Simulation
        const simulation = d3.forceSimulation<GraphNode>(nodes)
            .force("link", d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => (d as GraphNode).radius + 10));

        // Render Links
        const link = zoomGroup.append("g")
            .attr("stroke", "#4b5563") // gray-600
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => Math.sqrt(d.value));

        // Render Nodes
        const node = zoomGroup.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "cursor-pointer transition-opacity hover:opacity-80")
            .call(d3.drag<SVGGElement, GraphNode>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Node Circles
        node.append("circle")
            .attr("r", d => d.radius)
            .attr("fill", d => d.color)
            .on("click", (event, d) => {
                event.stopPropagation(); // Prevent drag end from firing immediately if inconsistent
                onNodeClick(d.data);
            });

        // Node Labels
        node.append("text")
            .text(d => d.label)
            .attr("x", d => d.radius + 5)
            .attr("y", 5)
            .attr("fill", "#e5e7eb") // gray-200
            .attr("font-size", "12px")
            .attr("stroke", "none")
            .attr("pointer-events", "none"); // Let clicks pass through to circle/group

        // Simulation Tick
        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as GraphNode).x!)
                .attr("y1", d => (d.source as GraphNode).y!)
                .attr("x2", d => (d.target as GraphNode).x!)
                .attr("y2", d => (d.target as GraphNode).y!);

            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

        // Drag functions
        function dragstarted(event: any, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: GraphNode) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: GraphNode) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        // Cleanup
        return () => {
            simulation.stop();
        };
    }, [project]); // Re-run if project data changes

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const result = await aiService.getGraphAnalysis(project);
            setAnalysisResult(result);
        } catch (error) {
            setAnalysisResult("Failed to analyze graph.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden" ref={containerRef}>
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                 <div className="bg-gray-800/80 backdrop-blur-sm p-2 rounded-lg border border-gray-700 text-xs text-gray-300">
                    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-cyan-400"></span> Scenes</div>
                    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-green-400"></span> Characters</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-400"></span> Notes</div>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-md shadow-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isAnalyzing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            AI Graph Analysis
                        </>
                    )}
                </button>
            </div>

            {analysisResult && (
                <div className="absolute bottom-4 right-4 z-10 w-80 bg-gray-800/95 backdrop-blur-md rounded-lg border border-gray-700 shadow-2xl p-4 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-2">
                        <h3 className="font-bold text-purple-300">Structural Analysis</h3>
                        <button onClick={() => setAnalysisResult(null)} className="text-gray-400 hover:text-white">&times;</button>
                    </div>
                    <div className="prose prose-invert prose-sm">
                        <p className="whitespace-pre-wrap text-gray-300">{analysisResult}</p>
                    </div>
                </div>
            )}

            <svg ref={svgRef} className="w-full h-full cursor-move"></svg>
        </div>
    );
};

export default StoryGraph;
