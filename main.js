angular.module('GuessingGameApp', [])
    .controller('GameController', ['$scope', '$timeout', function ($scope, $timeout) {
        
        function generateRandomNumber() {
            return Math.floor(Math.random() * 100) + 1;
        }

        let idleTimer;
        $scope.isIdle = false;

        function startIdleTimer() {
            cancelIdTimer();
            idleTimer = $timeout(() => {
                $scope.isIdle = true;
            }, 5000);
        }

        function cancelIdTimer() {
            if (idleTimer) $timeout.cancel(idleTimer);
            $scope.isIdle = false;
        }

        $scope.resetIdleTimer = function() {
            cancelIdTimer();
            startIdleTimer();
        } 

        $scope.resetGame = function () {
            $scope.targetNumber = generateRandomNumber();
            $scope.guess = '';
            $scope.feedback = '';
            $scope.attempts = 0;
            $scope.guessedCorrectly = false;
            $scope.resetIdleTimer();
        };

        const lowFeedbacks = [
            'Too low!', 
            'Still too low~', 
            'Wow! People said 3rd time\'s the charm, but uhhh you\'re still too low ', 
            'Come on! Are you purposely guessing small numbers? 🙄'
        ];
        const highFeedbacks = [
            "Too high!",
            "Still too high~",
            "Whoa there! Overshooting again??? 😞",
            "Seriously? Are you aiming for the moon? 😅"
        ];
        $scope.previousGuessTooHigh;

        $scope.checkGuess = function () {
            $scope.resetIdleTimer();
            const guess = parseInt($scope.guess);

            if (isNaN(guess) || guess < 1 || guess > 100) {
                $scope.feedback = "Please enter a number between 1 and 100.";
                return;
            }

            $scope.attempts++;

            if (guess < $scope.targetNumber) {
                let index = $scope.previousGuessTooHigh ? 0 : $scope.attempts -1;
                $scope.feedback = lowFeedbacks[(index) % lowFeedbacks.length];

            } else if (guess > $scope.targetNumber) {
                let index = $scope.previousGuessTooHigh ? $scope.attempts - 1 : 0;
                $scope.feedback = highFeedbacks[(index) % highFeedbacks.length];
                
            } else {
                $scope.feedback = `Correct! You guessed it in ${$scope.attempts} attempts.`;
                $scope.guessedCorrectly = true;
            }

            if ($scope.attempts > 5 && !$scope.guessedCorrectly && (Math.abs($scope.targetNumber - guess) < 10)) {
                $scope.feedback = $scope.feedback.substring(0, $scope.feedback.length-1) + ", but you're getting close!! 😆";
            }
        };

        $scope.resetGame();
    }]);