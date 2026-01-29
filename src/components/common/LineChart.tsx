"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface LineChartProps {
  data: {
    time: string[];
    series: {
      name: string;
      data: number[];
      color?: string;
    }[];
  };
  height?: number;
  yAxisUnit?: string;
}

export function LineChart({ data, height = 200, yAxisUnit = "" }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
      },
      legend: {
        data: data.series.map((s) => s.name),
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.time,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: {
          color: "#6b7280",
          fontSize: 10,
          formatter: `{value}${yAxisUnit}`,
        },
      },
      series: data.series.map((s) => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { color: s.color || "#22c55e", width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: (s.color || "#22c55e") + "40" },
            { offset: 1, color: (s.color || "#22c55e") + "05" },
          ]),
        },
        data: s.data,
      })),
    };

    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [data, yAxisUnit]);

  return <div ref={chartRef} style={{ height }} />;
}
