import React, { useEffect, useRef, useState } from 'react';
import {
    FooterToolbar,
    ModalForm,
    PageContainer,
    ProDescriptions,
    ProFormText,
    ProFormTextArea,
    ProTable,
    ProCard
  } from '@ant-design/pro-components';
import {
    Select,
    Button,
    Table,
    TreeSelect,
    Space,
    Card
} from 'antd'
import * as echarts from 'echarts';
import axios from 'axios';
const $ = require('jquery')
import {data, treeData} from "./data.js"
import OrgChartTree from './component/d3Tree.tsx';


import { Line } from '@ant-design/charts';

import Chart1 from './component/chart1.tsx';
// import FlameGraph from './component/flamegraph.js';
import Flamegraph from './component/flamegraph.js'
import stacks from "./stack.json"
import testStacks from "./testStack.json"
import testStack2 from "./testStack2.json"
import {transformToTree} from "../../utils/span2tree.js"

import { CodeBlock } from 'react-code-blocks';

import FlameGraph from "./component/flame.jsx";
import FlameGraph2 from "./component/flame2.jsx";


// 请求方法
import { getDistributeTableData, getFlamegraphDataByTraceId } from "../../services/server.js"
import { render } from '@testing-library/react';
const codeString = `
const data = {
    {
        traceId: '1a2b3c4d',
        server: 'productcatalogservice',
        client: 'recommendationservice-7fdcbbf66c-prdcs',
        protocol: 'HTTP2',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'otel-agent-scdrw',
        client: 'checkoutservice-7f69d98578-rk5fc',
        protocol: 'HTTP2',
        latency: '467μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'otel-agent',
        client: 'paymentservice-6df5f8595f-8pjtm',
        protocol: 'HTTP2',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'shippingservice-686df85ddc-csvx9',
        client: 'frontend-7b49dcdd95-mrvqx',
        protocol: 'gRPC',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'productcatalogservice-69948c768c-qnls5',
        client: 'recommendationservice-7fdcbbf66c-prdcs',
        protocol: 'gRPC',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: '169.254.25.10',
        client: 'frontend-7b49dcdd95-mrvqx',
        protocol: 'DNS',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: '169.254.25.10',
        client: 'frontend-7b49dcdd95-mrvqx',
        protocol: 'DNS',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'productcatalogservice',
        client: 'recommendationservice-7fdcbbf66c-prdcs',
        protocol: 'HTTP2',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: '0.0.0.0',
        client: 'frontend-7b49dcdd95-mrvqx',
        protocol: 'gRPC',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'otel-agent-4n555',
        client: 'productcatalogservice-69948c768c-qnls5',
        protocol: 'gRPC',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: '169.254.25.10',
        client: 'checkoutservice-7f69d98578-rk5fc',
        protocol: 'DNS',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },
    {
        traceId: '1a2b3c4d',
        server: 'paymentservice-6df5f8595f-8pjtm',
        client: 'checkoutservice-7f69d98578-rk5fc',
        protocol: 'gRPC',
        latency: '367μs',
        clienterror: '0%',
        servererror: '0%',
        time: '20250101'
    },

}
 `;

const options = [];
for (let i = 10; i < 36; i++) {
  options.push({
    value: i.toString(36) + i,
    label: i.toString(36) + i,
  });
}

const Monitor = () => {


    const columns = [
        {
          title: 'traceId',
          dataIndex: 'traceId',
        },
        {
          title: 'clientIp',
          dataIndex: 'clientIp',
        },
        {
          title: 'clientPort',
          dataIndex: 'clientPort',
        },
        {
          title: 'serverIp',
          dataIndex: 'serverIp',
        },
        {
            title: 'serverPort',
            dataIndex: 'serverPort'
        },
        {
            title: 'duration',
            dataIndex: 'e2eDuration',
            render: (_) => {
                return `${_} ms`
            }
        },
        {
            title: 'protocol',
            dataIndex: 'protocol'
        },
        {
          title: 'statusCode',
          dataIndex: 'statusCode',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
              <Space size="middle">
                <a onClick={() => {
                    getFlamegraphDataByTraceIdFun(record.traceId)
                }}>Flame Graph Component</a>
              </Space>
            ),
          },
      ];

    const [cardList, setCardList] = useState([
        {title: "指标值1", value: "1,200", status: 1},
        {title: "指标值2", value: "1,200", status: 2},
        {title: "指标值3", value: "1,200", status: 3},
        {title: "指标值4", value: "1,200", status: 4},
    ])
    const [isDistributeTableLoading, setIsDistributeTableLoading] = useState(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [distributeTabledDataSource, setDistributeTableDataSource] = useState([])
    const [flameTreeData, setFlameTreeData] = useState([])
    const [value, setValue] = useState();
    const onChange = (newValue) => {
        setValue(newValue);
    };
    const onPopupScroll = (e) => {
        console.log('onPopupScroll', e);
    };

    

    const onSelectChange = (newSelectedRowKeys) => {
        console.log('selectedRowKeys changed: ', newSelectedRowKeys);
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    useEffect(() => {
        // console.log("resres");
        // getFlamegraphDataByTraceIdFun(traceId)
        // 请求表格数据
        getDistributeTableDataFun({
            page: 1,
            pageSize: 10
        })
        
    }, [])

    const getFlamegraphDataByTraceIdFun = async (traceId) => {
        const res = await getFlamegraphDataByTraceId(traceId)
        const spans = res?.data?.records
        console.log(spans, "rrrrr");
        const spansTree = transformToTree(spans)
        console.log(spansTree, testStacks, "rrr");
        setFlameTreeData(spansTree)
        
    }

    const getDistributeTableDataFun = async (data) => {
        setIsDistributeTableLoading(true)
        try {
            const res =  await getDistributeTableData(data)
            const list = res?.data?.records
            console.log(list, "lll");
            setDistributeTableDataSource(list)
            
        } catch (error) {
            console.error("==error==", error)
        } finally {
            setIsDistributeTableLoading(false)
        }
    }
    return (
        <PageContainer
            content="集群节点健康度"
        >
            <ProCard direction="column" ghost gutter={[0, 16]}>
                <ProCard gutter={16} title="集群Trace记录">
                    <Table 
                        // rowSelection={rowSelection} 
                        columns={columns} 
                        dataSource={distributeTabledDataSource} 
                        pagination={{
                            position: ["topLeft"],
                        }}
                        size="small"
                        loading={isDistributeTableLoading}
                        
                    />
                </ProCard>
                <ProCard>
                    {
                        flameTreeData.length ? 
                        <FlameGraph 
                            data={flameTreeData} 
                            width={900} 
                            height={500}
                            onClick={(node) => console.log('点击节点:', node)}
                        /> :
                        <div style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            
                            <Card
                            >
                                <h2>选择trace以查看火焰图</h2>
                            </Card>
                        </div>

                    }
                </ProCard>
                {/* <ProCard gutter={16} title="Trace flame graph">
                    <ProCard  style={{height: 420}}>
                        <svg width={1280} height={420}>
                            <Flamegraph data={stacks} width={1280} enableClick />
                        </svg>                    
                    </ProCard>
                </ProCard> */}
                <ProCard gutter={16} title="JSON">
                    {/* <Live scope={scope} code={codeString} /> */}
                    <CodeBlock
                        language="javascript" // 指定代码语言
                        text={codeString}
                        showLineNumbers // 是否显示行号（这是一个布尔属性，不需要赋值）
                        />
                </ProCard>
            </ProCard>
        </PageContainer>
    )
}

export default Monitor