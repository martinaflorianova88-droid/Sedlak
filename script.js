// Zaregistrujeme plugin
gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. HORIZONTÁLNÍ SCROLLOVÁNÍ (převod kolečka na X posun) ---
    const wrapper = document.querySelector('.horizontal-wrapper');
    const scenes = gsap.utils.toArray('.scene');

    // Animate the entire wrapper based on its ACTUAL layout width (support for overlapping scenes)
    let getScrollAmount = () => -(wrapper.scrollWidth - window.innerWidth);
    const scrollTween = gsap.to(wrapper, {
        x: getScrollAmount,
        ease: "none", // lineární navázání na scroll (žádné zrychlovaní)
        scrollTrigger: {
            trigger: ".scroll-container",
            pin: true,           // Zafixujeme .scroll-container na obrazovce
            scrub: 1.5,          // Zvýšeno na 1.5 pro mnohem jemnější "máslovitější" doběh
            end: () => "+=" + ((wrapper.scrollWidth - window.innerWidth) * 2), // * 2 dělá scrollování dvakrát pomalejším (vyžaduje 2x delší fyzické posunutí kolečkem)
            invalidateOnRefresh: true // přepočte se, když uživatel změní velikost okna
        }
    });

    // --- 2. SCROLL PARALLAX (hloubka při horizontálním posuvu) ---
    // Nastavíme jemné posuvy pro každou vrstvu vůz horizontálnímu posuvu
    scenes.forEach((scene) => {
        const layers = scene.querySelectorAll('.layer');
        
        layers.forEach((layer) => {
            // Rychlost 1 je default. 
            // Předměty dozadu < 1 (např. 0.2 je obloha).
            // Předměty dopředu > 1 (např. 1.2 je kůň vpředu).
            const speed = parseFloat(layer.getAttribute('data-speed')) || 1;
            
            // Určíme o kolik procent budeme posouvat oproti scéně.
            // Oblačnost se zdrží zpět (-xPercent), předměty dopředu uhání rychleji dopředu.
            const moveAmount = (1 - speed) * 40; 
            
            gsap.to(layer, {
                xPercent: moveAmount, 
                ease: "none",
                scrollTrigger: {
                    trigger: scene,
                    containerAnimation: scrollTween, // Navážeme trigger na hlavní horizontální timeline !
                    start: "left right", // KDYŽ levý okraj scény protne pravý okraj okna 
                    end: "right left",   // DO doby než pravý okraj scény opustí levý okraj okna
                    scrub: 1.5,          // Měkčí dojezd paralaxy korespondující s hlavním containerem
                }
            });
        });
    });

    // --- 3. MOUSE-FOLLOW PARALLAX (oživuje scénu) ---
    const allLayers = gsap.utils.toArray('.layer');
    
    document.addEventListener("mousemove", (e) => {
        // Vektory osy X a Y vypočítáné od středu obrazovky (šíře / 2)
        const xOffset = (e.clientX - window.innerWidth / 2);
        const yOffset = (e.clientY - window.innerHeight / 2);

        // Všechny vrstvy trochu "uskočí" podle pozice myši a své hloubky
        allLayers.forEach((layer) => {
            // Zablokování mouse-follow efektu pro první úvodní text úvodní scény dle přání 
            if (layer.querySelector('.hero-text')) return;

            const speed = parseFloat(layer.getAttribute('data-speed')) || 1;
            
            // Čím víc vpředu (čím větší speed u Scrollu), tím víc reaguje na myš
            // Znaménko -, aby utíkalo na stranu oproti myši a budovalo prostor
            gsap.to(layer, {
                x: -(xOffset * speed * 0.04), // Jemná citlivost u X (0.04)
                y: -(yOffset * speed * 0.04), // Jemná citlivost u Y
                duration: 1.5, // Plynulý (lagging) doběh
                ease: "power2.out",
                overwrite: "auto" // Důležité: zabrání jitteringu z důvodu více gsap vteřinových animací
            });
        });
    });

    // --- 4. DEBUG INFO (Rámečky a souřadnice pro ladění pozic) ---
    const debugElements = document.querySelectorAll('.layer img, .layer-text > div');
    debugElements.forEach((el) => {
        el.style.outline = "2px solid red"; // Přidání dočasného červeného rámečku
        
        // Vytvoříme plovoucí štítek
        const debugLabel = document.createElement('div');
        debugLabel.style.position = 'fixed'; // Fixed zajišťuje snadné pozicování vůči viewportu
        debugLabel.style.background = 'rgba(255, 0, 0, 0.8)';
        debugLabel.style.color = 'white';
        debugLabel.style.padding = '4px 8px';
        debugLabel.style.fontSize = '12px';
        debugLabel.style.fontWeight = 'bold';
        debugLabel.style.zIndex = 99999;
        debugLabel.style.pointerEvents = 'none';
        debugLabel.style.borderRadius = '4px';
        document.body.appendChild(debugLabel);
        
        // Určíme název
        let name = "TEXT";
        if (el.tagName.toLowerCase() === 'img') {
            const src = el.getAttribute('src') || '';
            name = src.split('/').pop().replace('.png', '');
        } else {
            if (el.classList.contains('hero-text')) name = "TEXT S1";
            if (el.classList.contains('text-s2')) name = "TEXT S2";
            if (el.classList.contains('text-s3')) name = "TEXT S3";
            if (el.classList.contains('contact-wrapper')) name = "TEXT S4 (Kontakt)";
        }

        // Rychlý real-time update loop
        function updateLabel() {
            const elRect = el.getBoundingClientRect();
            const sceneRect = el.closest('.scene').getBoundingClientRect();
            
            const relativeLeft = elRect.left - sceneRect.left;
            const relativeTop = elRect.top - sceneRect.top;
            
            const leftVw = (relativeLeft / sceneRect.width) * 100;
            const topVh = (relativeTop / sceneRect.height) * 100;

            // Udržíme štítek stoprocentně v rámci viditelného okna, i když prvek vylézá ven (clamp logic)
            const safeTop = Math.max(10, elRect.top);
            const safeLeft = Math.max(10, Math.min(elRect.left, window.innerWidth - 150)); // zprava neuteče mimo

            // Fyzické umístění štítku (na monitoru) zůstává fixed
            debugLabel.style.left = safeLeft + 'px';
            debugLabel.style.top = safeTop + 'px';
            
            debugLabel.innerHTML = `
                ${name}<br>
                Left: ${Math.round(relativeLeft)}px (${leftVw.toFixed(1)} %)<br>
                Top: ${Math.round(relativeTop)}px (${topVh.toFixed(1)} %)
            `;
            
            requestAnimationFrame(updateLabel);
        }
        updateLabel();
    });

});
