import axios from 'axios'
import {
    accessGetAllMockData,
    overviewGetAllMockData
} from './mock.js'

// mock接口数据
let isMock = false

const getAllOverView = async () => {
    try {
        // const res = await axios.get("http://10.0.9.9:8888/api/overview/getAll")
        if(isMock) {
            return overviewGetAllMockData
        }
        const res = await axios.get("http://10.4.10.24:8888/api/overview/getAll")
        console.log(res, "sssss");
        const {data = {}} = res
        return isMock ? overviewGetAllMockData : data
    } catch (error) {
        console.error("==ERROR==", error);
    }
}

const getIPData = async () => {                                                                                                                                                                                                                      
    try {
        if(isMock) {
            return accessGetAllMockData
        }
        const res = await axios.get("http://10.4.10.24:8888/api/access/getAll")
        console.log(res, "sssss");
        const {data = {}} = res
        return isMock ? accessGetAllMockData : data
    } catch (error) {
        console.error("==ERROR==", error);
    }
}

const getDistributeTableData = async (queryData) => {
    try {
        const {
            page=1,
            pageSize=10,
            
        } = queryData
        const res = await axios.post("http://localhost:8080/distributeList", {
            // page,
            // pageSize,
            ...queryData
        })
        const {data = {}} = res
        return data
    } catch (error) {
        console.error("==ERROR==", error)
    }
}

const getFlamegraphDataByTraceId = async (traceId) => {
    const res = await axios.get("http://localhost:8080/flamegraphList", {
        params: {
        traceId: traceId
        }
      })
    const {data = {}} = res
    // console.log(data, "resres");
    return data
    
}

export {
    getAllOverView,
    getIPData,
    getDistributeTableData,
    getFlamegraphDataByTraceId
}