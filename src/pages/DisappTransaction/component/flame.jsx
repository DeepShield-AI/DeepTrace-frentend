import React, { useState, useEffect, useMemo, useRef } from 'react';
import './flame.css';

const FlameGraph = ({ 
  data, 
  colors = [
    '#440154', '#3e4989', '#31688e', '#26828e', 
    '#239b6bff', '#74BB48', '#6F7DA3', '#f3f3f3'
  ],
  timeUnit = 'ms',
  showTree = true,
  treeWidth = 300,
  graphHeight = 650,
  defaultExpandedLevels = 2,
  tooltipPosition = 'follow',
  showtimeTip = false
}) => {
  // 计算默认展开的前N个层级节点
  const computeDefaultExpandedNodes = (data, levels = defaultExpandedLevels) => {
    const defaultExpandedNodes = new Set();
    
    const traverse = (node, depth) => {
      if (depth > levels) return;
      
      const nodeKey = `${node.name}-${node.start_time}`;
      defaultExpandedNodes.add(nodeKey);
      
      if (node.children && depth < levels) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    
    data.forEach(root => {
      if (root.children) {
        root.children.forEach(child => traverse(child, 1));
      }
    });
    
    return defaultExpandedNodes;
  };

  const [expandedNodes, setExpandedNodes] = useState(() => computeDefaultExpandedNodes(data));
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltipPositionState, setTooltipPositionState] = useState({ x: 0, y: 0 });
  
  // 新增状态：管理悬浮时的时间参考线
  const [hoverTimePosition, setHoverTimePosition] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);
  const [showTimeMarker, setShowTimeMarker] = useState(false);
  
  // 新增状态：控制左侧树形图的展开/折叠
  const [treeExpanded, setTreeExpanded] = useState(true);
  
  const flameGraphRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeScaleRef = useRef(null);
  
  const levelColors = colors;

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

  // 展平所有节点并计算位置
  const flattenedNodes = useMemo(() => {
    const nodes = [];
    let rowIndex = 0;
    
    const traverse = (node, depth) => {
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
          durationMs: parseFloat((node.duration / 1000).toFixed(2)),
          startTimeMs: parseFloat((node.start_time / 1000).toFixed(2)),
          endTimeMs: parseFloat((node.end_time / 1000).toFixed(2)),
          nodeKey
        });
        
        rowIndex++;
      }
      
      const nodeKey = generateNodeKey(node);
      if (expandedNodes.has(nodeKey) && node.children) {
        node.children.forEach(child => traverse(child, depth + 1));
      }
    };
    
    data.forEach(root => {
      if (root.children) {
        root.children.forEach(child => {
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
          color: '#ccc'
        }}>
          <div style={{ height: '5px', width: '1px', background: '#999' }}></div>
          {showtimeTip && <div>{timeValue.toFixed(2)}{timeUnit}</div>}
        </div>
      );
    }
    
    return (
      <div 
        ref={timeScaleRef}
        style={{
          position: 'relative',
          height: '30px',
          borderBottom: '1px solid #444',
          marginBottom: '10px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {ticks}
        
        {/* 悬停时间参考线 - 改为虚线 */}
        {showTimeMarker && (
          <div style={{
            position: 'absolute',
            left: `${hoverTimePosition}%`,
            top: 0,
            height: '100%',
            width: '0',
            borderLeft: '1px dashed #FFD700', // 改为虚线
            zIndex: 20
          }}>
            <div style={{
              position: 'absolute',
              top: '-22px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(30, 30, 30, 0.9)',
              color: '#FFD700',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.8em',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              border: '1px solid #555'
            }}>
              {hoverTime.toFixed(2)}{timeUnit}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 处理时间轴上的鼠标移动
  const handleTimeScaleMouseMove = (e) => {
    if (!timeScaleRef.current) return;
    
    const rect = timeScaleRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const positionPercentage = (x / rect.width) * 100;
    
    // 计算实际时间值
    const timeValue = timeRange.minTime + (timeRange.range * positionPercentage / 100);
    
    setHoverTimePosition(positionPercentage);
    setHoverTime(timeValue);
    setShowTimeMarker(true);
  };

  // 处理节点上的鼠标事件
  const handleNodeMouseEnter = (e, node) => {
    setHoveredNode(node);
    
    const tooltipWidth = tooltipRef.current?.offsetWidth || 250;
    const viewportWidth = window.innerWidth;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 150;
    const viewportHeight = window.innerHeight;
    
    let x = e.clientX + 10;
    let y = e.clientY + 10;
    
    if (tooltipPosition === 'fixed') {
      // 固定位置在右上角
      x = viewportWidth - tooltipWidth - 20;
      y = 20;
    } else if (tooltipPosition === 'follow') {
      // 跟随鼠标
      if (x + tooltipWidth > viewportWidth) {
        x = e.clientX - tooltipWidth - 10;
      }
      
      if (y + tooltipHeight > viewportHeight) {
        y = e.clientY - tooltipHeight - 10;
      }
    }
    
    setTooltipPositionState({ x, y });
    
    // 更新时间标记
    if (timeScaleRef.current) {
      const rect = timeScaleRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      
      if (x >= 0 && x <= rect.width) {
        const positionPercentage = (x / rect.width) * 100;
        const timeValue = timeRange.minTime + (timeRange.range * positionPercentage / 100);
        
        setHoverTimePosition(positionPercentage);
        setHoverTime(timeValue);
        setShowTimeMarker(true);
      }
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
  };

  // 渲染节点（使用毫秒）
  const renderNode = (node) => {
    const color = levelColors[node.depth % levelColors.length];
    
    const displayName = node.container_name && node.container_name.length > 0 
      ? `${node.name} (${node.container_name[0]})` 
      : node.name;
    
    const renderContent = () => {
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
              {node.durationMs}{timeUnit}
            </div>
          </div>
        );
      } 
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
              {node.durationMs}{timeUnit}
            </div>
          </div>
        );
      } 
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
              {node.durationMs}{timeUnit}
            </div>
          </div>
        );
      } 
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
        onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
        onMouseLeave={handleNodeMouseLeave}
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
      if (!node.duration || node.duration <= 0) return null;
      
      const nodeKey = generateNodeKey(node);
      const isExpanded = expandedNodes.has(nodeKey);
      const isSelected = selectedNode?.nodeKey === nodeKey;
      
      const durationMs = parseFloat((node.duration / 1000).toFixed(2));
      
      const displayName = node.name || (node.container_name && node.container_name[0]);
      const color = levelColors[(depth + 1) % levelColors.length];
      
      return (
        <div key={nodeKey} className="tree-node-container">
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
              color: '#e0e0e0',
              minWidth: 'fit-content',
              width: '100%'
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
              
              if (flameGraphRef.current) {
                const nodeElement = flameGraphRef.current.querySelector(`.node[data-id="${nodeKey}"]`);
                if (nodeElement) {
                  nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }}
          >
            <div className="tree-node-content" style={{ 
              flex: 1, 
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center'
            }}>
              {/* 添加缩进指示器 */}
              <div style={{ 
                width: `${depth * 12}px`, 
                minWidth: `${depth * 12}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '4px'
              }}>
                {depth > 0 && (
                  <div style={{ 
                    height: '1px', 
                    width: '8px', 
                    backgroundColor: '#666',
                    marginRight: '4px'
                  }}></div>
                )}
              </div>
              
              <div style={{ 
                flex: 1, 
                minWidth: '0', 
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <div style={{ 
                  fontWeight: 'bold', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis', 
                  color: '#fff',
                  fontSize: '0.85em'
                }}>
                  {displayName}
                </div>
                <div style={{ 
                  fontSize: '0.75em', 
                  color: '#aaa',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {durationMs}{timeUnit}
                </div>
              </div>
            </div>
            
            {node.children?.length > 0 && (
              <span style={{ 
                marginLeft: '6px', 
                fontSize: '0.7em', 
                color: '#fff',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
          </div>
          
          {isExpanded && node.children?.length > 0 && (
            <div className="tree-children" style={{ 
              marginLeft: '12px',
              borderLeft: '1px dashed #444',
              paddingLeft: '8px'
            }}>
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
        overflow: 'hidden',
        width: `${treeWidth}px`,
        position: 'relative',
        color: '#e0e0e0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          marginBottom: '10px',
          paddingBottom: '6px',
          borderBottom: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          overflow: 'hidden',
          flexShrink: 0
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
          <div style={{ 
            display: 'flex',
            gap: '6px',
            alignItems: 'center'
          }}>
            <button 
              onClick={() => setTreeExpanded(!treeExpanded)}
              style={{
                background: 'none',
                border: '1px solid #444',
                color: '#e0e0e0',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '0.7em',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {treeExpanded ? '折叠' : '展开'}
            </button>
          </div>
        </div>
        
        <div className="tree-container" style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'auto',
          display: treeExpanded ? 'block' : 'none'
        }}>
          <div style={{ 
            minWidth: '100%',
            width: 'fit-content',
            paddingRight: '10px'
          }}>
            {data.map(root => {
              return root.children?.map(child => renderTreeNode(child, 0));
            })}
          </div>
        </div>
        
        {!treeExpanded && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '0.9em'
          }}>
            树形图已折叠
          </div>
        )}
      </div>
    );
  };

  // 渲染悬浮信息框（使用毫秒）
  const renderTooltip = () => {
    if (!hoveredNode) return null;
    
    const displayName = hoveredNode.container_name && hoveredNode.container_name.length > 0 
      ? `${hoveredNode.name} (${hoveredNode.container_name[0]})` 
      : hoveredNode.name;
    
    return (
      <div 
        ref={tooltipRef}
        className="tooltip"
        style={{
          position: 'fixed',
          left: `${tooltipPositionState.x}px`,
          top: `${tooltipPositionState.y}px`,
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
          <span style={{ fontWeight: 'bold', color: '#fff' }}>{hoveredNode.durationMs}{timeUnit}</span>
        </div>
        
        <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
          <span style={{ opacity: 0.7 }}>开始时间: </span>
          <span>{hoveredNode.startTimeMs}{timeUnit}</span>
        </div>
        
        <div style={{ marginBottom: '4px', fontSize: '0.9em' }}>
          <span style={{ opacity: 0.7 }}>结束时间: </span>
          <span>{hoveredNode.endTimeMs}{timeUnit}</span>
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
      color: '#e0e0e0',
      width: '100%',
      boxSizing: 'border-box'
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
          时间轴火焰图 (单位: {timeUnit})
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
        marginBottom: '15px',
        width: '100%'
      }}>
        {/* 左侧概览树 - 可配置是否显示 */}
        {showTree && (
          <div style={{ 
            flex: `0 0 ${treeWidth}px`,
            height: `${graphHeight}px`,
            position: 'relative',
            width: `${treeWidth}px`
          }}>
            {renderOverviewTree()}
          </div>
        )}
        
        {/* 右侧火焰图 */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          position: 'relative',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          minWidth: 0
        }}
        onMouseLeave={() => setShowTimeMarker(false)}
        >
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
              overflow: 'hidden',
              width: '100%',
              boxSizing: 'border-box'
            }}
            onMouseMove={handleTimeScaleMouseMove}
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
            
            {/* 全局时间标记 - 改为虚线 */}
            {showTimeMarker && (
              <div style={{
                position: 'absolute',
                left: `${hoverTimePosition}%`,
                top: 0,
                height: '100%',
                width: '0',
                borderLeft: '1px dashed #FFD700', // 改为虚线
                zIndex: 19,
                pointerEvents: 'none',
                boxShadow: '0 0 5px rgba(255, 215, 0, 0.7)'
              }} />
            )}
          </div>
        </div>
      </div>
      
      {/* 悬浮信息框 */}
      {renderTooltip()}
    </div>
  );
};

export default FlameGraph;