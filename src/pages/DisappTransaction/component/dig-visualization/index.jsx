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

    // 根据层级获取颜色
    const getLevelColor = (level) => {
        const colors = [
            '#F59556', // 第0层
            '#48C0C1', // 第1层
            '#4E90E8', // 第2层
            '#F11F16', // 第3层
            '#E76378', // 第4层
            '#74BB48', // 第5层
            '#6F7DA3', // 第6层
            '#f3f3f3', // 第7层及以上的默认颜色
        ];
        return level < colors.length ? colors[level] : colors[colors.length - 1];
    };

    // 预处理节点数据，设置层级颜色
    const processedNodes = nodes.map(node => {
        const level = node.level || 0;
        return {
            ...node,
            color: {
                ...node.color,
                background: getLevelColor(level),
                highlight: {
                    ...(node.color?.highlight || {}),
                    background: getLevelColor(level) === '#f0f0f0' ? '#e0e0e0' : getLevelColor(level)
                }
            }
        };
    });

    // 图配置
    const options = {
        autoResize: true,
        height: '100%',
        width: '100%',
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'LR', // 从左到右
                sortMethod: 'directed', // 有向排序
                nodeSpacing: 90,
                levelSeparation: 300,
                treeSpacing: 100
            },
            randomSeed: 42
        },
        nodes: {
            shape: 'box', // 将节点形状从 'dot' 改为 'box'
            widthConstraint: {
                maximum: 200, // 限制节点最大宽度
                minimum: 80   // 限制节点最小宽度
            },
            font: {
                size: 14,
                color: '#fff',
                align: 'center' // 文字居中对齐
            },
            borderWidth: 2,
            borderWidthSelected: 3,
            borderRadius: 40,
            color: {
                background: '#f0f0f0', // 节点背景色
                border: '#000',        // 节点边框色
                borderRadius: 20,
                highlight: {
                    background: '#e0e0e0', // 选中时的背景色
                    border: '#333'         // 选中时的边框色
                }
            },
            margin: 10 // 文字与边框的间距
        },
        edges: {
            width: 1,
            borderRadius: 20,
            color: {
                color: '#999',
                highlight: '#555'
            },
            arrows: {
                to: { enabled: true, scaleFactor: 0.8 }
            }
        },
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
                const updatedNodes = [...processedNodes].map(node => {
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
        }, [processedNodes]),
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
        const updatedNodes = [...processedNodes].map(node => ({
            ...node,
            fixed: true
        }));
        setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
    }, [processedNodes]);

    // 解锁所有节点
    const unfixAllNodes = useCallback(() => {
        const updatedNodes = [...processedNodes].map(node => ({
            ...node,
            fixed: false
        }));
        setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
    }, [processedNodes]);

    useEffect(() => {
        console.log(nodes, "nodes");
        
    }, [nodes])

    return (
        <div className="graph-container" style={{ height: '600px', position: 'relative' }}>
            {/* 图可视化组件 */}
            <Graph
                graph={{ nodes: processedNodes, edges }}
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
                    zIndex: 100,
                    color: "black"
                }}>
                    <h3 className="font-bold mb-2">节点详情</h3>
                    <div className="space-y-2">
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.title && (
                            <div>
                                <span className="text-gray-500 text-sm">端点:</span>
                                <div className="font-medium">{processedNodes.find(node => node.id === graphState.selectedNode)?.title}</div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.label && (
                            <div>
                                <span className="text-gray-500 text-sm">组件:</span>
                                <div className="font-medium">{processedNodes.find(node => node.id === graphState.selectedNode)?.label}</div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.protocol && (
                            <div>
                                <span className="text-gray-500 text-sm">Protocol:</span>
                                <div className="font-medium">{processedNodes.find(node => node.id === graphState.selectedNode)?.protocol}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GraphVisualization;