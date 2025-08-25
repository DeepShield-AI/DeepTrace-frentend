import React, { useState, useEffect, useMemo, useRef } from 'react';
import './flame.css';

const FlameGraph = ({ data }) => {
  // 计算默认展开的前两个层级节点
  const computeDefaultExpandedNodes = (data) => {
    const defaultExpandedNodes = new Set();
    
    data.forEach(root => {
      // 展开第一层级节点
      if (root.children) {
        root.children.forEach(firstLevelNode => {
          // 使用唯一键标识节点
          const firstLevelKey = `${firstLevelNode.name}-${firstLevelNode.start_time}`;
          defaultExpandedNodes.add(firstLevelKey);
          
          // 展开第二层级节点
          if (firstLevelNode.children) {
            firstLevelNode.children.forEach(secondLevelNode => {
              const secondLevelKey = `${secondLevelNode.name}-${secondLevelNode.start_time}`;
              defaultExpandedNodes.add(secondLevelKey);
            });
          }
        });
      }
    });
    
    return defaultExpandedNodes;
  };

  // 使用函数初始化状态，确保只在组件挂载时计算一次
  const [expandedNodes, setExpandedNodes] = useState(() => computeDefaultExpandedNodes(data));
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const flameGraphRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // 为每个层级定义颜色
  const levelColors = [
    '#440154', // 层级0 - 根节点
    '#3e4989', // 层级1
    '#31688e', // 层级2
    '#26828e', // 层级3
    '#239b6bff', // 层级4
    '#74BB48', // 层级5
    '#6F7DA3', // 层级6
    '#f3f3f3'  // 层级7
  ];

  // 计算整个跟踪的时间范围（转换为毫秒）
  const timeRange = useMemo(() => {
    let minTime = Infinity;
    let maxTime = -Infinity;
    
    const traverse = (node) => {
      if (node.start_time < minTime) minTime = node.start_time;
      if (node.end_time > maxTime) maxTime = node.end_time;
      node.children?.forEach(traverse);
    };
    
    data.forEach(traverse);
    
    // 转换为毫秒并保留2位小数
    return {
      minTime: parseFloat((minTime / 1000).toFixed(2)),
      maxTime: parseFloat((maxTime / 1000).toFixed(2)),
      range: parseFloat(((maxTime - minTime) / 1000).toFixed(2))
    };
  }, [data]);

  // 计算时间位置（使用毫秒）
  const calculatePosition = (startTime) => {
    const startMs = parseFloat((startTime / 1000).toFixed(2));
    return ((startMs - timeRange.minTime) / timeRange.range) * 100;
  };

  // 计算时间宽度（使用毫秒）
  const calculateWidth = (duration) => {
    const durationMs = parseFloat((duration / 1000).toFixed(2));
    return (durationMs / timeRange.range) * 100;
  };

  // 生成节点唯一键
  const generateNodeKey = (node) => {
    return `${node.name}-${node.start_time}`;
  };

  // 展平所有节点并计算位置（跳过根节点和没有持续时间的节点）
  const flattenedNodes = useMemo(() => {
    const nodes = [];
    let rowIndex = 0;
    
    const traverse = (node, depth) => {
      // 跳过根节点（depth为0）和没有持续时间的节点
      if (depth > 0 && node.duration && node.duration > 0) {
        const nodeKey = generateNodeKey(node);
        const isExpanded = expandedNodes.has(nodeKey);
        const position = calculatePosition(node.start_time);
        const width = calculateWidth(node.duration);
        
        nodes.push({
          ...node,
          depth,
          rowIndex,
          position,
          width,
          isExpanded,
          // 添加毫秒值用于显示
          durationMs: parseFloat((node.duration / 1000).toFixed(2)),
          startTimeMs: parseFloat((node.start_time / 1000).toFixed(2)),
          endTimeMs: parseFloat((node.end_time / 1000).toFixed(2)),
          nodeKey // 添加唯一键
        });
        
        rowIndex++;
      }
      
      // 如果节点展开且有子节点，继续遍历
      const nodeKey = generateNodeKey(node);
      if (expandedNodes.has(nodeKey) && node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    
    // 从根节点的子节点开始遍历（跳过根节点）
    data.forEach(root => {
      if (root.children) {
        root.children.forEach(child => {
          // 只添加有持续时间的子节点
          if (child.duration && child.duration > 0) {
            traverse(child, 1);
          }
        });
      }
    });
    
    return nodes;
  }, [data, expandedNodes, timeRange]);

  // 渲染时间轴刻度（使用毫秒）
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
          color: '#ccc' // 浅灰色文字
        }}>
          <div style={{ height: '5px', width: '1px', background: '#999' }}></div>
          <div>{timeValue.toFixed(2)}ms</div>
        </div>
      );
    }
    
    return (
      <div style={{
        position: 'relative',
        height: '30px',
        borderBottom: '1px solid #444', // 深色边框
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

  // 渲染节点（使用毫秒）
  const renderNode = (node) => {
    // 根据深度选择颜色
    const color = levelColors[node.depth % levelColors.length];
    
    // 获取显示名称（name和container_name[0]结合）
    const displayName = node.container_name && node.container_name.length > 0 
      ? `${node.name} (${node.container_name[0]})` 
      : node.name;
    
    // 计算名称显示方式
    const renderContent = () => {
      // 宽度足够显示完整名称和持续时间
      if (node.width > 12) {
        return (
          <div className="name-container" style={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 8px'
          }}>
            <div className="name" style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#fff',
              flex: 1,
              textAlign: 'left'
            }}>
              {displayName}
            </div>
            <div className="value" style={{ 
              color: '#fff',
              fontWeight: 'bold',
              marginLeft: '8px',
              whiteSpace: 'nowrap'
            }}>
              {node.durationMs}ms
            </div>
          </div>
        );
      } 
      // 宽度中等，显示缩写名称和持续时间
      else if (node.width > 8) {
        return (
          <div className="name-container" style={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 8px'
          }}>
            <div className="name" style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#fff',
              flex: 1,
              maxWidth: '60%',
              textAlign: 'left'
            }}>
              {displayName.length > 12 
                ? `${displayName.substring(0, 10)}...` 
                : displayName}
            </div>
            <div className="value" style={{ 
              color: '#fff',
              fontWeight: 'bold',
              marginLeft: '4px',
              whiteSpace: 'nowrap'
            }}>
              {node.durationMs}ms
            </div>
          </div>
        );
      } 
      // 宽度较小，只显示持续时间
      else if (node.width > 4) {
        return (
          <div className="name-container" style={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 4px'
          }}>
            <div className="value" style={{ 
              color: '#fff',
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}>
              {node.durationMs}ms
            </div>
          </div>
        );
      } 
      // 宽度非常小，不显示任何内容
      else {
        return null;
      }
    };

    return (
      <div 
        key={`${node.nodeKey}-${node.rowIndex}`}
        className={`node ${selectedNode?.nodeKey === node.nodeKey ? 'selected' : ''}`}
        style={{
          left: `${node.position}%`,
          width: `${node.width}%`,
          backgroundColor: color,
          height: '30px',
          margin: '2px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          cursor: node.children?.length > 0 ? 'pointer' : 'default',
          position: 'absolute',
          transition: 'all 0.3s ease',
          border: selectedNode?.nodeKey === node.nodeKey 
            ? '2px solid #FFD700' 
            : '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
          borderRadius: '3px',
          overflow: 'hidden',
          minWidth: '20px',
          top: `${node.rowIndex * 35}px`,
          zIndex: 10 - node.depth
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (node.children?.length > 0) {
            const newSet = new Set(expandedNodes);
            if (newSet.has(node.nodeKey)) {
              newSet.delete(node.nodeKey);
            } else {
              newSet.add(node.nodeKey);
            }
            setExpandedNodes(newSet);
          }
          setSelectedNode(node);
        }}
        onMouseEnter={(e) => handleMouseEnter(e, node)}
        onMouseLeave={() => setHoveredNode(null)}
      >
        {renderContent()}
        {node.children?.length > 0 && (
          <span 
            className="expand-icon"
            style={{ 
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6em',
              color: '#fff'
            }}
          >
            {node.isExpanded ? '▼' : '▶'}
          </span>
        )}
      </div>
    );
  };

  // 渲染概览树（使用毫秒）
  const renderOverviewTree = () => {
    const renderTreeNode = (node, depth = 0) => {
      // 跳过没有持续时间的节点
      if (!node.duration || node.duration <= 0) return null;
      
      const nodeKey = generateNodeKey(node);
      const isExpanded = expandedNodes.has(nodeKey);
      const isSelected = selectedNode?.nodeKey === nodeKey;
      
      // 计算毫秒值
      const durationMs = parseFloat((node.duration / 1000).toFixed(2));
      
      // 获取显示名称（name和container_name[0]结合）
      const displayName = node.container_name && node.container_name.length > 0 
        ? `${node.name} (${node.container_name[0]})` 
        : node.name;
      
      // 关键修改：使用与火焰图相同的颜色计算方式
      // 火焰图中节点深度从1开始，所以这里depth+1
      const color = levelColors[(depth + 1) % levelColors.length];
      
      return (
        <div key={nodeKey} style={{ marginLeft: `${depth * 15}px` }}>
          <div 
            className={`tree-node ${isSelected ? 'selected' : ''}`}
            style={{
              padding: '5px 8px',
              margin: '3px 0',
              borderRadius: '3px',
              cursor: 'pointer',
              backgroundColor: isSelected ? '#333' : '#222',
              borderLeft: `4px solid ${color}`,
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s',
              boxShadow: isSelected 
                ? '0 0 0 2px #1890ff' 
                : '0 1px 2px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              color: '#e0e0e0'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (node.children?.length > 0) {
                const newSet = new Set(expandedNodes);
                if (newSet.has(nodeKey)) {
                  newSet.delete(nodeKey);
                } else {
                  newSet.add(nodeKey);
                }
                setExpandedNodes(newSet);
              }
              setSelectedNode({...node, nodeKey});
              
              // 滚动到对应的火焰图节点
              if (flameGraphRef.current) {
                const nodeElement = flameGraphRef.current.querySelector(`.node[data-id="${nodeKey}"]`);
                if (nodeElement) {
                  nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.7em', color: '#aaa' }}>
                {durationMs}ms
              </div>
            </div>
            {node.children?.length > 0 && (
              <span style={{ marginLeft: '6px', fontSize: '0.7em', color: '#fff' }}>
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
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        height: '100%',
        overflowY: 'auto',
        width: '250px',
        position: 'relative',
        color: '#e0e0e0'
      }}>
        <div style={{ 
          marginBottom: '10px',
          paddingBottom: '6px',
          borderBottom: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '0.9em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: '#fff'
          }}>
            调用结构概览
          </h3>
          <div style={{ fontSize: '0.7em', color: '#aaa' }}>
            点击节点展开/折叠
          </div>
        </div>
        
        <div className="tree-container" style={{
          maxHeight: 'calc(100% - 40px)',
          overflowY: 'auto'
        }}>
          {data.map(root => {
            // 渲染根节点的子节点
            return root.children?.map(child => renderTreeNode(child, 0));
          })}
        </div>
      </div>
    );
  };

  // 渲染悬浮信息框（使用毫秒）
  const renderTooltip = () => {
    if (!hoveredNode) return null;
    
    // 获取显示名称（name和container_name[0]结合）
    const displayName = hoveredNode.container_name && hoveredNode.container_name.length > 0 
      ? `${hoveredNode.name} (${hoveredNode.container_name[0]})` 
      : hoveredNode.name;
    
    return (
      <div 
        ref={tooltipRef}
        className="tooltip"
        style={{
          position: 'fixed',
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
          backgroundColor: 'rgba(30, 30, 30, 0.95)',
          color: '#e0e0e0',
          padding: '10px',
          borderRadius: '6px',
          zIndex: 1000,
          maxWidth: '280px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease',
          border: '1px solid #444'
        }}
      >
        <div style={{ 
          fontWeight: 'bold', 
          fontSize: '1em',
          marginBottom: '6px',
          color: '#FFD166'
        }}>
          {displayName}
        </div>
        
        <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
          <span style={{ opacity: 0.7 }}>持续时间: </span>
          <span style={{ fontWeight: 'bold', color: '#fff' }}>{hoveredNode.durationMs}ms</span>
        </div>
        
        <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
          <span style={{ opacity: 0.7 }}>开始时间: </span>
          <span>{hoveredNode.startTimeMs}ms</span>
        </div>
        
        <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
          <span style={{ opacity: 0.7 }}>结束时间: </span>
          <span>{hoveredNode.endTimeMs}ms</span>
        </div>
        
        {hoveredNode.src_ip && (
          <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
            <span style={{ opacity: 0.7 }}>来源: </span>
            <span>{hoveredNode.src_ip}:{hoveredNode.src_port}</span>
          </div>
        )}
        
        {hoveredNode.dst_ip && (
          <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
            <span style={{ opacity: 0.7 }}>目标: </span>
            <span>{hoveredNode.dst_ip}:{hoveredNode.dst_port}</span>
          </div>
        )}
        
        {hoveredNode.component && (
          <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
            <span style={{ opacity: 0.7 }}>组件: </span>
            <span>{hoveredNode.component}</span>
          </div>
        )}
        
        {hoveredNode.endpoint && (
          <div style={{ fontSize: '0.9em' }}>
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
      padding: '15px',
      backgroundColor: '#121212',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
      maxWidth: '1400px',
      margin: '0 auto',
      color: '#e0e0e0'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px',
        paddingBottom: '8px',
        borderBottom: '1px solid #333',
        flexWrap: 'wrap'
      }}>
        <h2 style={{ color: '#fff', margin: 0, fontSize: '1.2em' }}>
          时间轴火焰图 (单位: ms)
        </h2>
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '8px'
        }}>
          {levelColors.map((color, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '0.8em',
              color: '#e0e0e0'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: color,
                marginRight: '4px',
                borderRadius: '2px'
              }}></div>
              <span>层级 {index}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '15px',
        marginBottom: '15px'
      }}>
        {/* 左侧概览树 - 固定宽度 */}
        <div style={{ 
          flex: '0 0 250px',
          height: '550px',
          position: 'relative'
        }}>
          {renderOverviewTree()}
        </div>
        
        {/* 右侧火焰图 */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          {renderTimeScale()}
          
          <div 
            ref={flameGraphRef}
            style={{ 
              position: 'relative',
              height: `${flattenedNodes.length * 35}px`,
              minHeight: '280px',
              border: '1px solid #333',
              borderRadius: '4px',
              backgroundColor: '#121212',
              padding: '8px',
              overflow: 'auto'
            }}
          >
            {flattenedNodes.map(node => (
              <div 
                key={`${node.nodeKey}-${node.rowIndex}`}
                className="node-wrapper"
                data-id={node.nodeKey}
              >
                {renderNode(node)}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 悬浮信息框 */}
      {renderTooltip()}
    </div>
  );
};

export default FlameGraph;