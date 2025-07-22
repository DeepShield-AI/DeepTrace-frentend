import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

// 颜色生成器 - 根据节点深度生成颜色
const colorScale = d3.scaleSequential(d3.interpolateViridis)
  .domain([0, 10]); // 假设最大深度为10

const FlameGraph = ({ 
  data, 
  width = 800, 
  height = 600, 
  margin = { top: 20, right: 20, bottom: 40, left: 60 } 
}) => {
  const svgRef = useRef();
  const zoomGRef = useRef();
  const axesGRef = useRef();
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);
  const textMeasurementRef = useRef(null);
  const [textBubble, setTextBubble] = useState(null);
  const [maxDepth, setMaxDepth] = useState(0);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const zoomG = d3.select(zoomGRef.current);
    const axesG = d3.select(axesGRef.current);
    
    // 清理现有内容
    zoomG.selectAll('*').remove();
    axesG.selectAll('*').remove();
    
    if (!data) return;
    
    // 创建分区函数 - 自上而下布局
    const partition = d3.partition()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom]);
    
    // 准备数据
    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);
    
    // 计算分区布局
    partition(root);
    
    // 记录最大深度用于坐标轴
    setMaxDepth(root.height);
    
    // 创建固定的坐标轴
    const xScale = d3.scaleLinear()
      .domain([0, root.value])
      .range([margin.left, width - margin.right]);
    
    const xAxis = d3.axisBottom(xScale)
      .ticks(5)
      // .tickFormat(d3.format('.2s')); //进行格式化缩写
      .tickFormat(d => d)
    
    axesG.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);
    
    // 添加x轴标题
    axesG.append('text')
      .attr('class', 'axis-title')
      .attr('x', width / 2)
      .attr('y', height - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .text('时间(ms)');
    
    const yScale = d3.scaleBand()
      .domain(d3.range(0, root.height + 1))
      .range([margin.top, height - margin.bottom])
      .padding(0.1);
    
    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `节点层级 ${d}`);
    
    axesG.append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis);
    
    // 添加y轴标题
    axesG.append('text')
      .attr('class', 'axis-title')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .text('层级深度');
    
    // 创建火焰图矩形
    const cells = zoomG.selectAll('g')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
    // 添加矩形 - 自上而下排列
    cells.append('rect')
      .attr('width', d => d.x1 - d.x0) // 宽度基于x坐标范围
      .attr('height', d => d.y1 - d.y0) // 高度基于y坐标范围
      .attr('fill', d => colorScale(d.depth))
      .attr('opacity', d => (selectedNode && (d === selectedNode || d.ancestors().includes(selectedNode))) ? 1 : 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        
        // 检查文本是否过长需要显示气泡
        const availableWidth = d.x1 - d.x0 - 12;
        const fullText = `${d.data.name} (${d.value})`;
        
        const measureTextWidth = (text) => {
          if (!textMeasurementRef.current) return 0;
          const ctx = textMeasurementRef.current.getContext('2d');
          ctx.font = '12px Arial';
          return ctx.measureText(text).width;
        };
        
        if (measureTextWidth(fullText) > availableWidth) {
          setTextBubble({
            text: fullText,
            x: d.x0 + (d.x1 - d.x0) / 2,
            y: d.y0 + (d.y1 - d.y0) / 2,
            width: d.x1 - d.x0
          });
        } else {
          setTextBubble(null);
        }
      })
      .on('mousemove', (event) => {
        // 更新气泡位置跟随鼠标
        if (textBubble) {
          setTextBubble(prev => ({
            ...prev,
            mouseX: event.clientX,
            mouseY: event.clientY
          }));
        }
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        setTextBubble(null);
      })
      .on('click', (event, d) => {
        // 点击相同节点时取消选择
        setSelectedNode(selectedNode === d ? null : d);
      });
    
    // 添加文本 - 只显示名称，不显示值
    cells.append('text')
      .attr('x', 6) // 左侧内边距
      .attr('y', d => (d.y1 - d.y0) / 2) // 垂直居中
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'start') // 文本左对齐
      .attr('class', 'flame-text')
      .text(d => {
        const availableWidth = d.x1 - d.x0 - 12;
        if (availableWidth < 10) return ''; // 宽度太小不显示任何文本
        
        // 总是尝试显示名称，值会在气泡中显示
        const nameText = d.data.name;
        
        const measureTextWidth = (text) => {
          if (!textMeasurementRef.current) return 0;
          const ctx = textMeasurementRef.current.getContext('2d');
          ctx.font = '12px Arial';
          return ctx.measureText(text).width;
        };
        
        // 如果名称可以放下
        if (measureTextWidth(nameText) <= availableWidth) {
          return nameText;
        }
        
        // 否则需要截断名称
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
    
    // 缩放处理 - 只缩放火焰图内容，不缩放坐标轴
    const zoom = d3.zoom()
      .scaleExtent([0.5, 20])
      .on('zoom', (event) => {
        setZoomTransform(event.transform);
        zoomG.attr('transform', event.transform);
      });
    
    svg.call(zoom);
    
    // 应用初始缩放
    svg.call(zoom.transform, zoomTransform);
    
  }, [data, width, height, margin, selectedNode, zoomTransform]);

  return (
    <div className="flame-graph-container" style={{ position: 'relative', display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* 缩放控制按钮 */}
      {/* <div className="zoom-controls" style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
        <button onClick={() => setZoomTransform(t => t.scale(1.2))}>放大</button>
        <button onClick={() => setZoomTransform(t => t.scale(0.8))}>缩小</button>
        <button onClick={() => setZoomTransform(d3.zoomIdentity)}>重置</button>
      </div> */}
      
      {/* 信息提示框 */}
      {hoveredNode && (
        <div className="tooltip" style={{
          position: 'absolute',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 20,
          maxWidth: '300px',
          fontSize: '12px',
          right: 0,
          top: 0
        }}>
          <div><strong>名称:</strong> {hoveredNode.data.name}</div>
          <div><strong>值:</strong> {hoveredNode.value}</div>
          <div><strong>深度:</strong> {hoveredNode.depth}</div>
          <div><strong>父节点:</strong> {hoveredNode.parent ? hoveredNode.parent.data.name : '根节点'}</div>
        </div>
      )}
      
      {/* 文本气泡 */}
      {textBubble && (
        <div className="text-bubble" style={{
          position: 'absolute',
          left: textBubble.mouseX + 10,
          top: textBubble.mouseY + 10,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 30,
          fontSize: '12px',
          whiteSpace: 'nowrap'
        }}>
          {textBubble.text}
        </div>
      )}
      
      {/* 隐藏的文本测量画布 */}
      <canvas ref={textMeasurementRef} style={{ display: 'none' }} />
      
      {/* SVG容器 - 移除了背景色 */}
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
            }
            .axis-title {
              font-size: 12px;
              font-weight: bold;
            }
            .x-axis text, .y-axis text {
              font-size: 11px;
            }
            `}
          </style>
        </defs>
        {/* 固定的坐标轴容器 */}
        <g ref={axesGRef} />
        {/* 火焰图内容容器 - 会随缩放变化 */}
        <g ref={zoomGRef} transform={`translate(${margin.left},${margin.top})`} />
      </svg>
    </div>
  );
};

export default FlameGraph;