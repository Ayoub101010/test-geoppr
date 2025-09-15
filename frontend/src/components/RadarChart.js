import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import "./RadarChart.css";

const RadarChart = () => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const baseLabels = [
    "Conakry",
    "Boké",
    "Kindia",
    "Mamou",
    "Labé",
    "Faranah",
    "Kankan",
    "Nzérékoré",
    "Coyah",
    "Dubréka",
  ];

  const baseData = {
    Pistes: [4, 5, 3, 6, 2, 4, 5, 3, 4, 5],
    Chaussées: [2, 3, 2, 4, 5, 3, 2, 1, 2, 3],
    Ouvrages: [1, 2, 3, 2, 3, 1, 2, 3, 2, 1],
    "Infrastructures rurales": [3, 4, 2, 3, 5, 4, 2, 4, 3, 2],
    "Autres infrastructures": [2, 2, 2, 1, 2, 3, 2, 2, 1, 2],
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
    "Autres infrastructures": ["hydrauliques", "sante", "autres"],
  };

  const renderChart = () => {
    const checkedTypes = Array.from(
      document.querySelectorAll(".filter-checkbox-group input:checked")
    ).map((cb) => cb.id);

    const filteredDatasets = Object.keys(baseData)
      .filter((category) => {
        const subTypes = categoryMapping[category];
        return subTypes.some((type) => checkedTypes.includes(type));
      })
      .map((category) => {
        const subTypes = categoryMapping[category];
        const ratio =
          subTypes.filter((t) => checkedTypes.includes(t)).length /
          subTypes.length;
        return {
          label: category,
          data: baseData[category].map((val) => Math.round(val * ratio)),
          borderColor: getColor(category),
          backgroundColor: getColor(category, 0.2),
          fill: true,
          pointHoverRadius: 8,
        };
      });

    const config = {
      type: "radar",
      data: {
        labels: baseLabels,
        datasets: filteredDatasets,
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 9 },
              padding: 4,
              boxWidth: 10,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.dataset.label;
                const value = context.formattedValue;
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          r: {
            angleLines: { display: true },
            suggestedMin: 0,
            suggestedMax: 7,
            ticks: {
              stepSize: 1,
              font: { size: 9 },
            },
            pointLabels: {
              font: { size: 9 },
            },
          },
        },
      },
    };

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    chartInstanceRef.current = new Chart(ctx, config);
  };

  const getColor = (label, alpha = 1) => {
    const colors = {
      Pistes: `rgba(25, 118, 210, ${alpha})`,
      Chaussées: `rgba(211, 47, 47, ${alpha})`,
      Ouvrages: `rgba(251, 192, 45, ${alpha})`,
      "Infrastructures rurales": `rgba(56, 142, 60, ${alpha})`,
      "Autres infrastructures": `rgba(123, 31, 162, ${alpha})`,
    };
    return colors[label];
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
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, []);

  return (
    <div className="radar-chart-container">
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

export default RadarChart;
