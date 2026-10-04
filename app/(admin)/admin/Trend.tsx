"use client";

import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

/**
 * A single-measure day series.
 *
 * One measure per chart, always. The obvious move — signups and unlocks on one chart with two
 * y-axes — is the most misleading thing a chart can do: where the two lines cross is an artefact
 * of where the axes were pinned, not a fact about the data. Two charts sharing an x-axis compare
 * honestly and cost nothing extra.
 *
 * Colours are passed as hex rather than read from the CSS tokens because ApexCharts rasterises
 * them; these are the slots from a palette validated against this console's own dark surface
 * (worst adjacent ΔE 9.4 under deuteranopia, all ≥3:1 on the surface).
 *
 * The crosshair tooltip is not optional — reading a value off thirty unlabelled points is guesswork.
 */
export function Trend({
  categories, values, color, label, height = 150,
}: {
  categories: string[];
  values: number[];
  color: string;
  label: string;
  height?: number;
}) {
  return (
    <ReactApexChart
      type="area"
      height={height}
      series={[{ name: label, data: values }]}
      options={{
        chart: { toolbar: { show: false }, animations: { enabled: false }, parentHeightOffset: 0, background: "transparent" },
        theme: { mode: "dark" },
        colors: [color],
        stroke: { width: 2, curve: "smooth" },
        fill: { type: "gradient", gradient: { shadeIntensity: 0, opacityFrom: 0.25, opacityTo: 0, stops: [0, 100] } },
        dataLabels: { enabled: false },
        grid: { borderColor: "rgba(255,255,255,0.07)", strokeDashArray: 0, xaxis: { lines: { show: false } }, padding: { left: 2, right: 6, top: 0, bottom: 0 } },
        xaxis: {
          categories,
          tickAmount: 5,
          axisBorder: { show: false },
          axisTicks: { show: false },
          crosshairs: { stroke: { color: "rgba(255,255,255,0.22)", width: 1, dashArray: 0 } },
          labels: { style: { colors: "#8a8a80", fontSize: "10px" } },
        },
        yaxis: {
          labels: { style: { colors: "#8a8a80", fontSize: "10px" }, formatter: (v: number) => String(Math.round(v)) },
          min: 0,
        },
        tooltip: { theme: "dark", x: { show: true }, marker: { show: false } },
        markers: { size: 0, hover: { size: 4 } },
        legend: { show: false },
      }}
    />
  );
}
