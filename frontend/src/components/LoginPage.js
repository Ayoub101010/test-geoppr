// src/components/LoginPage.js
import React, { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext"; // AJOUT: Import du context d'auth

import "./LoginPage.css";
import geoLogo from "../assets/GeoPPR_Logo.png";
import ndgrLogo from "../assets/NDGR_Logo.png";

export default function LoginPage() {
  const globeEl = useRef();
  const navigate = useNavigate();
  const { login } = useAuth(); // AJOUT: Récupération de la fonction login
  
  // AJOUT: États pour gérer le formulaire
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePublicAccess = () => {
      navigate("/user"); // Accès public vers UserPage
    };

    useEffect(() => {
      document.body.style.backgroundColor = "#000";

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

    // MODIFICATION: Remplacer votre handleLogin existant par celui-ci
    const handleLogin = async () => {
    setError("");
    
    if (!email || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success) {
        // MODIFICATION : Redirection selon le rôle
        if (result.user.role === 'super_admin') {
          navigate("/superadmin");
        } else if (result.user.role === 'admin') {
          navigate("/admin"); // Redirection vers AdminPage pour les admins
        } else {
          // Ne devrait pas arriver car backend refuse les autres rôles
          setError("Accès refusé. Connexion réservée aux administrateurs.");
        }
      } else {
        setError(result.error || "Identifiants incorrects");
      }
    } catch (err) {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  // AJOUT: Gestion de la touche Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

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
              {/* MODIFICATION: Remplacer vos inputs existants */}
              <input
                id="username"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              <input 
                id="password" 
                type="password" 
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
              
              {/* AJOUT: Affichage des erreurs */}
              {error && (
                <div style={{ 
                  color: '#ff4444', 
                  fontSize: '14px', 
                  marginTop: '10px',
                  textAlign: 'center' 
                }}>
                  {error}
                </div>
              )}
              
              {/* MODIFICATION: Bouton avec état de chargement */}
              <button 
                className="login-btn" 
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
              
              <div className="small-text">
                "Connexion réservée aux agents PPR"
              </div>
              <div
                className="forgot"
                onClick={() => alert("Contactez l'administrateur pour réinitialiser votre mot de passe")}
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