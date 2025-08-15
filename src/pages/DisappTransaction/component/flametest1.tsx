import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const TimeBasedFlameGraph = ({ 
  data, 
  width = 1200, 
  height = 600, 
  margin = { top: 15, right: 20, bottom: 15, left: 20 },
  barHeight = 30,  // 固定行高，不改变
  barHeightRatio = 0.85, 
  textHideThreshold = 600,
  maxRowsPerLevel = 3  // 每个深度层级允许的最大行数
}) => {
  const svgRef = useRef();
  const flameGraphGRef = useRef();
  const containerRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const textMeasurementRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [timeRange, setTimeRange] = useState([0, 0]);
  const [showTexts, setShowTexts] = useState(width >= textHideThreshold);
  const [verticalLine, setVerticalLine] = useState(null);
  
  // 防抖处理文本显示状态
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTexts(width >= textHideThreshold);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [width, textHideThreshold]);

  // 生成基于深度的渐变颜色 - 保持原有颜色体系
  const getGradientId = (depth) => `gradient-${depth}`;
  
  const getStartColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).toString();
  };
  
  const getEndColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).darker(0.2).toString();
  };

  // 格式化数值显示
  const formatValue = (value) => {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });
  };

  // 格式化时间显示
  const formatDuration = (value) => {
    return `${formatValue(value / 1000)} μs`;
  };

  // 计算tooltip位置
  const calculateTooltipPosition = (event, node) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = 220;
    const tooltipHeight = 140;
    
    let x = event.clientX - containerRect.left + 10;
    let y = event.clientY - containerRect.top + 10;
    
    if (x + tooltipWidth > containerRect.width) {
      x = event.clientX - containerRect.left - tooltipWidth - 10;
    }
    if (y + tooltipHeight > containerRect.height) {
      y = event.clientY - containerRect.top - tooltipHeight - 10;
    }
    x = Math.max(x, 5);
    y = Math.max(y, 5);
    
    return { x, y };
  };

  // 测量文本宽度
  const measureTextWidth = (text, fontSize) => {
    if (!textMeasurementRef.current) return 0;
    const ctx = textMeasurementRef.current.getContext('2d');
    ctx.font = `${fontSize} Arial`;
    return ctx.measureText(text).width;
  };

  // 处理鼠标移动事件（显示竖线和数值）
  const handleMouseMove = (event) => {
    if (!svgRef.current || !timeRange[1]) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const xPos = event.clientX - svgRect.left;
    
    // 创建时间比例尺
    const xScale = d3.scaleLinear()
      .domain(timeRange)
      .range([margin.left, width - margin.right]);
    
    // 获取当前时间值
    const currentTime = xScale.invert(xPos);
    
    // 计算文本位置，防止超出图表边界
    let textX = xPos;
    const timeText = `${formatValue(currentTime / 1000)} μs`;
    const textWidth = measureTextWidth(timeText, '11px');
    
    // 调整文本位置避免超出边界
    if (textX + textWidth / 2 > width - margin.right) {
      textX = width - margin.right - textWidth / 2;
    }
    if (textX - textWidth / 2 < margin.left) {
      textX = margin.left + textWidth / 2;
    }
    
    setVerticalLine({
      x: xPos,
      textX: textX,
      textWidth: textWidth,
      time: currentTime
    });
  };

  // 处理鼠标离开事件（隐藏竖线和数值）
  const handleMouseLeave = () => {
    setVerticalLine(null);
  };

  // 检测并分配行号以避免重叠
  const assignRowNumbers = (nodes) => {
    // 按深度分组
    const nodesByDepth = {};
    nodes.forEach(node => {
      const depth = node.depth;
      if (!nodesByDepth[depth]) {
        nodesByDepth[depth] = [];
      }
      nodesByDepth[depth].push(node);
    });

    // 为每个深度的节点分配行号
    Object.keys(nodesByDepth).forEach(depth => {
      const depthNodes = nodesByDepth[depth];
      // 按开始时间排序
      depthNodes.sort((a, b) => a.data.start_time - b.data.start_time);
      
      // 跟踪每行的结束时间
      const rowEndTimes = [];
      
      depthNodes.forEach(node => {
        const startTime = node.data.start_time;
        const endTime = startTime + node.data.value;
        
        // 尝试找到可以放置当前节点的行
        let assignedRow = -1;
        for (let i = 0; i < rowEndTimes.length; i++) {
          // 如果当前行的最后一个节点结束时间 <= 当前节点的开始时间，没有重叠
          if (rowEndTimes[i] <= startTime) {
            assignedRow = i;
            rowEndTimes[i] = endTime;
            break;
          }
        }
        
        // 如果没有找到合适的行且未超过最大行数限制，则创建新行
        if (assignedRow === -1 && rowEndTimes.length < maxRowsPerLevel) {
          assignedRow = rowEndTimes.length;
          rowEndTimes.push(endTime);
        } else if (assignedRow === -1) {
          // 如果超过最大行数限制，使用最后一行（可能会有轻微重叠）
          assignedRow = rowEndTimes.length - 1;
          rowEndTimes[assignedRow] = Math.max(rowEndTimes[assignedRow], endTime);
        }
        
        node.row = assignedRow;
      });
      
      // 记录当前深度的最大行数
      nodesByDepth[depth].maxRows = rowEndTimes.length;
    });
    
    return nodesByDepth;
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const flameGraphG = d3.select(flameGraphGRef.current);
    
    // 清理现有内容
    flameGraphG.selectAll('*').remove();
    
    if (!data || !data.children) return; 
    
    // 计算绘图区域
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // 创建层次结构
    const root = d3.hierarchy(data);
    const allNodes = root.descendants();
    
    // 分配行号以避免重叠
    const nodesByDepth = assignRowNumbers(allNodes);
    
    // 计算每个深度的最大行数
    const maxRowsByDepth = {};
    Object.keys(nodesByDepth).forEach(depth => {
      maxRowsByDepth[depth] = nodesByDepth[depth].maxRows || 1;
    });
    
    // 计算每个深度的总高度（行数 × 行高）- 使用固定行高
    const depthHeights = {};
    let totalHeight = 0;
    
    Object.keys(nodesByDepth).forEach((depth) => {
      const rows = maxRowsByDepth[depth] || 1;
      depthHeights[depth] = {
        rows,
        height: rows * barHeight,  // 使用固定行高
        yOffset: totalHeight
      };
      totalHeight += rows * barHeight + 5; // 增加行间距
    });
    
    // 计算时间范围
    let minStartTime = Infinity;
    let maxEndTime = -Infinity;
    
    allNodes.forEach(node => {
      if (typeof node.data.start_time !== 'number' || isNaN(node.data.start_time)) {
        console.warn('Invalid start_time, using default 0 for node:', node.data);
      }
      
      const start = node.data.start_time;
      const end = start + node.data.value;
      
      if (start < minStartTime) minStartTime = start;
      if (end > maxEndTime) maxEndTime = end;
    });
    
    setTimeRange([minStartTime, maxEndTime]);
    
    // 创建X轴比例尺
    const xScale = d3.scaleLinear()
      .domain([minStartTime, maxEndTime])
      .range([margin.left, width - margin.right]);
    
    // 创建渐变定义和悬停阴影滤镜
    const defs = svg.select("defs");
    defs.selectAll("*").remove();
    
    // 添加悬停阴影滤镜
    defs.append("filter")
      .attr("id", "hoverShadow")
      .attr("x", "-20%")
      .attr("y", "-20%")
      .attr("width", "140%")
      .attr("height", "140%")
      .append("feDropShadow")
      .attr("dx", 0)
      .attr("dy", 2)
      .attr("stdDeviation", 3)
      .attr("flood-color", "rgba(0,0,0,0.3)");
    
    // 为每个深度创建渐变（保持原有颜色体系）
    const uniqueDepths = new Set(allNodes.map(d => d.depth));
    uniqueDepths.forEach(depth => {
      const gradient = defs.append("linearGradient")
        .attr("id", getGradientId(depth))
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", getStartColor(depth))
        .attr("stop-opacity", 1);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", getEndColor(depth))
        .attr("stop-opacity", 1);
    });
    
    // 创建火焰图矩形组
    const cells = flameGraphG.selectAll('g')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('transform', d => {
        const start = Number(d.data.start_time);
        const depth = d.depth;
        const row = d.row || 0;
        
        const validStart = isNaN(start) ? 0 : start;
        const validDepth = isNaN(depth) ? 0 : depth;
        
        // 计算垂直位置：深度偏移 + 行偏移 - 使用固定行高
        const depthInfo = depthHeights[validDepth] || { yOffset: 0, rows: 1 };
        const yPos = margin.top + depthInfo.yOffset + (row * barHeight);
        
        // 添加垂直偏移使条居中
        const verticalOffset = (barHeight - (barHeight * barHeightRatio)) / 2;
        
        return `translate(${xScale(validStart)},${yPos + verticalOffset})`;
      })
      .classed('selected', d => selectedNode === d);
    
    // 添加矩形
    const rects = cells.append('rect')
      .attr('width', d => {
        const start = Number(d.data.start_time);
        const value = Number(d.data.value);
        if (isNaN(start) || isNaN(value)) return 0;
        const end = start + value;
        const startX = xScale(start);
        const endX = xScale(end);
        const barWidth = Math.max(1, endX - startX);
        d.barWidth = barWidth; // 存储宽度供文本使用
        return barWidth;
      })
      .attr('height', barHeight * barHeightRatio)  // 使用固定行高计算高度
      .attr('fill', d => `url(#${getGradientId(d.depth)})`)
      .attr('opacity', d => (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .attr('filter', 'none')
      .attr('transition', 'all 0.2s ease')
      .style('cursor', 'pointer');
    
    // 添加主文本（节点名称）- 上半部分
    const nameTexts = cells.append('text')
      .attr('x', 4)
      .attr('y', (barHeight * barHeightRatio) * 0.35)  // 上半部分
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', width < 800 ? '10px' : '11px')
      .attr('font-weight', d => selectedNode === d ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('class', 'flame-text name-text');
    
    nameTexts.text(d => { 
      if (!showTexts) return '';
      if (d.barWidth < 40) return ''; // 宽度过窄不显示名称
      
      const nameText = d.data.name;
      const fontSize = width < 800 ? '10px' : '11px';
      const availableWidth = d.barWidth - 60; // 预留右侧空间
      
      if (availableWidth <= 0) return '';
      
      const fullTextWidth = measureTextWidth(nameText, fontSize);
      if (fullTextWidth <= availableWidth) return nameText;
      
      // 文本截断处理
      let truncateAt = 0;
      let truncated = '';
      for (let i = 1; i <= nameText.length; i++) {
        const testText = nameText.substring(0, i) + '...';
        if (measureTextWidth(testText, fontSize) > availableWidth) break;
        truncateAt = i;
        truncated = testText;
      }
      return truncateAt > 0 ? truncated : '';
    });
    
    // 添加容器名称文本 - 中间部分
    const containerTexts = cells.append('text')
      .attr('x', 4)
      .attr('y', (barHeight * barHeightRatio) * 0.65)  // 中间部分
      .attr('dy', '0.35em')
      .attr('fill', '#f0f0f0')
      .attr('font-size', width < 800 ? '9px' : '10px')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('class', 'flame-text container-text');
    
    containerTexts.text(d => {
      if (!showTexts) return '';
      if (d.barWidth < 40) return '';
      
      const containerName = d.data.container_name?.[0] || '';
      if (!containerName) return '';
      
      const fontSize = width < 800 ? '9px' : '10px';
      const availableWidth = d.barWidth - 60;
      
      if (availableWidth <= 0) return '';
      
      const fullTextWidth = measureTextWidth(containerName, fontSize);
      if (fullTextWidth <= availableWidth) return containerName;
      
      // 文本截断处理
      let truncateAt = 0;
      let truncated = '';
      for (let i = 1; i <= containerName.length; i++) {
        const testText = containerName.substring(0, i) + '...';
        if (measureTextWidth(testText, fontSize) > availableWidth) break;
        truncateAt = i;
        truncated = testText;
      }
      return truncateAt > 0 ? truncated : '';
    });
    
    // 添加Duration文本（μs）- 右侧，垂直居中
    const durationTexts = cells.append('text')
      .attr('x', d => d.barWidth - 4)
      .attr('y', (barHeight * barHeightRatio) * 0.5)  // 垂直居中
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', width < 800 ? '9px' : '10px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'end')
      .attr('class', 'flame-text duration-text')
      .attr('opacity', 0.9);
    
    durationTexts.text(d => {
      if (!showTexts) return '';
      const duration = Number(d.data.value);
      if (isNaN(duration)) return '';
      
      // 条宽度过窄时不显示
      if (d.barWidth < 40) return '';
      
      const durationText = formatDuration(duration);
      const fontSize = width < 800 ? '9px' : '10px';
      const textWidth = measureTextWidth(durationText, fontSize);
      
      // 确保文本不会与左侧文本重叠（增加间距避免重叠）
      return textWidth + 70 < d.barWidth ? durationText : '';
    });
    
    // 鼠标交互
    rects
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        const pos = calculateTooltipPosition(event, d);
        setTooltip({ node: d, x: pos.x, y: pos.y });
        d3.select(event.currentTarget)
          .attr('opacity', 1)
          .attr('stroke', '#ff9800')
          .attr('stroke-width', 2)
          .attr('filter', 'url(#hoverShadow)');
      })
      .on('mousemove', (event) => {
        if (tooltip) {
          const pos = calculateTooltipPosition(event, tooltip.node);
          setTooltip(prev => ({ ...prev, x: pos.x, y: pos.y }));
        }
      })
      .on('mouseout', (event) => {
        setHoveredNode(null);
        setTooltip(null);
        const d = d3.select(event.currentTarget).datum();
        d3.select(event.currentTarget)
          .attr('opacity', (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
          .attr('stroke', 'none')
          .attr('stroke-width', 0)
          .attr('filter', 'none');
      })
      .on('click', (event, d) => {
        if (selectedNode !== d) {
          setSelectedNode(d);
        } else {
          setSelectedNode(null); // 再次点击取消选择
        }
      });
    
    // 文本触发悬停效果
    cells.selectAll('text')
      .on('mouseover', function(event) {
        d3.select(this).closest('g').select('rect').dispatch('mouseover', { event });
      })
      .on('mouseout', function(event) {
        d3.select(this).closest('g').select('rect').dispatch('mouseout', { event });
      });
    
  }, [
    data, 
    width, 
    height, 
    margin,
    selectedNode, 
    barHeight,  // 加入依赖，确保行高变化时重新渲染
    barHeightRatio, 
    showTexts,
    maxRowsPerLevel
  ]);

  return (
    <div 
      ref={containerRef}
      className="flame-graph-container" 
      style={{ 
        position: 'relative', 
        display: "flex", 
        flexDirection: "column",
        justifyContent: "center", 
        alignItems: "center",
        width: '100%',
        overflow: 'auto',
        fontFamily: 'Segoe UI, Roboto, sans-serif',
        backgroundColor: 'transparent',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 信息框 */}
      {tooltip && (
        <div 
          className="flame-tooltip" 
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            backgroundColor: 'rgba(25, 25, 25, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            padding: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            width: width < 500 ? '180px' : '220px',
            fontSize: width < 500 ? '12px' : '13px',
            border: 'none',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <div style={{
            fontSize: width < 500 ? '13px' : '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#fff',
            wordBreak: 'break-all'
          }}>
            {tooltip.node.data.name}
          </div>
          <div style={{ marginBottom: '6px', color: '#ddd' }}>
            <span style={{ fontWeight: '500', color: '#fff' }}>容器:</span> {tooltip.node.data.container_name?.[0] || 'N/A'}
          </div>
          <div style={{ marginBottom: '6px', color: '#ddd' }}>
            <span style={{ fontWeight: '500', color: '#fff' }}>持续时间:</span> {formatDuration(tooltip.node.data.value)}
          </div>
          <div style={{ marginBottom: '6px', color: '#ddd' }}>
            <span style={{ fontWeight: '500', color: '#fff' }}>起始时间:</span> {formatValue(tooltip.node.data.start_time / 1000)} us
          </div>
          <div style={{ marginBottom: '6px', color: '#ddd' }}>
            <span style={{ fontWeight: '500', color: '#fff' }}>深度:</span> {tooltip.node.depth}
          </div>
          <div style={{ color: '#ddd', wordBreak: 'break-all' }}>
            <span style={{ fontWeight: '500', color: '#fff' }}>端点:</span>{' '}
            {tooltip.node.data.endpoint || 'N/A'}
          </div>
          <div style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid rgba(25, 25, 25, 0.95)',
            top: '-8px',
            left: '20px',
            filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.2))'
          }}></div>
        </div>
      )}
      
      <canvas ref={textMeasurementRef} style={{ display: 'none' }} />
      
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ 
          border: 'none',
          borderRadius: '8px',
          backgroundColor: 'transparent',
        }}
      >
        <defs>
          <style>
            {`
            .flame-text {
              text-shadow: 
                -1px -1px 0 rgba(0,0,0,0.7),
                 1px -1px 0 rgba(0,0,0,0.7),
                -1px  1px 0 rgba(0,0,0,0.7),
                 1px  1px 0 rgba(0,0,0,0.7);
              dominant-baseline: middle;
              transition: all 0.2s ease;
            }
            .name-text { font-weight: 500; }
            .container-text { font-weight: normal; opacity: 0.9; }
            .duration-text { font-family: monospace; }
            .flame-graph-container g.selected rect {
              stroke: #4CAF50 !important;
              stroke-width: 2.5px !important;
            }
            .flame-graph-container g.selected .flame-text {
              font-weight: bold !important;
              fill: #fff !important;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .flame-tooltip { animation: fadeIn 0.2s ease forwards; }
            .time-indicator {
              transition: all 0.1s ease-out;
              animation: fadeIn 0.2s ease-out;
            }
            `}
          </style>
        </defs>
        <g ref={flameGraphGRef} />
        
        {/* 竖线和时间数值显示 */}
        {verticalLine && (
          <g className="time-indicator" pointerEvents="none">
            {/* 竖线 */}
            <line
              x1={verticalLine.x}
              y1={margin.top}
              x2={verticalLine.x}
              y2={height - margin.bottom}
              stroke="#e74c3c"
              strokeWidth="1.5"
              strokeDasharray="4,3"
              opacity="0.8"
            />
            
            {/* 数值背景框 */}
            <rect
              x={verticalLine.textX - verticalLine.textWidth / 2 - 6}
              y={margin.top - 15}
              width={verticalLine.textWidth + 30}
              height="20"
              rx="3"
              ry="3"
              fill="#333"
              stroke="#ddd"
              strokeWidth="0.5"
              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
            />
            
            {/* 时间数值文本 */}
            <text
              x={verticalLine.textX + 10}
              y={margin.top - 1}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11px"
              fontWeight="500"
              fontFamily="monospace"
            >
              {formatValue(verticalLine.time / 1000)} μs
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default TimeBasedFlameGraph;        
