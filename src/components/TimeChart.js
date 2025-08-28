import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import "./TimeChart.css";

const TimeChart = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null); // Ref pour stocker l'instance Chart
  const [period, setPeriod] = useState("day");

  const baseData = {
    day: {
      labels: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      values: {
        pistes: [2, 4, 6, 8, 5, 3, 2],
        chaussees: [1, 2, 3, 4, 2, 1, 0],
        buses: [1, 2, 2, 2, 1, 0, 0],
        ecoles: [3, 2, 1, 0, 1, 2, 3],
        autres: [2, 3, 2, 3, 4, 3, 2],
      },
    },
    week: {
      labels: ["S1", "S2", "S3", "S4"],
      values: {
        pistes: [20, 25, 30, 28],
        chaussees: [8, 10, 11, 12],
        buses: [10, 8, 7, 6],
        ecoles: [7, 5, 6, 5],
        autres: [5, 6, 5, 7],
      },
    },
    month: {
      labels: ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil"],
      values: {
        pistes: [120, 135, 142, 150, 160, 180, 200],
        chaussees: [35, 40, 42, 38, 36, 38, 39],
        buses: [20, 22, 21, 18, 19, 17, 16],
        ecoles: [10, 12, 15, 13, 14, 12, 10],
        autres: [15, 14, 15, 16, 15, 14, 15],
      },
    },
  };

  const getFilteredChartData = () => {
    const checkedTypes = Array.from(
      document.querySelectorAll(
        ".filter-checkbox-group input[type='checkbox']:checked"
      )
    ).map((cb) => cb.id);

    // Si aucun type coché, on prend tous par défaut
    const typesToUse =
      checkedTypes.length > 0
        ? checkedTypes
        : Object.keys(baseData[period].values);

    // Somme des valeurs sur les types cochés
    const summedData = baseData[period].labels.map((_, i) => {
      return typesToUse.reduce((total, type) => {
        const serie = baseData[period].values[type];
        return total + (serie?.[i] || 0);
      }, 0);
    });

    return {
      labels: baseData[period].labels,
      datasets: [
        {
          label: "Données collectées",
          data: summedData,
          borderColor: "#2980b9",
          backgroundColor: "rgba(41, 128, 185, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const renderChart = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: getFilteredChartData(),
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "#f1f3f4",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
  };

  useEffect(() => {
    renderChart();

    // Ecouteurs sur filtres checkbox + select
    const allInputs = document.querySelectorAll(
      ".filter-select, .filter-checkbox-group input"
    );
    allInputs.forEach((input) => {
      input.addEventListener("change", renderChart);
    });

    return () => {
      allInputs.forEach((input) => {
        input.removeEventListener("change", renderChart);
      });
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [period]);

  return (
    <div className="analytics-section">
      <div className="analytics-title">
        <i className="fas fa-chart-bar"></i>
        Analyse temporelle
      </div>

      <div className="time-filters">
        {["day", "week", "month"].map((p) => (
          <button
            key={p}
            className={`time-btn ${period === p ? "active" : ""}`}
            onClick={() => setPeriod(p)}
          >
            {p === "day" && "Jour"}
            {p === "week" && "Semaine"}
            {p === "month" && "Mois"}
          </button>
        ))}
      </div>

      <div className="chart-container" style={{ height: "300px" }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
};

export default TimeChart;
