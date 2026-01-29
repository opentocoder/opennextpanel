"use client";

import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MonitorChartsProps {
  cpuData: number[];
  memoryData: number[];
  diskReadData: number[];
  diskWriteData: number[];
  netInData: number[];
  netOutData: number[];
  timeLabels: string[];
}

export function MonitorCharts({
  cpuData,
  memoryData,
  diskReadData,
  diskWriteData,
  netInData,
  netOutData,
  timeLabels,
}: MonitorChartsProps) {
  const createLineOption = (
    title: string,
    data1: number[],
    data2: number[] | null,
    label1: string,
    label2: string | null,
    color1: string,
    color2: string | null,
    unit: string
  ) => ({
    title: { text: title, left: "center", textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        let result = params[0].axisValue + "<br/>";
        params.forEach((param: any) => {
          result += `${param.marker} ${param.seriesName}: ${param.value}${unit}<br/>`;
        });
        return result;
      },
    },
    legend: { bottom: 0 },
    grid: { left: "3%", right: "4%", bottom: "15%", top: "15%", containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: timeLabels,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: "value",
      axisLabel: { formatter: `{value}${unit}`, fontSize: 10 },
    },
    series: [
      {
        name: label1,
        type: "line",
        smooth: true,
        data: data1,
        areaStyle: { opacity: 0.3 },
        lineStyle: { color: color1 },
        itemStyle: { color: color1 },
      },
      ...(data2 && label2 && color2
        ? [
            {
              name: label2,
              type: "line",
              smooth: true,
              data: data2,
              areaStyle: { opacity: 0.3 },
              lineStyle: { color: color2 },
              itemStyle: { color: color2 },
            },
          ]
        : []),
    ],
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-4">
          <ReactECharts
            option={createLineOption(
              "CPU使用率",
              cpuData,
              null,
              "CPU",
              null,
              "#10b981",
              null,
              "%"
            )}
            style={{ height: "250px" }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <ReactECharts
            option={createLineOption(
              "内存使用率",
              memoryData,
              null,
              "内存",
              null,
              "#3b82f6",
              null,
              "%"
            )}
            style={{ height: "250px" }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <ReactECharts
            option={createLineOption(
              "磁盘IO",
              diskReadData,
              diskWriteData,
              "读取",
              "写入",
              "#10b981",
              "#ef4444",
              "MB/s"
            )}
            style={{ height: "250px" }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <ReactECharts
            option={createLineOption(
              "网络流量",
              netInData,
              netOutData,
              "入站",
              "出站",
              "#3b82f6",
              "#f59e0b",
              "MB/s"
            )}
            style={{ height: "250px" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
