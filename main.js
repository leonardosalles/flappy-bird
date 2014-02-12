var DEBUG = false,
	SPEED = 500,
	GRAVITY = 40,
	FLAP = 620,
	SPAWN_RATE = 1 / 1.2,
	OPENING = 134;

var game;

WebFontConfig = {
    google: { families: [ 'Press+Start+2P::latin' ] },
    active: main
};

(function() {
    var wf = document.createElement('script');
    wf.src = ('https:' == document.location.protocol ? 'https' : 'http') +
      '://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
    wf.type = 'text/javascript';
    wf.async = 'true';
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(wf, s);
})(); 

function main() {

	var state = {
	    preload: preload,
	    create: create,
	    update: update,
	    render: render
	};
	
	var parent = document.querySelector('#screen');
	
	game = new Phaser.Game(
	    window.innerWidth,
	    window.innerHeight,
	    Phaser.CANVAS,
	    parent,
	    state,
	    false,
	    false
	);
	
	function preload() {
	    var assets = {
	        spritesheet: {
	            birdie: ['assets/birdie.png', 24, 24],
	            clouds: ['assets/clouds.png', 128, 64]
	        },
	        image: {
	            pipe: ['assets/pipe.png'],
	            fence: ['assets/fence.png']
	        },
	        audio: {
	            flap: ['assets/flap.wav'],
	            score: ['assets/score.wav'],
	            hurt: ['assets/hurt.wav']
	        }
	    };
	    Object.keys(assets).forEach(function(type) {
	        Object.keys(assets[type]).forEach(function(id) {
	            game.load[type].apply(game.load, [id].concat(assets[type][id]));
	        });
	    });
	}
	
	var gameStarted,
	    gameOver,
	    score,
	    bg,
	    credits,
	    clouds,
	    pipes,
	    invs,
	    birdie,
	    fence,
	    scoreText,
	    instText,
	    gameOverText,
	    flapSnd,
	    scoreSnd,
	    hurtSnd,
	    pipesTimer,
	    cloudsTimer;
	
	function create() {
	    var screenWidth = parent.clientWidth > window.innerWidth ? window.innerWidth : parent.clientWidth;
	    var screenHeight = parent.clientHeight > window.innerHeight ? window.innerHeight : parent.clientHeight;
	    game.world.width = screenWidth;
	    game.world.height = screenHeight;
	    bg = game.add.graphics(0, 0);
	    bg.beginFill(0xDDEEFF, 1);
	    bg.drawRect(0, 0, game.world.width, game.world.height);
	    bg.endFill();
	    credits = game.add.text(
	        game.world.width / 2,
	        10,
	        '',
	        {
	            font: '8px "Press Start 2P',
	            fill: '#fff',
	            align: 'center'
	        }
	    );
	    credits.anchor.x = 0.5;
	    clouds = game.add.group();
	    pipes = game.add.group();
	    invs = game.add.group();
	    birdie = game.add.sprite(0, 0, 'birdie');
	    birdie.anchor.setTo(0.5, 0.5);
	    birdie.animations.add('fly', [0, 1, 2, 3], 10, true);
	    birdie.inputEnabled = true;
	    birdie.body.collideWorldBounds = true;
	    birdie.body.gravity.y = GRAVITY;
	    fence = game.add.tileSprite(0, game.world.height - 32, game.world.width, 32, 'fence');
	    fence.tileScale.setTo(2, 2);
	    scoreText = game.add.text(
	        game.world.width / 2,
	        game.world.height / 4,
	        '',
	        {
	            font: '16px "Press Start 2P"',
	            fill: '#fff',
	            stroke: '#430',
	            strokeThickness: 4,
	            align: 'center'
	        }
	    );
	    scoreText.anchor.setTo(0.5, 0.5);
	    instText = game.add.text(
	        game.world.width / 2,
	        game.world.height - game.world.height / 4,
	        '',
	        {
	            font: '8px "Press Start 2P"',
	            fill: '#fff',
	            stroke: '#430',
	            strokeThickness: 4,
	            align: 'center'
	        }
	    );
	    instText.anchor.setTo(0.5, 0.5);
	    gameOverText = game.add.text(
	        game.world.width / 2,
	        game.world.height / 2,
	        '',
	        {
	            font: '16px "Press Start 2P"',
	            fill: '#fff',
	            stroke: '#430',
	            strokeThickness: 4,
	            align: 'center'
	        }
	    );
	    gameOverText.anchor.setTo(0.5, 0.5);
	    gameOverText.scale.setTo(2, 2);
	    flapSnd = game.add.audio('flap');
	    scoreSnd = game.add.audio('score');
	    hurtSnd = game.add.audio('hurt');
	    game.input.onDown.add(flap);
	    cloudsTimer = new Phaser.Timer(game);
	    cloudsTimer.onEvent.add(spawnCloud);
	    cloudsTimer.start();
	    cloudsTimer.add(Math.random());
	    reset();
	}
	
	function reset() {
	    gameStarted = false;
	    gameOver = false;
	    score = 0;
	    credits.renderable = true;
	    scoreText.setText('FLAPPY\nBIRD');
	    instText.setText('');
	    gameOverText.renderable = false;
	    birdie.body.allowGravity = false;
	    birdie.angle = 0;
	    birdie.reset(game.world.width / 4, game.world.height / 2);
	    birdie.scale.setTo(2, 2);
	    birdie.animations.play('fly');
	    pipes.removeAll();
	    invs.removeAll();
	}
	
	function start() {
	    credits.renderable = false;
	    birdie.body.allowGravity = true;
	    pipesTimer = new Phaser.Timer(game);
	    pipesTimer.onEvent.add(spawnPipes);
	    pipesTimer.start();
	    pipesTimer.add(2);
	    scoreText.setText(score);
	    instText.renderable = false;
	    gameStarted = true;
	}
	
	function flap() {
	    if (!gameStarted) {
	        start();
	    }
	    if (!gameOver) {
	        birdie.body.velocity.y = -FLAP;
	        flapSnd.play();
	    }
	}
	
	function spawnCloud() {
	    cloudsTimer.stop();
	
	    var cloudY = Math.random() * game.height / 2;
	    var cloud = clouds.create(
	        game.width,
	        cloudY,
	        'clouds',
	        Math.floor(4 * Math.random())
	    );
	    var cloudScale = 2 + 2 * Math.random();
	    cloud.alpha = 2 / cloudScale;
	    cloud.scale.setTo(cloudScale, cloudScale);
	    cloud.body.allowGravity = false;
	    cloud.body.velocity.x = -SPEED / cloudScale;
	    cloud.anchor.y = 0;
	
	    cloudsTimer.start();
	    cloudsTimer.add(4 * Math.random());
	}
	
	function o() {
	    return OPENING + 60 * ((score > 50 ? 50 : 50 - score) / 50);
	}
	
	function spawnPipe(pipeY, flipped) {
	    var pipe = pipes.create(
	        game.width,
	        pipeY + (flipped ? -o() : o()) / 2,
	        'pipe'
	    );
	    pipe.body.allowGravity = false;
	
	    pipe.scale.setTo(2, flipped ? -2 : 2);
	    pipe.body.offset.y = flipped ? -pipe.body.height * 2 : 0;
	
	    pipe.body.velocity.x = -SPEED;
	
	    return pipe;
	}
	
	function spawnPipes() {
	    pipesTimer.stop();
	
	    var pipeY = ((game.height - 16 - o() / 2) / 2) + (Math.random() > 0.5 ? -1 : 1) * Math.random() * game.height / 6;
	    var botPipe = spawnPipe(pipeY);
	    var topPipe = spawnPipe(pipeY, true);
	
	    var inv = invs.create(topPipe.x + topPipe.width, 0);
	    inv.width = 2;
	    inv.height = game.world.height;
	    inv.body.allowGravity = false;
	    inv.body.velocity.x = -SPEED;
	
	    pipesTimer.start();
	    pipesTimer.add(1 / SPAWN_RATE);
	}
	
	function addScore(_, inv) {
	    invs.remove(inv);
	    score += 1;
	    scoreText.setText(score);
	    scoreSnd.play();
	}
	
	function setGameOver() {
	    gameOver = true;
	    instText.setText('TOUCH BIRDIE\nTO TRY AGAIN');
	    instText.renderable = true;
	    var hiscore = window.localStorage.getItem('hiscore');
	    hiscore = hiscore ? hiscore : score;
	    hiscore = score > parseInt(hiscore, 10) ? score : hiscore;
	    window.localStorage.setItem('hiscore', hiscore);
	    gameOverText.setText('GAMEOVER\n\nHIGH SCORE\n' + hiscore);
	    gameOverText.renderable = true;
	    pipes.forEachAlive(function(pipe) {
	    	pipe.body.velocity.x = 0;
	    });
	    invs.forEach(function(inv) {
	        inv.body.velocity.x = 0;
	    });
	    pipesTimer.stop();
	    birdie.events.onInputDown.addOnce(reset);
	    hurtSnd.play();
	}
	
	function update() {
	    if (gameStarted) {
	        var dvy = FLAP + birdie.body.velocity.y;
	        birdie.angle = (90 * dvy / FLAP) - 180;
	        if (birdie.angle < -30) {
	            birdie.angle = -30;
	        }
	        if (
	            gameOver ||
	            birdie.angle > 90 ||
	            birdie.angle < -90
	        ) {
	            birdie.angle = 90;
	            birdie.animations.stop();
	            birdie.frame = 3;
	        } else {
	            birdie.animations.play('fly');
	        }
	        if (gameOver) {
	            if (birdie.scale.x < 4) {
	                birdie.scale.setTo(
	                    birdie.scale.x * 1.2,
	                    birdie.scale.y * 1.2
	                );
	            }
	            gameOverText.angle = Math.random() * 5 * Math.cos(game.time.now / 100);
	        } else {
	            game.physics.overlap(birdie, pipes, setGameOver);
	            if (!gameOver && birdie.body.bottom >= game.world.bounds.bottom) {
	                setGameOver();
	            }
	            game.physics.overlap(birdie, invs, addScore);
	        }
	        pipes.forEachAlive(function(pipe) {
	            if (pipe.x + pipe.width < game.world.bounds.left) {
	                pipe.kill();
	            }
	        });
	        pipesTimer.update();
	    } else {
	        birdie.y = (game.world.height / 2) + 8 * Math.cos(game.time.now / 200);
	    }
	    if (!gameStarted || gameOver) {
	        instText.scale.setTo(
	            2 + 0.1 * Math.sin(game.time.now / 100),
	            2 + 0.1 * Math.cos(game.time.now / 100)
	        );
	    }
	    scoreText.scale.setTo(
	        2 + 0.1 * Math.cos(game.time.now / 100),
	        2 + 0.1 * Math.sin(game.time.now / 100)
	    );
	    cloudsTimer.update();
	    clouds.forEachAlive(function(cloud) {
	        if (cloud.x + cloud.width < game.world.bounds.left) {
	            cloud.kill();
	        }
	    });
	    if (!gameOver) {
	        fence.tilePosition.x -= game.time.physicsElapsed * SPEED / 2;
	    }
	}
	
	function render() {
	    if (DEBUG) {
	        game.debug.renderSpriteBody(birdie);
	        pipes.forEachAlive(function(pipe) {
	            game.debug.renderSpriteBody(pipe);
	        });
	        invs.forEach(function(inv) {
	            game.debug.renderSpriteBody(inv);
	        });
	    }
	}
};