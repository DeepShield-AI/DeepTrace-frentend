import React from 'react';
import Tree from 'react-d3-tree';

// 这是组织结构图的一个简化例子，深度为 2。
// 注意更深层次是通过 `children` 属性递归定义的。
const orgChart = {
  name: 'P_node',
  children: [
    {
      name: 'C_node1',
      attributes: {
        department: 'Production',
      },
      children: [
        {
          name: 'CC_node2',
          attributes: {
            department: 'Fabrication',
          },
          children: [
            {
              name: 'CCC_node1',
            },
          ],
        }, 
        {
          name: 'CC_node2', 
          attributes: {
            department: 'Assembly',
          },
          children: [
            {
              name: 'CCC_node1',
            },
          ],
        },
        {
          name: 'CC_node3', 
          attributes: {
            department: 'Assembly',
          },
          children: [
            {
              name: 'CCC_node1',
            },
          ],
        },
      ],
    },
    // {
    //   name: 'C_node2',
    //   attributes: {
    //     department: 'Production',
    //   },
    //   children: [
    //     {
    //       name: 'CC_node2',
    //       attributes: {
    //         department: 'Fabrication',
    //       },
    //       children: [
    //         {
    //           name: 'CCC_node1',
    //         },
    //       ],
    //     }, 
    //     {
    //       name: 'CC_node2', 
    //       attributes: {
    //         department: 'Assembly',
    //       },
    //       children: [
    //         {
    //           name: 'CCC_node1',
    //         },
    //       ],
    //     },
    //     {
    //       name: 'CC_node3', 
    //       attributes: {
    //         department: 'Assembly',
    //       },
    //       children: [
    //         {
    //           name: 'CCC_node1',
    //         },
    //       ],
    //     },
    //   ],
    // },
  ],
};

export default function OrgChartTree() {
  return (
    // `<Tree />` 将填充其容器的宽高；在这个例子中是 `#treeWrapper`。
    <div id="treeWrapper" style={{ width: '100%', height: '500px' }}>
      <Tree data={orgChart} />
    </div>
  );
}