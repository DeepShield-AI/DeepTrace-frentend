import React, { useState, useEffect, useMemo, useRef } from 'react';
import './flame.css';

const FlameGraph = ({ data }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const flameGraphRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // 为每个层级定义颜色
  const levelColors = [
    '#FF6B6B', // 层级0 - 根节点
    '#4ECDC4', // 层级1
    '#FFD166', // 层级2
    '#6A0572', // 层级3
    '#1A535C', // 层级4
    '#FF9F1C', // 层级5
    '#2EC4B6', // 层级6
    '#E71D36'  // 层级7
  ];

  // 计算整个跟踪的时间范围
  const timeRange = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    const traverse = (node) => {
      if (node.start_time < minTime) minTime = node.start_time;
      if (node.end_time > maxTime) maxTime = node.end_time;
      node.children?.forEach(traverse);
    };
    
    data.forEach(traverse);
    return { minTime, maxTime, range: maxTime - minTime };
  }, [data]);

  // 计算时间位置
  const calculatePosition = (startTime) => {
    return ((startTime - timeRange.minTime) / timeRange.range) * 100;
  };

  // 计算时间宽度
  const calculateWidth = (duration) => {
    return (duration / timeRange.range) * 100;
  };

  // 展平所有节点并计算位置
  const flattenedNodes = useMemo(() => {
    const nodes = [];
    let rowIndex = 0;
    
    const traverse = (node, depth) => {
      const isExpanded = expandedNodes.has(node.name);
      const position = calculatePosition(node.start_time);
      const width = calculateWidth(node.duration);
      
      nodes.push({
        ...node,
        depth,
        rowIndex,
        position,
        width,
        isExpanded
      });
      
      rowIndex++;
      
      if (isExpanded && node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    
    data.forEach(root => traverse(root, 0));
    return nodes;
  }, [data, expandedNodes, timeRange]);

  // 渲染时间轴刻度
  const renderTimeScale = () => {
    const ticks = [];
    const tickCount = 10;
    const tickInterval = timeRange.range / tickCount;
    
    for (let i = 0; i <= tickCount; i++) {
      const timeValue = timeRange.minTime + i * tickInterval;
      const position = (i / tickCount) * 100;
      
      ticks.push(
        <div key={i} style={{
          position: 'absolute',
          left: `${position}%`,
          top: 0,
          height: '20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '0.8em',
          color: '#666'
        }}>
          <div style={{ height: '5px', width: '1px', background: '#999' }}></div>
          <div>{Math.round(timeValue)}μs</div>
        </div>
      );
    }
    
    return (
      <div style={{
        position: 'relative',
        height: '30px',
        borderBottom: '1px solid #ddd',
        marginBottom: '10px'
      }}>
        {ticks}
      </div>
    );
  };

  // 处理鼠标悬浮事件
  const handleMouseEnter = (e, node) => {
    setHoveredNode(node);
    
    // 计算工具提示位置
    const tooltipWidth = tooltipRef.current?.offsetWidth || 250;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 150;
    const viewportHeight = window.innerHeight;
    
    let x = e.clientX + 10;
    let y = e.clientY + 10;
    
    // 防止工具提示超出屏幕右侧
    if (x + tooltipWidth > viewportWidth) {
      x = e.clientX - tooltipWidth - 10;
    }
    
    // 防止工具提示超出屏幕底部
    if (y + tooltipHeight > viewportHeight) {
      y = e.clientY - tooltipHeight - 10;
    }
    
    setTooltipPosition({ x, y });
  };

  // 渲染节点
  const renderNode = (node) => {
    // 根据深度选择颜色
    const color = levelColors[node.depth % levelColors.length];
    
    // 计算名称显示方式
    const displayName = () => {
      if (node.width > 8) {
        // 宽度足够显示完整名称
        return (
          <div className="name-container">
            <div className="name">{node.name}</div>
            <div className="value">{node.duration}μs</div>
          </div>
        );
      } else if (node.width > 4) {
        // 宽度中等，显示缩写名称
        const shortName = node.name.length > 12 
          ? `${node.name.substring(0, 10)}...` 
          : node.name;
        return (
          <div className="name-container">
            <div className="name">{shortName}</div>
            <div className="value">{node.duration}μs</div>
          </div>
        );
      } else {
        // 宽度很小，只显示值
        return (
          <div className="name-container">
            <div className="value">{node.duration}μs</div>
          </div>
        );
      }
    };

    return (
      <div 
        key={`${node.name}-${node.rowIndex}`}
        className={`node ${selectedNode?.name === node.name ? 'selected' : ''}`}
        style={{
          left: `${node.position}%`,
          width: `${node.width}%`,
          backgroundColor: color,
          height: '40px',
          margin: '5px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          cursor: node.children?.length > 0 ? 'pointer' : 'default',
          position: 'absolute',
          transition: 'all 0.3s ease',
          border: selectedNode?.name === node.name 
            ? '2px solid #FFD700' 
            : '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          minWidth: '20px',
          top: `${node.rowIndex * 50}px`,
          zIndex: 10 - node.depth
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (node.children?.length > 0) {
            const newSet = new Set(expandedNodes);
            if (newSet.has(node.name)) {
              newSet.delete(node.name);
            } else {
              newSet.add(node.name);
            }
            setExpandedNodes(newSet);
          }
          setSelectedNode(node);
        }}
        onMouseEnter={(e) => handleMouseEnter(e, node)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        {displayName()}
        {node.children?.length > 0 && (
          <span 
            className="expand-icon"
            style={{ 
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8em'
            }}
          >
            {node.isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>
    );
  };

  // 渲染概览树
  const renderOverviewTree = () => {
    const renderTreeNode = (node, depth = 0) => {
      const isExpanded = expandedNodes.has(node.name);
      const isSelected = selectedNode?.name === node.name;
      
      return (
        <div key={node.name} style={{ marginLeft: `${depth * 15}px` }}>
          <div 
            className={`tree-node ${isSelected ? 'selected' : ''}`}
            style={{
              padding: '6px 10px',
              margin: '4px 0',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: isSelected ? '#e6f7ff' : '#f9f9f9',
              borderLeft: `4px solid ${levelColors[depth % levelColors.length]}`,
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
              boxShadow: isSelected 
                ? '0 0 0 2px #1890ff' 
                : '0 1px 2px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (node.children?.length > 0) {
                const newSet = new Set(expandedNodes);
                if (newSet.has(node.name)) {
                  newSet.delete(node.name);
                } else {
                  newSet.add(node.name);
                }
                setExpandedNodes(newSet);
              }
              setSelectedNode(node);
              
              // 滚动到对应的火焰图节点
              if (flameGraphRef.current) {
                const nodeElement = flameGraphRef.current.querySelector(`.node[data-id="${node.name}"]`);
                if (nodeElement) {
                  nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.name}
              </div>
              <div style={{ fontSize: '0.75em', color: '#666' }}>
                {node.duration}μs
              </div>
            </div>
            {node.children?.length > 0 && (
              <span style={{ marginLeft: '8px', fontSize: '0.8em' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </div>
          
          {isExpanded && node.children?.length > 0 && (
            <div>
              {node.children.map(child => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    };
    
    return (
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        height: '100%',
        overflowY: 'auto'
      }}>
        <div style={{ 
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '1em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            调用结构概览
          </h3>
          <div style={{ fontSize: '0.75em', color: '#666' }}>
            点击节点展开/折叠
          </div>
        </div>
        
        <div className="tree-container">
          {data.map(root => renderTreeNode(root))}
        </div>
      </div>
    );
  };

  // 渲染悬浮信息框
  const renderTooltip = () => {
    if (!hoveredNode) return null;
    
    return (
      <div 
        ref={tooltipRef}
        className="tooltip"
        style={{
          position: 'fixed',
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: '12px',
          borderRadius: '6px',
          zIndex: 1000,
          maxWidth: '300px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease'
        }}
      >
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '1.1em',
          marginBottom: '8px',
          color: '#FFD166'
        }}>
          {hoveredNode.name}
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <span style={{ opacity: 0.7 }}>持续时间: </span>
          <span style={{ fontWeight: 'bold' }}>{hoveredNode.duration}μs</span>
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <span style={{ opacity: 0.7 }}>开始时间: </span>
          <span>{hoveredNode.start_time}μs</span>
        </div>
        
        <div style={{ marginBottom: '6px' }}>
          <span style={{ opacity: 0.7 }}>结束时间: </span>
          <span>{hoveredNode.end_time}μs</span>
        </div>
        
        {hoveredNode.src_ip && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ opacity: 0.7 }}>来源: </span>
            <span>{hoveredNode.src_ip}:{hoveredNode.src_port}</span>
          </div>
        )}
        
        {hoveredNode.dst_ip && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ opacity: 0.7 }}>目标: </span>
            <span>{hoveredNode.dst_ip}:{hoveredNode.dst_port}</span>
          </div>
        )}
        
        {hoveredNode.component && (
          <div style={{ marginBottom: '6px' }}>
            <span style={{ opacity: 0.7 }}>组件: </span>
            <span>{hoveredNode.component}</span>
          </div>
        )}
        
        {hoveredNode.endpoint && (
          <div>
            <span style={{ opacity: 0.7 }}>端点: </span>
            <span>{hoveredNode.endpoint}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #ddd',
        flexWrap: 'wrap'
      }}>
        <h2 style={{ color: '#333', margin: 0 }}>
          时间轴火焰图
        </h2>
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          flexWrap: 'wrap',
          marginTop: '10px'
        }}>
          {levelColors.map((color, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '0.85em'
            }}>
              <div style={{
                width: '15px',
                height: '15px',
                backgroundColor: color,
                marginRight: '5px',
                borderRadius: '3px'
              }}></div>
              <span>层级 {index}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* 左侧概览树 - 固定宽度 */}
        <div style={{ 
          flex: '0 0 250px', // 固定宽度
          height: '600px'
        }}>
          {renderOverviewTree()}
        </div>
        
        {/* 右侧火焰图 */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'relative'
        }}>
          {renderTimeScale()}
          
          <div 
            ref={flameGraphRef}
            style={{ 
              position: 'relative',
              height: `${flattenedNodes.length * 50}px`,
              minHeight: '300px',
              border: '1px solid #eee',
              borderRadius: '4px',
              backgroundColor: '#fff',
              padding: '10px',
              overflow: 'auto'
            }}
          >
            {flattenedNodes.map(node => (
              <div 
                key={`${node.name}-${node.rowIndex}`}
                className="node-wrapper"
                data-id={node.name}
              >
                {renderNode(node)}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#e9f7fe', 
        borderRadius: '4px',
        fontSize: '0.9em',
        borderLeft: '4px solid #4ECDC4'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>使用说明：</div>
        <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
          <li><strong>左侧概览图</strong>：显示调用结构，点击节点可展开/折叠，并定位到火焰图中对应位置</li>
          <li><strong>火焰图</strong>：水平位置表示开始时间，宽度表示持续时间</li>
          <li><strong>悬浮信息</strong>：鼠标悬浮在火焰图节点上显示详细信息</li>
          <li><strong>颜色编码</strong>：同一层级的节点使用相同颜色</li>
          <li><strong>交互功能</strong>：点击节点可展开/折叠子节点，黄色边框表示当前选中节点</li>
          <li><strong>时间轴</strong>：顶部显示时间刻度，帮助理解时间分布</li>
        </ul>
      </div>
      
      {/* 悬浮信息框 */}
      {renderTooltip()}
    </div>
  );
};

export default FlameGraph;