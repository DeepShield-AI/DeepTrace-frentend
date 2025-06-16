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
    DatePicker
} from 'antd'
import * as echarts from 'echarts';
import axios from 'axios';
const $ = require('jquery')
import {data} from "./data.js"

import { Line } from '@ant-design/charts';

import Chart1 from './component/chart1.tsx';
import OrgChartTree from './component/d3Tree.tsx';
import Chart2 from './components/chart2.tsx';
import Chart3 from './components/chart3.tsx';
import Chart4 from './component/chart4.tsx'
import LineChart from './component/lineChart.tsx';
// import Chart4 from './components/chart4.tsx';
// import Chart5 from './components/chart5.tsx';
// import Chart6 from './components/chart6.tsx';



// import Chart3 from './components/chart3.tsx';
// import BaseMontor from './components/BaseMontor'
// import TriggerMonitor from './components/triggerMonitor';
// import './index.less'
// import {SECURITY_CARD_DATA} from '../../mock.ts'
const { RangePicker } = DatePicker;

const options = [];
for (let i = 10; i < 36; i++) {
  options.push({
    value: i.toString(36) + i,
    label: i.toString(36) + i,
  });
}

const Monitor = () => {

    const [cardList, setCardList] = useState([
        {title: "指标值1", value: "1,200", status: 1},
        {title: "指标值2", value: "1,200", status: 2},
        {title: "指标值3", value: "1,200", status: 3},
        {title: "指标值4", value: "1,200", status: 4},
    ])

    const [isSearchLoading, setIsSearchLoading] = useState(false)

    const renderConfigCard = (config) => {
        return (
            <ProCard colSpan={4} style={{ 
                height: 100, 
                marginTop: 10,
                // alignItems:'center', 
                // justifyContent: 'center' 
            }} >
                <div>{config.title}</div>
                <div style={{fontSize: 20, fontWeight: 500}}>{config.value}</div>
            </ProCard>
        )
    }

    // useEffect(() => {
    //     var ROOT_PATH = 'https://echarts.apache.org/examples';
    //     type EChartsOption = echarts.EChartsOption;

    //     var chartDom = document.getElementById('main')!;
    //     var myChart = echarts.init(chartDom);
    //     var option: EChartsOption;

    //     myChart.showLoading();
    //     // $.get(ROOT_PATH + '/data/asset/data/flare.json', function (data) {
    //     myChart.hideLoading();
        

    //     data.children.forEach(function (
    //         datum: { collapsed: boolean },
    //         index: number
    //     ) {
    //         index % 2 === 0 && (datum.collapsed = true);
    //     });

    //     myChart.setOption(
    //         (option = {
    //         tooltip: {
    //             trigger: 'item',
    //             triggerOn: 'mousemove'
    //         },
    //         series: [
    //             {
    //             type: 'tree',

    //             data: [data],

    //             top: '1%',
    //             left: '7%',
    //             bottom: '1%',
    //             right: '20%',

    //             symbolSize: 7,

    //             label: {
    //                 position: 'left',
    //                 verticalAlign: 'middle',
    //                 align: 'right',
    //                 fontSize: 9
    //             },

    //             leaves: {
    //                 label: {
    //                 position: 'right',
    //                 verticalAlign: 'middle',
    //                 align: 'left'
    //                 }
    //             },

    //             emphasis: {
    //                 focus: 'descendant'
    //             },

    //             expandAndCollapse: true,
    //             animationDuration: 550,
    //             animationDurationUpdate: 750
    //             }
    //         ]
    //         })
    //     );
    //     // });

    //     option && myChart.setOption(option);
    // }, [])

    const renderCards = (item) => {
        let color
        switch(item.status) {
            case 1: 
                color = "#28a745"
                break;
            case 2:
                color = "#ffc107"
                break;
            case 3:
                color = "#dc3545"
                break;
            case 4:
                color = "#adb5bd"
                break;
        }
        return (
            <ProCard colSpan={6} style={{ height: 200, padding: 0 }} title={item.title}>
                <div
                    style={{
                        fontSize: 20,
                        fontWeight: 600,
                        height: "100%",
                        background: color,
                        borderRadius: 20,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}
                >
                    {item.value}
                </div>
            </ProCard>
        )
    }

    const handleChange = (value: string) => {
        console.log(`selected ${value}`);
      };
    const onChange = (value: string) => {
    console.log(`selected ${value}`);
    };
    const onSearch = (value: string) => {
    console.log('search:', value);
    };
    const handleSearchButton = () => {
        setIsSearchLoading(true)

        setTimeout(() => {
            setIsSearchLoading(false)
        }, 2000)
    }

    return (
        <PageContainer
            content="集群节点健康度"
        >
            <ProCard direction="column" ghost gutter={[0, 16]}>
                {/* part1 节点图*/}
                
                {/* <ProCard gutter={16} title="关系树">
                    <OrgChartTree></OrgChartTree>
                </ProCard> */}
                {/* part2 */}
                <ProCard gutter={16} title="节点径向关系树">
                    <Chart4></Chart4>
                </ProCard>
                
                <ProCard ghost gutter={16}>
                        <ProCard>
                            <RangePicker></RangePicker>
                            <Select
                                showSearch
                                placeholder="选择一个关注的服务节点"
                                optionFilterProp="label"
                                onChange={onChange}
                                onSearch={onSearch}
                                style={{width: 300, marginLeft: 40}}
                                options={[
                                {
                                    value: 'node1',
                                    label: 'node1',
                                },
                                {
                                    value: 'node2',
                                    label: 'node2',
                                },
                                {
                                    value: 'node3',
                                    label: 'node3',
                                },
                                ]}
                            />
                            
                            <Button
                                type="primary"
                                // icon={<PoweroffOutlined />}
                                loading={isSearchLoading}
                                onClick={() => handleSearchButton()}
                                style={{marginLeft: 40}}
                            >
                                筛选
                            </Button>
                        </ProCard>
                </ProCard>
                <ProCard gutter={16} ghost>
                    <ProCard style={{height: 440}}>
                        {/* <div id="main" style={{height: 200}}></div> */}
                        <LineChart></LineChart>
                    </ProCard>
                    {/* <ProCard style={{height: 250}}>
                        <div style={{display: 'flex', flexDirection: 'column',gap: 30, justifyContent: 'space-around'}}>
                            <Select
                                showSearch
                                placeholder="选择一个点指标"
                                optionFilterProp="label"
                                onChange={onChange}
                                onSearch={onSearch}
                                style={{width: 300}}
                                options={[
                                {
                                    value: 'jack',
                                    label: 'Jack',
                                },
                                {
                                    value: 'lucy',
                                    label: 'Lucy',
                                },
                                {
                                    value: 'tom',
                                    label: 'Tom',
                                },
                                ]}
                            />
                            <Select
                                showSearch
                                placeholder="选择一个边指标"
                                optionFilterProp="label"
                                onChange={onChange}
                                onSearch={onSearch}
                                style={{width: 300}}
                                options={[
                                {
                                    value: 'jack',
                                    label: 'Jack',
                                },
                                {
                                    value: 'lucy',
                                    label: 'Lucy',
                                },
                                {
                                    value: 'tom',
                                    label: 'Tom',
                                },
                                ]}
                            />
                            <Select
                                showSearch
                                placeholder="选择组件Tag"
                                optionFilterProp="label"
                                onChange={onChange}
                                onSearch={onSearch}
                                style={{width: 300}}
                                options={[
                                {
                                    value: 'jack',
                                    label: 'Jack',
                                },
                                {
                                    value: 'lucy',
                                    label: 'Lucy',
                                },
                                {
                                    value: 'tom',
                                    label: 'Tom',
                                },
                                ]}
                            />
                        </div>
                        <div style={{marginTop: 30, display: 'flex', justifyContent: 'flex-end'}}>
                            
                            <Button
                                type="primary"
                                // icon={<PoweroffOutlined />}
                                loading={isSearchLoading}
                                onClick={() => handleSearchButton()}
                            >
                                Click me!
                            </Button>
                        </div>
                    </ProCard> */}
                </ProCard>
                {/* <ProCard gutter={16} ghost>
                    <ProCard colSpan={8} style={{ height: 300, padding: 0 }} title={" "} >
                            <div>
                                <span>图表筛选项1</span>
                                <Select
                                    mode="tags"
                                    size={"middle"}
                                    placeholder="Please select"
                                    defaultValue={['a10', 'c12']}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                    }}
                                    options={options}
                                />
                            </div>
                            <div style={{
                                marginTop: 30
                            }}>
                                <span>图表筛选项2</span>
                                <Select
                                    mode="tags"
                                    size={"middle"}
                                    placeholder="Please select"
                                    defaultValue={['a10', 'c12']}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                    }}
                                    options={options}
                                />
                            </div>
                    </ProCard>
                    <ProCard colSpan={16} style={{ height: 300, padding: 0 }} title={"panel"} >
                        <Chart1></Chart1>
                    </ProCard>
                </ProCard> */}
            </ProCard>
        </PageContainer>
    )
}

export default Monitor