import React, { useRef, useState } from 'react';
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
    DatePicker,
    Radio
} from 'antd'
import { Line } from '@ant-design/charts';
import Chart1 from './components/chart1.tsx';
import Chart2 from './components/chart2.tsx';
import Chart3 from './components/chart3.tsx';
// import Chart4 from './components/chart4.tsx';
// import Chart5 from './components/chart5.tsx';
// import Chart6 from './components/chart6.tsx';



// import Chart3 from './components/chart3.tsx';
// import BaseMontor from './components/BaseMontor'
// import TriggerMonitor from './components/triggerMonitor';
// import './index.less'
// import {SECURITY_CARD_DATA} from '../../mock.ts'

    
const { RangePicker } = DatePicker;

const Monitor = () => {

    const [cardList, setCardList] = useState([
        {title: "指标值1", value: "1,200", status: 1},
        {title: "指标值2", value: "1,200", status: 2},
        {title: "指标值3", value: "1,200", status: 3},
        {title: "指标值4", value: "1,200", status: 4},
    ])

    const [chartListTop, setChartListTop] = useState([
        {title: "接收/处理用户请求个数", type: "line1", status: "warn"},
        {title: "用户请求平均/90/95/99处理延时", type: "line2", status: "abnormal"},
        {title: "异常（如超时等）用户请求个数", type: "line1", status: "normal"},

    ])

    const [chartListBottom, setChartListBottom] = useState([
        {title: "发送/接收字节总数", type: "line2", status: "abnormal"},
        {title: "发送/接收packet总数", type: "line1", status: "normal"},
        {title: "平均/90/95/99发送/接收packet长度", type: "line1", status: "normal"},
        {title: "TCP建联失败次数", type: "stack", status: "abnormal"},
        {title: "TCP传输失败次数", type: "stack", status: "warn"},
        {title: "发送/接收segment总数", type: "line1", status: "normal"},
        {title: "平均/90/95/99发送/接收segment长度", type: "line2", status: "abnormal"},
        {title: "平均/90/95/99 RTT", type: "line2", status: "normal"},
        {title: "平均/90/95/99 组件发送消息长度", type: "line1", status: "warn"},
        {title: "平均/90/95/99 组件间响应延时", type: "line1", status: "abnormal"},
        {title: "出现请求超时组件个数", type: "line1", status: "warn"},
        {title: "接收/处理用户请求个数", type: "line2", status: "normal"},
        {title: "接收/处理用户请求个数", type: "line2", status: "abnormal"},
    ])

    const [status, setStatus] = useState("normal")

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

    const renderChartByType = (type) => {
        switch(type){
            case "line1":
                return <Chart1></Chart1>
            case "line2":
                return <Chart3></Chart3>
            case "stack":
                return <Chart2></Chart2>
        }
    }

    const handleStatusChange = (e) => {
        const newTopList = chartListTop.filter(item => {
            return item.status == e.target.value 
        })
        console.log(newTopList, "-----====");
        
        const newBottomList = chartListBottom.filter(item => {
            return item.status == e.target.value
        })

        setChartListTop(newTopList)
        setChartListBottom(newBottomList)
        setStatus(e.target.value)
    }
    return (
        
        <PageContainer
            // content="集群节点健康度"
        >
            <div
                style={{marginBottom: 20}}
            >
                
                <Radio.Group value={status} onChange={handleStatusChange}>
                    <Radio.Button value="warn">warn</Radio.Button>
                    <Radio.Button value="normal">normal</Radio.Button>
                    <Radio.Button value="abnormal">abnormal</Radio.Button>
                </Radio.Group>
                <Select
                    showSearch
                    placeholder="输入搜索的图表"
                    optionFilterProp="label"
                    onChange={onChange}
                    onSearch={onSearch}
                    options={[
                    {label: "接收/处理用户请求个数", value: "line1", status: "warn"},
                    {label: "用户请求平均/90/95/99处理延时", value: "line2", status: "abnormal"},
                    {label: "异常（如超时等）用户请求个数", value: "line1", status: "normal"},
                    {label: "发送/接收字节总数", value: "line2", status: "abnormal"},
                    {label: "发送/接收packet总数", value: "line1", status: "normal"},
                    {label: "平均/90/95/99发送/接收packet长度", value: "line1", status: "normal"},
                    {label: "发送/接收segment总数", value: "line1", status: "normal"},
                    {label: "平均/90/95/99发送/接收segment长度", value: "line2", status: "abnormal"},
                    {label: "平均/90/95/99 RTT", value: "line2", status: "normal"},
                    {label: "TCP建联失败次数", value: "stack", status: "abnormal"},
                    {label: "TCP传输失败次数", value: "stack", status: "warn"},
                    {label: "平均/90/95/99 组件发送消息长度", value: "line1", status: "warn"},
                    {label: "平均/90/95/99 组件间响应延时", value: "line1", status: "abnormal"},
                    {label: "出现请求超时组件个数", value: "line1", status: "warn"},
                    {label: "接收/处理用户请求个数", value: "line2", status: "normal"},
                    {label: "接收/处理用户请求个数", value: "line2", status: "abnormal"},

                    ]}
                />
            </div>
            <div style={{
                background: "#397ED7",
                height: 40,
                lineHeight: "40px",
                paddingLeft: 10,
                borderRadius: 10,
                // lineHeight: 40,
                fontSize: 20,
                // color: "#000000"
            }}>
                用户关键性能指标
            </div>
            <ProCard direction="row" ghost gutter={[16, 16]} wrap={true} style={{gap: 10}}>
                {/* <ProCard gutter={16} ghost wrap={true} direction={"column"}> */}
                    {chartListTop.map(item => {
                        return (
                            <ProCard
                                title={item.title}
                                style={{ height: 300}}
                                colSpan={8}
                                headerBordered={true}

                            >
                                {
                                    renderChartByType(item.type)
                                }
                                {/* <Chart1></Chart1> */}
                            </ProCard>
                        )
                    })}
                {/* </ProCard> */}
            </ProCard>

            
            <div style={{
                background: "#397ED7",
                height: 40,
                lineHeight: "40px",
                paddingLeft: 10,
                borderRadius: 10,
                // lineHeight: 40,
                fontSize: 20,
                // color: "#000000"
            }}>
                业务关键性能指标
            </div>
            <ProCard direction="row" ghost gutter={[16, 16]} wrap={true} style={{gap: 10}}>
                {/* <ProCard gutter={16} ghost wrap={true} direction={"column"}> */}
                    {chartListBottom.map(item => {
                        return (
                            <ProCard
                                title={item.title}
                                style={{ height: 300}}
                                colSpan={8}
                                headerBordered={true}

                            >
                                {
                                    renderChartByType(item.type)
                                }
                            </ProCard>
                        )
                    })}
                {/* </ProCard> */}
            </ProCard>
        </PageContainer>


        // <PageContainer
        //     content="集群节点健康度"
        // >
        //     <ProCard direction="column" ghost gutter={[0, 16]}>
        //         <ProCard gutter={16} ghost>
        //             <ProCard colSpan={24} style={{padding: 0 }}>
        //                 <RangePicker showTime />
        //             </ProCard>
        //         </ProCard>
        //         {/* part1 */}
        //         {/* part2 */}
        //         <ProCard gutter={16} ghost>
        //             {
        //                 cardList.map(item => {
        //                     return (
        //                         renderCards(item)
        //                     )
        //                 })
        //             }
        //         </ProCard>
        //         <ProCard gutter={16} ghost>
        //             <ProCard colSpan={24} style={{ height: 100, padding: 0 }} title={"标识选择"} >
        //                 <div>
        //                     <Select
        //                         style={{ width: 300 }}
        //                         onChange={handleChange}
        //                         placeholder={"请选择筛选项"}
        //                         options={[
        //                             { value: 'jack', label: 'Jack' },
        //                             { value: 'lucy', label: 'Lucy' },
        //                             { value: 'Yiminghe', label: 'yiminghe' },
        //                             { value: 'disabled', label: 'Disabled', disabled: true },
        //                         ]}
        //                     />
        //                     <Select
        //                         style={{ width: 300, marginLeft: 50 }}
        //                         onChange={handleChange}
        //                         placeholder={"请选择筛选项"}
        //                         options={[
        //                             { value: 'jack', label: 'Jack' },
        //                             { value: 'lucy', label: 'Lucy' },
        //                             { value: 'Yiminghe', label: 'yiminghe' },
        //                             { value: 'disabled', label: 'Disabled', disabled: true },
        //                         ]}
        //                     />
        //                 </div>
        //             </ProCard>
        //         </ProCard>
        //         <ProCard gutter={16} ghost>
        //             <ProCard colSpan={8} style={{ height: 300, padding: 0 }} title={" "}>
                            
        //                     <div>
        //                         <span>图表筛选项1</span>
        //                         <Select
        //                             style={{ width: 300 }}
        //                             onChange={handleChange}
        //                             placeholder={"请选择筛选项"}
        //                             options={[
        //                                 { value: 'jack', label: 'Jack' },
        //                                 { value: 'lucy', label: 'Lucy' },
        //                                 { value: 'Yiminghe', label: 'yiminghe' },
        //                                 { value: 'disabled', label: 'Disabled', disabled: true },
        //                             ]}
        //                         />
        //                     </div>
        //                     <div style={{
        //                         marginTop: 30
        //                     }}>
        //                         <span>图表筛选项2</span>
        //                         <Select
        //                             title='222'
        //                             // defaultValue=""
        //                             style={{ width: 300}}
        //                             onChange={handleChange}
        //                             placeholder={"请选择筛选项"}
        //                             options={[
        //                                 { value: 'jack', label: 'Jack' },
        //                                 { value: 'lucy', label: 'Lucy' },
        //                                 { value: 'Yiminghe', label: 'yiminghe' },
        //                                 { value: 'disabled', label: 'Disabled', disabled: true },
        //                             ]}
        //                         />
        //                     </div>
        //             </ProCard>
        //             <ProCard colSpan={16} style={{ height: 300, padding: 0 }} title={"panel"} >
        //                 <Chart1></Chart1>
        //             </ProCard>
        //         </ProCard>
        //     </ProCard>
        // </PageContainer>
    )
}

export default Monitor
