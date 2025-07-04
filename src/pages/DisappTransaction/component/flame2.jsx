// 堆叠式火焰图完整实现
import React, { useState, useRef, useEffect } from 'react';

function StackedFlameGraph({ data, width = 800, height = 600 }) {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [visibleNodes, setVisibleNodes] = useState([]);

  // 计算节点在堆叠火焰图中的位置
  const calculateStackPosition = (node, allNodes, index) => {
    // 首先过滤出同一父节点的所有子节点
    const siblings = allNodes.filter(n => n.parent === node.parent);
    
    // 计算当前节点在兄弟中的索引
    const siblingIndex = siblings.findIndex(s => s === node);
    
    // 基础位置计算 - 水平位置由层级深度决定
    let x = 0;
    if (node.parent) {
      const parentNode = allNodes.find(n => n.name === node.parent);
      if (parentNode) {
        x = parentNode.x;
      }
    }
    
    // 垂直位置由兄弟节点堆叠决定
    let y = 0;
    if (siblingIndex > 0) {
      // 获取前一个兄弟节点
      const prevSibling = siblings[siblingIndex - 1];
      y = prevSibling.y + prevSibling.height;
    } else if (node.parent) {
      // 第一个子节点位于父节点下方
      const parentNode = allNodes.find(n => n.name === node.parent);
      if (parentNode) {
        y = parentNode.y + parentNode.height;
      }
    }
    
    // 宽度计算 - 子节点宽度按比例分配父节点宽度
    let width = node.width;
    if (node.parent) {
      const parentNode = allNodes.find(n => n.name === node.parent);
      if (parentNode) {
        // 计算所有子节点的总价值，用于比例分配
        const totalSiblingValue = siblings.reduce((sum, s) => sum + s.value, 0);
        if (totalSiblingValue > 0) {
          width = parentNode.width * (node.value / totalSiblingValue);
        }
      }
    }
    
    return {
      x,
      y,
      width,
      height: node.height || 20
    };
  };

  // 获取节点颜色
  const getColor = (node, depth) => {
    // 简单的颜色渐变，深度越深颜色越重
    const hue = 200 - depth * 20; // 从蓝色到绿色渐变
    return `hsl(${hue}, 70%, ${50 + depth * 5}%)`;
  };

  // 处理节点点击
  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    setSelectedNode(prev => (prev === node ? null : node));
    
    // 可添加展开/折叠子节点的逻辑
    if (node.children && node.children.length > 0) {
      // 这里可以实现展开或折叠子节点的功能
    }
  };

  // 处理拖拽开始
  const handleDragStart = (e) => {
    // 拖拽功能实现
    const startX = e.clientX;
    const startY = e.clientY;
    const startTransform = { ...transform };
    
    const handleDrag = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setTransform({
        x: startTransform.x + dx,
        y: startTransform.y + dy,
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

  // 初始化数据 - 处理数据为适合堆叠火焰图的格式
  useEffect(() => {
    if (data && data.length > 0) {
      // 这里假设data是一个节点数组，每个节点有name, value, parent, children等属性
      // 实际使用中可能需要根据你的数据结构调整
      
      // 简单示例：为每个节点计算基本尺寸
      const processedNodes = data.map(node => ({
        ...node,
        // 假设value代表节点大小，转换为像素宽度
        width: node.value / 10, // 示例转换，根据实际数据调整
        height: 20, // 固定高度或根据需要调整
        x: 0, // 初始x坐标，由calculateStackPosition计算
        y: 0  // 初始y坐标，由calculateStackPosition计算
      }));
      
      setVisibleNodes(processedNodes);
    }
  }, [data]);

  return (
    <svg 
      ref={svgRef}
      width={width} 
      height={height}
      onMouseDown={handleDragStart}
    >
      <g transform={`translate(${transform.x}, ${transform.y}) scale(${1/transform.scale})`}>
        {visibleNodes.map((node, index) => {
          // 1. 复制节点数据并计算堆叠布局坐标
          const stackedNode = { ...node };
          const { depth, value, children = [] } = node;
          
          // 2. 计算水平偏移：层级越深，水平偏移越大
          const HORIZONTAL_PADDING = 20; // 层级间水平间隔
          stackedNode.x = depth * HORIZONTAL_PADDING;
          
          // 3. 计算垂直位置：同层级节点按顺序堆叠
          const STACKED_Y_PADDING = 5; // 节点垂直间隔
          const siblingNodes = visibleNodes.filter(n => n.depth === depth && n.parent === node.parent);
          const siblingIndex = siblingNodes.findIndex(n => n.name === node.name);
          
          // 若为根节点（无父节点），从y=0开始堆叠
          if (!node.parent) {
            stackedNode.y = siblingIndex * (node.height + STACKED_Y_PADDING);
          } else {
            // 非根节点：y坐标为父节点底部 + 间隔
            const parentNode = visibleNodes.find(n => n.name === node.parent);
            stackedNode.y = parentNode.y + parentNode.height + STACKED_Y_PADDING;
          }
          
          // 4. 堆叠布局中，节点宽度由父层级或全局比例决定
          // 示例：同层级节点等宽，宽度为剩余空间 / 同层级节点数
          const TOTAL_SIBLINGS = siblingNodes.length;
          if (TOTAL_SIBLINGS > 0) {
            const AVAILABLE_WIDTH = width - (depth + 1) * HORIZONTAL_PADDING;
            stackedNode.width = AVAILABLE_WIDTH / TOTAL_SIBLINGS;
          }
          
          return (
            <g key={node.name}>
              <rect
                x={stackedNode.x}
                y={stackedNode.y}
                width={stackedNode.width}
                height={stackedNode.height}
                fill={getColor(stackedNode, stackedNode.depth)}
                stroke="#333"
                strokeWidth={0.5}
                onMouseEnter={() => setHoveredNode(stackedNode)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={(e) => handleNodeClick(stackedNode, e)}
                style={{ cursor: 'pointer' }}
              />
              {stackedNode.width > 20 && (
                <text
                  x={stackedNode.x + 5}
                  y={stackedNode.y + stackedNode.height - 5}
                  fontSize={12}
                  fill={stackedNode === selectedNode ? '#fff' : '#333'}
                  pointerEvents="none"
                >
                  {stackedNode.name} ({stackedNode.value})
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export default StackedFlameGraph;