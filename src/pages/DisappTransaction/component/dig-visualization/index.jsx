import React, { useState, useCallback, useEffect, useRef } from 'react';
import Graph from 'react-graph-vis';

const GraphVisualization = ({ relationData }) => {
    // 状态管理
    const [graphState, setGraphState] = useState({
        selectedNode: null,
        selectedEdge: null,
        physicsEnabled: true,
        stabilized: false,
        highlightedEdges: new Set()  // 新增：存储高亮边的ID
    });

    // 使用 ref 存储图实例
    const networkRef = useRef(null);

    // 根据层级获取颜色
    const getLevelColor = (level) => {
        const colors = [
            '#440154', '#3e4989', '#31688e', '#26828e', 
            '#239b6bff', '#74BB48', '#6F7DA3', '#f3f3f3'
        ];
        return level < colors.length ? colors[level] : colors[colors.length - 1];
    };

    // 递归处理嵌套的拓扑结构，生成边
    const processTopology = (topology, adjacencyList, inDegree, edges, components) => {
        const traverse = (source, targets) => {
            if (typeof targets !== 'object' || targets === null) return;
            
            Object.keys(targets).forEach(targetId => {
                if (components[source] && components[targetId]) {
                    const edgeId = `${source}-${targetId}`;
                    edges.push({
                        id: edgeId,  // 确保每条边都有唯一ID
                        from: source,
                        to: targetId,
                        label: '',
                        arrows: { to: { enabled: true } }
                    });
                    adjacencyList[source].push(targetId);
                    inDegree[targetId] = (inDegree[targetId] || 0) + 1;
                    traverse(targetId, targets[targetId]);
                }
            });
        };
        
        Object.entries(topology).forEach(([sourceId, targets]) => {
            traverse(sourceId, targets);
        });
    };

    // 生成图数据
    const generateGraphData = useCallback(() => {
        if (!relationData || !relationData.components || !relationData.topology) {
            return { nodes: [], edges: [] };
        }

        const { components, topology } = relationData;
        const nodes = [];
        const edges = [];
        const nodeLevels = {};

        const adjacencyList = {};
        const inDegree = {};
        Object.keys(components).forEach(id => {
            adjacencyList[id] = [];
            inDegree[id] = 0;
        });

        processTopology(topology, adjacencyList, inDegree, edges, components);

        const queue = [];
        Object.keys(inDegree).forEach(nodeId => {
            if (inDegree[nodeId] === 0) {
                nodeLevels[nodeId] = 0;
                queue.push(nodeId);
            }
        });

        if (queue.length === 0) {
            const firstNodeId = Object.keys(components)[0];
            nodeLevels[firstNodeId] = 0;
            queue.push(firstNodeId);
        }

        while (queue.length > 0) {
            const currentNode = queue.shift();
            adjacencyList[currentNode].forEach(neighbor => {
                inDegree[neighbor]--;
                const newLevel = nodeLevels[currentNode] + 1;
                if (nodeLevels[neighbor] === undefined || newLevel > nodeLevels[neighbor]) {
                    nodeLevels[neighbor] = newLevel;
                }
                if (inDegree[neighbor] === 0) {
                    queue.push(neighbor);
                }
            });
        }

        Object.entries(components).forEach(([id, component]) => {
            nodes.push({
                id,
                name: component.name[0] || id,
                endpoint: component.endpoint || 'N/A',
                ip: component.ip || 'N/A',
                protocol: component.protocol || 'N/A',
                container_name: component.name,
                level: nodeLevels[id] || 0
            });
        });

        return { nodes, edges };
    }, [relationData]);

    // 预处理节点数据
    const { nodes, edges } = generateGraphData();
    
    // 高亮与节点相关的边
    const highlightRelatedEdges = useCallback((nodeId) => {
        if (!networkRef.current) return;
        
        const connectedEdges = networkRef.current.getConnectedEdges(nodeId);
        setGraphState(prev => ({
            ...prev,
            highlightedEdges: new Set(connectedEdges)
        }));
    }, []);

    // 预处理节点（添加高亮状态）
    const processedNodes = nodes.map(node => {
        const level = node.level || 0;
        
        const labelLines = [
            `服务：${node.name}`,
            `Endpotint: ${node.endpoint}`,
            `IP: ${node.ip}`,
            `Protocol: ${node.protocol}`
        ].filter(Boolean);
        
        return {
            ...node,
            label: labelLines.join('\n\n'),
            font: {
                useHTML: true,
                multi: true
            },
            color: {
                background: getLevelColor(level),
                highlight: {
                    background: getLevelColor(level) === '#f0f0f0' ? '#e0e0e0' : getLevelColor(level)
                }
            },
            borderWidth: graphState.selectedNode === node.id ? 3 : 0,  // 选中节点加边框
            borderColor: graphState.selectedNode === node.id ? '#ff9800' : undefined
        };
    });

    // 预处理边（添加高亮状态）
    const processedEdges = edges.map(edge => {
        const isHighlighted = graphState.highlightedEdges.has(edge.id);
        
        return {
            ...edge,
            color: {
                color: isHighlighted ? '#ff9800' : '#999',
                highlight: isHighlighted ? '#ff9800' : '#555'
            },
            width: isHighlighted ? 3 : 1,  // 高亮边加粗
            smooth: {
                type: 'curvedCW',
                roundness: 0.2
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
                direction: 'LR',
                sortMethod: 'directed',
                nodeSpacing: 180,
                levelSeparation: 500,
                treeSpacing: 200,
                startPosition: 'center'
            },
            randomSeed: 42
        },
        nodes: {
            shape: 'box',
            widthConstraint: { 
                maximum: 420,
                minimum: 180
            },
            borderWidth: 0,
            borderWidthSelected: 0,
            margin: 30,
            font: { 
                size: 12,
                color: '#fff', 
                align: 'center',
                multi: true,
                lineHeight: 2.0,
                useHTML: true
            },
            borderRadius: 10,
            shapeProperties: {
                interpolation: false,
                useBorderWithImage: false,
            }
        },
        edges: {
            width: 1,
            borderRadius: 20,
            color: { color: '#999', highlight: '#555' },
            arrows: { to: { enabled: true, scaleFactor: 0.8 } },
            font: {
                size: 10,
                color: '#666',
                strokeWidth: 0,
                align: 'top'
            },
            selectionWidth: 2,
            hoverWidth: 1.5
        },
        physics: {
            enabled: false,
            stabilization: { 
                enabled: true,
                iterations: 1000,
                fit: true
            }
        },
        interaction: {
            hover: true,
            selectConnectedEdges: true,
            tooltipDelay: 200,
            multiselect: false,
            zoomView: true,
            dragView: true
        },
        manipulation: { enabled: false }
    };

    // 事件处理
    const events = {
        select: useCallback((event) => {
            const { nodes, edges } = event;
            const selectedNode = nodes[0] || null;
            
            setGraphState(prev => ({
                ...prev,
                selectedNode,
                selectedEdge: edges[0] || null
            }));
            
            // 高亮相关边
            if (selectedNode) {
                highlightRelatedEdges(selectedNode);
            } else {
                setGraphState(prev => ({
                    ...prev,
                    highlightedEdges: new Set()
                }));
            }
        }, [highlightRelatedEdges]),
        
        doubleClick: useCallback((event) => {
            const { nodes } = event;
            if (nodes.length > 0) {
                const nodeId = nodes[0];
                const updatedNodes = [...processedNodes].map(node => {
                    if (node.id === nodeId) {
                        return { ...node, fixed: !node.fixed };
                    }
                    return node;
                });
                setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
            }
        }, [processedNodes]),
        
        stabilizationIterationsDone: useCallback(() => {
            setGraphState(prev => ({ ...prev, stabilized: true }));
        }, []),
        
        // 存储网络实例
        getNetwork: useCallback((network) => {
            networkRef.current = network;
        }, [])
    };

    // 控制函数
    const togglePhysics = useCallback(() => {
        setGraphState(prev => ({ ...prev, physicsEnabled: !prev.physicsEnabled }));
    }, []);

    const resetLayout = useCallback(() => {
        setGraphState(prev => ({ ...prev, physicsEnabled: true, stabilized: false }));
    }, []);

    const fixAllNodes = useCallback(() => {
        const updatedNodes = [...processedNodes].map(node => ({ ...node, fixed: true }));
        setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
    }, [processedNodes]);

    const unfixAllNodes = useCallback(() => {
        const updatedNodes = [...processedNodes].map(node => ({ ...node, fixed: false }));
        setGraphState(prev => ({ ...prev, nodes: updatedNodes }));
    }, [processedNodes]);

    return (
        <div className="graph-container" style={{ 
            height: '400px', 
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        }}>
            <Graph
                graph={{ nodes: processedNodes, edges: processedEdges }}
                options={options}
                events={events}
                getNetwork={events.getNetwork}
            />

            {/* 节点信息面板 */}
            {graphState.selectedNode !== null && (
                <div className="node-info-panel" style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    maxWidth: '250px',
                    zIndex: 100,
                    color: "black",
                    border: '1px solid #eee'
                }}>
                    <h3 className="font-bold mb-2" style={{ 
                        color: '#333', 
                        borderBottom: '1px solid #eee',
                        paddingBottom: '0.5rem'
                    }}>
                        节点详情
                    </h3>
                    <div className="space-y-2">
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.name && (
                            <div>
                                <span className="text-gray-500 text-sm" style={{ display: 'block' }}>名称:</span>
                                <div className="font-medium" style={{ marginBottom: '0.5rem' }}>
                                    {processedNodes.find(node => node.id === graphState.selectedNode)?.name}
                                </div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.container_name?.[0] && (
                            <div>
                                <span className="text-gray-500 text-sm" style={{ display: 'block' }}>容器名称:</span>
                                <div className="font-medium" style={{ marginBottom: '0.5rem' }}>
                                    {processedNodes.find(node => node.id === graphState.selectedNode)?.container_name[0]}
                                </div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.endpoint && (
                            <div>
                                <span className="text-gray-500 text-sm" style={{ display: 'block' }}>端点:</span>
                                <div className="font-medium" style={{ marginBottom: '0.5rem' }}>
                                    {processedNodes.find(node => node.id === graphState.selectedNode)?.endpoint}
                                </div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.ip && (
                            <div>
                                <span className="text-gray-500 text-sm" style={{ display: 'block' }}>IP地址:</span>
                                <div className="font-medium" style={{ marginBottom: '0.5rem' }}>
                                    {processedNodes.find(node => node.id === graphState.selectedNode)?.ip}
                                </div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.protocol && (
                            <div>
                                <span className="text-gray-500 text-sm" style={{ display: 'block' }}>协议:</span>
                                <div className="font-medium" style={{ marginBottom: '0.5rem' }}>
                                    {processedNodes.find(node => node.id === graphState.selectedNode)?.protocol}
                                </div>
                            </div>
                        )}
                        {processedNodes.find(node => node.id === graphState.selectedNode)?.level !== undefined && (
                            <div>
                                <span className="text-gray-500 text-sm" style={{ display: 'block' }}>层级:</span>
                                <div className="font-medium">
                                    {processedNodes.find(node => node.id === graphState.selectedNode)?.level}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* 控制面板 */}
            {/* <div className="graph-controls" style={{
                position: 'absolute',
                bottom: 10,
                left: 10,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 100,
                display: 'flex',
                gap: '0.5rem'
            }}>
                <button 
                    onClick={togglePhysics}
                    className="control-btn"
                    style={{
                        padding: '0.3rem 0.6rem',
                        background: graphState.physicsEnabled ? '#4CAF50' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {graphState.physicsEnabled ? '禁用物理' : '启用物理'}
                </button>
                <button 
                    onClick={resetLayout}
                    className="control-btn"
                    style={{
                        padding: '0.3rem 0.6rem',
                        background: '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    重置布局
                </button>
            </div> */}
        </div>
    );
};

export default GraphVisualization;