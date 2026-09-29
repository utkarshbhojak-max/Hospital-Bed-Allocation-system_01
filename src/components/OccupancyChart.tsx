import React, { useState } from "react";
import { OccupancyPoint } from "../types";

interface OccupancyChartProps {
  data: OccupancyPoint[];
}

export const OccupancyChart: React.FC<OccupancyChartProps> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxTime = data[data.length - 1].time;
  const maxBedCount = 35; // y-axis upper limit to fit 30 bed line comfortably

  const width = 900;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const scaleX = (t: number) => padding.left + (t / maxTime) * plotWidth;
  const scaleY = (val: number) => padding.top + plotHeight - (val / maxBedCount) * plotHeight;

  // Generate SVG path for an attribute
  const generatePath = (key: keyof OccupancyPoint) => {
    return data
      .map((d, i) => {
        const x = scaleX(d.time);
        const y = scaleY(d[key] as number);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const hoveredPoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Bed Occupancy Over Time</h2>
          <p className="text-xs text-slate-500">
            Real-time tracked bed occupancy across units vs physical capacity limits
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-sky-500 inline-block"></span>
            <span className="font-medium text-slate-700">General (Cap: 30)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span>
            <span className="font-medium text-slate-700">Monitored (Cap: 10)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
            <span className="font-medium text-slate-700">Critical (Cap: 5)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Horizontal Grid lines */}
          {[5, 10, 20, 30].map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={scaleY(val)}
                x2={width - padding.right}
                y2={scaleY(val)}
                stroke="#e2e8f0"
                strokeDasharray={val === 30 || val === 10 || val === 5 ? "4 4" : undefined}
                strokeWidth={val === 30 || val === 10 || val === 5 ? "1.5" : "1"}
              />
              <text
                x={padding.left - 8}
                y={scaleY(val) + 4}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
                fontFamily="monospace"
              >
                {val}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {[0, 300, 600, 900, 1200, 1500].filter(t => t <= maxTime).map((t) => (
            <text
              key={t}
              x={scaleX(t)}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#94a3b8"
              fontFamily="monospace"
            >
              {t}m
            </text>
          ))}

          {/* General Line (30 cap) */}
          <path
            d={generatePath("general_occupied")}
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
          />

          {/* Monitored Line (10 cap) */}
          <path
            d={generatePath("monitored_occupied")}
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
          />

          {/* Critical Line (5 cap) */}
          <path
            d={generatePath("critical_occupied")}
            fill="none"
            stroke="#e11d48"
            strokeWidth="2"
          />

          {/* Interactive vertical hover indicator */}
          {hoverIndex !== null && (
            <line
              x1={scaleX(data[hoverIndex].time)}
              y1={padding.top}
              x2={scaleX(data[hoverIndex].time)}
              y2={height - padding.bottom}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Mouse tracking overlay rectangles */}
          {data.map((d, i) => {
            const x = scaleX(d.time);
            const nextX = i < data.length - 1 ? scaleX(data[i + 1].time) : width - padding.right;
            const barW = Math.max(1, nextX - x);
            return (
              <rect
                key={i}
                x={x - barW / 2}
                y={padding.top}
                width={barW}
                height={plotHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>
      </div>

      {/* Dynamic Hover Status Card */}
      {hoveredPoint && (
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="text-slate-600">
            Time: <span className="font-bold text-slate-900">{hoveredPoint.time.toFixed(1)} min</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sky-700 font-semibold">
              General: {hoveredPoint.general_occupied}/30
            </span>
            <span className="text-amber-700 font-semibold">
              Monitored: {hoveredPoint.monitored_occupied}/10
            </span>
            <span className="text-rose-700 font-semibold">
              Critical: {hoveredPoint.critical_occupied}/5
            </span>
            <span className="text-slate-800 font-bold border-l border-slate-300 pl-3">
              Total Occupied: {hoveredPoint.total_occupied}/45 ({((hoveredPoint.total_occupied / 45) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
