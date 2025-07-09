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
    Card,
    Descriptions,
    Image
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
import { convertToGraphStructure } from '@/utils/convert2graph.js';

import { CodeBlock } from 'react-code-blocks';

import FlameGraph from "./component/flame.jsx";
import FlameGraph2 from "./component/flame2.jsx";

import GraphVisEGraphVisualizationxample from './component/dig-visualization/index.jsx';

import {SPAN_OBJ_LIST} from "../../constant"
import introImg from "../../assets/images/introduce.png"



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
const items = [
    {
      key: '1',
      label: 'Product',
      children: 'Cloud Database',
    },
    {
      key: '2',
      label: 'Billing Mode',
      children: 'Prepaid',
    },
    {
      key: '3',
      label: 'Automatic Renewal',
      children: 'YES',
    },
    {
      key: '4',
      label: 'Order time',
      children: '2018-04-24 18:00:00',
    },
    {
      key: '5',
      label: 'Usage Time',
      children: '2019-04-24 18:00:00',
    },
  ];
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
          search: false
        },
        {
          title: 'serverIp',
          dataIndex: 'serverIp',
        },
        {
            title: 'serverPort',
            dataIndex: 'serverPort',
            search: false
        },
        {
            title: 'duration',
            dataIndex: 'e2eDuration',
            render: (_) => {
                return `${_} ms`
            },
            search: false
        },
        {
            title: 'protocol',
            dataIndex: 'protocol',
            search: {
                el: "select",
                props: {
                    options: [
                        {label: "Thrift", value: "Thrift"},
                        {label: "Thrift", value: "Thrift"}
                    ]
                }
            }
        },
        {
          title: 'statusCode',
          dataIndex: 'statusCode',
          search: false
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
              <Space size="middle">
                <a onClick={() => {
                    getFlamegraphDataByTraceIdFun(record.traceId)
                }}>详情</a>
              </Space>
            ),
            search:false
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
    const [descriptionData, setDescriptionData] = useState([])
    const [graphData, setGraphData] = useState({})
    const [value, setValue] = useState();
    const [pagination, setPagination] = useState({
        current: 1,       // 当前页码
        pageSize: 10,     // 每页条数
        total: 0,         // 总记录数
    });
    const onChange = (newValue) => {
        setValue(newValue);
    };
    const onPopupScroll = (e) => {
        console.log('onPopupScroll', e);
    };

    

    const onSelectChange = (newSelectedRowKeys) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };

    const getFlamegraphDataByTraceIdFun = async (traceId) => {
        const res = await getFlamegraphDataByTraceId(traceId)
        const spansList = res?.data?.records
        const spans = spansList.map((spans_ori) => {
            return {
            ...spans_ori.metric,
            ...spans_ori.content,
            ...spans_ori.context,
            ...spans_ori.tag.ebpf_tag
            }
        })
        const spansTree = transformToTree(spans)
        setFlameTreeData(spansTree)

        // const graphData = convertToGraphStructure(spans)
        setGraphData(convertToGraphStructure(spans))
        
    }

    const getDistributeTableDataFun = async (data) => {
        setIsDistributeTableLoading(true)
        try {
            const res =  await getDistributeTableData({
                page: data.current || pagination.current,
                pageSize: data.pageSize || pagination.pageSize,
                // traceId: "26c2443cc01b783f",
                protocol: "Thrift"
            })
            const list = res?.data?.records
            setPagination({
                ...pagination,
                current: data.current || pagination.current,
                total: res?.data?.total
            })
            setDistributeTableDataSource(list)
            
        } catch (error) {
            console.error("==error==", error)
        } finally {
            setIsDistributeTableLoading(false)
        }
    }

    const setDescriptionDataBySpanId = (clickObj) => {
        if(!clickObj) {
            setDescriptionData([])
            return
        }
        const spanList = []
        Object.keys(clickObj).map(key => {
            if(SPAN_OBJ_LIST.indexOf(key) !== -1) {
                spanList.push({
                    label: key,
                    children: clickObj[key]
                })
            }
        })        
        setDescriptionData(spanList)
    }

    const handlePageChange = (pageParam) => {        
        // 保留当前分页参数，仅更新变化的部分
        setPagination({
            ...pagination,
            current: pageParam.current,
            pageSize: pageParam.pageSize,
        });
        
        // 重新加载数据
        getDistributeTableDataFun(pageParam);
    }
    return (
        <PageContainer
            content="调用链追踪"
        >
            <ProCard direction="column" ghost gutter={[0, 16]}>
                <ProCard collapsible>
                    <ProCard>   
                        <text style={{fontSize:16}}>
                            SocialNetwork is an end-to-end microservice in DeathStarBench with similar functionality to Twitter or Facebook to share posts, follow friends, view the followed posts, and browse the homepages of others. It consists of 26 individual services, including Nginx as the web server, tens of Thrift microservices for processing business logic, Memcached and Redis for caching, MongoDB for persistent storage, and RebbitMQ for asynchronous messaging. We load the system with Socfb-Reed98 Facebook social network dataset [60] as the social graph and use wrk2 [1] as the HTTP workload generator. Among all APIs, ComposePost has the most complex trace graph, with 31 spans in total and a max depth of nine.
                        </text>
                    </ProCard>
                    <Image 
                        src={introImg}
                        style={{
                            width: "100%",
                            borderRadius: "20px"
                        }}
                        >
                    </Image>
                </ProCard>
                <ProCard gutter={16} title="Trace记录">
                    <ProTable 
                        // rowSelection={rowSelection} 
                        request={async (params, sorter, filter) => {
                            // 表单搜索项会从 params 传入，传递给后端接口。
                            console.log(params, sorter, filter, "aaa-----");
                            // return Promise.resolve({
                            // data: tableListDataSource,
                            // success: true,
                            // });
                            try {
                                const res =  await getDistributeTableData({
                                    ...params,
                                    page: params.current || pagination.current,
                                    pageSize: params.pageSize || pagination.pageSize,
                                    // traceId: "26c2443cc01b783f",
                                    // protocol: "Thrift"
                                })
                                const list = res?.data?.records
                                setPagination({
                                    ...pagination,
                                    current: params.current || pagination.current,
                                    total: res?.data?.total
                                })
                                setDistributeTableDataSource(list)
                                return list
                            } catch (error) {
                                console.error("==error==", error)
                            } finally {
                                setIsDistributeTableLoading(false)
                            }
                        }}
                        columns={columns} 
                        dataSource={distributeTabledDataSource} 
                        pagination={pagination}
                        search={{
                            optionRender: false,
                            collapsed: false,
                        }}
                        // onLoad={isDistributeTableLoading}
                        // pagination={{
                        //     showQuickJumper: true,
                        // }}
                        // size="small"
                        // loading={isDistributeTableLoading}
                        // onChange={handlePageChange}
                    />
                </ProCard>
                <ProCard style={{
                    maxHeight: 400,
                    // minHeight: 300
                }}>
                    {
                        graphData?.nodes && graphData?.edges ? 
                        <GraphVisEGraphVisualizationxample
                            nodes={graphData.nodes}
                            edges={graphData.edges}
                        ></GraphVisEGraphVisualizationxample> :
                        <div style={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center"
                        }}>
                            
                            <Card
                            >
                                <h2>选择trace以查看有向无环图</h2>
                            </Card>
                        </div>
                    }
                    
                </ProCard>
                <ProCard>
                    {
                        flameTreeData.length ? 
                        
                        <ProCard>
                            <ProCard colSpan={17}>
                                <FlameGraph 
                                    data={flameTreeData} 
                                    width={800} 
                                    height={400}
                                    onClick={(node) => {
                                        // console.log(node?.children[0]);
                                        // const clickObj = node?.children[0]
                                        // 点击节点添加到右边的列表
                                        setDescriptionDataBySpanId(node)
                                        console.log('点击节点:', node)
                                    }}
                                />
                            </ProCard>
                            <ProCard colSpan={7}>
                                {
                                    descriptionData?.length ? 
                                        <Descriptions 
                                            size='small' 
                                            title="Span Info" 
                                            layout="vertical"  
                                            items={descriptionData} 
                                            bordered
                                        /> : 
                                        <Card
                                        >
                                            <h2>点击火焰图查看Span详情</h2>
                                        </Card>
                                }
                            </ProCard>
                        </ProCard>
                        :
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
                {/* <ProCard gutter={16} title="JSON">
                    <CodeBlock
                        language="javascript" // 指定代码语言
                        text={codeString}
                        showLineNumbers // 是否显示行号（这是一个布尔属性，不需要赋值）
                        />
                </ProCard> */}
            </ProCard>
        </PageContainer>
    )
}

export default Monitor