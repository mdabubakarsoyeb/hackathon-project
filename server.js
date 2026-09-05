const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve frontend files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Setup file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// ----- THE UNIQUE "BRAIN" (Algorithm for University Matching) -----
const universityMapping = {
    "Agriculture": "Birsa Agricultural University, Ranchi",
    "Water": "Civil Engineering Dept, NIT Jamshedpur",
    "Sanitation": "Public Health Dept, RIMS Ranchi",
    "Disaster": "NDRF / IIT (ISM) Dhanbad",
    "Education": "Dept of Education, Ranchi University",
    "Healthcare": "Medical College, Ranchi",
    "Urban": "Architecture Dept, BIT Mesra"
};

// Simple JSON Database
const DATA_FILE = path.join(__dirname, 'data.json');
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([]));

// API: Get all challenges
app.get('/api/challenges', (req, res) => {
    res.json(JSON.parse(fs.readFileSync(DATA_FILE)));
});

// API: Submit a new challenge
app.post('/api/submit', upload.single('attachment'), (req, res) => {
    const { title, category, description, location, urgent } = req.body;
    const file = req.file;

    // Automatically assign university based on category
    const assignedTo = universityMapping[category] || "State Innovation Council (Pending review)";

    // --- NEW: AI PREDICTION (Risk Score Calculator) ---
    let riskScore = 0;
    let riskLevel = "Low";
    const text = (description + " " + title).toLowerCase();

    const highRiskWords = ["death", "died", "urgent", "flood", "emergency", "hospital", "children", "collapse", "sewage", "outbreak"];
    const mediumRiskWords = ["damage", "accident", "traffic", "blocked", "disease", "pollution", "stagnant", "long time"];

    highRiskWords.forEach(word => {
        if (text.includes(word)) riskScore += 20;
    });

    mediumRiskWords.forEach(word => {
        if (text.includes(word)) riskScore += 10;
    });

    if (urgent === 'on') riskScore += 30; // Urgent checkbox adds 30 points
    if (riskScore > 80) riskScore = 80; // Cap score at 80

    if (riskScore >= 60) riskLevel = "High";
    else if (riskScore >= 30) riskLevel = "Medium";
    else riskLevel = "Low";
    // --- END AI PREDICTION ---

    const newChallenge = {
        id: Date.now(),
        title,
        category,
        description,
        location,
        urgent: urgent === 'on' ? true : false,
        fileUrl: file ? `/uploads/${file.filename}` : null,
        assignedTo: assignedTo,
        upvotes: 0,
        riskScore: riskScore, // Save the score
        riskLevel: riskLevel, // Save the level
        submittedAt: new Date().toISOString()
    };

    // Save to database
    const currentData = JSON.parse(fs.readFileSync(DATA_FILE));
    currentData.push(newChallenge);
    fs.writeFileSync(DATA_FILE, JSON.stringify(currentData, null, 2));

    res.status(201).json({ message: 'Challenge submitted successfully', challenge: newChallenge });
});

// API: Upvote a challenge
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

// ✅ THIS IS THE ONLY LINE THAT CHANGED (Added '0.0.0.0')
app.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://localhost:3000`));