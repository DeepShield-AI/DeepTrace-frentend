const OVERVIEW_CARD_MAP = {
    alertCount: "告警数量",
    avgBandwidth: "平均带宽",
    avgClientLatency: "平均服务端延迟",
    avgUpstreamBandwidth: "平均上行带宽",
    clientRetransmissionRate: "重传率",
    dataPacketRetransmissionRate: "数据包重传率",
    peakBandwidth: "峰值带宽",
    serverRetransmissionRate: "服务端重传率",
    totalPackets: "总数据包",
    totalTraffic: "总流量"
} 

const SPAN_OBJ_LIST = [
    "endpoint",
    "protocol",
    "duration",
    "tgid",
    "pid",
    "src_ip",
    "src_port",
    "dst_ip",
    "dst_port",
    "component_name",
]
export {
    OVERVIEW_CARD_MAP,
    SPAN_OBJ_LIST
}