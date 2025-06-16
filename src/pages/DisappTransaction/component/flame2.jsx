import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const FlameGraph = ({ data, width = 800, height = 600, minHeight = 20, onClick }) => {
  const svgRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [visibleNodes, setVisibleNodes] = useState([]);
  const [timeRange, setTimeRange] = useState({ min: 0, max: 1 });

  // 计算时间范围
  useEffect(() => {
    if (!data || data.length === 0) return;

    let minTime = Infinity;
    let maxTime = -Infinity;

    function traverse(node) {
      if (node.start_time !== undefined) {
        minTime = Math.min(minTime, node.start_time);
        maxTime = Math.max(maxTime, node.start_time + (node.duration || 0));
      }
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => traverse(child));
      }
    }

    data.forEach(root => traverse(root));
    setTimeRange({ min: minTime, max: maxTime });
  }, [data]);

  // 计算节点的位置和尺寸
  useEffect(() => {
    if (!data || data.length === 0 || timeRange.max <= timeRange.min) return;

    const totalWidth = width * transform.scale;
    const timeSpan = timeRange.max - timeRange.min;
    const nodes = [];

    function traverse(node, depth, parentStartTime = timeRange.min) {
      const startTime = node.start_time !== undefined ? node.start_time : parentStartTime;
      const nodeWidth = ((node.duration || 0) / timeSpan) * totalWidth;
      const x = ((startTime - timeRange.min) / timeSpan) * totalWidth;
      
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
        // 按startTime排序子节点
        const sortedChildren = [...node.children].sort((a, b) => {
          const timeA = a.start_time !== undefined ? a.start_time : 0;
          const timeB = b.start_time !== undefined ? b.start_time : 0;
          return timeA - timeB;
        });
        
        sortedChildren.forEach(child => {
          traverse(child, depth + 1, startTime);
        });
      }
    }

    data.forEach(root => traverse(root, 0));
    setVisibleNodes(nodes);
  }, [data, width, height, minHeight, transform, timeRange]);

  // 处理缩放和平移
  const handleWheel = (e) => {
    e.preventDefault();
    const { deltaY } = e;
    const newScale = transform.scale * (deltaY < 0 ? 1.1 : 0.9);
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(10, newScale))
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
    setSelectedNode(node === selectedNode ? null : node); // 切换选中状态
    onClick?.(node); // 调用外部回调
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp / 1000); // 假设时间戳是纳秒，转换为毫秒
    return date.toISOString().slice(11, -1); // 只显示时间部分
  };

  // 生成时间轴标记
  const generateTimeMarkers = () => {
    if (timeRange.max <= timeRange.min) return [];
    
    const markers = [];
    const timeSpan = timeRange.max - timeRange.min;
    const numMarkers = 5; // 默认为5个标记
    
    for (let i = 0; i <= numMarkers; i++) {
      const position = (i / numMarkers) * width;
      const time = timeRange.min + (i / numMarkers) * timeSpan;
      
      markers.push(
        <g key={i}>
          <line 
            x1={position} 
            y1={0} 
            x2={position} 
            y2={10} 
            stroke="#999" 
            strokeWidth={1} 
          />
          <text 
            x={position} 
            y={25} 
            fontSize={10} 
            textAnchor="middle" 
            fill="#333"
          >
            {formatTime(time)}
          </text>
        </g>
      );
    }
    
    return markers;
  };

  return (
    <div 
      style={{ width, height, overflow: 'hidden', position: 'relative' }}
      onWheel={handleWheel}
    >
      <svg 
        ref={svgRef}
        width={width} 
        height={height}
        onMouseDown={handleDragStart}
      >
        {/* 时间轴 */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${1/transform.scale})`}>
          <line x1={0} y1={0} x2={width} y2={0} stroke="#333" strokeWidth={1} />
          {generateTimeMarkers()}
        </g>
        
        {/* 火焰图 */}
        <g transform={`translate(${transform.x}, ${transform.y + 30}) scale(${1/transform.scale})`}>
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
              {node.width > 30 && (
                <text
                  x={node.x + 5}
                  y={node.y + node.height - 5}
                  fontSize={12}
                  fill={node === selectedNode ? '#fff' : '#333'}
                  pointerEvents="none"
                >
                  {node.name.substring(0, 15)} ({node.duration})
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
          <div>开始时间: {formatTime(hoveredNode.start_time)}</div>
          <div>结束时间: {formatTime(hoveredNode.start_time + hoveredNode.duration)}</div>
          <div>持续时间: {hoveredNode.duration}</div>
          {hoveredNode.depth !== undefined && <div>层级: {hoveredNode.depth}</div>}
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
            zIndex: 100
          }}
        >
          <h3>选中节点: {selectedNode.name}</h3>
          <div>开始时间: {formatTime(selectedNode.start_time)}</div>
          <div>结束时间: {formatTime(selectedNode.start_time + selectedNode.duration)}</div>
          <div>持续时间: {selectedNode.duration}</div>
          <div>层级: {selectedNode.depth}</div>
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