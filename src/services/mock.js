const overviewGetAllMockData = [
    {
        "date": "2024-12-31T16:00:00.000+00:00",
        "totalTraffic": 1.07,
        "totalPackets": 1000000,
        "avgBandwidth": 100.5,
        "peakBandwidth": 200.75,
        "avgUpstreamBandwidth": 50.25,
        "dataPacketRetransmissionRate": 0.5,
        "clientRetransmissionRate": 0.3,
        "serverRetransmissionRate": 0.2,
        "alertCount": 5,
        "avgClientLatency": 150.45,
        "avgServerLatency": 101.0
    },
    {
        "date": "2025-01-01T16:00:00.000+00:00",
        "totalTraffic": 2.07,
        "totalPackets": 2000000,
        "avgBandwidth": 200.5,
        "peakBandwidth": 200.75,
        "avgUpstreamBandwidth": 20.25,
        "dataPacketRetransmissionRate": 0.4,
        "clientRetransmissionRate": 0.3,
        "serverRetransmissionRate": 0.2,
        "alertCount": 2,
        "avgClientLatency": 50.45,
        "avgServerLatency": 201.0
    }
]

const accessGetAllMockData = [
    {
        "id": 1,
        "ds": "2025-01-08T16:00:00.000+00:00",
        "ip": "192.168.1.1",
        "visitCount": 5,
        "isThreat": 0,
        "createdAt": "2025-01-09T07:12:14.000+00:00",
        "updatedAt": "2025-01-09T07:12:14.000+00:00"
    },
    {
        "id": 2,
        "ds": "2025-01-08T16:00:00.000+00:00",
        "ip": "192.168.1.2",
        "visitCount": 3,
        "isThreat": 1,
        "createdAt": "2025-01-09T07:12:14.000+00:00",
        "updatedAt": "2025-01-09T07:12:14.000+00:00"
    },
    {
        "id": 3,
        "ds": "2025-01-08T16:00:00.000+00:00",
        "ip": "192.168.1.3",
        "visitCount": 1,
        "isThreat": 0,
        "createdAt": "2025-01-09T07:12:14.000+00:00",
        "updatedAt": "2025-01-09T07:12:14.000+00:00"
    },
    {
        "id": 4,
        "ds": "2025-01-08T16:00:00.000+00:00",
        "ip": "192.168.1.4",
        "visitCount": 7,
        "isThreat": 0,
        "createdAt": "2025-01-09T07:12:14.000+00:00",
        "updatedAt": "2025-01-09T07:12:14.000+00:00"
    },
    {
        "id": 5,
        "ds": "2025-01-08T16:00:00.000+00:00",
        "ip": "192.168.1.5",
        "visitCount": 2,
        "isThreat": 1,
        "createdAt": "2025-01-09T07:12:14.000+00:00",
        "updatedAt": "2025-01-09T07:12:14.000+00:00"
    }
]

export {
    overviewGetAllMockData,
    accessGetAllMockData
}