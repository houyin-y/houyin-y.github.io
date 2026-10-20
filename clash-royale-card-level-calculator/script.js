const upgradeRequirements = {
    common:    { 2:2, 3:4, 4:10, 5:20, 6:50, 7:100, 8:200, 9:400, 10:800, 11:1000, 12:1500, 13:2500, 14:3500, 15:5500, 16:7500 },
    rare:      { 4:2, 5:4, 6:10, 7:20, 8:50, 9:100, 10:200, 11:300, 12:400, 13:550, 14:750, 15:1000, 16:1400 },
    epic:      { 7:2, 8:4, 9:10, 10:20, 11:30, 12:50, 13:70, 14:100, 15:130, 16:180 },
    legendary: { 10:2, 11:4, 12:6, 13:9, 14:12, 15:14, 16:20 },
    champion:  { 12:2, 13:5, 14:8, 15:11, 16:20 }
};

const minLevels = { common: 1, rare: 3, epic: 6, legendary: 9, champion: 11 };
const maxLevel = 16;

function updateLevelOptions() {
    const rarity = document.getElementById("rarity").value;
    const currentLevelSelect = document.getElementById("currentLevel");
    const minLvl = minLevels[rarity];

    currentLevelSelect.innerHTML = "";
    for (let lvl = minLvl; lvl < maxLevel; lvl++) {
        const option = document.createElement("option");
        option.value = lvl;
        option.textContent = `Level ${lvl}`;
        currentLevelSelect.appendChild(option);
    }
}

function calculateMaxLevel() {
    const cardName = document.getElementById("cardName").value.trim();
    const rarity = document.getElementById("rarity").value;
    let currentLvl = parseInt(document.getElementById("currentLevel").value);
    let availableCards = parseInt(document.getElementById("cardAmount").value) || 0;

    const reqs = upgradeRequirements[rarity];
    let reachedLvl = currentLvl;

    while (reachedLvl < maxLevel) {
        const needed = reqs[reachedLvl+1];
        if (availableCards >= needed) {
            availableCards -= needed;
            reachedLvl++;
        } else {
            break;
        }
    }

    const resultBox = document.getElementById("result");
    const cardTitleResult = document.getElementById("cardTitleResult");
    const maxLevelResult = document.getElementById("maxLevelResult");
    const leftoverResult = document.getElementById("leftoverResult");
    const nextLevelResult = document.getElementById("nextLevelResult");

    resultBox.style.display = "block";
    
    if (cardName) {
        cardTitleResult.style.display = "block";
        cardTitleResult.textContent = cardName;
    } else {
        cardTitleResult.style.display = "none";
    }

    maxLevelResult.textContent = `Achievable Level: Level ${reachedLvl}`;
    leftoverResult.textContent = `Leftover Cards: ${availableCards.toLocaleString()}`;

    if (reachedLvl < maxLevel) {
        const nextReq = reqs[reachedLvl+1];
        const stillNeeded = nextReq - availableCards;
        nextLevelResult.textContent = `Cards needed for Level ${reachedLvl + 1}: ${stillNeeded.toLocaleString()} more`;
    } 

    // Save calculation to LocalStorage
    saveToHistory(cardName, rarity, currentLvl, reachedLvl, availableCards);
}

function saveToHistory(cardName, rarity, startLvl, maxLvl, leftover) {
    const history = JSON.parse(localStorage.getItem("cr_calc_history")) || [];
    const record = {
        cardName: cardName || "Unnamed Card",
        rarity: rarity.charAt(0).toUpperCase() + rarity.slice(1),
        startLvl,
        maxLvl,
        leftover,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    history.unshift(record);
    if (history.length > 10) history.pop();
    
    localStorage.setItem("cr_calc_history", JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem("cr_calc_history")) || [];
    const historyList = document.getElementById("historyList");
    
    if (history.length === 0) {
        historyList.innerHTML = `<div class="history-item">No saved calculations yet.</div>`;
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <div>
                <div class="history-card-name">${item.cardName}</div>
                <small style="opacity: 0.7;">${item.rarity} (Lvl ${item.startLvl})</small>
            </div>
            <span class="highlight">➔ Lvl ${item.maxLvl}</span>
        </div>
    `).join("");
}

function toggleHistory() {
    const panel = document.getElementById("historyPanel");
    panel.style.display = panel.style.display === "block" ? "none" : "block";
}

function clearHistory() {
    localStorage.removeItem("cr_calc_history");
    renderHistory();
}

document.addEventListener("DOMContentLoaded", () => {
    updateLevelOptions();
    renderHistory();
});