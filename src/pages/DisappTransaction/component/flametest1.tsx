import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

const FlameGraph = ({ 
  data, 
  width = 800, 
  height = 600, 
  margin = { top: 20, right: 20, bottom: 40, left: 60 },
  barHeightRatio = 0.95 // 接近1以利用完整层级高度
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
  const [maxDepth, setMaxDepth] = useState(0);

  // 生成基于深度的渐变颜色
  const getGradientId = (depth) => `gradient-${depth}`;
  
  // 定义渐变的起始和结束颜色生成函数
  const getStartColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).darker(1.2).toString();
  };
  
  const getEndColor = (depth) => {
    const color = d3.interpolateViridis(depth / 10);
    return d3.color(color).brighter(1.5).toString();
  };

  // 格式化数值显示（添加千位分隔符）
  const formatValue = (value) => {
    return value.toLocaleString('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    });
  };

  // 计算tooltip的最佳位置
  const calculateTooltipPosition = (event, node) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipWidth = 220;
    const tooltipHeight = 140;
    
    let x = event.clientX - containerRect.left + 10;
    let y = event.clientY - containerRect.top + 10;
    
    // 边界检查
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

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoomG = d3.select(zoomGRef.current);
    const axesG = d3.select(axesGRef.current);
    
    // 清理现有内容
    zoomG.selectAll('*').remove();
    axesG.selectAll('*').remove();
    
    if (!data) return;
    
    // 创建分区函数 - 仅保留宽度计算逻辑，修改高度逻辑以消除间距
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const partition = d3.partition()
      .size([plotWidth, plotHeight]); // 宽度保持原有逻辑，高度用于计算无间距布局
    
    // 准备数据 - 保留原有宽度计算（基于value的比例分配）
    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value); // 宽度排序逻辑不变
    
    // 计算分区布局
    partition(root);
    setMaxDepth(root.height);
    
    // 关键修改：重新计算每个层级的y坐标，消除间距
    // 1. 计算总层级数
    const totalLevels = root.height + 1;
    // 2. 计算每个层级的实际高度（无间距）
    const levelHeight = plotHeight / totalLevels;
    // 3. 重新分配每个节点的y坐标
    root.descendants().forEach(node => {
      // 保持原有x坐标（宽度）不变
      // 重新计算y坐标：当前层级 * 层级高度
      node.y0 = node.depth * levelHeight;
      node.y1 = (node.depth + 1) * levelHeight;
    });
    
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
      .attr("flood-color", "rgba(0,0,0,0.5)");
    
    // 为每个深度创建左右渐变
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
    
    // 创建坐标轴 - x轴保持原有宽度逻辑
    const xScale = d3.scaleLinear()
      .domain([0, root.value])
      .range([margin.left, width - margin.right]);
    
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      .tickFormat(d => formatValue(d));
    
    axesG.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);
    
    axesG.append('text')
      .attr('class', 'axis-title')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .text('时间(ms)');
    
    // Y轴修改：无间距比例尺
    const yScale = d3.scaleBand()
      .domain(d3.range(0, totalLevels))
      .range([margin.top, height - margin.bottom])
      .padding(0); // 关键：去除间距
    
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `层级 ${d}`);
    
    axesG.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis);
    
    axesG.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .text('层级深度');
    
    // 创建火焰图矩形组 - 宽度保持不变，高度适应无间距布局
    const cells = zoomG.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => {
        // 宽度相关x坐标保持不变
        // 垂直方向使用重新计算的y坐标，消除间距
        const originalHeight = d.y1 - d.y0;
        const newHeight = originalHeight * barHeightRatio;
        const verticalOffset = (originalHeight - newHeight) / 2;
        return `translate(${d.x0},${d.y0 + verticalOffset})`;
      })
      .classed('selected', d => selectedNode === d);
    
    // 添加矩形 - 宽度保持原有计算（d.x1 - d.x0）
    const rects = cells.append('rect')
      .attr('width', d => d.x1 - d.x0) // 宽度不变
      .attr('height', d => (d.y1 - d.y0) * barHeightRatio) // 高度基于无间距布局
      .attr('fill', d => `url(#${getGradientId(d.depth)})`)
      .attr('opacity', d => (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('filter', 'none')
      .attr('transition', 'all 0.2s ease')
      .style('cursor', 'pointer');
    
    // 添加主文本（节点名称）
    cells.append('text')
      .attr('x', 6)
      .attr('y', d => ((d.y1 - d.y0) * barHeightRatio) / 3)
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', d => selectedNode === d ? 'bold' : 'normal')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('class', 'flame-text name-text')
      .text(d => {
        const availableWidth = d.x1 - d.x0 - 12; // 宽度相关计算不变
        if (availableWidth < 30) return '';
        
        const nameText = d.data.name;
        
        const measureTextWidth = (text) => {
          if (!textMeasurementRef.current) return 0;
          const ctx = textMeasurementRef.current.getContext('2d');
          ctx.font = '12px Arial';
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
    
    // 添加值文本（增强显示）
    cells.append('text')
      .attr('x', 6)
      .attr('y', d => ((d.y1 - d.y0) * barHeightRatio) * 2/3)
      .attr('dy', '0.35em')
      .attr('fill', 'rgba(255, 255, 255, 0.9)')
      .attr('font-size', '11px')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start')
      .attr('class', 'flame-text value-text')
      .text(d => {
        const availableWidth = d.x1 - d.x0 - 12; // 宽度相关计算不变
        if (availableWidth < 40) return '';
        
        const percentage = d.parent 
          ? ((d.value / d.parent.value) * 100).toFixed(1) 
          : '100.0';
        
        const valueText = `${formatValue(d.value)}ms (${percentage}%)`;
        
        const measureTextWidth = (text) => {
          if (!textMeasurementRef.current) return 0;
          const ctx = textMeasurementRef.current.getContext('2d');
          ctx.font = '11px Arial';
          return ctx.measureText(text).width;
        };
        
        return measureTextWidth(valueText) <= availableWidth ? valueText : '';
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
          .attr('stroke', '#fff')
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
    
    // 缩放处理 - 保持原有逻辑
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        setZoomTransform(event.transform);
        zoomG.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    svg.call(zoom.transform, zoomTransform);
    
  }, [data, width, height, margin, selectedNode, zoomTransform, barHeightRatio]);

  return (
    <div 
      ref={containerRef}
      className="flame-graph-container" 
      style={{ 
        position: 'relative', 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center",
        width: '100%',
        overflow: 'hidden'
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
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            pointerEvents: 'none',
            zIndex: 1000,
            width: '220px',
            fontSize: '13px',
            border: '1px solid #eee',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#333',
            wordBreak: 'break-all'
          }}>
            {tooltip.node.data.name}
          </div>
          <div style={{ marginBottom: '6px', color: '#666' }}>
            <span style={{ fontWeight: '500', color: '#333' }}>值:</span> {formatValue(tooltip.node.value)}ms
          </div>
          <div style={{ marginBottom: '6px', color: '#666' }}>
            <span style={{ fontWeight: '500', color: '#333' }}>占比:</span> {tooltip.node.parent 
              ? `${((tooltip.node.value / tooltip.node.parent.value) * 100).toFixed(1)}%`
              : '100%'
            }
          </div>
          <div style={{ marginBottom: '6px', color: '#666' }}>
            <span style={{ fontWeight: '500', color: '#333' }}>深度:</span> {tooltip.node.depth}
          </div>
          <div style={{ color: '#666', wordBreak: 'break-all' }}>
            <span style={{ fontWeight: '500', color: '#333' }}>父节点:</span>{' '}
            {tooltip.node.parent ? tooltip.node.parent.data.name : '根节点'}
          </div>
          {/* 小三角指示器 */}
          <div style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: '8px solid rgba(255, 255, 255, 0.95)',
            top: '-8px',
            left: '20px',
            filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.1))'
          }}></div>
        </div>
      )}
      
      <canvas ref={textMeasurementRef} style={{ display: 'none' }} />
      
      <svg 
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ddd' }}
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
            .value-text { opacity: 0.9; }
            .axis-title { font-size: 12px; font-weight: bold; }
            .x-axis text, .y-axis text { font-size: 11px; }
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
    </div>
  );
};

export default FlameGraph;