"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

/** Real Tabler chart/map widgets (ApexCharts + jsvectormap — the same libraries Tabler's own demo
 * bundles), not hand-rolled CSS bars. Client-only: both libraries touch the DOM directly and have
 * no meaningful SSR output, same reason Tabler's own examples load them post-mount. */

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const TBLR_BLUE = "#206bc4";
const TBLR_AXIS = "#66748099";

/** Tiny inline chart inside a StatCard — Tabler's own "trend inside KPI" pattern (chart-sm). */
export function Sparkline({ values, color = TBLR_BLUE }: { values: number[]; color?: string }) {
  return (
    <div className="chart-sm">
      <ReactApexChart
        type="bar"
        height={40}
        series={[{ name: "value", data: values }]}
        options={{
          chart: { sparkline: { enabled: true }, animations: { enabled: false } },
          plotOptions: { bar: { columnWidth: "55%" } },
          colors: [color],
          tooltip: { enabled: false },
        }}
      />
    </div>
  );
}

/** The big "Traffic summary"-style card chart — full axis labels, matching Tabler's dashboard
 * chart-card exactly (card-body header row for the legend/metric, chart filling the rest). */
export function BarChart({ categories, values, height = 220 }: { categories: string[]; values: number[]; height?: number }) {
  return (
    <ReactApexChart
      type="bar"
      height={height}
      series={[{ name: "Count", data: values }]}
      options={{
        chart: { toolbar: { show: false }, animations: { enabled: false }, parentHeightOffset: 0 },
        plotOptions: { bar: { columnWidth: "55%", borderRadius: 3 } },
        dataLabels: { enabled: false },
        colors: [TBLR_BLUE],
        grid: { borderColor: "#ffffff14", strokeDashArray: 4 },
        xaxis: {
          categories,
          labels: { style: { colors: TBLR_AXIS, fontSize: "11px" }, rotate: 0 },
          axisBorder: { show: false },
          axisTicks: { show: false },
          tickAmount: 8,
        },
        yaxis: { labels: { style: { colors: TBLR_AXIS, fontSize: "11px" } } },
        tooltip: { theme: "dark" },
      }}
    />
  );
}

/** "Locations" world map — jsvectormap ships inside @tabler/core's own libs, this just wires the
 * real npm package (proper ESM, same underlying lib) to a country->count dataset instead of demo
 * data. ISO-2 codes only: a name not in COUNTRY_ISO (rare — new country, or "Unknown") is simply
 * absent from the shaded regions rather than guessed at. */
const COUNTRY_ISO: Record<string, string> = {
  India: "IN", "United States": "US", "United Kingdom": "GB", Nigeria: "NG", Spain: "ES",
  Oman: "OM", Pakistan: "PK", Canada: "CA", Norway: "NO", Czechia: "CZ", Germany: "DE",
  France: "FR", Australia: "AU", Brazil: "BR", "United Arab Emirates": "AE", Singapore: "SG",
};

export function WorldMap({ data }: { data: { country: string; n: number }[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: { destroy: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ default: JsVectorMap }] = await Promise.all([
        import("jsvectormap"),
        import("jsvectormap/dist/maps/world.js"),
      ]);
      if (cancelled || !ref.current) return;

      const max = Math.max(1, ...data.map((d) => d.n));
      const values: Record<string, number> = {};
      for (const d of data) {
        const iso = COUNTRY_ISO[d.country];
        if (iso) values[iso] = d.n;
      }

      map = new JsVectorMap({
        selector: ref.current,
        map: "world",
        backgroundColor: "transparent",
        zoomButtons: false,
        regionStyle: {
          initial: { fill: "#2c3a4f" },
          hover: { fill: TBLR_BLUE },
        },
        series: {
          regions: [{ values, scale: ["#25324a", TBLR_BLUE], normalizeFunction: "polynomial" }],
        },
        onRegionTooltipShow(_e: unknown, tooltip: { text: (t: string) => void }, code: string) {
          const entry = data.find((d) => COUNTRY_ISO[d.country] === code);
          if (entry) tooltip.text(`${entry.country}: ${entry.n} users`);
        },
      } as never);
      void max;
    })();

    return () => {
      cancelled = true;
      map?.destroy();
    };
  }, [data]);

  return <div ref={ref} style={{ height: 220 }} />;
}
