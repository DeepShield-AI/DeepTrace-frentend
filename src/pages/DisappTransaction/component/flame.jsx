import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const FlameGraph = ({ data, width = 800, height = 400, minHeight = 18, onClick }) => {
  const svgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [visibleNodes, setVisibleNodes] = useState([]);

  // 计算节点的位置和尺寸
  useEffect(() => {
    if (!data || data.length === 0) return;

    const root = data[0];
    const totalWidth = width * transform.scale;
    const nodes = [];

    function traverse(node, depth, x, availableWidth) {
      const nodeWidth = (node.value / root.value) * availableWidth;
      if (nodeWidth < 1) return; // 宽度太小则不显示

      const y = depth * minHeight;
      const height = minHeight;

      nodes.push({
        ...node,
        x,
        y,
        width: nodeWidth,
        height,
        depth
      });

      if (node.children && node.children.length > 0) {
        let currentX = x;
        node.children.forEach(child => {
          traverse(child, depth + 1, currentX, nodeWidth);
          currentX += (child.value / root.value) * availableWidth;
        });
      }
    }

    traverse(root, 0, 0, totalWidth);
    setVisibleNodes(nodes);
  }, [data, width, height, minHeight, transform]);

  // 处理缩放和平移
  const handleWheel = (e) => {
    e.preventDefault();
    const { deltaY } = e;
    const newScale = transform.scale * (deltaY < 0 ? 1.1 : 0.9);
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(5, newScale))
    }));
  };

  const handleDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const { x, y } = transform;

    const handleDrag = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setTransform({
        x: x + dx,
        y: y + dy,
        scale: transform.scale
      });
    };

    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // 颜色生成函数
  const getColor = (node, depth) => {
    if (node === selectedNode) return '#ff5555'; // 选中节点颜色
    if (node === hoveredNode) return '#ffaa99'; // 高亮颜色
    const hue = (depth * 30) % 360; // 根据深度生成不同色调
    return `hsl(${hue}, 70%, 60%)`;
  };

  // 处理节点点击
  const handleNodeClick = (node, e) => {
    e.stopPropagation(); // 防止触发拖拽
    console.log(node,e, "-----");
    
    setSelectedNode(node === selectedNode ? null : node); // 切换选中状态
    onClick?.(node); // 调用外部回调
  };

  return (
    <div 
      style={{ width, height, overflow: 'hidden', position: 'relative' }}
      // onWheel={handleWheel} //取消缩放功能
    >
      <svg 
        ref={svgRef}
        width={width} 
        height={height}
        onMouseDown={handleDragStart}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${1/transform.scale})`}>
          {visibleNodes.map(node => (
            <g key={node.name}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={getColor(node, node.depth)}
                stroke="#333"
                strokeWidth={0.5}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => handleNodeClick(node, e)}
                style={{ cursor: 'pointer' }}
              />
              {node.width > 20 && (
                <text
                  x={node.x + 5}
                  y={node.y + node.height - 5}
                  fontSize={12}
                  fill={node === selectedNode ? '#fff' : '#333'}
                  pointerEvents="none"
                >
                  {node.name} ({node.value})
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
      
      {hoveredNode && (
        <div 
          style={{
            position: 'absolute',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 100
          }}
        >
          <div><strong>{hoveredNode.name}</strong></div>
          <div>Value: {hoveredNode.value}</div>
          {hoveredNode.depth !== undefined && <div>Depth: {hoveredNode.depth}</div>}
        </div>
      )}
      
      {selectedNode && (
        <div 
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px',
            zIndex: 100,
            width: "100%"
          }}
        >
          <h3>选中节点: {selectedNode.name}</h3>
          <div>值: {selectedNode.value}</div>
          <div>深度: {selectedNode.depth}</div>
          <div>子节点数量: {selectedNode.children?.length || 0}</div>
        </div>
      )}
    </div>
  );
};

FlameGraph.propTypes = {
  data: PropTypes.array.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  minHeight: PropTypes.number,
  onClick: PropTypes.func
};

export default FlameGraph;    