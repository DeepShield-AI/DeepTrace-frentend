function transformToTree(spans) {
    // 创建一个映射表，用于快速查找节点
    const map = new Map();
    
    // 第一步：创建所有节点并放入映射表，保留原始字段
    // const spans = spansList.map((spans_ori) => {
    //     return {
    //     ...spans_ori.metric,
    //     ...spans_ori.content,
    //     ...spans_ori.context,
    //     ...spans_ori.tag.ebpf_tag
    //     }
    // })
    spans?.forEach(span => {
        const node = {
            name: span?.endpoint,
            value: span?.duration || 1, // 使用duration作为value，如果没有则默认为1
            // value: span.dst_port || 1, // 使用duration作为value，如果没有则默认为1
            children: [],
            ...span // 保留原始span的所有字段
        };
        map.set(span.span_id, node);
    });
    
    
    // 第二步：构建树结构
    spans?.forEach(span => {        
        const node = map.get(span.span_id);
        if (!node) return;
        
        // 处理子节点
        (span.child_ids || []).forEach(childId => {
            const childNode = map.get(childId);
            if (childNode) {
                node.children.push(childNode);
            }
        });
    });
    
    // 第三步：找到根节点（parent_id为null或不存在于span_id中的节点）
    const rootNodes = [];
    spans?.forEach(span => {
        if (span.parent_id === null || !map.has(span.parent_id)) {
            const rootNode = map.get(span.span_id);
            if (rootNode) {
                rootNodes.push(rootNode);
            }
        }
    });
    
    // 如果没有找到根节点，创建一个虚拟根节点
    if (rootNodes.length === 0) {
        return [{
            name: "root",
            value: 0,
            children: []
        }];
    }
    
    // 如果有多个根节点，也创建一个虚拟根节点
    if (rootNodes.length > 1) {
        return [{
            name: "root",
            value: rootNodes.reduce((sum, node) => sum + (node.value || 0), 0),
            children: rootNodes
        }];
    }
    
    // 只有一个根节点，直接返回
    return [{
        name: "root",
        value: rootNodes[0].value || 0,
        children: [rootNodes[0]]
    }];
}


export {
    transformToTree
}