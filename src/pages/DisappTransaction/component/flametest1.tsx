import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const TimeBasedFlameGraph = ({ 
  data, 
  width = 1200, 
  height = 400, 
  margin = { top: 15, right: 20, bottom: 40, left: 20 },  // 增加底部边距以容纳X轴
  barHeightRatio = 0.85, 
  textHideThreshold = 600 
}) => {
  const svgRef = useRef();
  const flameGraphGRef = useRef();  // 重命名zoomGRef为flameGraphGRef
  const axesGRef = useRef();
  const containerRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const textMeasurementRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [timeRange, setTimeRange] = useState([0, 0]);
  const [showTexts, setShowTexts] = useState(width >= textHideThreshold);
  const [verticalLine, setVerticalLine] = useState(null);  // 竖线状态

  // 防抖处理文本显示状态
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTexts(width >= textHideThreshold);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [width, textHideThreshold]);

  // 生成基于深度的渐变颜色
  const getGradientId = (depth) => `gradient-${depth}`;
  
  const getStartColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).toString();
  };
  
  const getEndColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).toString();
  };

  // 格式化数值显示
  const formatValue = (value) => {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });
  };

  // 格式化时间显示（带ms单位）
  const formatDuration = (value) => {
    return `${formatValue(value)} ms`;
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

  // 处理鼠标移动事件（显示竖线）
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
    
    setVerticalLine({
      x: xPos,
      time: currentTime
    });
  };

  // 处理鼠标离开事件（隐藏竖线）
  const handleMouseLeave = () => {
    setVerticalLine(null);
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const flameGraphG = d3.select(flameGraphGRef.current);
    const axesG = d3.select(axesGRef.current);
    
    // 清理现有内容
    flameGraphG.selectAll('*').remove();
    axesG.selectAll('*').remove();
    
    if (!data || !data.children) return; 
    
    // 计算绘图区域
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // 创建层次结构
    const root = d3.hierarchy(data);
    
    // 计算时间范围
    let minStartTime = Infinity;
    let maxEndTime = -Infinity;
    
    root.descendants().forEach(node => {
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
    
    // 计算层级高度
    const totalLevels = root.height + 1;
    const baseLevelHeight = plotHeight / totalLevels;
    const levelHeight = baseLevelHeight * 0.5;
    
    // 创建Y轴比例尺
    const yScale = d3.scaleLinear()
      .domain([0, totalLevels])
      .range([margin.top, margin.top + totalLevels * levelHeight]);
    
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
    
    // 为每个深度创建渐变
    const uniqueDepths = new Set(root.descendants().map(d => d.depth));
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
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => {
        const start = Number(d.data.start_time);
        const depth = d.depth;
        
        const validStart = isNaN(start) ? 0 : start;
        const validDepth = isNaN(depth) ? 0 : depth;
        
        const verticalOffset = (levelHeight - (levelHeight * barHeightRatio)) / 2;
        
        return `translate(${xScale(validStart)},${yScale(validDepth) + verticalOffset})`;
      })
      .classed('selected', d => selectedNode === d);
    
    // 添加矩形（计算宽度并存储为数据属性）
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
      .attr('height', levelHeight * barHeightRatio)
      .attr('fill', d => `url(#${getGradientId(d.depth)})`)
      .attr('opacity', d => (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .attr('filter', 'none')
      .attr('transition', 'all 0.2s ease')
      .style('cursor', 'pointer');
    
    // 添加主文本（节点名称）- 左侧
    const nameTexts = cells.append('text')
      .attr('x', 4)
      .attr('y', (levelHeight * barHeightRatio) * 0.3)
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
      const availableWidth = d.barWidth - 60; // 预留右侧duration空间
      
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
    
    // 添加容器名称文本 - 中间
    const containerTexts = cells.append('text')
      .attr('x', 4)
      .attr('y', (levelHeight * barHeightRatio) * 0.7)
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
    
    // 添加Duration文本（右侧显示，带ms单位）
    const durationTexts = cells.append('text')
      .attr('x', d => d.barWidth - 4) // 右对齐，距离右侧4px
      .attr('y', (levelHeight * barHeightRatio) * 0.5) // 垂直居中
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', width < 800 ? '9px' : '10px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'end') // 右对齐
      .attr('class', 'flame-text duration-text')
      .attr('opacity', 0.9); // 略透明，避免与主文本冲突
    
    durationTexts.text(d => {
      if (!showTexts) return '';
      const duration = Number(d.data.value);
      if (isNaN(duration)) return '';
      
      // 条宽度过窄时不显示
      if (d.barWidth < 30) return '';
      
      const durationText = formatDuration(duration);
      const fontSize = width < 800 ? '9px' : '10px';
      const textWidth = measureTextWidth(durationText, fontSize);
      
      // 确保文本不会与左侧文本重叠（预留至少10px间距）
      return textWidth + 50 < d.barWidth ? durationText : '';
    });
    
    // 创建X轴
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => formatValue(d));
    
    axesG.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis);
    
    // 添加X轴标题
    axesG.append("text")
      .attr("class", "axis-title")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .attr("text-anchor", "middle")
      .attr("fill", "#666")
      .text("时间 (ms)");
    
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
    margin.top,
    margin.right,
    margin.bottom,
    margin.left,
    selectedNode, 
    barHeightRatio, 
    showTexts
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
        overflow: 'hidden',
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
            <span style={{ fontWeight: '500', color: '#fff' }}>起始时间:</span> {formatValue(tooltip.node.data.start_time)}
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
            .duration-text { font-family: monospace; } /* 等宽字体，对齐更整齐 */
            .axis-title { font-size: 12px; font-weight: bold; }
            .x-axis text { font-size: 11px; fill: #666; }
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
            `}
          </style>
        </defs>
        <g ref={axesGRef} />
        <g ref={flameGraphGRef} transform={`translate(${margin.left},${margin.top})`} />
        
        {/* 竖线 */}
        {verticalLine && (
          <>
            <line
              x1={verticalLine.x}
              y1={margin.top}
              x2={verticalLine.x}
              y2={height - margin.bottom}
              stroke="#999"
              strokeWidth="1"
              strokeDasharray="3,3"
              pointerEvents="none"
            />
            <text
              x={verticalLine.x}
              y={margin.top - 15}
              textAnchor="middle"
              fill="#666"
              fontSize="10px"
              pointerEvents="none"
            >
              {formatValue(verticalLine.time)} ms
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

export default TimeBasedFlameGraph;