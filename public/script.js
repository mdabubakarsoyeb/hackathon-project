document.addEventListener('DOMContentLoaded', () => {
    const homePage = document.getElementById('homePage');
    const loginPage = document.getElementById('loginPage');
    const mainApp = document.getElementById('mainApp');
    const loginForm = document.getElementById('loginForm');
    const form = document.getElementById('challengeForm');
    const gpsBtn = document.getElementById('gpsBtn');
    const locationInput = document.getElementById('location');
    const challengeCards = document.getElementById('challengeCards');

    // FUNCTIONS TO SWITCH PAGES
    window.showLogin = () => { homePage.style.display = 'none'; loginPage.style.display = 'flex'; };
    window.goHome = () => { loginPage.style.display = 'none'; homePage.style.display = 'block'; };
    window.logout = () => { mainApp.style.display = 'none'; homePage.style.display = 'block'; loginForm.reset(); challengeCards.innerHTML = ''; };

    // LOGIN LOGIC
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('userName').value;
        const terms = document.getElementById('terms').checked;

        if (!terms) { alert('⚠️ Please agree to the Terms & Conditions before logging in!'); return; }
        
        loginPage.style.display = 'none';
        mainApp.style.display = 'block';
        
        alert(`Welcome, ${name}! You are now logged in.`);
        loadChallenges();
    });

    // GPS
    gpsBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                locationInput.value = `Lat: ${position.coords.latitude}, Lon: ${position.coords.longitude}`;
            }, () => alert('Unable to retrieve location.'));
        } else { alert('Geolocation not supported.'); }
    });

    // SUBMIT CHALLENGE (WITH BASE64 IMAGE)
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value;
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const location = document.getElementById('location').value;
        const urgent = document.getElementById('urgent').checked;
        const fileInput = document.getElementById('attachment');

        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64Data = event.target.result.split(',')[1]; // Remove data:image/jpeg;base64,
                sendData({ title, category, description, location, urgent, fileData: base64Data });
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            sendData({ title, category, description, location, urgent, fileData: null });
        }
    });

    // SEND DATA TO BACKEND
    async function sendData(data) {
        alert("Submitting your challenge...");
        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                alert('✅ Challenge submitted! Assigned to a University.');
                form.reset();
                loadChallenges();
            } else { alert('❌ Failed to submit.'); }
        } catch (error) { alert('❌ Error connecting to server.'); }
    }

    // LOAD CHALLENGES
    async function loadChallenges() {
        const response = await fetch('/api/challenges');
        let challenges = await response.json();
        
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
                mediaHtml = `<img src="${challenge.fileUrl}">`;
            }

            let urgentBadge = challenge.urgent ? `<div class="urgent-badge">🚨 CRITICAL</div>` : '';

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
