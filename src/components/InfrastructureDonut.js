import React, { useRef, useEffect } from "react";
import Chart from "chart.js/auto";
import "./InfrastructureDonut.css";

const InfrastructureDonut = () => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const baseData = {
    labels: [
      "Pistes",
      "Chaussées", // ← ajouté ici
      "Ouvrages",
      "Infrastructures rurales",
      "Infrastructures hydrauliques",
      "Services de santé",
    ],
    values: {
      Pistes: 340,
      Chaussées: 120, // ← ajouté ici
      Ouvrages: 210,
      "Infrastructures rurales": 180,
      "Infrastructures hydrauliques": 75,
      "Services de santé": 60,
    },
    km: {
      Pistes: 4720,
      Chaussées: 820, // ← ajouté ici
      Ouvrages: 0,
      "Infrastructures rurales": 0,
      "Infrastructures hydrauliques": 0,
      "Services de santé": 0,
    },
  };

  const categoryMapping = {
    Pistes: ["pistes"],
    Chaussées: ["chaussees"],
    Ouvrages: ["buses", "dalots", "ponts", "passages", "bacs"],
    "Infrastructures rurales": [
      "localites",
      "ecoles",
      "marches",
      "administratifs",
    ],
    "Infrastructures hydrauliques": ["hydrauliques"],
    "Services de santé": ["sante"],
  };

  const getFilteredData = () => {
    const checkedTypes = Array.from(
      document.querySelectorAll(
        ".filter-checkbox-group input[type='checkbox']:checked"
      )
    ).map((cb) => cb.id);

    const dynamicData = {
      labels: baseData.labels,
      datasets: [
        {
          label: "Nombre d’éléments",
          data: baseData.labels.map((category) => {
            const subTypes = categoryMapping[category];
            const activeSubTypes = subTypes.filter((t) =>
              checkedTypes.includes(t)
            );
            const ratio = activeSubTypes.length / subTypes.length;
            return Math.round(baseData.values[category] * ratio);
          }),
          backgroundColor: [
            "#4e73df", // Pistes
            "#8e44ad", // Chaussées
            "#1cc88a", // Ouvrages
            "#f6c23e", // Infrastructures rurales
            "#36b9cc", // Hydrauliques
            "#e74a3b", // Santé
          ],

          borderWidth: 1,
        },
        {
          label: "Kilométrage",
          data: baseData.labels.map((category) => {
            const subTypes = categoryMapping[category];
            const activeSubTypes = subTypes.filter((t) =>
              checkedTypes.includes(t)
            );
            const ratio = activeSubTypes.length / subTypes.length;
            return Math.round(baseData.km[category] * ratio);
          }),
          backgroundColor: "transparent",
        },
      ],
    };

    return dynamicData;
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 180,
    hover: {
      offset: 0.5,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          boxWidth: 13,
          padding: 8,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        backgroundColor: "#ffffff",
        titleColor: "#2d3748",
        bodyColor: "#2d3748",
        borderColor: "#e2e8f0",
        borderWidth: 0.5,
        padding: 4,
        cornerRadius: 4,
        titleFont: {
          size: 10,
          weight: "normal",
        },
        bodyFont: {
          size: 11,
        },
        callbacks: {
          label: function (context) {
            const index = context.dataIndex;
            const label = context.label;
            const nombre = context.dataset.data[index];
            const km = context.chart.data.datasets[1].data[index];

            if ((label === "Pistes" || label === "Chaussées") && km > 0) {
              return `${label} : ${nombre} éléments - ${km} km`;
            }
            return `${label} : ${nombre} éléments`;
          },
        },
      },
    },
  };

  const renderChart = () => {
    const data = getFilteredData();

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: data,
      options: options,
    });
  };

  useEffect(() => {
    renderChart();

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
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="donut-wrapper">
      <h2>Capacité par Domaine d’Infrastructure</h2>
      <div className="chart-container">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
};

export default InfrastructureDonut;
