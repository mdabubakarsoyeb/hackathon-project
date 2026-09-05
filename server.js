const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 1. ALLOW LARGE JSON PAYLOADS (For base64 images)
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// 2. SERVE FRONTEND
app.use(express.static('public'));

// 3. SMART MATCHING
const universityMapping = {
    "Agriculture": "Birsa Agricultural University, Ranchi",
    "Water": "Civil Engineering Dept, NIT Jamshedpur",
    "Sanitation": "Public Health Dept, RIMS Ranchi",
    "Disaster": "NDRF / IIT (ISM) Dhanbad",
    "Education": "Dept of Education, Ranchi University",
    "Healthcare": "Medical College, Ranchi",
    "Urban": "Architecture Dept, BIT Mesra"
};

// 4. SIMPLE JSON DATABASE
const DATA_FILE = path.join(__dirname, 'data.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

// 5. API: GET CHALLENGES
app.get('/api/challenges', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
});

// 6. API: SUBMIT CHALLENGE (NO MULTER NEEDED)
app.post('/api/submit', (req, res) => {
    const { title, category, description, location, urgent, fileData } = req.body;

    const assignedTo = universityMapping[category] || "State Innovation Council (Pending review)";

    // Risk Score Logic
    let riskScore = 0;
    let riskLevel = "Low";
    const text = (description + " " + title).toLowerCase();
    const highRiskWords = ["death", "died", "urgent", "flood", "emergency", "hospital", "children", "collapse", "sewage", "outbreak"];
    const mediumRiskWords = ["damage", "accident", "traffic", "blocked", "disease", "pollution", "stagnant", "long time"];

    highRiskWords.forEach(word => { if (text.includes(word)) riskScore += 20; });
    mediumRiskWords.forEach(word => { if (text.includes(word)) riskScore += 10; });
    if (urgent) riskScore += 30;
    if (riskScore > 80) riskScore = 80;
    if (riskScore >= 60) riskLevel = "High";
    else if (riskScore >= 30) riskLevel = "Medium";
    else riskLevel = "Low";

    // Create challenge with base64 image (or null)
    const newChallenge = {
        id: Date.now(),
        title,
        category,
        description,
        location,
        urgent: urgent,
        fileUrl: fileData ? `data:image/jpeg;base64,${fileData}` : null, // Stored directly in JSON
        assignedTo: assignedTo,
        upvotes: 0,
        riskScore: riskScore,
        riskLevel: riskLevel,
        submittedAt: new Date().toISOString()
    };

    const currentData = JSON.parse(fs.readFileSync(DATA_FILE));
    currentData.push(newChallenge);
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));

    res.status(201).json({ message: 'Challenge submitted successfully', challenge: newChallenge });
});

// 7. API: UPVOTE
app.post('/api/upvote/:id', (req, res) => {
    let currentData = JSON.parse(fs.readFileSync(DATA_FILE));
    const index = currentData.findIndex(c => c.id == req.params.id);
    if (index !== -1) {
        currentData[index].upvotes++;
        fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));
        res.json(currentData[index]);
    } else {
        res.status(404).send('Challenge not found');
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://localhost:3000`));
