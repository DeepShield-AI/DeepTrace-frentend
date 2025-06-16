import React from 'react';
import ReactDOM from 'react-dom';
import { Area } from '@ant-design/plots';

const Chart1 = () => {
  const config = {
    data: {
      type: 'fetch',
      value: 'https://assets.antv.antgroup.com/g2/unemployment-by-industry.json',
    },
    xField: (d) => new Date(d.date),
    yField: 'unemployed',
    colorField: 'industry',
    normalize: true,
    stack: true,
    tooltip: { channel: 'y0', valueFormatter: '.0%' },
  };
  return <Area {...config} />;
};

export default Chart1