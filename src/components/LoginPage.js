import React, { useEffect, useRef } from "react";
import Globe from "globe.gl";
import { useNavigate } from "react-router-dom";

import "./LoginPage.css";
import geoLogo from "../assets/GeoPPR_Logo.png";
import ndgrLogo from "../assets/NDGR_Logo.png";

export default function LoginPage() {
  const globeEl = useRef();
  const navigate = useNavigate();

  const handlePublicAccess = () => {
    navigate("/user"); // chemin vers UserPage
  };
  useEffect(() => {
    document.body.style.backgroundColor = "#000"; // Forcer le fond sombre

    const globe = Globe()(globeEl.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .backgroundColor("rgba(0,0,0,0)")
      .pointOfView({ lat: 0, lng: 0, altitude: 2 }, 0)
      .showAtmosphere(true)
      .atmosphereColor("#950f6dff")
      .atmosphereAltitude(0.2);

    let angle = 0;
    const interval = setInterval(() => {
      globe.pointOfView({ lat: 0, lng: angle, altitude: 2 }, 50);
      angle += 0.1;
    }, 60);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    // Tu peux ajouter ici ta logique d'authentification plus tard
    navigate("/superadmin");
  };

  /*const handleLogin = () => {
    const user = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if (!user || !pass) {
      alert("Veuillez remplir tous les champs.");
    } else {
      alert("Connexion en cours pour " + user);
    }
  };*/

  return (
    <>
      <div className="loginpage-wrapper">
        <div className="globe-wrapper">
          <div ref={globeEl} id="globe-container" />
        </div>

        <div className="container">
          <div className="left-panel">
            <img src={geoLogo} alt="Logo GeoPPR" className="geoppr" />
            <p>Plateforme de Suivi & Évaluation</p>
            <button onClick={handlePublicAccess}>
              Accéder à la plateforme publique
            </button>
          </div>

          <div className="right-panel">
            <img src={ndgrLogo} alt="Logo NDGR" className="logo" />
            <div className="form-group">
              <input
                id="username"
                type="text"
                placeholder="Nom d’utilisateur"
              />
              <input id="password" type="password" placeholder="Mot de passe" />
              <button className="login-btn" onClick={handleLogin}>
                Se connecter
              </button>
              <div className="small-text">
                "Connexion réservée aux agents PPR"
              </div>
              <div
                className="forgot"
                onClick={() => alert("Lien de récupération")}
              >
                Mot de passe oublié
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
