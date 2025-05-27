import React, { useEffect, useState, useRef } from 'react';
import { ParseTreeNode } from '../../types/compiler';

interface ParseTreeVisualizationProps {
  parseTree: ParseTreeNode | null;
}

const ParseTreeVisualization: React.FC<ParseTreeVisualizationProps> = ({ parseTree }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<ParseTreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  useEffect(() => {
    if (!parseTree || !svgRef.current) return;
    renderTree(layoutTree(parseTree));
  }, [parseTree, transform, expandedNodes]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  
  const layoutTree = (node: ParseTreeNode) => {
    const NODE_WIDTH = 160;
    const NODE_HEIGHT = 40;
    const LEVEL_HEIGHT = 80;
    const NODE_SPACING = 5;
    const nodes: any[] = [];
    const links: any[] = [];
    
    const processNode = (n: ParseTreeNode, x = 0, y = 0, level = 0): number => {
      const isExpanded = expandedNodes.has(n.id);
      
      nodes.push({
        id: n.id,
        label: n.type,
        value: n.value,
        x,
        y: y + level * (LEVEL_HEIGHT + NODE_SPACING),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        isExpanded,
        hasChildren: n.children.length > 0
      });
      
      if (!isExpanded || !n.children || n.children.length === 0) {
        return NODE_WIDTH + NODE_SPACING;
      }
      
      const childrenWidth = n.children.reduce((total, child) => {
        return total + processNode(child, 0, y, level + 1);
      }, 0);
      
      const startX = x - childrenWidth / 2 + NODE_WIDTH / 2;
      let currentX = startX;
      
      n.children.forEach(child => {
        const childWidth = processNode(child, currentX, y, level + 1);
        links.push({
          source: n.id,
          target: child.id,
          sourceX: x,
          sourceY: y + level * (LEVEL_HEIGHT + NODE_SPACING) + NODE_HEIGHT,
          targetX: currentX,
          targetY: y + (level + 1) * (LEVEL_HEIGHT + NODE_SPACING)
        });
        currentX += childWidth + NODE_SPACING;
      });
      
      return Math.max(NODE_WIDTH + NODE_SPACING, childrenWidth);
    };
    
    processNode({ ...node, id: 'root' });
    return { nodes, links };
  };
  
  const renderTree = ({ nodes, links }: { nodes: any[], links: any[] }) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    svg.innerHTML = '';
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${transform.x},${transform.y}) scale(${transform.scale})`);
    svg.appendChild(g);
    
    // Draw links
    links.forEach(link => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const dx = link.targetX - link.sourceX;
      const dy = link.targetY - link.sourceY;
      const midY = link.sourceY + dy / 2;
      
      path.setAttribute('d', `M${link.sourceX},${link.sourceY} C${link.sourceX},${midY} ${link.targetX},${midY} ${link.targetX},${link.targetY}`);
      path.setAttribute('stroke', '#94a3b8');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      g.appendChild(path);
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('transform', `translate(${node.x - node.width / 2},${node.y})`);
      g.appendChild(group);
      
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', String(node.width));
      rect.setAttribute('height', String(node.height));
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', node.isExpanded ? '#e0f2fe' : '#f0f9ff');
      rect.setAttribute('stroke', '#0284c7');
      rect.setAttribute('stroke-width', '1.5');
      group.appendChild(rect);
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(node.width / 2));
      text.setAttribute('y', String(node.height / 2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('font-family', 'monospace');
      text.setAttribute('font-size', '12px');
      text.textContent = node.label;
      group.appendChild(text);
      
      if (node.hasChildren) {
        const expandIcon = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const iconSize = 16;
        const iconX = node.width - iconSize - 4;
        const iconY = (node.height - iconSize) / 2;
        
        expandIcon.setAttribute('d', node.isExpanded 
          ? 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z'
          : 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z'
        );
        expandIcon.setAttribute('transform', `translate(${iconX},${iconY})`);
        expandIcon.setAttribute('fill', '#0284c7');
        group.appendChild(expandIcon);
      }
      
      group.addEventListener('click', (e) => {
        e.stopPropagation();
        if (node.hasChildren) {
          toggleNode(node.id);
        }
        setSelectedNode(node);
      });
      
      group.addEventListener('mouseover', () => {
        rect.setAttribute('fill', '#bae6fd');
        rect.setAttribute('stroke-width', '2');
      });
      
      group.addEventListener('mouseout', () => {
        rect.setAttribute('fill', node.isExpanded ? '#e0f2fe' : '#f0f9ff');
        rect.setAttribute('stroke-width', '1.5');
      });
    });
  };
  
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(0.1, transform.scale * scaleFactor), 3);
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
    if (!isFullScreen) {
      const newWindow = window.open('', '_blank', 'width=800,height=600');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Parse Tree Visualization</title>
              <style>
                body { margin: 0; overflow: hidden; }
                #container { width: 100vw; height: 100vh; }
              </style>
            </head>
            <body>
              <div id="container"></div>
            </body>
          </html>
        `);
        const container = newWindow.document.getElementById('container');
        if (container && svgRef.current) {
          container.appendChild(svgRef.current.cloneNode(true));
        }
      }
    }
  };
  
  if (!parseTree) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No parse tree available</p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="bg-gray-50 p-2 border-b flex justify-between items-center text-sm">
        <div className="flex gap-2">
          <button 
            onClick={() => setTransform({ x: 0, y: 0, scale: 1 })}
            className="px-2 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset View
          </button>
          <button
            onClick={() => setExpandedNodes(new Set(['root']))}
            className="px-2 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Collapse All
          </button>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500">
            Click nodes to expand/collapse • Drag to pan • Scroll to zoom
          </span>
          <button
            onClick={toggleFullScreen}
            className="px-2 py-1 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Open in New Window
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden relative">
        <svg 
          ref={svgRef}
          className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {selectedNode && (
          <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium">Node Details</h3>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <dl className="text-sm">
              <dt className="font-medium text-gray-500">Type</dt>
              <dd className="mb-1">{selectedNode.label}</dd>
              
              {selectedNode.value && (
                <>
                  <dt className="font-medium text-gray-500">Value</dt>
                  <dd className="mb-1 font-mono">{selectedNode.value}</dd>
                </>
              )}
              
              <dt className="font-medium text-gray-500">Position</dt>
              <dd>x: {Math.round(selectedNode.x)}, y: {Math.round(selectedNode.y)}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParseTreeVisualization;