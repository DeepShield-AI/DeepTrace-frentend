import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const TimeBasedFlameGraph = ({ 
  data, 
  width = 1200, 
  height = 400, 
  margin = { top: 15, right: 20, bottom: 15, left: 20 }, 
  barHeightRatio = 0.85, 
  textHideThreshold = 600 
}) => {
  const svgRef = useRef();
  const zoomGRef = useRef();
  const axesGRef = useRef();
  const containerRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);
  const textMeasurementRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [timeRange, setTimeRange] = useState([0, 0]);
  const [showTexts, setShowTexts] = useState(width >= textHideThreshold);

  // 生成基于深度的渐变颜色
  const getGradientId = (depth) => `gradient-${depth}`;
  
  const getStartColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).darker(0.8).toString();
  };
  
  const getEndColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).brighter(1.2).toString();
  };

  // 格式化数值显示
  const formatValue = (value) => {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });
  };

  // 格式化时间显示
  const formatTime = (time) => {
    return `${formatValue(time)} ms`;
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

  // 监听宽度变化
  // useEffect(() => {
  //   setShowTexts(width >= 0);
  // }, [width]);

  // useEffect(() => {
  //   console.log(data, "火焰");
  // }, [data])

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoomG = d3.select(zoomGRef.current);
    const axesG = d3.select(axesGRef.current);
    
    // 清理现有内容
    zoomG.selectAll('*').remove();
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
      console.error('Invalid start_time in node:', node.data);
      return; // 跳过无效节点
    }
      const start = node.data.start_time;
      const end = start + node.data.value;
      
      if (start < minStartTime) minStartTime = start;
      if (end > maxEndTime) maxEndTime = end;
    });
    
    setTimeRange([minStartTime, maxEndTime]);
    
    // 创建X轴比例尺（仅用于内部计算，不绘制轴）
    const xScale = d3.scaleLinear()
      .domain([minStartTime, maxEndTime])
      .range([margin.left, width - margin.right]);
    
    // 计算层级高度
    const totalLevels = root.height + 1;
    const baseLevelHeight = plotHeight / totalLevels;
    const levelHeight = baseLevelHeight * 0.5;
    
    // 创建Y轴比例尺（仅用于定位）
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
    const cells = zoomG.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      // .attr('transform', d => {
      //   const originalHeight = levelHeight;
      //   const newHeight = originalHeight * barHeightRatio;
      //   const verticalOffset = (originalHeight - newHeight) / 2;
        
      //   return `translate(${xScale(d.data.start_time)},${yScale(d.depth) + verticalOffset})`;
      // })
      .attr('transform', d => {
        const start = Number(d.data.start_time);
        const depth = d.depth;
        
        // 添加双重保护
        const validStart = isNaN(start) ? 0 : start;
        const validDepth = isNaN(depth) ? 0 : depth;
        
        const barWidth = Math.max(0, xScale(validStart + d.data.value) - xScale(validStart));
        const verticalOffset = (levelHeight - (levelHeight * barHeightRatio)) / 2;
        
        return `translate(${xScale(validStart)},${yScale(validDepth) + verticalOffset})`;
      })
      .classed('selected', d => selectedNode === d);
    
    // 添加矩形（移除边框）
    const rects = cells.append('rect')
      .attr('width', d => {
        const start = Number(d.data.start_time);
        const value = Number(d.data.value);
        if (isNaN(start) || isNaN(value)) return 0; // 无效数据时宽度为0
        const end = start + value;
        const startX = xScale(start);
        const endX = xScale(end);
        return Math.max(1, endX - startX); // 确保至少1px，避免0宽度
      })
      .attr('height', levelHeight * barHeightRatio)
      .attr('fill', d => `url(#${getGradientId(d.depth)})`)
      .attr('opacity', d => (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
      // 移除矩形边框
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .attr('filter', 'none')
      .attr('transition', 'all 0.2s ease')
      .style('cursor', 'pointer');
    
    // 添加主文本（节点名称）
    const nameTexts = cells.append('text')
      .attr('x', 4)
      .attr('y', (levelHeight * barHeightRatio) / 2)
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', width < 800 ? '10px' : '11px')
      .attr('font-weight', d => selectedNode === d ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('class', 'flame-text name-text');
    
    nameTexts.text(d => { if (!showTexts) return '';
  
  const start = d.data.start_time;
  const end = start + d.data.value;
  const barWidth = Math.max(0, xScale(end) - xScale(start));
  const availableWidth = barWidth - 8; // 减去左右padding
  
  // 如果条形宽度小于20像素，完全不显示文本
  if (barWidth < 20) return '';
  
  const nameText = d.data.name;
  
  const measureTextWidth = (text) => {
    if (!textMeasurementRef.current) return 0;
    const ctx = textMeasurementRef.current.getContext('2d');
    ctx.font = `${width < 800 ? '10px' : '11px'} Arial`;
    return ctx.measureText(text).width;
  };
  
  // 测量省略号宽度作为最小显示阈值
  const ellipsisWidth = measureTextWidth('...');
  
  // 如果可用宽度小于省略号宽度，不显示任何文本
  if (availableWidth < ellipsisWidth) return '';
  
  // 测量完整文本宽度
  const fullTextWidth = measureTextWidth(nameText);
  
  // 如果完整文本能放下
  if (fullTextWidth <= availableWidth) {
    return nameText;
  }
  
  // 精确计算截断位置
  let truncateAt = 0;
  let truncated = '';
  
  for (let i = 1; i <= nameText.length; i++) {
    const testText = nameText.substring(0, i) + '...';
    if (measureTextWidth(testText) > availableWidth) {
      break;
    }
    truncateAt = i;
    truncated = testText;
  }
  
  return truncateAt > 0 ? truncated : '';
    });
    
    // 鼠标交互（调整悬停时的边框样式）
    rects
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        const pos = calculateTooltipPosition(event, d);
        setTooltip({ node: d, x: pos.x, y: pos.y });
        d3.select(event.currentTarget)
          .attr('opacity', 1)
          .attr('stroke', '#ff9800')  // 悬停时临时显示边框
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
          // 鼠标离开后移除边框
          .attr('stroke', 'none')
          .attr('stroke-width', 0)
          .attr('filter', 'none');
      })
      .on('click', (event, d) => {
        setSelectedNode(selectedNode === d ? null : d);
      });
    
    // 文本触发悬停效果
    cells.selectAll('text')
      .on('mouseover', function(event) {
        d3.select(this).closest('g').select('rect').dispatch('mouseover', { event });
      })
      .on('mouseout', function(event) {
        d3.select(this).closest('g').select('rect').dispatch('mouseout', { event });
      });
    
    // 缩放处理
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        setZoomTransform(event.transform);
        zoomG.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    svg.call(zoom.transform, zoomTransform);
    
  }, [data, width, height, margin, selectedNode, zoomTransform, barHeightRatio, showTexts]);

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
            border: 'none',  // 移除tooltip边框
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
            <span style={{ fontWeight: '500', color: '#fff' }}>持续时间:</span> {formatValue(tooltip.node.data.value)}ms
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
          border: 'none',  // 移除SVG边框
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
            .axis-title { font-size: 12px; font-weight: bold; }
            .x-axis text { font-size: 11px; fill: #666; }
            .flame-graph-container g.selected rect {
              stroke: #4CAF50 !important;  /* 选中状态保留边框以便区分 */
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
        <g ref={zoomGRef} transform={`translate(${margin.left},${margin.top})`} />
      </svg>
    </div>
  );
};

export default TimeBasedFlameGraph;