const server = window.location.host;
const socket = new WebSocket(`ws://${server}/ws?client_type=control`);

socket.onclose = (event) => {
    console.log('WebSocket closed:', event);
    console.log(`WebSocket closed with error code ${event.code}. Reconnecting...`);
    setTimeout(openWebSocket, 5000);
}

socket.onopen = function (event) {
    console.log("WebSocket is open now.");
};

socket.onmessage = function (event) {
    try {
        const data = JSON.parse(event.data);
        if (data.time && typeof data.time.activated === 'boolean') {
            updatePage(data);
        } else {
            console.log('Non State Info')
            if (data.status) {
                switch (true) {
                    case (data.message.includes('popup')):
                        console.log('popup successfully sent')
                }
            }
        }

    } catch (e) {
        console.error("Error parsing JSON:", e);
    }
};

socket.onclose = function (event) {
    console.log("WebSocket is closed now.");
};

function updatePage(data) {
    document.getElementById('gameTime').value = data.time.gameTime;
    document.getElementById('homeName').value = data.home.name;
    document.getElementById('homeSubtext').value = data.home.subtext;
    document.getElementById('homeScore').value = data.home.score;
    document.getElementById('homeColor').value = data.home.color;
    document.getElementById('awayName').value = data.away.name;
    document.getElementById('awaySubtext').value = data.away.subtext;
    document.getElementById('awayScore').value = data.away.score;
    document.getElementById('awayColor').value = data.away.color;
    document.getElementById('homeBorder').style.borderColor = data.home.color;
    document.getElementById('awayBorder').style.borderColor = data.away.color;
    updateTeamColors(data.home.color, data.away.color);
    document.querySelector('.quick-actions-group.scoreHome h3').textContent = `Home Score (${data.home.name} ${data.home.subtext})`
    document.querySelector('.quick-actions-group.scoreAway h3').textContent = `Away Score (${data.away.name} ${data.away.subtext})`
}

function sendData() {
    const data = {
        time: {
            activated: true,
            gameTime: document.getElementById('gameTime').value
        },
        home: {
            name: document.getElementById('homeName').value,
            subtext: document.getElementById('homeSubtext').value,
            score: parseInt(document.getElementById('homeScore').value, 10),
            color: document.getElementById('homeColor').value
        },
        away: {
            name: document.getElementById('awayName').value,
            subtext: document.getElementById('awaySubtext').value,
            score: parseInt(document.getElementById('awayScore').value, 10),
            color: document.getElementById('awayColor').value
        }
    };
    document.getElementById('homeBorder').style.borderColor = data.home.color;
    document.getElementById('awayBorder').style.borderColor = data.away.color;
    updateTeamColors(data.home.color, data.away.color);
    socket.send(JSON.stringify(data));
}

function resetData() {
    socket.send(JSON.stringify({ command: "reset" }));
}

function sendBannerData() {
    const bannerData = {
        command: "banner",
        text: document.getElementById('bannerText').value,
        bgColor: document.getElementById('bannerBgColor').value,
        textColor: document.getElementById('bannerTextColor').value,
        duration: parseInt(document.getElementById('bannerDuration').value, 10) * 1000 // Convert to milliseconds
    };
    socket.send(JSON.stringify(bannerData));
}

function setBannerBgColor(team) {
    const color = team === 'home' ? document.getElementById('homeColor').value : document.getElementById('awayColor').value;
    document.getElementById('bannerBgColor').value = color;
}

function sendPersistentBanner() {
    const bannerData = {
        command: "persistent_banner",
        text: document.getElementById('bannerText').value,
        bgColor: document.getElementById('bannerBgColor').value,
        textColor: document.getElementById('bannerTextColor').value
    };
    socket.send(JSON.stringify(bannerData));
}

function removeBanner() {
    const bannerData = {
        command: "remove_banner"
    };
    socket.send(JSON.stringify(bannerData));
}

function updateTeamColors(homeColor, awayColor) {
    document.documentElement.style.setProperty('--home-color', homeColor);
    document.documentElement.style.setProperty('--away-color', awayColor);
}

document.addEventListener('DOMContentLoaded', function () {
    // No more color input event listeners
});

let activePopup = null;

function sendPopupData() {
    if (activePopup) {
        alert("A popup is already active. Please remove it first.");
        return;
    }

    const popupData = {
        command: "popup",
        text: document.getElementById('popupText').value,
        team: document.getElementById('popupTeam').value,
        bgColor: document.getElementById('popupBgColor').value,
        textColor: document.getElementById('popupTextColor').value,
        duration: parseInt(document.getElementById('popupDuration').value, 10) * 1000
    };

    activePopup = popupData;
    updateActivePopupsList();
    socket.send(JSON.stringify(popupData));
}

function sendPersistentPopup() {
    if (activePopup) {
        alert("A popup is already active. Please remove it first.");
        return;
    }

    const popupData = {
        command: "persistent_popup",
        text: document.getElementById('popupText').value,
        team: document.getElementById('popupTeam').value,
        bgColor: document.getElementById('popupBgColor').value,
        textColor: document.getElementById('popupTextColor').value
    };

    activePopup = popupData;
    updateActivePopupsList();
    socket.send(JSON.stringify(popupData));
}

function removePopup() {
    const popupData = {
        command: "remove_popup"
    };
    activePopup = null;
    updateActivePopupsList();
    socket.send(JSON.stringify(popupData));
}

function updateActivePopupsList() {
    const listDiv = document.getElementById('activePopupsList');
    if (activePopup) {
        listDiv.innerHTML = `
            <div class="active-popup-item">
                <span>${activePopup.text}</span>
                <span>(${activePopup.team} team)</span>
            </div>
        `;
    } else {
        listDiv.innerHTML = 'No active popups';
    }
}

let presets = [];

function quickAction(action) {
    const currentData = {
        time: {
            activated: true,
            gameTime: document.getElementById('gameTime').value
        },
        home: {
            name: document.getElementById('homeName').value,
            subtext: document.getElementById('homeSubtext').value,
            score: parseInt(document.getElementById('homeScore').value, 10),
            color: document.getElementById('homeColor').value
        },
        away: {
            name: document.getElementById('awayName').value,
            subtext: document.getElementById('awaySubtext').value,
            score: parseInt(document.getElementById('awayScore').value, 10),
            color: document.getElementById('awayColor').value
        }
    };

    switch (action) {
        case 'homeScoreUp':
            currentData.home.score++;
            break;
        case 'homeScoreDown':
            currentData.home.score = Math.max(0, currentData.home.score - 1);
            break;
        case 'awayScoreUp':
            currentData.away.score++;
            break;
        case 'awayScoreDown':
            currentData.away.score = Math.max(0, currentData.away.score - 1);
            break;
    }

    updatePage(currentData);
    socket.send(JSON.stringify(currentData));
}

function saveNewPreset() {
    const name = prompt("Enter preset name:");
    if (!name) return;

    const preset = {
        name,
        data: {
            time: {
                activated: true,
                gameTime: document.getElementById('gameTime').value
            },
            home: {
                name: document.getElementById('homeName').value,
                subtext: document.getElementById('homeSubtext').value,
                score: parseInt(document.getElementById('homeScore').value, 10),
                color: document.getElementById('homeColor').value
            },
            away: {
                name: document.getElementById('awayName').value,
                subtext: document.getElementById('awaySubtext').value,
                score: parseInt(document.getElementById('awayScore').value, 10),
                color: document.getElementById('awayColor').value
            }
        }
    };

    presets.push(preset);
    updatePresetButtons();
}

function updatePresetButtons() {
    const container = document.getElementById('presetButtons');
    container.innerHTML = '';

    presets.forEach((preset, index) => {
        const button = document.createElement('button');
        button.className = 'quick-button';
        button.style.backgroundColor = '#4B5563';
        button.textContent = preset.name;
        button.onclick = () => loadPreset(index);
        container.appendChild(button);
    });
}

function loadPreset(index) {
    const preset = presets[index];
    updatePage(preset.data);
    socket.send(JSON.stringify(preset.data));
}

function savePresetsToFile() {
    const dataStr = JSON.stringify(presets, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'scorebug_presets.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function loadPresetsFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = event => {
            try {
                presets = JSON.parse(event.target.result);
                updatePresetButtons();
            } catch (err) {
                alert('Error loading presets file');
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// Initialize preset buttons when page loads
document.addEventListener('DOMContentLoaded', function () {
    updatePresetButtons();
});

function updateScoreButtons() {
    const sport = document.getElementById('sportType').value;
    const homeScores = document.getElementById('homeScoreButtons');
    const homeFlags = document.querySelector('.quickPopup.home')
    const awayScores = document.getElementById('awayScoreButtons');
    const awayFlags = document.querySelector('.quickPopup.away')

    let buttons = {
        scoreButtons: [],
        flagButtons: []
    };

    switch (sport) {
        case 'football':
            buttons.scoreButtons = [
                { value: 1, label: '+1 (PAT)', banner: true },
                { value: 2, label: '+2 (Conv)', banner: true },
                { value: 3, label: '+3 (FG)', banner: true },
                { value: 6, label: '+6 (TD)', banner: true },
                { value: -1, label: '-1', banner: false },
                { value: -2, label: '-2', banner: false },
                { value: -3, label: '-3', banner: false },
                { value: -6, label: '-6', banner: false }
            ];
            buttons.flagButtons = [
                { label: 'Penalty', color: '#FFD700' },
                { label: 'Challenge', color: '#FF0000' },
                { label: 'Timeout', color: '#FFA500' }
            ];
            break;
        case 'basketball':
            buttons.scoreButtons = [
                { value: 1, label: '+1 (FT)', banner: true },
                { value: 2, label: '+2', banner: true },
                { value: 3, label: '+3', banner: true },
                { value: -1, label: '-1', banner: false },
                { value: -2, label: '-2', banner: false },
                { value: -3, label: '-3', banner: false }
            ];
            buttons.flagButtons = [
                { label: 'Foul', color: '#FFD700' },
                { label: 'Timeout', color: '#FFA500' },
                { label: 'Shot Clock', color: '#FF0000' }
            ];
            break;
        default:
            buttons.scoreButtons = [
                { value: 1, label: '+1', banner: false },
                { value: 2, label: '+2', banner: false },
                { value: 3, label: '+3', banner: false },
                { value: -1, label: '-1', banner: false },
                { value: -2, label: '-2', banner: false },
                { value: -3, label: '-3', banner: false }
            ];
            buttons.flagButtons = [
                { label: 'Timeout', color: '#FFA500' },
                { label: 'Foul', color: '#FFD700' }
            ];
    }

    // Update home buttons

    homeScores.innerHTML = `
        ${buttons.scoreButtons.map(btn => `
            <div class="score-button-group">
                <button onclick="updateScore('home', ${btn.value})" class="quick-button score-button home-color">
                    ${btn.label}
                </button>
                ${btn.banner && btn.value > 0 ? `
                    <button onclick="sendScoreBanner('home', ${btn.value})" class="quick-button banner-button home-color">
                        🔔
                    </button>
                ` : ''}
            </div>
        `).join('')}
    `;

    homeFlags.innerHTML = `${buttons.flagButtons.map(btn => `
            <button onclick="sendQuickPopup('home', '${btn.label}')" 
                    class="quick-button score-button"
                    style="background-color: ${btn.color}">
                🚩 ${btn.label}
            </button>
        `).join('')}`

    // Update away buttons
    console.log('before score')
    awayScores.innerHTML = `
        ${buttons.scoreButtons.map(btn => `
            <div class="score-button-group">
                <button onclick="updateScore('away', ${btn.value})" class="quick-button score-button away-color">
                    ${btn.label}
                </button>
                ${btn.banner && btn.value > 0 ? `
                    <button onclick="sendScoreBanner('away', ${btn.value})" class="quick-button banner-button away-color">
                        🔔
                    </button>
                ` : ''}
            </div>
        `).join('')}
    `;
    console.log('after score')
    awayFlags.innerHTML = `${buttons.flagButtons.map(btn => `
            <button onclick="sendQuickPopup('away', '${btn.label}')" 
                    class="quick-button score-button"
                    style="background-color: ${btn.color}">
                🚩 ${btn.label}
            </button>
        `).join('')}`
}

function updateScore(team, value) {
    const scoreElement = document.getElementById(`${team}Score`);
    let currentScore = parseInt(scoreElement.value, 10);
    currentScore += value;

    // Prevent negative scores
    if (currentScore < 0) currentScore = 0;

    scoreElement.value = currentScore;
    sendData(); // Send the updated score to the server
}

function sendScoreBanner(team, points) {
    const teamData = team === 'home' ? {
        name: document.getElementById('homeName').value,
        subtext: document.getElementById('homeSubtext').value,
        color: document.getElementById('homeColor').value
    } : {
        name: document.getElementById('awayName').value,
        subtext: document.getElementById('awaySubtext').value,
        color: document.getElementById('awayColor').value
    };

    let bannerText = '';
    switch (points) {
        case 1:
            bannerText = 'Extra Point';
            break;
        case 2:
            bannerText = '2-Point Conversion';
            break;
        case 3:
            bannerText = 'Field Goal';
            break;
        case 6:
            bannerText = 'Touchdown';
            break;
        default:
            bannerText = `${points} Points`;
    }

    const nameType = document.getElementById('bannerNameType').value;
    const displayName = nameType === 'main' ? teamData.name : nameType === 'sub' ? teamData.subtext : `${teamData.name} ${teamData.subtext}`;

    const bannerData = {
        command: "banner",
        text: `${displayName} ${bannerText}!`,
        bgColor: teamData.color,
        textColor: "#ffffff",
        duration: 5000 // 5 seconds
    };

    socket.send(JSON.stringify(bannerData));
}

// Add this new function to handle flag popups
function sendQuickPopup(team, flagType) {
    const teamData = team === 'home' ? {
        name: document.getElementById('homeName').value,
        subtext: document.getElementById('homeSubtext').value,
        color: document.getElementById('homeColor').value
    } : {
        name: document.getElementById('awayName').value,
        subtext: document.getElementById('awaySubtext').value,
        color: document.getElementById('awayColor').value
    };

    const nameType = document.getElementById('bannerNameType').value;
    const displayName = nameType === 'main' ? teamData.name :
        nameType === 'sub' ? teamData.subtext :
            `${teamData.name} ${teamData.subtext}`;

    const popupData = {
        command: "persistent_popup",
        text: `${flagType}`,
        team: team,
        bgColor: "#00000",
        textColor: teamData.color,
        duration: "" // 5 seconds
    };

    activePopup = popupData; // Update the activePopup variable
    updateActivePopupsList(); // Update the active popups list
    socket.send(JSON.stringify(popupData));
}

// Initialize score buttons when page loads
document.addEventListener('DOMContentLoaded', function () {
    updatePresetButtons();
    updateScoreButtons();
}); 