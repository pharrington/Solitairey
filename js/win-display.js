/*
 * Reward the player when they win
 */
YUI.add("win-display", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    Solitaire = Y.Solitaire,
	    Statistics = Solitaire.Statistics,
	    WinDisplay = Y.namespace("Solitaire.WinDisplay"),
	    winDisplayTimer,
	    isAttached = false,
	    cacheNode = Solitaire.Util.cacheNode,
	    
	    winScreens = [],

	    bodyNode = cacheNode("body"),
	    winDisplayNode = cacheNode("#win-display"),
	    winDisplayGame = cacheNode("#win-display-game"),
	    winDisplayStreak = cacheNode("#win-display-streak"),
	    winDisplayWins = cacheNode("#win-display-wins"),
	    winDisplayLoses = cacheNode("#win-display-loses");

	Y.on("newGame", function () {
		won = false;
	});

	Y.on("loadGame", function () {
		won = false;
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		won = true;

		winScreens[~~(Math.random() * winScreens.length)]();
	});

	Y.on("beforeSetup", function () {
		WinDisplay.cancel();
		WinDisplay.enable();
		Bouncer.clear();
	});

	Y.on("fieldResize", function () {
		Bouncer.resize();
	});

	var requestAnimationFrame = (function () {
		var rate = 16;

		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback) {
				setTimeout(callback, rate);
			}
	})();

	var Bouncer = {
		width: 0,
		height: 0,
		angle: 2 * Math.PI,
		velocity: 1000,
		minYVelocity: 200,
		gravity: 15,
		dampening: 0.5,
		canvas: null,
		context: null,
		actors: [],

		bounce: function (card, angleRandomFactor, velocityRandomFactor) {
			var node = card.node,
				xy = node.getXY(),
				vector = {},
				angle, angleMin, angleDelta,
				velocity, velocityMin, velocityDelta,
				now = new Date().getTime(),
				start;


			angleMin = this.angle * (1 - angleRandomFactor);
			angleDelta = this.angle - angleMin;
			angle = Math.random() * angleDelta + angleMin;

			velocityMin = this.velocity * (1 - velocityRandomFactor);
			velocityDelta = this.velocity - velocityMin;
			velocity = Math.random() * velocityDelta + velocityMin;

			vector.x = Math.cos(angle) * velocity;
			vector.y = Math.sin(angle) * velocity;

			node.remove();

			start = this.actors.length === 0;

			if (xy) {
				this.actors.push({
					node: node._node,
					velocity: vector,
					boundingbox: {x: xy[0], y: xy[1], width: ~~card.width, height: ~~card.height},
					lastUpdate: now,
					lastSmear: now
				});
			}

			if (start) {
				this.bounceCallback(now);
			}
		},

		bounceCallback: function (lastUpdate) {
			var now = new Date().getTime(),
				dt,
				actors = this.actors,
				actor,
				i;

			dt = now - lastUpdate;

			i = 0;
			while (actor = actors[i]) {
				if (this.bounceStep(actor.node, actor.velocity, actor.boundingbox, dt)) {
					actors.splice(i, 1);
				} else {
					i++;
				}
				
			}

			if (actors.length > 0) {
				requestAnimationFrame(function () {
					this.bounceCallback(now);
				}.bind(this));
			}
		},

		bounceStep: function (image, velocity, boundingbox, dt) {
			dt /= 1000;

			boundingbox.x += velocity.x * dt;
			boundingbox.y += velocity.y * dt;

			velocity.y += this.gravity;

			if (boundingbox.x > this.width || boundingbox.x + boundingbox.width < 0 ||
				boundingbox.y + boundingbox.height < 0) {
				return true;
			}

			if (boundingbox.y + boundingbox.height >= this.height) {
				boundingbox.y -= velocity.y * dt;
				velocity.y *= -this.dampening;
				velocity.y = Math.min(velocity.y, -this.minYVelocity);
			}

			this.context.drawImage(image, ~~boundingbox.x, ~~boundingbox.y, boundingbox.width, boundingbox.height);
		},

		createSmearNode: function () {
			var node;

			if (!this.canvas) {
				var node = document.createElement("canvas");
				node.style.zIndex = -1;
				node.style.position = "absolute";
				node.style.top = "0px";
				node.style.left = "0px";
				node.width = this.width;
				node.height = this.height;

				this.canvas = node;
				this.context = node.getContext("2d");
				bodyNode().appendChild(this.canvas);
			}

			this.canvas.className = "";
		},

		resize: function () {
			this.width = bodyNode().get("winWidth");
			this.height = bodyNode().get("winHeight");

			if (this.canvas) {
				this.canvas.width = this.width;
				this.canvas.height = this.height;
			}
		},

		init: function () {
			this.resize();
			this.createSmearNode();
		},

		clear: function () {
			if (!this.context) { return; }

			this.context.clearRect(0, 0, this.width, this.height);
			this.canvas.className = "hidden";

			this.actors = [];
		}
	};

	function attachEvents() {
		if (isAttached) { return; }

		var Application = Solitaire.Application,
		    activeGame = Solitaire.game.name();

		Y.on("click", function () {
			WinDisplay.cancel();
			setTimeout(function () {
				Application.newGame();
			}, 0);
		}, Y.one("#win-display .new_deal"));

		Y.on("click", function () {
			Application.GameChooser.show(true);
		}, Y.one("#win-display .choose_game"));

		isAttached = true;
	}

	function windows3() {
		var delay = 300,
			winDisplayDelay = 1000,
			interval = 1000;

		Bouncer.init();

		Game.eachStack(function (stack) {
			var length = stack.length();

			stack.eachCard(function (card, index) {
				card.node.setStyle("zIndex", index - length);
				setTimeout(function () {
					Bouncer.bounce(card, 0.8, 0.2);
				}, ~~(interval * (stack.cards.length - 1 - index) + Math.random() * interval + delay));
			});
		}, "foundation");

		WinDisplay.winDisplay(winDisplayDelay);
	}

	function explodeFoundations() {
		var delay = 500,
		    duration = 900,
		    interval = 900;

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				if (!card) { return; }

				var node = card.node;
				if (card !== stack.last()) {
					setTimeout(function (node) {
						node.addClass("hidden");
					}.partial(node), delay);

					return;
				}

				node.plug(Y.Breakout, {columns: 5});
				(function (node) {
					setTimeout(function () {
						node.breakout.explode({random: 0.65, duration: duration});
					}, delay);
				})(node);

				delay += interval;
			});
		}, "foundation");

		WinDisplay.winDisplay(delay + 200);
	}

	Y.mix(WinDisplay, {
		winDisplay: function (delay) {
			winDisplayTimer = setTimeout(function () {
				var gameName = Solitaire.game.name(),
					stats = Statistics.getRecord(gameName);

				attachEvents();

				winDisplayGame().set("text", Solitaire.Application.nameMap[gameName]);
				winDisplayStreak().set("text", stats.streaks().last().length);
				winDisplayWins().set("text", stats.wins().length);
				winDisplayLoses().set("text", stats.loses().length);
				winDisplayNode().removeClass("hidden");
			}, delay);
		},

		cancel: function () {
			winDisplayNode().addClass("hidden");
			clearTimeout(winDisplayTimer);
		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

	winScreens.push(explodeFoundations);
	if (window.HTMLCanvasElement) {
		winScreens.push(windows3);
	}
}, "0.0.1", {requires: ["solitaire", "statistics", "util", "array-extras", "breakout"]});
