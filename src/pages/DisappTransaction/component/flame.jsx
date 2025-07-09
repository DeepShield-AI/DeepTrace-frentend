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

  // // 颜色生成函数
  // const getColor = (node, depth) => {
  //   if (node === selectedNode) return '#ff5555'; // 选中节点颜色
  //   if (node === hoveredNode) return '#ffaa99'; // 高亮颜色
  //   const hue = (depth * 30) % 360; // 根据深度生成不同色调
  //   return `hsl(${hue}, 70%, 60%)`;
  // };

  // 增强版颜色生成函数
const getColor = (node, depth) => {
  if (node === selectedNode) return '#FF3A5E'; // 选中节点：鲜艳的珊瑚红，吸引注意力
  if (node === hoveredNode) return '#FF8A65'; // 悬停节点：温暖的橙色，提供交互反馈
  
  // 根据深度生成渐变色系
  // 浅色系：深度0-2使用柔和的蓝绿色调，适合根节点
  if (depth <= 2) {
    const hue = 180 - (depth * 20); // 从蓝绿色过渡到青色
    return `hsl(${hue}, 75%, 65%)`;
  }
  // 中色系：深度3-5使用活力的蓝紫色调，适合中间层
  else if (depth <= 5) {
    const hue = 240 - (depth * 15); // 从靛蓝色过渡到紫色
    return `hsl(${hue}, 70%, 60%)`;
  }
  // 深色系：深度6+使用浓郁的紫色调，适合叶子节点
  else {
    const hue = 270 - Math.min((depth - 6) * 10, 30); // 从紫色过渡到深紫
    return `hsl(${hue}, 65%, 55%)`;
  }
};

  // 专业数据可视化风格的颜色生成函数
  // const getColor = (node, depth) => {
  //   if (node === selectedNode) return '#4E90E8'; // 选中节点：专业蓝色，传达可靠感
  //   if (node === hoveredNode) return '#93C5FD'; // 悬停节点：浅蓝色，提供柔和反馈
    
  //   // 根据深度生成从灰到蓝的渐变色
  //   const baseHue = 50; // 蓝色系基础色调
  //   const depthFactor = Math.min(depth * 0.15, 0.5); // 深度因子，最大0.7
    
  //   // 计算亮度和饱和度，深度越大颜色越深
  //   const lightness = 80 - (depthFactor * 25); // 从80%亮度递减到55%
  //   const saturation = 20 + (depthFactor * 50); // 从20%饱和度递增到70%
    
  //   return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`;
  // };

  // 处理节点点击
  const handleNodeClick = (node, e) => {
    e.stopPropagation(); // 防止触发拖拽
    
    setSelectedNode(node === selectedNode ? null : node); // 切换选中状态
    onClick?.(node); // 调用外部回调
  };

    // 堆叠布局配置
  const STACKED_LAYOUT_BASE_OFFSET = 20; // 层级基础偏移
  const Y_SPACING = 5; // 节点垂直间距

  // 计算堆叠布局的Y坐标
  function calculateStackedY(node, allNodes) {
    // 找到同一父节点下的所有兄弟节点
    const parent = allNodes.find(n => n.children && n.children.includes(node));
    const siblings = parent ? parent.children : allNodes.filter(n => n.depth === node.depth);
    
    // 找到当前节点在兄弟中的索引
    const siblingIndex = siblings.indexOf(node);
    
    // 计算同一父节点下前面兄弟节点的总高度
    const previousHeights = siblings.slice(0, siblingIndex).reduce((sum, n) => sum + n.height + Y_SPACING, 0);
    
    // 如果是根节点，直接从顶部开始
    if (!parent) {
      return previousHeights;
    }
    
    // 非根节点的Y坐标 = 父节点Y坐标 + 父节点高度 + 间距 + 前面兄弟的总高度
    const parentNode = allNodes.find(n => n.name === parent.name);
    return parentNode.y + parentNode.height + Y_SPACING + previousHeights;
  }

  // 可能需要调整节点宽度计算函数（如果需要等宽显示）
  function calculateStackedWidth(node, allNodes) {
    const sameDepthNodes = allNodes.filter(n => n.depth === node.depth);
    const totalValue = sameDepthNodes.reduce((sum, n) => sum + n.value, 0);
    
    // 等宽模式（所有同层级节点宽度相同）
    const availableWidth = width - (node.depth * STACKED_LAYOUT_BASE_OFFSET);
    return availableWidth / sameDepthNodes.length;
    
    // 或者保持比例宽度
    // return (node.value / totalValue) * availableWidth;
  }

  return (
    <div 
      style={{ width, height, overflow: 'hidden', position: 'relative' }}
      // onWheel={handleWheel} //取消缩放功能
    >
      {/* <svg 
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
      </svg> */}
      <svg 
        ref={svgRef}
        width={width} 
        height={height}
        onMouseDown={handleDragStart}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${1/transform.scale})`}>
          {visibleNodes.map((node, index) => {
            // 计算堆叠布局的节点坐标
            const stackedNode = { ...node };
            
            // 1. 确定当前节点的层级（深度）
            const depth = node.depth || 0;
            
            // 2. 计算同一层级中前面节点的总宽度
            const sameDepthNodes = visibleNodes.filter(n => n.depth === depth);
            const previousNodesInSameDepth = sameDepthNodes.slice(0, sameDepthNodes.indexOf(node));
            const previousWidths = previousNodesInSameDepth.reduce((sum, n) => sum + n.width, 0);
            
            // 3. 堆叠布局的x坐标 = 层级*基础偏移 + 同层级前面节点的总宽度
            stackedNode.x = depth * STACKED_LAYOUT_BASE_OFFSET + previousWidths;
            
            // 4. y坐标基于层级和堆叠顺序计算
            stackedNode.y = calculateStackedY(node, visibleNodes);
            
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