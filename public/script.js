document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('challengeForm');
    const gpsBtn = document.getElementById('gpsBtn');
    const locationInput = document.getElementById('location');
    const challengeCards = document.getElementById('challengeCards');

    loadChallenges();

    gpsBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                locationInput.value = `Lat: ${position.coords.latitude}, Lon: ${position.coords.longitude}`;
            }, () => alert('Unable to retrieve location.'));
        } else { alert('Geolocation not supported.'); }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        alert("Submitting your challenge...");

        try {
            const response = await fetch('/api/submit', { method: 'POST', body: formData });
            if (response.ok) {
                alert('✅ Challenge submitted! Assigned to a University.');
                form.reset();
                loadChallenges();
            } else { alert('❌ Failed to submit.'); }
        } catch (error) { alert('❌ Error connecting to server.'); }
    });

    async function loadChallenges() {
        const response = await fetch('/api/challenges');
        let challenges = await response.json();
        
        // SORT: Urgent issues first, then highest upvotes
        challenges.sort((a, b) => {
            if (a.urgent && !b.urgent) return -1;
            if (!a.urgent && b.urgent) return 1;
            return b.upvotes - a.upvotes;
        });

        challengeCards.innerHTML = '';
        if (challenges.length === 0) { challengeCards.innerHTML = '<p>No challenges yet. Be the first to submit one!</p>'; return; }

        challenges.forEach(challenge => {
            const card = document.createElement('div');
            card.className = `card ${challenge.urgent ? 'urgent' : ''}`;
            
            let mediaHtml = '';
            if (challenge.fileUrl) {
                const ext = challenge.fileUrl.split('.').pop();
                if (['jpg','jpeg','png','gif'].includes(ext)) mediaHtml = `<img src="${challenge.fileUrl}">`;
                else mediaHtml = `<video src="${challenge.fileUrl}" controls></video>`;
            }

            let urgentBadge = challenge.urgent ? `<div class="urgent-badge">🚨 CRITICAL</div>` : '';

            // New Risk Score Display
            card.innerHTML = `
                ${urgentBadge}
                <div class="risk-box risk-${challenge.riskLevel.toLowerCase()}">
                    <strong>⚠️ Risk Score:</strong> ${challenge.riskScore}/80 
                    <span class="risk-label">${challenge.riskLevel} Priority</span>
                </div>
                <h3>${challenge.title}</h3>
                <p><strong>${challenge.category}</strong></p>
                <p>${challenge.description}</p>
                <p>📍 ${challenge.location}</p>
                
                <div class="partner-box">
                    <strong>🏛️ Auto-Assigned To:</strong><br>${challenge.assignedTo}
                </div>

                ${mediaHtml}

                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <p style="font-size:12px; color:#777;">Posted: ${new Date(challenge.submittedAt).toLocaleDateString()}</p>
                    <button class="upvote-btn" onclick="upvote(${challenge.id})">👍 Upvote (${challenge.upvotes})</button>
                </div>
            `;
            challengeCards.appendChild(card);
        });
    }

    window.upvote = async (id) => {
        await fetch(`/api/upvote/${id}`, { method: 'POST' });
        loadChallenges();
    };
});