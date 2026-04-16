// ============================================
// MINDBRIDGE AI - Location & Hospital Finder
// ============================================

const LocationFinder = {
    userLat: null,
    userLng: null,
    map: null,
    hospitals: [],

    // Get user's location
    async getUserLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            const statusEl = document.querySelector('.map-placeholder p');
            if (statusEl) statusEl.textContent = 'Getting your location...';

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLat = position.coords.latitude;
                    this.userLng = position.coords.longitude;

                    // Update profile
                    ProfileManager.profile.location = `${this.userLat.toFixed(2)}°N, ${this.userLng.toFixed(2)}°E`;
                    ProfileManager.save();

                    resolve({
                        lat: this.userLat,
                        lng: this.userLng
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000
                }
            );
        });
    },

    // Search for nearby hospitals using Google Places API (via Gemini)
    async findNearbyHospitals(lat, lng) {
        // Use Overpass API (free, no key needed) to find real hospitals
        try {
            const radius = 10000; // 10km
            const query = `
                [out:json][timeout:25];
                (
                    node["amenity"="hospital"](around:${radius},${lat},${lng});
                    way["amenity"="hospital"](around:${radius},${lat},${lng});
                    node["amenity"="clinic"]["healthcare"](around:${radius},${lat},${lng});
                    node["healthcare"="psychologist"](around:${radius},${lat},${lng});
                    node["healthcare"="psychiatrist"](around:${radius},${lat},${lng});
                    node["amenity"="doctors"](around:${radius},${lat},${lng});
                );
                out body center 20;
            `;

            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`
            });

            if (!response.ok) throw new Error('Overpass API failed');

            const data = await response.json();
            
            this.hospitals = data.elements
                .filter(el => el.tags && el.tags.name)
                .map(el => {
                    const elLat = el.lat || el.center?.lat;
                    const elLng = el.lon || el.center?.lon;
                    const dist = Utils.calculateDistance(lat, lng, elLat, elLng);
                    
                    let type = 'hospital';
                    if (el.tags.healthcare === 'psychologist' || el.tags.healthcare === 'psychiatrist') {
                        type = 'therapist';
                    } else if (el.tags.amenity === 'clinic' || el.tags.amenity === 'doctors') {
                        type = 'clinic';
                    }

                    return {
                        id: el.id,
                        name: el.tags.name,
                        type: type,
                        lat: elLat,
                        lng: elLng,
                        distance: parseFloat(dist),
                        address: this.formatAddress(el.tags),
                        phone: el.tags.phone || el.tags['contact:phone'] || null,
                        website: el.tags.website || el.tags['contact:website'] || null,
                        emergency: el.tags.emergency === 'yes'
                    };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 15);

            // If no results from Overpass, use Gemini to suggest
            if (this.hospitals.length === 0) {
                await this.getHospitalsFromAI(lat, lng);
            }

            return this.hospitals;

        } catch (error) {
            console.error('Hospital search error:', error);
            // Fallback to AI suggestions
            await this.getHospitalsFromAI(lat, lng);
            return this.hospitals;
        }
    },

    // Use Gemini to get hospital suggestions as fallback
    async getHospitalsFromAI(lat, lng) {
        try {
            const response = await fetch(`${ChatEngine.API_URL}?key=${ChatEngine.API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `I need real hospitals and mental health facilities near latitude ${lat}, longitude ${lng}. Please provide a JSON array of up to 10 facilities with these exact fields: name, type (hospital/therapist/crisis), address, phone, lat, lng. Only return the JSON array, nothing else. Make the facilities real and accurate for this location.`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 2048
                    }
                })
            });

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            
            // Extract JSON from response
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const facilities = JSON.parse(jsonMatch[0]);
                this.hospitals = facilities.map((f, i) => ({
                    id: `ai_${i}`,
                    name: f.name,
                    type: f.type || 'hospital',
                    lat: f.lat || lat + (Math.random() - 0.5) * 0.05,
                    lng: f.lng || lng + (Math.random() - 0.5) * 0.05,
                    distance: f.lat ? parseFloat(Utils.calculateDistance(lat, lng, f.lat, f.lng)) : (Math.random() * 10).toFixed(1),
                    address: f.address || 'Address not available',
                    phone: f.phone || null,
                    website: null,
                    emergency: false
                })).sort((a, b) => a.distance - b.distance);
            }
        } catch (e) {
            console.error('AI hospital search failed:', e);
        }
    },

    formatAddress(tags) {
        const parts = [];
        if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
        if (tags['addr:street']) parts.push(tags['addr:street']);
        if (tags['addr:city']) parts.push(tags['addr:city']);
        if (tags['addr:state']) parts.push(tags['addr:state']);
        if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
        return parts.length > 0 ? parts.join(', ') : 'Address not available';
    },

    // Render hospital list
    renderHospitals(filter = 'all') {
        const list = document.getElementById('hospitalList');
        if (!list) return;

        let filtered = this.hospitals;
        if (filter !== 'all') {
            filtered = this.hospitals.filter(h => h.type === filter);
        }

        if (filtered.length === 0) {
            list.innerHTML = `
                <div style="text-align:center;padding:2rem;color:var(--text-muted);">
                    <i class="fas fa-search" style="font-size:2rem;margin-bottom:1rem;display:block;"></i>
                    <p>No ${filter === 'all' ? '' : filter} facilities found nearby.</p>
                    <p style="font-size:0.85rem;margin-top:0.5rem;">Try expanding your search or try a different category.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(h => {
            const typeLabels = {
                hospital: '🏥 Hospital',
                therapist: '🧠 Mental Health',
                clinic: '🩺 Clinic',
                crisis: '🆘 Crisis Center'
            };

            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}&travelmode=driving`;

            return `
                <div class="hospital-card" data-id="${h.id}">
                    <div class="hospital-card-header">
                        <div>
                            <div class="hospital-name">${Utils.sanitize(h.name)}</div>
                            <span class="hospital-type">${typeLabels[h.type] || typeLabels.hospital}</span>
                        </div>
                        <span class="hospital-distance">${h.distance} km</span>
                    </div>
                    <p class="hospital-address">
                        <i class="fas fa-map-pin" style="color:var(--accent);margin-right:0.3rem;"></i>
                        ${Utils.sanitize(h.address)}
                    </p>
                    <div class="hospital-actions">
                        <a href="${directionsUrl}" target="_blank" rel="noopener" class="hospital-action-btn directions">
                            <i class="fas fa-directions"></i> Get Directions
                        </a>
                        ${h.phone ? `
                            <a href="tel:${h.phone}" class="hospital-action-btn call-hospital">
                                <i class="fas fa-phone-alt"></i> ${h.phone}
                            </a>
                        ` : ''}
                        ${h.website ? `
                            <a href="${h.website}" target="_blank" rel="noopener" class="hospital-action-btn">
                                <i class="fas fa-globe"></i> Website
                            </a>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // Render map using Leaflet (free, no API key)
    renderMap(lat, lng) {
        const mapContainer = document.getElementById('hospitalMap');
        mapContainer.innerHTML = '<div id="leafletMap" style="width:100%;height:100%;"></div>';

        // Load Leaflet CSS and JS dynamically
        if (!document.querySelector('link[href*="leaflet"]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
        }

        const loadLeaflet = () => {
            return new Promise((resolve) => {
                if (window.L) {
                    resolve();
                    return;
                }
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        };

        loadLeaflet().then(() => {
            if (this.map) {
                this.map.remove();
            }

            this.map = L.map('leafletMap').setView([lat, lng], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // User marker
            const userIcon = L.divIcon({
                html: '<div style="width:20px;height:20px;background:#6C5CE7;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20],
                className: 'user-marker'
            });

            L.marker([lat, lng], { icon: userIcon })
                .addTo(this.map)
                .bindPopup('<strong>📍 You are here</strong>');

            // Hospital markers
            this.hospitals.forEach(h => {
                if (h.lat && h.lng) {
                    const hospitalIcon = L.divIcon({
                        html: `<div style="width:16px;height:16px;background:${h.type === 'therapist' ? '#00CEC9' : '#E17055'};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
                        iconSize: [16, 16],
                        className: 'hospital-marker'
                    });

                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;

                    L.marker([h.lat, h.lng], { icon: hospitalIcon })
                        .addTo(this.map)
                        .bindPopup(`
                            <strong>${Utils.sanitize(h.name)}</strong><br>
                            <small>${h.distance} km away</small><br>
                            ${h.phone ? `<a href="tel:${h.phone}">📞 ${h.phone}</a><br>` : ''}
                            <a href="${directionsUrl}" target="_blank">🗺️ Get Directions</a>
                        `);
                }
            });

            // Fit bounds to show all markers
            if (this.hospitals.length > 0) {
                const allPoints = [[lat, lng], ...this.hospitals.filter(h => h.lat && h.lng).map(h => [h.lat, h.lng])];
                this.map.fitBounds(allPoints, { padding: [30, 30] });
            }
        });
    },

    // Search hospitals
    searchHospitals(query) {
        const lower = query.toLowerCase();
        const filtered = this.hospitals.filter(h =>
            h.name.toLowerCase().includes(lower) ||
            h.address.toLowerCase().includes(lower) ||
            h.type.toLowerCase().includes(lower)
        );
        
        const list = document.getElementById('hospitalList');
        // Temporarily override hospitals for rendering
        const original = this.hospitals;
        this.hospitals = filtered;
        this.renderHospitals('all');
        this.hospitals = original;
    }
};
