// PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.error('Service Worker registration failed.', err));
    });
}

// DOM要素
const pomodoroTimerBox = document.getElementById('pomodoro-timer');
const breakTimerBox = document.getElementById('break-timer');
const pomodoroDisplay = document.getElementById('pomodoro-display');
const breakDisplay = document.getElementById('break-display');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const currentSetDisplay = document.getElementById('current-set');
const totalSetsDisplay = document.getElementById('total-sets');
const totalTimeDisplayMain = document.querySelector('#total-time-display-main span');
const resetTotalTimeBtn = document.getElementById('reset-total-time-btn');

// 設定関連のDOM
const settingsBtn = document.getElementById('settings-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const settingsModal = document.getElementById('settings-modal');
const pomodoroDurationInput = document.getElementById('pomodoro-duration');
const breakDurationInput = document.getElementById('break-duration');
const setsInput = document.getElementById('sets-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const totalStudyTimePreview = document.getElementById('total-study-time-preview');
const totalSessionTimePreview = document.getElementById('total-session-time-preview');

// 効果音
const focusEndSound = document.getElementById('focus-end-sound');
const breakEndSound = document.getElementById('break-end-sound');
const sessionEndSound = document.getElementById('session-end-sound');

// 設定値
let pomodoroMins = localStorage.getItem('pomodoroMins') || 25;
let breakMins = localStorage.getItem('breakMins') || 5;
let totalSets = localStorage.getItem('totalSets') || 4;

// タイマーの状態変数
let timerInterval;
let timeLeft;
let currentMode = 'pomodoro';
let currentSet = 0;
let isRunning = false;
let dailyTotalSeconds = 0; // シンプルな総学習時間（秒）に戻す

// --- 初期化とUI更新 ---

function initialize() {
    loadSettings();
    loadTheme();
    loadDailyTotal(); // 関数名を元に戻す
    resetAll();
}

function updateAllDisplays() {
    let pomodoroTimeToShow;
    let breakTimeToShow;

    if (currentMode === 'pomodoro') {
        pomodoroTimeToShow = timeLeft;
        breakTimeToShow = breakMins * 60;
    } else {
        pomodoroTimeToShow = pomodoroMins * 60;
        breakTimeToShow = timeLeft;
    }
    
    pomodoroDisplay.textContent = formatTime(pomodoroTimeToShow, 'mm:ss');
    breakDisplay.textContent = formatTime(breakTimeToShow, 'mm:ss');

    pomodoroTimerBox.classList.toggle('active', currentMode === 'pomodoro');
    breakTimerBox.classList.toggle('active', currentMode === 'break');
    
    currentSetDisplay.textContent = currentSet;
    totalSetsDisplay.textContent = totalSets;
    
    totalTimeDisplayMain.textContent = formatTime(dailyTotalSeconds, 'hh:mm:ss');

    if (isRunning) {
        document.title = `${formatTime(timeLeft, 'mm:ss')} - ${currentMode === 'pomodoro' ? '集中' : '休憩'}`;
    } else {
        document.title = '学習タイマー';
    }
}

function formatTime(seconds, formatType) {
    if (seconds === undefined || isNaN(seconds)) seconds = 0;

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (formatType === 'hh:mm:ss') {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    if (formatType === 'h:m') {
        if (h === 0) return `${m}分`;
        return `${h}時間${m}分`;
    }
    const totalMinutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(totalMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

// --- タイマーのコアロジック ---

function startTimer() {
    if (isRunning) return;
    isRunning = true;

    if (currentSet === 0) {
        currentSet = 1;
    }
    
    if (timeLeft === undefined || timeLeft <= 0) {
        timeLeft = (currentMode === 'pomodoro' ? pomodoroMins : breakMins) * 60;
    }

    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    
    Notification.requestPermission();

    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            if (currentMode === 'pomodoro') {
                dailyTotalSeconds++;
                saveDailyTotal(); // シンプルな保存関数を呼ぶ
            }
        }
        updateAllDisplays();

        if (timeLeft <= 0) {
            handleTimerEnd();
        }
    }, 1000);
}

function stopTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    startBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    updateAllDisplays();
}

function resetAll() {
    stopTimer();
    currentMode = 'pomodoro';
    currentSet = 0;
    timeLeft = pomodoroMins * 60;
    updateAllDisplays();
}

// ★★★ バグ修正 ★★★
function handleTimerEnd() {
    // 集中タイマー終了時の処理
    if (currentMode === 'pomodoro') {
        // もし最終セットの集中が終わったら
        if (currentSet >= totalSets) {
            sessionEndSound.play();
            alert('全セット完了です！お疲れ様でした！');
            resetAll(); // 全てリセットして終了
            return; // 休憩タイマーを開始させない
        }
        // 最終セットでなければ、休憩へ
        focusEndSound.play();
        currentMode = 'break';
        timeLeft = breakMins * 60;
        currentSet++; // 次のセットに進む（休憩が終わったタイミングから変更）
    } 
    // 休憩タイマー終了時の処理
    else { 
        breakEndSound.play();
        currentMode = 'pomodoro';
        timeLeft = pomodoroMins * 60;
    }
    showNotification();
    updateAllDisplays();
}

function showNotification() {
    if (Notification.permission !== 'granted') return;
    const title = currentMode === 'pomodoro' ? '休憩終了！集中を再開しましょう' : '集中お疲れ様でした！休憩に入ります';
    const body = `次のセット: ${currentSet} / ${totalSets}`;
    new Notification(title, { body, icon: '/icon-192x192.png' });
}

// --- 設定、テーマ、データ永続化 ---

function loadSettings() {
    pomodoroDurationInput.value = pomodoroMins;
    breakDurationInput.value = breakMins;
    setsInput.value = totalSets;
    updateTimePreviews();
}

function saveSettings() {
    const sanitizedPomodoro = Math.max(1, parseInt(pomodoroDurationInput.value, 10) || 1);
    const sanitizedBreak = Math.max(1, parseInt(breakDurationInput.value, 10) || 1);
    const sanitizedSets = Math.max(1, parseInt(setsInput.value, 10) || 1);

    pomodoroMins = sanitizedPomodoro;
    breakMins = sanitizedBreak;
    totalSets = sanitizedSets;

    localStorage.setItem('pomodoroMins', pomodoroMins);
    localStorage.setItem('breakMins', breakMins);
    localStorage.setItem('totalSets', totalSets);
    
    settingsModal.style.display = 'none';
    resetAll();
}

function updateTimePreviews() {
    const pomodoroVal = Math.max(1, parseInt(pomodoroDurationInput.value, 10) || 1);
    const breakVal = Math.max(1, parseInt(breakDurationInput.value, 10) || 1);
    const setsVal = Math.max(1, parseInt(setsInput.value, 10) || 1);

    const totalStudySeconds = pomodoroVal * setsVal * 60;
    const totalSessionSeconds = (pomodoroVal + breakVal) * setsVal * 60 - (breakVal * 60);

    totalStudyTimePreview.textContent = formatTime(totalStudySeconds, 'h:m');
    totalSessionTimePreview.textContent = formatTime(totalSessionSeconds, 'h:m');
}

// シンプルなデータ管理に戻す
function loadDailyTotal() {
    const today = new Date().toISOString().slice(0, 10);
    const data = JSON.parse(localStorage.getItem('dailyStudyTime'));
    if (data && data.date === today) {
        dailyTotalSeconds = data.seconds;
    } else {
        dailyTotalSeconds = 0;
        saveDailyTotal();
    }
    updateAllDisplays();
}

function saveDailyTotal() {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('dailyStudyTime', JSON.stringify({ date: today, seconds: dailyTotalSeconds }));
}

function resetDailyTotal() {
    if (confirm('今日の総学習時間をリセットしますか？')) {
        dailyTotalSeconds = 0;
        saveDailyTotal();
        updateAllDisplays();
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        themeToggleBtn.textContent = '🌙';
    }
}

// --- イベントリスナー ---
startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetAll);
settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsModal.style.display = 'flex';
});
saveSettingsBtn.addEventListener('click', saveSettings);
themeToggleBtn.addEventListener('click', toggleTheme);
resetTotalTimeBtn.addEventListener('click', resetDailyTotal);

pomodoroDurationInput.addEventListener('input', updateTimePreviews);
breakDurationInput.addEventListener('input', updateTimePreviews);
setsInput.addEventListener('input', updateTimePreviews);

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.style.display = 'none';
});

// 初期化実行
initialize();