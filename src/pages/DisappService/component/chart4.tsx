import React, { useEffect, useRef } from 'react';
import { Graph, treeToGraphData } from '@antv/g6';
 
const Chart4 = () => {
  const containerRef = useRef(null);
 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('https://gw.alipayobjects.com/os/antvdemo/assets/data/algorithm-category.json');
        const data = await res.json();
 
        const graph = new Graph({
          container: containerRef.current,
          autoFit: 'view',
          data: treeToGraphData(data),
          behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
          node: {
            style: {
              labelText: d => d.id,
              labelBackground: true,
            },
            animation: {
              enter: false,
            },
          },
          layout: {
            type: 'compact-box',
            radial: true,
            direction: 'RL',
            getId: function getId(d) {
              return d.id;
            },
            getHeight: () => 26,
            getWidth: () => 26,
            getVGap: () => 20,
            getHGap: () => 40,
          },
        });
 
        graph.render();
        graph.on('node:click', function (evt) {
          // const { item } = evt;
          const id = evt.target.id;
          // const config = evt.config;
          // const context = evt.context;
          // const {id} = config
          // const model = item.getModel();
          // console.log(evt,id, "evtevt");
          console.log(evt,id, "evtevt");
          // 携带URL跳转
          window.location.href = `http://localhost:8000/distributeApp/transaction?nodeQuery=${id}`
        });
        
        // 清理函数，用于在组件卸载时销毁图实例
        return () => {
          graph.destroy();
        };
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      }
    };
 
    fetchData();
  }, []); // 空依赖数组意味着这个效果只在组件挂载和卸载时运行一次
 
  return <div ref={containerRef} id="container" style={{ width: '100%', height: '500px' }}></div>;
};
 
export default Chart4;