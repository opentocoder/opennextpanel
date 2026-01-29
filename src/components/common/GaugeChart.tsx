"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface GaugeChartProps {
  value: number;
  title: string;
  subtitle?: string;
  color?: string;
  max?: number;
}

export function GaugeChart({
  value,
  title,
  subtitle,
  color = "#22c55e",
  max = 100,
}: GaugeChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const option: echarts.EChartsOption = {
      series: [
        {
          type: "gauge",
          startAngle: 90,
          endAngle: -270,
          pointer: { show: false },
          progress: {
            show: true,
            overlap: false,
            roundCap: true,
            clip: false,
            itemStyle: {
              color: color,
            },
          },
          axisLine: {
            lineStyle: {
              width: 8,
              color: [[1, "#e5e7eb"]],
            },
          },
          splitLine: { show: false },
          axisTick: { show: false },
          axisLabel: { show: false },
          data: [
            {
              value: value,
              detail: {
                offsetCenter: ["0%", "-10%"],
              },
            },
          ],
          title: {
            fontSize: 14,
            color: "#6b7280",
            offsetCenter: ["0%", "30%"],
          },
          detail: {
            width: 50,
            height: 14,
            fontSize: 24,
            fontWeight: "bold",
            color: color,
            formatter: "{value}%",
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [value, color, max]);

  return (
    <div className="flex flex-col items-center">
      <div ref={chartRef} className="w-32 h-32" />
      <div className="text-center mt-1">
        <div className="text-sm text-gray-700 font-medium">{title}</div>
        {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
}
