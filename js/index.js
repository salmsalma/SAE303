document.addEventListener('DOMContentLoaded', () => {
    const marqueeTrack = document.getElementById('marquee-track');
    if (!marqueeTrack) return;
    
    // Sécurité : on vérifie si on a déjà cloné pour éviter les doublons infinis
    if (marqueeTrack.getAttribute('data-cloned')) return;

    // 1. On clone le contenu
    const initialContent = marqueeTrack.innerHTML;
    marqueeTrack.innerHTML += initialContent; 
    marqueeTrack.setAttribute('data-cloned', 'true');

    // --- AJOUT : Gestion du clic sur les logos ---
    const logos = document.querySelectorAll('.logos-track img');
    logos.forEach(logo => {
        logo.addEventListener('click', () => {
            const brand = logo.alt.toLowerCase(); // ex: "ugc", "mk2"
            
            // Vérification de sécurité si les données ne sont pas encore là
            if (typeof allCinemas === 'undefined' || allCinemas.length === 0) {
                alert("Les données des cinémas chargent encore, réessayez dans une seconde !");
                return;
            }

            // On filtre la liste globale (allCinemas vient de cinemas.js)
            const filtered = allCinemas.filter(cinema => {
                const nom = cinema.nom ? cinema.nom.toLowerCase() : '';
                const proprietaire = cinema.proprietaire ? cinema.proprietaire.toLowerCase() : '';
                // On cherche si le nom du cinéma ou le propriétaire contient la marque (ex: "ugc")
                return nom.includes(brand) || proprietaire.includes(brand);
            });

            // On met à jour la carte et les résultats (fonctions de cinemas.js)
            if (typeof updateMap === 'function') {
                updateMap(filtered);
                displayResults(filtered);

                // On descend la page vers la carte pour voir le résultat
                document.getElementById('map-section').scrollIntoView({ behavior: 'smooth' });
                
                // On remplit la barre de recherche pour montrer le filtre actif
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = "Cinéma " + brand.toUpperCase();
            }
        });
    });

    let currentScroll = 0;
    let speed = 1; // Vitesse un peu plus douce
    let resetPoint = 0;

    // 2. Calcul ultra-précis du point de raccord
    const updateDimensions = () => {
        const style = window.getComputedStyle(marqueeTrack);
        // On récupère le gap (ou column-gap pour compatibilité) et on s'assure que c'est un nombre
        const gap = parseFloat(style.gap || style.columnGap) || 0;
        
        // On mesure la largeur totale et on divise par 2 car on a dupliqué le contenu
        // On ajoute le gap car scrollWidth ne compte pas l'espace après le dernier élément
        resetPoint = (marqueeTrack.scrollWidth + gap) / 2;
        
        // Sécurité absolue : si le calcul échoue ou donne 0, on met 1 pour éviter le blocage
        if (!resetPoint || isNaN(resetPoint) || resetPoint <= 0) {
            resetPoint = 1;
        }
    };

    // On calcule tout de suite
    updateDimensions();
    
    // On recalcule quand tout est chargé (images) et quand on redimensionne
    window.addEventListener('load', updateDimensions);
    window.addEventListener('resize', updateDimensions);
    // Sécurité supplémentaire : on force un recalcul après 1 seconde au cas où
    setTimeout(updateDimensions, 1000);

    function animateMarquee() {
        currentScroll -= speed;

        // 3. Le raccord parfait
        // Si on a dépassé la moitié, on rajoute la valeur au lieu de mettre 0
        // Cela évite de perdre des micro-pixels de mouvement
        if (Math.abs(currentScroll) >= resetPoint) {
            currentScroll += resetPoint; 
        }

        marqueeTrack.style.transform = `translateX(${currentScroll}px)`;
        requestAnimationFrame(animateMarquee);
    }

    animateMarquee();
});