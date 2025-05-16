$(function() { // Shorthand for $(document).ready()
    // Játék változók
    let score = 0;
    let highScore = localStorage.getItem('highscore') || 0;
    let userName = localStorage.getItem('userName') || '';
    let speed = 3;
    let isGameOver = false;
    let lanePositions = [ (400/3)/2, 400/2, 400*(5/6) ]; // Center of each lane: ~66.6, 200, ~333.3
    let currentLane = 1;
    let animationId;
    let obstacles = [];
    let bonuses = [];
    let obstacleIntervalId;
    let bonusIntervalId;
    let lastObstacleTime = Date.now();
    let minObstacleIntervalCurrent = 1000;

    let laneLastSpawnTime = [-Infinity, -Infinity, -Infinity];
    const ITEM_SPAWN_COOLDOWN = 350;

    const difficultySettings = {
        easy: { initialSpeed: 2, speedIncrease: 0.1, obstacleInterval: 2000, minObstacleInterval: 1500, bonusFrequency: 5000, scoreMultiplier: 1 },
        medium: { initialSpeed: 3, speedIncrease: 0.2, obstacleInterval: 1500, minObstacleInterval: 1000, bonusFrequency: 8000, scoreMultiplier: 1 },
        hard: { initialSpeed: 4, speedIncrease: 0.3, obstacleInterval: 1200, minObstacleInterval: 800, bonusFrequency: 12000, scoreMultiplier: 2 },
        insane: { initialSpeed: 5, speedIncrease: 0.4, obstacleInterval: 1000, minObstacleInterval: 600, bonusFrequency: 15000, scoreMultiplier: 3 }
    };
    let currentDifficulty = 'medium';

    const player = $('#player');
    const gameContainer = $('#game-container');
    const scoreElement = $('#score');
    const highScoreElement = $('#high-score');
    const difficultyDisplay = $('#difficulty-display');
    const gameOverElement = $('#game-over');
    const finalScoreElement = $('#final-score');
    const finalHighScoreElement = $('#final-high-score');
    const restartBtn = $('#restart-btn');
    const changeDifficultyBtn = $('#change-difficulty-btn');
    const difficultySelector = $('#difficulty-selector');
    const easyBtn = $('#easy-btn');
    const mediumBtn = $('#medium-btn');
    const hardBtn = $('#hard-btn');
    const insaneBtn = $('#insane-btn');
    const userNameDisplay = $('#user-name-display');
    const userNameInputContainer = $('#user-name-input-container');
    const userNameInput = $('#user-name-input');
    const submitUserNameBtn = $('#submit-user-name-btn');

    if (userName) {
        userNameDisplay.text(`Játékos: ${userName}`);
        userNameInputContainer.hide();
        difficultySelector.css('display', 'flex');
    } else {
        userNameInputContainer.css('display', 'flex');
        difficultySelector.hide();
    }

    submitUserNameBtn.on('click', function() {
        const enteredName = userNameInput.val().trim();
        if (enteredName) {
            userName = enteredName;
            localStorage.setItem('userName', userName);
            userNameDisplay.text(`Játékos: ${userName}`);
            userNameInputContainer.hide();
            difficultySelector.css('display', 'flex');
        } else {
            alert('Kérlek, add meg a felhasználóneved!');
        }
    });

    highScoreElement.text(`Legjobb: ${highScore}`);
    player.css('left', lanePositions[currentLane] - player.outerWidth() / 2 + 'px');

    easyBtn.on('click', function() { setDifficulty('easy'); difficultySelector.hide(); startGame(); });
    mediumBtn.on('click', function() { setDifficulty('medium'); difficultySelector.hide(); startGame(); });
    hardBtn.on('click', function() { setDifficulty('hard'); difficultySelector.hide(); startGame(); });
    insaneBtn.on('click', function() { setDifficulty('insane'); difficultySelector.hide(); startGame(); });

    function setDifficulty(difficulty) {
        currentDifficulty = difficulty;
        const settings = difficultySettings[difficulty];
        speed = settings.initialSpeed;
        minObstacleIntervalCurrent = settings.minObstacleInterval;
        const difficultyNames = { easy: 'Könnyű', medium: 'Közepes', hard: 'Nehéz', insane: 'Őrült' };
        difficultyDisplay.text(`Nehézség: ${difficultyNames[difficulty]}`);
    }

    $(document).on('keydown', function(event) {
        if (isGameOver || difficultySelector.is(':visible') || userNameInputContainer.is(':visible')) return;
        if (event.key === 'ArrowLeft' || event.key === 'a') moveLeft();
        else if (event.key === 'ArrowRight' || event.key === 'd') moveRight();
    });

    function movePlayer() {
        player.css('left', lanePositions[currentLane] - player.outerWidth() / 2 + 'px');
    }

    function moveLeft() {
        if (currentLane > 0) {
            currentLane--;
            movePlayer();
        }
    }

    function moveRight() {
        if (currentLane < lanePositions.length - 1) {
            currentLane++;
            movePlayer();
        }
    }

    function findAvailableLaneIndex() {
        const currentTime = Date.now();
        let potentialLanes = [];
        for (let i = 0; i < lanePositions.length; i++) {
            if (currentTime - laneLastSpawnTime[i] > ITEM_SPAWN_COOLDOWN) {
                potentialLanes.push(i);
            }
        }

        if (potentialLanes.length === 0) {
            return -1;
        }

        const randomAvailableIndex = Math.floor(Math.random() * potentialLanes.length);
        return potentialLanes[randomAvailableIndex];
    }

    function createObstacle() {
        const now = Date.now();
        if (now - lastObstacleTime < minObstacleIntervalCurrent) return;

        let lanesToSpawn = [];
        if (currentDifficulty === 'insane' && Math.random() < 0.5 || currentDifficulty === 'hard' && Math.random() < 0.3 || currentDifficulty === 'medium' && Math.random() < 0.15) {
            let firstLane = findAvailableLaneIndex();
            if (firstLane !== -1) {
                lanesToSpawn.push(firstLane);
                let secondLane = findAvailableLaneIndex();
                if (secondLane !== -1 && secondLane !== firstLane) {
                    lanesToSpawn.push(secondLane);
                }
            }
        } else {
            const singleLane = findAvailableLaneIndex();
            if (singleLane !== -1) {
                lanesToSpawn.push(singleLane);
            }
        }

        if (lanesToSpawn.length === 0) return;

        lastObstacleTime = now;

        lanesToSpawn.forEach(laneIndex => {
            const obstacle = $('<div>').addClass('obstacle');
            const obstacleWidth = 60;
            obstacle.css('left', lanePositions[laneIndex] - obstacleWidth / 2 + 'px');

            gameContainer.append(obstacle);
            obstacles.push(obstacle);
            laneLastSpawnTime[laneIndex] = now;
        });

        if (score > 0 && score % 10 === 0) {
            speed += difficultySettings[currentDifficulty].speedIncrease;
            if (minObstacleIntervalCurrent > 400) {
                minObstacleIntervalCurrent -= 50;
            }
        }
    }

    function createBonus() {
        if (isGameOver) return;

        const laneIndex = findAvailableLaneIndex();
        if (laneIndex === -1) return;

        const bonus = $('<div>').addClass('bonus');
        const bonusWidth = 40;
        bonus.css('left', lanePositions[laneIndex] - bonusWidth / 2 + 'px');

        gameContainer.append(bonus);
        bonuses.push(bonus);
        laneLastSpawnTime[laneIndex] = Date.now();
    }

    function updateGame() {
        if (isGameOver) return;

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obstacle = obstacles[i];
            const obstacleY = obstacle.position().top + speed;
            obstacle.css('top', obstacleY + 'px');

            if (isCollision(obstacle[0], player[0])) {
                gameOver();
                return;
            }

            if (obstacleY > gameContainer.height()) {
                obstacle.remove();
                obstacles.splice(i, 1);
                score += difficultySettings[currentDifficulty].scoreMultiplier;
                scoreElement.text(`Pontszám: ${score}`);
            }
        }

        for (let i = bonuses.length - 1; i >= 0; i--) {
            const bonus = bonuses[i];
            const bonusY = bonus.position().top + speed;
            bonus.css('top', bonusY + 'px');

            if (isCollision(bonus[0], player[0])) {
                bonus.remove();
                bonuses.splice(i, 1);
                score += 5 * difficultySettings[currentDifficulty].scoreMultiplier;
                scoreElement.text(`Pontszám: ${score}`);
                player.css('background-color', '#2ecc71');
                setTimeout(() => { player.css('background-color', '#5d9cec'); }, 300);
                continue;
            }

            if (bonusY > gameContainer.height()) {
                bonus.remove();
                bonuses.splice(i, 1);
            }
        }
        animationId = requestAnimationFrame(updateGame);
    }

    function isCollision(element1, element2) {
        const rect1 = element1.getBoundingClientRect();
        const rect2 = element2.getBoundingClientRect();
        return !(rect1.bottom < rect2.top || rect1.top > rect2.bottom || rect1.right < rect2.left || rect1.left > rect2.right);
    }

    function gameOver() {
        isGameOver = true;
        cancelAnimationFrame(animationId);
        clearInterval(obstacleIntervalId);
        clearInterval(bonusIntervalId);

        gameContainer.css('filter', 'blur(5px)');
        gameOverElement.css('display', 'flex');

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highscore', highScore);
            highScoreElement.text(`Legjobb: ${highScore}`);
        }
        finalScoreElement.text(`Végső pontszám: ${score}`);
        finalHighScoreElement.text(`Legjobb pontszám: ${highScore}`);
    }

    function clearGameElements() {
        obstacles.forEach(obstacle => obstacle.remove());
        bonuses.forEach(bonus => bonus.remove());
    }

    function restartGame() {
        clearGameElements();
        score = 0;
        speed = difficultySettings[currentDifficulty].initialSpeed;
        minObstacleIntervalCurrent = difficultySettings[currentDifficulty].minObstacleInterval;

        isGameOver = false;
        currentLane = 1;
        obstacles = [];
        bonuses = [];
        lastObstacleTime = Date.now();
        laneLastSpawnTime = [-Infinity, -Infinity, -Infinity];

        movePlayer();
        scoreElement.text(`Pontszám: 0`);
        gameOverElement.hide();
        gameContainer.css('filter', 'none');
        startGame();
    }

    function changeDifficulty() {
        cancelAnimationFrame(animationId);
        clearInterval(obstacleIntervalId);
        clearInterval(bonusIntervalId);

        clearGameElements();
        gameContainer.css('filter', 'none');

        score = 0;
        scoreElement.text(`Pontszám: ${score}`);
        obstacles = []; bonuses = [];
        laneLastSpawnTime = [-Infinity, -Infinity, -Infinity];

        gameOverElement.hide();
        difficultySelector.css('display', 'flex');
    }

    function startGame() {
        isGameOver = false;
        setDifficulty(currentDifficulty);
        movePlayer();

        updateGame();
        obstacleIntervalId = setInterval(createObstacle, difficultySettings[currentDifficulty].obstacleInterval);
        bonusIntervalId = setInterval(createBonus, difficultySettings[currentDifficulty].bonusFrequency);
    }

    restartBtn.on('click', restartGame);
    changeDifficultyBtn.on('click', changeDifficulty);
    setDifficulty(currentDifficulty);
});