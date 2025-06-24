import React, { useState, useCallback, useEffect } from 'react';
import Graph from 'react-graph-vis';

const GraphVisualization = ({ nodes, edges }) => {
    // 状态管理
    const [graphState, setGraphState] = useState({
        selectedNode: null,
        selectedEdge: null,
        physicsEnabled: true, // 物理引擎状态
        stabilized: false // 布局是否稳定
    });

    useEffect(() => {
        console.log(nodes, edges, "edge");
        
    }, [nodes, edges])
    // 图配置
    const options = {
        autoResize: true,
        height: '100%',
        width: '100%',
        layout: {
            hierarchical: graphState.treeLayout, // 树形布局
            hierarchical: {
                direction: 'LR', // 从左到右
                sortMethod: 'directed', // 有向排序
                nodeSpacing: 90,
                levelSeparation: 300,
                treeSpacing: 100
            },
            randomSeed: 42
        },
        nodes: {
            shape: 'dot',
            size: 10,
            font: {
                size: 14,
                color: '#333'
            },
            borderWidth: 2,
            borderWidthSelected: 1
        },
        edges: {
            width: 1,
            color: {
                color: '#999',
                highlight: '#555'
            },
            arrows: {
                to: { enabled: true, scaleFactor: 0.8 }
            },
            // smooth: {
            //     enabled: true,
            //     type: 'dynamic'
            // }
        },
        physicsEnabled: false,
        physics: {
            enabled: false, // 完全禁用物理引擎
            stabilization: {
                enabled: false // 禁用稳定化过程
            }
        },
        interaction: {
            hover: true,
            selectConnectedEdges: true,
            tooltipDelay: 200
        },
        manipulation: {
            enabled: false // 禁用默认操作
        }
    };

    // 事件处理
    const events = {
        select: useCallback((event) => {
            const { nodes, edges } = event;
            setGraphState(prev => ({
                ...prev,
                selectedNode: nodes[0] || null,
                selectedEdge: edges[0] || null
            }));
        }, []),
        doubleClick: useCallback((event) => {
            // 双击固定/解锁节点
            const { nodes } = event;
            if (nodes.length > 0) {
                const nodeId = nodes[0];
                const updatedNodes = [...nodes].map(node => {
                    if (node.id === nodeId) {
                        return {
                            ...node,
                            fixed: !node.fixed // 切换固定状态
                        };
                    }
                    return node;
                });
                // 更新节点数据
                setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
            }
        }, [nodes]),
        stabilizationIterationsDone: useCallback(() => {
            // 布局稳定后自动暂停物理引擎
            setGraphState(prev => ({ ...prev, stabilized: true }));
        }, [])
    };

    // 切换物理引擎状态
    const togglePhysics = useCallback(() => {
        setGraphState(prev => ({
            ...prev,
            physicsEnabled: !prev.physicsEnabled
        }));
    }, []);

    // 重置布局
    const resetLayout = useCallback(() => {
        setGraphState(prev => ({
            ...prev,
            physicsEnabled: true,
            stabilized: false
        }));
    }, []);

    // 固定所有节点
    const fixAllNodes = useCallback(() => {
        const updatedNodes = [...nodes].map(node => ({
            ...node,
            fixed: true
        }));
        setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
    }, [nodes]);

    // 解锁所有节点
    const unfixAllNodes = useCallback(() => {
        const updatedNodes = [...nodes].map(node => ({
            ...node,
            fixed: false
        }));
        setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
    }, [nodes]);

    return (
        <div className="graph-container" style={{ height: '300px', position: 'relative' }}>
            {/* 控制面板 */}
            {/* <div className="graph-controls" style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
                <div className="bg-white p-3 rounded-lg shadow-lg flex flex-wrap gap-2">
                    <button
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        onClick={togglePhysics}
                    >
                        {graphState.physicsEnabled ? '暂停布局' : '启用布局'}
                    </button>
                    <button
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                        onClick={fixAllNodes}
                    >
                        固定所有节点
                    </button>
                    <button
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                        onClick={unfixAllNodes}
                    >
                        解锁所有节点
                    </button>
                    <button
                        className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                        onClick={resetLayout}
                    >
                        重置布局
                    </button>
                    <div className="text-sm text-gray-600 mt-2">
                        <span>当前状态: </span>
                        {graphState.stabilized ?
                            <span className="text-green-500">布局已稳定</span> :
                            <span className="text-yellow-500">布局中...</span>
                        }
                    </div>
                </div>
            </div> */}

            {/* 图可视化组件 */}
            <Graph
                graph={{ nodes, edges }}
                options={options}
                events={events}
                getNetwork={(network) => {
                    // 可选：获取网络实例以进行更多操作
                    // console.log('Network instance:', network);
                }}
            />

            {/* 节点信息面板 */}
            {graphState.selectedNode !== null && (
                <div className="node-info-panel" style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    maxWidth: '250px',
                    zIndex: 100
                }}>
                    <h3 className="font-bold mb-2">节点详情</h3>
                    <div className="space-y-2">
                        {nodes.find(node => node.id === graphState.selectedNode)?.title && (
                            <div>
                                <span className="text-gray-500 text-sm">端点:</span>
                                <div className="font-medium">{nodes.find(node => node.id === graphState.selectedNode)?.title}</div>
                            </div>
                        )}
                        {nodes.find(node => node.id === graphState.selectedNode)?.label && (
                            <div>
                                <span className="text-gray-500 text-sm">组件:</span>
                                <div className="font-medium">{nodes.find(node => node.id === graphState.selectedNode)?.label}</div>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-500 text-sm">ID:</span>
                            <div className="font-medium">{graphState.selectedNode}</div>
                        </div>
                        {/* <div>
                            <span className="text-gray-500 text-sm">固定状态:</span>
                            <div className="font-medium">{
                                nodes.find(node => node.id === graphState.selectedNode)?.fixed ?
                                    '已固定' : '未固定'
                            }</div>
                        </div> */}
                        <button
                            className="mt-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition-colors w-full"
                            onClick={() => {
                                const nodeId = graphState.selectedNode;
                                const updatedNodes = [...nodes].map(node => {
                                    if (node.id === nodeId) {
                                        return {
                                            ...node,
                                            fixed: !node.fixed
                                        };
                                    }
                                    return node;
                                });
                                setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
                            }}
                        >
                            {nodes.find(node => node.id === graphState.selectedNode)?.fixed ?
                                '解锁此节点' : '固定此节点'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraphVisualization;  