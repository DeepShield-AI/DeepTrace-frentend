import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const TimeBasedFlameGraph = ({ 
  data, 
  width = 1200, 
  height = 400,  // 进一步降低整体高度以适配更紧凑的层级
  margin = { top: 15, right: 20, bottom: 40, left: 20 },  // 缩减顶部边距，保持紧凑
  barHeightRatio = 0.85,  // 配合矮层级，适当降低比例避免拥挤
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
  useEffect(() => {
    setShowTexts(width >= textHideThreshold);
  }, [width, textHideThreshold]);

  useEffect(() => {
    console.log(data, "火焰");
  }, [data])

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoomG = d3.select(zoomGRef.current);
    const axesG = d3.select(axesGRef.current);
    
    // 清理现有内容
    zoomG.selectAll('*').remove();
    axesG.selectAll('*').remove();
    
    if (!data) return;
    
    // 计算绘图区域
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    
    // 创建层次结构
    const root = d3.hierarchy(data);
    
    // 计算时间范围
    let minStartTime = Infinity;
    let maxEndTime = -Infinity;
    
    root.descendants().forEach(node => {
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
    
    // 计算层级高度（核心调整：进一步降低层级高度，缩放因子从0.7→0.5）
    const totalLevels = root.height + 1;
    const baseLevelHeight = plotHeight / totalLevels;
    const levelHeight = baseLevelHeight * 0.5;  // 层级高度为基础高度的50%（更矮）
    
    // 创建Y轴比例尺（仅用于定位）
    const yScale = d3.scaleLinear()
      .domain([0, totalLevels])
      .range([margin.top, margin.top + totalLevels * levelHeight]);  // 适配更矮的层级
    
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
      .attr("flood-color", "rgba(255,255,255,0.3)");
    
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
    
    // 创建X轴（时间轴）
    const xAxis = d3.axisBottom(xScale)
      .ticks(width >= 800 ? 5 : 3)
      .tickFormat(d => formatTime(d - minStartTime));
    
    const xAxisGroup = axesG.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);
    
    // 调整X轴文本
    if (width < 500) {
      xAxisGroup.selectAll("text")
        .attr("font-size", "9px")
        .attr("dy", "1em");
    }
    
    // X轴标题
    axesG.append('text')
      .attr('class', 'axis-title')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ddd')
      .text('时间 (毫秒)')
      .style('opacity', width < 400 ? 0 : 1);
    
    // 创建火焰图矩形组
    const cells = zoomG.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => {
        // 基于更矮的层级高度计算位置
        const originalHeight = levelHeight;
        const newHeight = originalHeight * barHeightRatio;
        const verticalOffset = (originalHeight - newHeight) / 2;
        
        return `translate(${xScale(d.data.start_time)},${yScale(d.depth) + verticalOffset})`;
      })
      .classed('selected', d => selectedNode === d);
    
    // 添加矩形（高度基于更矮的层级）
    const rects = cells.append('rect')
      .attr('width', d => {
        const start = d.data.start_time;
        const end = start + d.data.value;
        return Math.max(1, xScale(end) - xScale(start));
      })
      .attr('height', levelHeight * barHeightRatio)  // 矩形高度随层级高度进一步降低
      .attr('fill', d => `url(#${getGradientId(d.depth)})`)
      .attr('opacity', d => (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .attr('filter', 'none')
      .attr('transition', 'all 0.2s ease')
      .style('cursor', 'pointer');
    
    // 添加主文本（节点名称）- 适配矮层级，调整文本位置和大小
    const nameTexts = cells.append('text')
      .attr('x', 4)  // 缩减左侧偏移，适应窄矩形
      .attr('y', (levelHeight * barHeightRatio) / 2)  // 文本垂直居中（因层级过矮，不再分两行）
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', width < 800 ? '10px' : '11px')  // 进一步缩小字体
      .attr('font-weight', d => selectedNode === d ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('class', 'flame-text name-text');
    
    nameTexts.text(d => {
      if (!showTexts) return '';
      
      const start = d.data.start_time;
      const end = start + d.data.value;
      const availableWidth = Math.max(0, xScale(end) - xScale(start) - 8);  // 缩减可用宽度阈值
      if (availableWidth < (width < 800 ? 20 : 25)) return '';  // 更严格的显示条件
      
      const nameText = d.data.name;
      
      const measureTextWidth = (text) => {
        if (!textMeasurementRef.current) return 0;
        const ctx = textMeasurementRef.current.getContext('2d');
        ctx.font = `${width < 800 ? '10px' : '11px'} Arial`;
        return ctx.measureText(text).width;
      };
      
      if (measureTextWidth(nameText) <= availableWidth) {
        return nameText;
      }
      
      let truncatedName = '';
      for (let i = 0; i < nameText.length; i++) {
        const testText = nameText.substring(0, i) + '...';
        if (measureTextWidth(testText) > availableWidth) {
          break;
        }
        truncatedName = testText;
      }
      
      return truncatedName || '...';
    });
    
    // 移除值文本（因层级过矮，无法容纳两行文本，通过tooltip展示）
    
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
          .attr('stroke', '#333')
          .attr('stroke-width', 0.5)
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
        backgroundColor: '#121212',
        padding: '15px',  // 缩减整体内边距
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}
    >
      {/* <div style={{ 
        width: '100%', 
        textAlign: 'center', 
        marginBottom: '10px',  // 缩减标题下方间距
        color: '#e0e0e0'
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: width < 600 ? '16px' : '22px' }}>时间线火焰图</h2>
        <p style={{ 
          margin: '5px 0 0', 
          fontSize: width < 600 ? '11px' : '13px', 
          color: '#b0b0b0',
          opacity: width < 400 ? 0 : 1
        }}>
          基于起始时间(start_time)的节点布局 | 总时间范围: {formatTime(timeRange[1] - timeRange[0])}
        </p>
      </div> */}
      
      {/* 信息框（保留完整信息展示，弥补文本简化） */}
      {tooltip && (
        <div 
          className="flame-tooltip" 
          style={{
            position: 'absolute',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            backgroundColor: 'rgba(30, 30, 30, 0.97)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(255,255,255,0.1)',
            padding: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            width: width < 500 ? '180px' : '220px',
            fontSize: width < 500 ? '12px' : '13px',
            border: '1px solid #444',
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
            borderBottom: '8px solid rgba(30, 30, 30, 0.97)',
            top: '-8px',
            left: '20px',
            filter: 'drop-shadow(0 -1px 1px rgba(255,255,255,0.1))'
          }}></div>
        </div>
      )}
      
      <canvas ref={textMeasurementRef} style={{ display: 'none' }} />
      
      <svg 
        ref={svgRef}
        width={width}
        height={height}
        style={{ 
          border: '1px solid #333',
          borderRadius: '8px',
          backgroundColor: '#000'
        }}
      >
        <defs>
          <style>
            {`
            .flame-text {
              text-shadow: 
                -1px -1px 0 #000,
                 1px -1px 0 #000,
                -1px  1px 0 #000,
                 1px  1px 0 #000;
              dominant-baseline: middle;
              transition: all 0.2s ease;
            }
            .name-text { font-weight: 500; }
            .axis-title { font-size: 12px; font-weight: bold; }
            .x-axis text { font-size: 11px; fill: #ddd; }
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
        <g ref={zoomGRef} transform={`translate(${margin.left},${margin.top})`} />
      </svg>
      
      {/* 底部说明文本 */}
      {/* <div style={{
        marginTop: '10px',  // 缩减底部说明间距
        fontSize: width < 600 ? '11px' : '12px',  // 缩小说明文本
        color: '#b0b0b0',
        textAlign: 'center',
        maxWidth: '800px',
        opacity: width < 500 ? 0 : 1
      }}>
        <p>
          <strong style={{ color: '#e0e0e0' }}>说明:</strong> 每个矩形代表一个调用，宽度表示持续时间，垂直方向表示调用深度。
          鼠标悬停查看详情，滚轮缩放，拖拽平移，点击高亮节点。
        </p>
      </div> */}
    </div>
  );
};

export default TimeBasedFlameGraph;