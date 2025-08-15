function convertToGraphStructure(data) {
    // 用于存储节点ID映射，确保每个span_id对应唯一的数字ID
    const spanIdToNodeId = {};
    // 节点计数器
    let nodeIdCounter = 1;
    // 存储节点数据
    const nodes = [];
    // 存储边数据
    const edges = [];
    
    // 第一步：处理所有节点数据
    data?.forEach(item => {
        const { span_id, component, endpoint } = item;
        
        // 为span_id分配唯一的数字ID
        if (!spanIdToNodeId[span_id]) {
            spanIdToNodeId[span_id] = nodeIdCounter++;
        }
        
        // 创建节点对象
        nodes.push({
            id: spanIdToNodeId[span_id],
            label: component,
            title: endpoint,
            ...item
        });
        
        // 处理父节点关系
        const parentId = item.parent_id;
        if (parentId) {
            // 为父节点分配唯一的数字ID（如果尚未分配）
            if (!spanIdToNodeId[parentId]) {
                spanIdToNodeId[parentId] = nodeIdCounter++;
            }
            
            // 创建边对象
            edges.push({
                from: spanIdToNodeId[parentId],
                to: spanIdToNodeId[span_id],
                label: `${component} -> ${item.component}`
            });
        }
    });
    
    // 返回图结构对象
    return {
        nodes,
        edges
    };
}


export {
    convertToGraphStructure
}