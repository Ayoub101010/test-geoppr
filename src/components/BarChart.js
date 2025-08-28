import React, { useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import Chart from "chart.js/auto";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import "./BarChart.css";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Title
);

const BarChart = () => {
  const chartRef = useRef(null);

  const types = [
    "piste",
    "chaussée",
    "buse",
    "dalot",
    "pont",
    "passage submersible",
    "bac",
    "localité",
    "école",
    "marché",
    "bâtiment administratif",
    "infrastructure hydraulique",
    "service de santé",
    "autre infrastructure",
  ];

  const valeursBrutes = {
    piste: 135,
    chaussée: 42,
    buse: 88,
    dalot: 47,
    pont: 12,
    "passage submersible": 8,
    bac: 3,
    localité: 75,
    école: 52,
    marché: 20,
    "bâtiment administratif": 18,
    "infrastructure hydraulique": 25,
    "service de santé": 15,
    "autre infrastructure": 9,
  };

  const mappingCheckboxToLabel = {
    pistes: "piste",
    chaussees: "chaussée",
    buses: "buse",
    dalots: "dalot",
    ponts: "pont",
    passages: "passage submersible",
    bacs: "bac",
    localites: "localité",
    ecoles: "école",
    marches: "marché",
    administratifs: "bâtiment administratif",
    hydrauliques: "infrastructure hydraulique",
    sante: "service de santé",
    autres: "autre infrastructure",
  };

  const buildDataFromFilters = () => {
    const checkedTypes = Array.from(
      document.querySelectorAll(
        ".filter-checkbox-group input[type='checkbox']:checked"
      )
    ).map((cb) => cb.id);

    const activeLabels = types.filter((label) =>
      checkedTypes.some((t) => mappingCheckboxToLabel[t] === label)
    );

    const labels = [];
    const values = [];

    for (const label of types) {
      if (activeLabels.includes(label)) {
        labels.push(label);
        values.push(valeursBrutes[label]);
      }
    }

    return {
      labels,
      datasets: [
        {
          label: "Nombre de collectes",
          data: values,
          backgroundColor: "rgba(59, 130, 246, 0.7)",
          borderRadius: 8,
          barPercentage: 0.7,
        },
      ],
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1F2937",
        titleColor: "#FFF",
        bodyColor: "#FFF",
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: { size: 12 },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Nombre de collectes",
          font: { weight: "600" },
        },
        grid: {
          color: "#E5E7EB",
        },
        ticks: {
          stepSize: 1,
          callback: function (value) {
            return Number.isInteger(value) ? value : "";
          },
        },
      },
    },
  };

  const renderChart = () => {
    const chartData = buildDataFromFilters();

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = document.getElementById("barChartCanvas").getContext("2d");
    chartRef.current = new Chart(ctx, {
      type: "bar",
      data: chartData,
      options,
    });
  };

  useEffect(() => {
    renderChart();

    const inputs = document.querySelectorAll(
      ".filter-select, .filter-checkbox-group input"
    );
    inputs.forEach((input) => input.addEventListener("change", renderChart));

    return () => {
      inputs.forEach((input) =>
        input.removeEventListener("change", renderChart)
      );
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="bar-chart-wrapper">
      <h2 className="chart-title">📊 Collectes par type d'infrastructure</h2>
      <div className="bar-chart-canvas">
        <canvas id="barChartCanvas"></canvas>
      </div>
    </div>
  );
};

export default BarChart;
