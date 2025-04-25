import React, { useEffect, useRef, useState, useCallback } from 'react';

interface Node {
  id: string;
  x: number;
  y: number;
  color?: 'red' | 'green' | 'yellow';
  checked?: boolean;
}

interface Edge {
  from: string;
  to: string;
  checked?: boolean;
}

interface TreeVisualizationProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

const TreeVisualization: React.FC<TreeVisualizationProps> = ({ visible, setVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const NODE_SIZE = 60; // Size of node in pixels
  const GRID_SIZE = 40; // Grid size in pixels
  const [editMode, setEditMode] = useState(false);
  const [gridSnap, setGridSnap] = useState(false);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [nextNodeId, setNextNodeId] = useState(4);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isBranchMode, setIsBranchMode] = useState(false);
  const [branchStart, setBranchStart] = useState<string | null>(null);
  const [branchPreview, setBranchPreview] = useState<{ fromX: number, fromY: number, toX: number, toY: number } | null>(null);
  const newNodeRef = useRef<HTMLDivElement>(null);
  const [dragPreviewContent, setDragPreviewContent] = useState<string>('+');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggingPosition, setDraggingPosition] = useState<{ x: number; y: number } | null>(null);

  const [nodes, setNodes] = useState<Node[]>([
    { id: 'A', x: 20, y: 20 },
    { id: 'B', x: 20, y: 80 },
    { id: 'C', x: 50, y: 80 },
    { id: 'D', x: 80, y: 80 }
  ]);

  const [edges, setEdges] = useState<Edge[]>([
    { from: 'A', to: 'B', checked: false },
    { from: 'B', to: 'C', checked: false },
    { from: 'C', to: 'D', checked: false }
  ]);

  const GRID_SNAP_INCREMENT = 40; // Grid size in pixels

  const handleColorSelect = (nodeId: string, color: 'red' | 'green' | 'yellow' | null) => {
    setNodes(nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, color: color || undefined };
      }
      return node;
    }));
  };

  const handleCheckToggle = (nodeId: string) => {
    setNodes(nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, checked: !node.checked };
      }
      return node;
    }));
  };

  const handleEdgeClick = useCallback((edge: Edge) => {
    if (editMode) {
      // Only allow deletion in edit mode
      if (isDeleteMode) {
        setEdges(edges.filter(e => !(e.from === edge.from && e.to === edge.to)));
      }
      return;
    }
    
    // Toggle checked state only when not in edit mode
    setEdges(prevEdges => prevEdges.map(e => {
      if (e.from === edge.from && e.to === edge.to) {
        return { ...e, checked: !e.checked };
      }
      return e;
    }));
  }, [editMode, isDeleteMode]);

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode) {
      handleCheckToggle(nodeId);
    } else if (isDeleteMode) {
      // Remove the node when in delete mode
      setNodes(nodes.filter(node => node.id !== nodeId));
    }
  };

  const handleDragStart = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode) return;
    e.preventDefault();
    setDraggingNode(nodeId);
    lastPositionRef.current = null;
  };

  const snapToGrid = (value: number, size: number): number => {
    if (!gridSnap) return value;
    // Convert percentage to pixels
    const pixels = (value / 100) * size;
    // Snap to nearest grid increment in pixels, offset by half node size to center on grid points
    const snappedPixels = Math.round((pixels - NODE_SIZE/2) / GRID_SNAP_INCREMENT) * GRID_SNAP_INCREMENT + NODE_SIZE/2;
    // Convert back to percentage and ensure it stays within bounds
    return Math.max(0, Math.min(100, (snappedPixels / size) * 100));
  };

  const smoothUpdatePosition = (nodeId: string, targetX: number, targetY: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate position as percentage of container
    let x = ((targetX - rect.left) / rect.width) * 100;
    let y = ((targetY - rect.top) / rect.height) * 100;

    // Ensure coordinates stay within bounds (0-100%)
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // Apply snapping if enabled
    if (gridSnap) {
      x = snapToGrid(x, rect.width);
      y = snapToGrid(y, rect.height);
    }

    setNodes(nodes.map(node => {
      if (node.id === nodeId) {
        return { ...node, x, y };
      }
      return node;
    }));
  };

  const handleDrag = (e: React.MouseEvent) => {
    if (!draggingNode || !editMode || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate raw position in pixels
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    if (gridSnap) {
      // Snap to the nearest grid point
      const snappedX = Math.round(rawX / GRID_SNAP_INCREMENT) * GRID_SNAP_INCREMENT;
      const snappedY = Math.round(rawY / GRID_SNAP_INCREMENT) * GRID_SNAP_INCREMENT;
      
      // Convert to percentages
      const x = (snappedX / rect.width) * 100;
      const y = (snappedY / rect.height) * 100;

      setDraggingPosition({ x, y });
      // Update the node position immediately
      setNodes(nodes.map(node => {
        if (node.id === draggingNode) {
          return { ...node, x, y };
        }
        return node;
      }));
    } else {
      // No snapping, just convert to percentages
      const x = (rawX / rect.width) * 100;
      const y = (rawY / rect.height) * 100;

      setDraggingPosition({ 
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
      });
      // Update the node position immediately
      setNodes(nodes.map(node => {
        if (node.id === draggingNode) {
          return { 
            ...node, 
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y))
          };
        }
        return node;
      }));
    }
  };

  const handleDragEnd = () => {
    setDraggingPosition(null);
    setDraggingNode(null);
  };

  const handleNewNodeDragStart = (e: React.DragEvent) => {
    if (!editMode) return;
    setIsDraggingNew(true);
    e.dataTransfer.setData('text/plain', 'new-node');
    
    // Create a preview node with the letter
    const previewNode = document.createElement('div');
    previewNode.className = 'graph-node';
    previewNode.style.position = 'absolute';
    previewNode.style.width = `${NODE_SIZE}px`;
    previewNode.style.height = `${NODE_SIZE}px`;
    previewNode.style.display = 'flex';
    previewNode.style.alignItems = 'center';
    previewNode.style.justifyContent = 'center';
    previewNode.style.background = '#1a1b1e';
    previewNode.style.border = '2px solid var(--accent-color)';
    previewNode.style.borderRadius = '50%';
    previewNode.style.color = 'white';
    previewNode.style.fontWeight = '600';
    previewNode.style.fontSize = '24px';
    previewNode.textContent = String.fromCharCode(65 + nextNodeId);
    
    document.body.appendChild(previewNode);
    e.dataTransfer.setDragImage(previewNode, NODE_SIZE/2 + 15, NODE_SIZE/2 + 15);
    
    // Remove the preview node after the drag image is captured
    setTimeout(() => {
      document.body.removeChild(previewNode);
    }, 0);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    if (!editMode || !isDraggingNew) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    if (!editMode || !isDraggingNew || !containerRef.current) return;
    e.preventDefault();
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate position as percentage of container
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    // Ensure coordinates stay within bounds (0-100%)
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    // Apply snapping if enabled
    if (gridSnap) {
      const pixelX = (x / 100) * rect.width;
      const pixelY = (y / 100) * rect.height;
      
      // Snap to grid in pixels
      const snappedX = Math.round((pixelX - NODE_SIZE/2) / GRID_SNAP_INCREMENT) * GRID_SNAP_INCREMENT + NODE_SIZE/2;
      const snappedY = Math.round((pixelY - NODE_SIZE/2) / GRID_SNAP_INCREMENT) * GRID_SNAP_INCREMENT + NODE_SIZE/2;
      
      // Convert back to percentages
      x = (snappedX / rect.width) * 100;
      y = (snappedY / rect.height) * 100;
    }

    // Create new node
    const newNode: Node = {
      id: String.fromCharCode(65 + nextNodeId), // A, B, C, etc.
      x,
      y
    };

    setNodes([...nodes, newNode]);
    setNextNodeId(nextNodeId + 1);
    setIsDraggingNew(false);
  };

  const handleNewNodeClick = () => {
    if (!editMode) return;
    
    // Create new node in center
    const newNode: Node = {
      id: String.fromCharCode(65 + nextNodeId),
      x: 50, // Center horizontally
      y: 50  // Center vertically
    };

    setNodes([...nodes, newNode]);
    setNextNodeId(nextNodeId + 1);
  };

  const handleBranchDragStart = (e: React.MouseEvent, nodeId: string) => {
    if (!editMode || !isBranchMode || !containerRef.current) return;
    e.preventDefault();
    const container = containerRef.current.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    setBranchStart(nodeId);
    const fromX = (node.x / 100) * container.width;
    const fromY = (node.y / 100) * container.height;
    setBranchPreview({ fromX, fromY, toX: fromX, toY: fromY });

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBranchPreview(prev => prev ? { ...prev, toX: x, toY: y } : null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Find if we're over another node
      const targetNode = nodes.find(node => {
        const nodeX = (node.x / 100) * rect.width;
        const nodeY = (node.y / 100) * rect.height;
        const distance = Math.sqrt(Math.pow(nodeX - x, 2) + Math.pow(nodeY - y, 2));
        return distance < NODE_SIZE / 2;
      });

      if (targetNode && targetNode.id !== nodeId) {
        // Check if edge already exists
        const edgeExists = edges.some(
          edge => (edge.from === nodeId && edge.to === targetNode.id) ||
                 (edge.from === targetNode.id && edge.to === nodeId)
        );
        if (!edgeExists) {
          setEdges([...edges, { from: nodeId, to: targetNode.id, checked: false }]);
        }
      }

      setBranchStart(null);
      setBranchPreview(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Turn off other modes when one is activated
  useEffect(() => {
    if (isDeleteMode) {
      setIsBranchMode(false);
      setBranchStart(null);
    }
  }, [isDeleteMode]);

  useEffect(() => {
    if (isBranchMode) {
      setIsDeleteMode(false);
      setBranchStart(null);
    }
  }, [isBranchMode]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Clean up previous edges
    const existingEdges = container.getElementsByClassName('graph-edge');
    while (existingEdges.length > 0) {
      existingEdges[0].remove();
    }

    // Draw edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode) return;

      const edgeElement = document.createElement('div');
      edgeElement.className = `graph-edge ${edge.checked ? 'checked' : ''}`;
      edgeElement.style.zIndex = '1';
      edgeElement.style.cursor = editMode ? (isDeleteMode ? 'pointer' : 'default') : 'pointer';
      edgeElement.style.pointerEvents = 'auto';

      // Add click event listener
      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleEdgeClick(edge);
      };

      edgeElement.addEventListener('click', handleClick);

      // Calculate edge position and rotation using current node positions
      const pixelFromX = (fromNode.x / 100) * containerRect.width;
      const pixelFromY = (fromNode.y / 100) * containerRect.height;
      const pixelToX = (toNode.x / 100) * containerRect.width;
      const pixelToY = (toNode.y / 100) * containerRect.height;

      const angle = Math.atan2(pixelToY - pixelFromY, pixelToX - pixelFromX);
      const BORDER_WIDTH = 2;
      const radius = (NODE_SIZE / 2) - (BORDER_WIDTH / 2);
      const distance = Math.sqrt(Math.pow(pixelToX - pixelFromX, 2) + Math.pow(pixelToY - pixelFromY, 2));
      const MIN_EDGE_LENGTH = 10;
      const scale = Math.max(0, Math.min(1, (distance - MIN_EDGE_LENGTH) / distance));
      
      const startX = pixelFromX + Math.cos(angle) * (radius * scale);
      const startY = pixelFromY + Math.sin(angle) * (radius * scale);
      const endX = pixelToX - Math.cos(angle) * (radius * scale);
      const endY = pixelToY - Math.sin(angle) * (radius * scale);
      
      const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
      const rotationAngle = angle * 180 / Math.PI;
      
      edgeElement.style.width = `${length}px`;
      edgeElement.style.left = `${startX}px`;
      edgeElement.style.top = `${startY}px`;
      edgeElement.style.transform = `rotate(${rotationAngle}deg)`;
      
      container.appendChild(edgeElement);

      // Cleanup function
      return () => {
        edgeElement.removeEventListener('click', handleClick);
      };
    });
  }, [nodes, edges, editMode, isDeleteMode, visible, handleEdgeClick]);

  useEffect(() => {
    if (draggingNode) {
      const handleMouseMove = (e: MouseEvent) => {
        handleDrag(e as unknown as React.MouseEvent);
      };

      const handleMouseUp = () => {
        handleDragEnd();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingNode]);

  useEffect(() => {
    if (!containerRef.current || !branchPreview) return;

    const container = containerRef.current;
    
    // Clean up previous preview
    const existingPreviews = container.getElementsByClassName('branch-preview');
    while (existingPreviews.length > 0) {
      existingPreviews[0].remove();
    }

    // Create preview line
    const previewElement = document.createElement('div');
    previewElement.className = 'branch-preview';
    
    // Calculate angle and length
    const angle = Math.atan2(branchPreview.toY - branchPreview.fromY, branchPreview.toX - branchPreview.fromX);
    const length = Math.sqrt(
      Math.pow(branchPreview.toX - branchPreview.fromX, 2) + 
      Math.pow(branchPreview.toY - branchPreview.fromY, 2)
    );

    // Style the preview line
    previewElement.style.position = 'absolute';
    previewElement.style.height = '3px';
    previewElement.style.width = `${length}px`;
    previewElement.style.left = `${branchPreview.fromX}px`;
    previewElement.style.top = `${branchPreview.fromY}px`;
    previewElement.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;
    previewElement.style.transformOrigin = 'left center';
    previewElement.style.background = '#4f46e5';
    previewElement.style.opacity = '0.5';
    previewElement.style.pointerEvents = 'none';
    previewElement.style.zIndex = '1';
    previewElement.style.borderRadius = '1.5px';
    previewElement.style.boxShadow = '0 0 8px rgba(79, 70, 229, 0.4)';

    container.appendChild(previewElement);

    return () => {
      if (previewElement.parentNode) {
        previewElement.parentNode.removeChild(previewElement);
      }
    };
  }, [branchPreview]);

  // Add a separate effect to handle initial render
  useEffect(() => {
    if (visible && containerRef.current) {
      const container = containerRef.current;
      const existingEdges = container.getElementsByClassName('graph-edge');
      while (existingEdges.length > 0) {
        existingEdges[0].remove();
      }

      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        
        if (!fromNode || !toNode) return;

        const edgeElement = document.createElement('div');
        edgeElement.className = `graph-edge ${edge.checked ? 'checked' : ''}`;
        edgeElement.style.zIndex = '1';
        edgeElement.style.cursor = editMode ? (isDeleteMode ? 'pointer' : 'default') : 'pointer';
        edgeElement.style.pointerEvents = 'auto';

        // Add click event listener
        const handleClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          handleEdgeClick(edge);
        };

        edgeElement.addEventListener('click', handleClick);

        const containerRect = container.getBoundingClientRect();
        const pixelFromX = (fromNode.x / 100) * containerRect.width;
        const pixelFromY = (fromNode.y / 100) * containerRect.height;
        const pixelToX = (toNode.x / 100) * containerRect.width;
        const pixelToY = (toNode.y / 100) * containerRect.height;

        const angle = Math.atan2(pixelToY - pixelFromY, pixelToX - pixelFromX);
        const BORDER_WIDTH = 2;
        const radius = (NODE_SIZE / 2) - (BORDER_WIDTH / 2);
        const distance = Math.sqrt(Math.pow(pixelToX - pixelFromX, 2) + Math.pow(pixelToY - pixelFromY, 2));
        const MIN_EDGE_LENGTH = 10;
        const scale = Math.max(0, Math.min(1, (distance - MIN_EDGE_LENGTH) / distance));
        
        const startX = pixelFromX + Math.cos(angle) * (radius * scale);
        const startY = pixelFromY + Math.sin(angle) * (radius * scale);
        const endX = pixelToX - Math.cos(angle) * (radius * scale);
        const endY = pixelToY - Math.sin(angle) * (radius * scale);
        
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        const rotationAngle = angle * 180 / Math.PI;
        
        edgeElement.style.width = `${length}px`;
        edgeElement.style.left = `${startX}px`;
        edgeElement.style.top = `${startY}px`;
        edgeElement.style.transform = `rotate(${rotationAngle}deg)`;
        
        container.appendChild(edgeElement);

        // Cleanup function
        return () => {
          edgeElement.removeEventListener('click', handleClick);
        };
      });
    }
  }, [visible, nodes, edges, editMode, isDeleteMode, handleEdgeClick]);

  return (
    <div className={`tree-panel ${visible ? 'visible' : ''}`}>
      <button 
        className="close-tree-button"
        onClick={() => setVisible(false)}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'var(--background-color)',
          border: '2px solid var(--accent-color)',
          cursor: 'pointer',
          borderRadius: '8px',
          color: 'var(--text-color)',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Close Tree
      </button>
      <h2 className="tree-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L20 7.5V16.5L12 21L4 16.5V7.5L12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Node Tree
      </h2>
      <p className="tree-description">
        This visualization demonstrates how a stack is used in graph traversal.
        The stack keeps track of nodes to visit, pushing adjacent nodes and popping when backtracking.
      </p>
      <div style={{ position: 'relative' }}>
        {editMode && (
          <div style={{
            position: 'absolute',
            top: '-35px',
            right: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            zIndex: 1
          }}>
            <span style={{ color: '#9ca3af', fontSize: '16px' }}>Snap to Grid</span>
            <div style={{ position: 'relative', width: '44px', height: '24px' }}>
              <input
                type="checkbox"
                checked={gridSnap}
                onChange={(e) => setGridSnap(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div
                onClick={() => setGridSnap(!gridSnap)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: gridSnap ? 'linear-gradient(135deg, #4338ca, #4f46e5)' : '#e5e7eb',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    height: '20px',
                    width: '20px',
                    left: gridSnap ? '22px' : '2px',
                    bottom: '2px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'all 0.3s ease',
                    boxShadow: gridSnap ? '0 0 10px rgba(79, 70, 229, 0.3)' : 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}
        <div 
          className={`graph-container ${editMode ? 'edit-mode' : ''} ${gridSnap ? 'show-grid' : ''}`} 
          ref={containerRef}
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
          style={{
            ...(gridSnap && editMode ? {
              backgroundImage: `radial-gradient(circle at center, rgba(79, 70, 229, 0.2) 2px, transparent 2px)`,
              backgroundSize: `${GRID_SNAP_INCREMENT}px ${GRID_SNAP_INCREMENT}px`,
              backgroundPosition: `${GRID_SNAP_INCREMENT/2}px ${GRID_SNAP_INCREMENT/2}px`
            } : {}),
            position: 'relative',
            border: editMode ? '2px dashed rgba(79, 70, 229, 0.6)' : '2px solid #1a1b1e',
            ...(isDeleteMode ? {
              boxShadow: 'inset 0 0 100px rgba(239, 68, 68, 0.15)',
              transition: 'box-shadow 0.3s ease'
            } : {
              transition: 'box-shadow 0.3s ease'
            }),
            boxSizing: 'border-box'
          }}
        >
          {/* Render non-hovered nodes first */}
          {nodes
            .filter(node => node.id !== hoveredNodeId)
            .map(node => (
              <div
                key={node.id}
                className={`graph-node ${node.checked ? 'checked' : ''} ${node.color ? `highlighted-${node.color}` : ''} ${draggingNode === node.id ? 'dragging' : ''} ${branchStart === node.id ? 'branch-start' : ''}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  cursor: editMode ? (isDeleteMode ? 'pointer' : isBranchMode ? 'crosshair' : 'move') : 'pointer',
                  transition: draggingNode === node.id ? 'none' : 'all 0.2s ease-out',
                  background: '#1a1b1e',
                  zIndex: 2
                }}
                onClick={(e) => {
                  if (!editMode && e.target === e.currentTarget) {
                    handleCheckToggle(node.id);
                  } else {
                    handleNodeClick(e, node.id);
                  }
                }}
                onMouseDown={(e) => {
                  if (editMode) {
                    if (isBranchMode) {
                      handleBranchDragStart(e, node.id);
                    } else if (!isDeleteMode) {
                      handleDragStart(e, node.id);
                    }
                  }
                }}
                onMouseEnter={() => {
                  setHoveredNodeId(node.id);
                  if (isDeleteMode || isBranchMode) setHoveredNode(node.id);
                }}
                onMouseLeave={() => {
                  setHoveredNodeId(null);
                  if (isDeleteMode || isBranchMode) setHoveredNode(null);
                }}
              >
                {node.id}
                {!editMode && (
                  <div className="node-menu">
                    <div className="menu-title">Highlight Color</div>
                    <div className="color-options">
                      <div 
                        className={`color-option red ${node.color === 'red' ? 'active' : ''}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(node.id, node.color === 'red' ? null : 'red');
                        }}
                      />
                      <div 
                        className={`color-option yellow ${node.color === 'yellow' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(node.id, node.color === 'yellow' ? null : 'yellow');
                        }}
                      />
                      <div 
                        className={`color-option green ${node.color === 'green' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(node.id, node.color === 'green' ? null : 'green');
                        }}
                      />
                    </div>
                    <button 
                      className="menu-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckToggle(node.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {node.checked ? 'Uncheck' : 'Check'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          
          {/* Render hovered node last */}
          {hoveredNodeId && nodes
            .filter(node => node.id === hoveredNodeId)
            .map(node => (
              <div
                key={node.id}
                className={`graph-node ${node.checked ? 'checked' : ''} ${node.color ? `highlighted-${node.color}` : ''} ${draggingNode === node.id ? 'dragging' : ''} ${branchStart === node.id ? 'branch-start' : ''}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  cursor: editMode ? (isDeleteMode ? 'pointer' : isBranchMode ? 'crosshair' : 'move') : 'pointer',
                  transition: draggingNode === node.id ? 'none' : 'all 0.2s ease-out',
                  background: '#1a1b1e',
                  zIndex: 1000
                }}
                onClick={(e) => {
                  if (!editMode && e.target === e.currentTarget) {
                    handleCheckToggle(node.id);
                  } else {
                    handleNodeClick(e, node.id);
                  }
                }}
                onMouseDown={(e) => {
                  if (editMode) {
                    if (isBranchMode) {
                      handleBranchDragStart(e, node.id);
                    } else if (!isDeleteMode) {
                      handleDragStart(e, node.id);
                    }
                  }
                }}
                onMouseEnter={() => {
                  setHoveredNodeId(node.id);
                  if (isDeleteMode || isBranchMode) setHoveredNode(node.id);
                }}
                onMouseLeave={() => {
                  setHoveredNodeId(null);
                  if (isDeleteMode || isBranchMode) setHoveredNode(null);
                }}
              >
                {node.id}
                {!editMode && (
                  <div className="node-menu">
                    <div className="menu-title">Highlight Color</div>
                    <div className="color-options">
                      <div 
                        className={`color-option red ${node.color === 'red' ? 'active' : ''}`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(node.id, node.color === 'red' ? null : 'red');
                        }}
                      />
                      <div 
                        className={`color-option yellow ${node.color === 'yellow' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(node.id, node.color === 'yellow' ? null : 'yellow');
                        }}
                      />
                      <div 
                        className={`color-option green ${node.color === 'green' ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorSelect(node.id, node.color === 'green' ? null : 'green');
                        }}
                      />
                    </div>
                    <button 
                      className="menu-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckToggle(node.id);
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {node.checked ? 'Uncheck' : 'Check'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          {editMode && (
            <>
              <div
                className="graph-node"
                style={{
                  position: 'absolute',
                  bottom: '180px',
                  right: '20px',
                  transform: 'none',
                  cursor: 'pointer',
                  opacity: isBranchMode ? '1' : '0.6',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '0',
                  border: isBranchMode ? '2px solid #4f46e5' : '2px solid var(--accent-color)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setIsBranchMode(!isBranchMode)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(-40deg)' }}>
                  <circle cx="4" cy="12" r="3" stroke={isBranchMode ? '#4f46e5' : 'currentColor'} strokeWidth="2"/>
                  <circle cx="20" cy="12" r="3" stroke={isBranchMode ? '#4f46e5' : 'currentColor'} strokeWidth="2"/>
                  <line x1="7" y1="12" x2="17" y2="12" stroke={isBranchMode ? '#4f46e5' : 'currentColor'} strokeWidth="2" strokeDasharray="3 3"/>
                </svg>
              </div>
              <div
                className="graph-node"
                style={{
                  position: 'absolute',
                  bottom: '100px',
                  right: '20px',
                  transform: 'none',
                  cursor: 'pointer',
                  opacity: isDeleteMode ? '1' : '0.6',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '0',
                  border: isDeleteMode ? '2px solid #ef4444' : '2px solid var(--accent-color)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setIsDeleteMode(!isDeleteMode)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21" stroke={isDeleteMode ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke={isDeleteMode ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div
                ref={newNodeRef}
                className="graph-node new-node-template"
                draggable
                onDragStart={handleNewNodeDragStart}
                onClick={handleNewNodeClick}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  transform: 'none',
                  cursor: 'grab',
                  opacity: isDraggingNew ? '0.6' : '1',
                  fontSize: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: '0',
                  marginTop: '-2px',
                  paddingBottom: '4px'
                }}
              >
                +
              </div>
            </>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button 
          className={`edit-mode-toggle ${editMode ? 'active' : ''}`}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Done Editing' : 'Edit Nodes'}
        </button>
      </div>
    </div>
  );
};

export default TreeVisualization; 