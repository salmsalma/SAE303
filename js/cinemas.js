// --- Variables globales ---
let allCinemas = [];
let markers;

// --- Fonctions ---

// Charge le fichier JSON et initialise l'affichage
async function afficherCinemas() {

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';

    try {
        // Initialisation du groupe de marqueurs
        // On vérifie si le plugin MarkerCluster est bien chargé sinon on utilise un groupe simple
        if (L.MarkerClusterGroup) {
            markers = new L.MarkerClusterGroup();
        } else {
            markers = L.featureGroup();
        }

        const reponse = await fetch("data/geo-cinemas.json");

        if (!reponse.ok) {
            throw new Error(`Erreur HTTP ! statut : ${reponse.status}`);
        }

        allCinemas = await reponse.json();
        
        // Affichage initial de tous les cinémas
        updateMap(allCinemas);

        if (loading) loading.style.display = 'none';

    } catch(error) {
        console.error("Erreur lors du chargement des cinémas :", error);
        // Message d'aide explicite pour l'erreur fréquente en local
        alert("Erreur : Impossible de charger les données.\n\nSi vous êtes en local (file://), utilisez un serveur web (ex: Live Server sur VSCode).");
        if (loading) loading.style.display = 'none';
    }
}

// Met à jour les marqueurs sur la carte Leaflet
function updateMap(cinemasList) {
    // Si la carte ou le groupe de marqueurs n'existe pas, on ne fait rien
    // 'map' est défini globalement dans index.html
    if (typeof map === 'undefined' || !markers) return;

    // On retire tous les marqueurs actuels de la carte
    markers.clearLayers();

    cinemasList.forEach(cinema => {
        if(cinema.geo) {
            const [lat, lng] = cinema.geo.split(',').map(Number);

            // Vérification que les coordonnées sont valides
            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng])
                    .bindPopup(`
                        <b class="popup-titre">${cinema.nom}</b>
                        <b>Adresse :</b> ${cinema.adresse}<br>
                        <b>Ville :</b> ${cinema.commune} (${cinema.dep})<br>
                        <b>Nombre d'écran(s) :</b> ${cinema.ecrans}<br>
                        <b>Nombre de fauteuils :</b> ${cinema.fauteuils} <br>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" class="popup-itineraire">
                            📍 Comment y aller ?
                        </a>
                    `);
                    
                markers.addLayer(marker); 
            }
        }
    });

    // On ajoute le groupe de marqueurs à la carte
    map.addLayer(markers);
    
    // On ajuste le zoom pour voir tous les marqueurs (s'il y en a)
    if (markers.getLayers().length > 0) {
        map.fitBounds(markers.getBounds());
    }
}

// Affiche la liste des résultats sous la carte
function displayResults(cinemasList) {
    if (!resultsInfo) return;

    if (cinemasList.length === 0) {
        resultsInfo.innerHTML = "<p>Aucun cinéma trouvé pour cette recherche.</p>";
        return;
    }

    let htmlContent = `<h3>${cinemasList.length} cinéma(s) trouvé(s)</h3>`;
    
    // Ajout d'un indicateur visuel s'il y a plus de 3 résultats (donc risque de défilement)
    if (cinemasList.length > 3) {
        htmlContent += `<p class="scroll-hint">🔽 Faites défiler pour voir la suite</p>`;
    }
    
    // On ouvre un conteneur spécifique pour la liste défilante
    htmlContent += `<div class="results-list">`;
    
    cinemasList.forEach((cinema, index) => {
        htmlContent += `
            <div class="cinema-item">
                <h4>
                    <button class="cinema-name-btn" data-index="${index}" title="Voir sur la carte">${cinema.nom}</button>
                </h4>
                <p><strong>Adresse :</strong> ${cinema.adresse}, ${cinema.code_insee} ${cinema.commune}</p>
                <p><strong>Nombre d'écran(s) :</strong> ${cinema.ecrans} | <strong>Nombre de fauteuils :</strong> ${cinema.fauteuils}</p>
            </div>
        `;
    });

    // On ferme le conteneur
    htmlContent += `</div>`;

    resultsInfo.innerHTML = htmlContent;

    // Ajout des écouteurs d'événements pour centrer la carte au clic sur le nom
    const titles = resultsInfo.querySelectorAll('.cinema-name-btn');
    titles.forEach(title => {
        title.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            const cinema = cinemasList[index];
            
            if (cinema && cinema.geo) {
                const [lat, lng] = cinema.geo.split(',').map(Number);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    // On centre la carte et on zoome
                    map.setView([lat, lng], 16);
                    
                    // On remonte vers la carte pour bien voir le résultat
                    document.getElementById('map').scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // On ouvre la popup du marqueur correspondant
                    markers.eachLayer(layer => {
                        if (Math.abs(layer.getLatLng().lat - lat) < 0.0001 && Math.abs(layer.getLatLng().lng - lng) < 0.0001) {
                            layer.openPopup();
                        }
                    });
                }
            }
        });
    });
}

// --- Gestion des événements (Recherche, Clics) ---

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resetBtn = document.getElementById('reset-btn');
const resultsInfo = document.getElementById('results-info');

// --- Recherche ---
if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value.trim().toLowerCase();

        if (searchTerm === "") {
            resultsInfo.innerHTML = "<p class='error-message'>Veuillez entrer un nom de ville.</p>";
            return;
        }

        // On filtre la liste complète des cinémas
        const filteredCinemas = allCinemas.filter(cinema => {
            const commune = cinema.commune ? cinema.commune.toLowerCase() : '';
            const nom = cinema.nom ? cinema.nom.toLowerCase() : '';
            
            // On garde le cinéma si la ville OU le nom contient le terme de recherche
            return commune.includes(searchTerm) || nom.includes(searchTerm);
        });

        // On met à jour la carte avec les résultats filtrés
        updateMap(filteredCinemas);
        
        // On affiche les informations détaillées sous la carte
        displayResults(filteredCinemas);
    });
}

// --- Réinitialisation ---
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        searchInput.value = ""; // Vider le champ de recherche
        resultsInfo.innerHTML = ""; // Effacer les résultats écrits en dessous
        updateMap(allCinemas); // Remettre tous les points sur la carte
    });
}

// --- Bouton "Trouver un cinéma" (Intro) ---
const introBtn = document.querySelector('.txt-intro .btn');
if (introBtn) {
    introBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = "";
        if (resultsInfo) resultsInfo.innerHTML = "";
        updateMap(allCinemas);
    });
}

// Lancement au démarrage
afficherCinemas();
