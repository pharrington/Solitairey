/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	Y.mix(Y.Solitaire.Solver.Freecell, {
		enable: Y.Solitaire.noop,
		disable: Y.Solitaire.noop,
		isEnabled: function () { return false; }
	});

	// only let this work with web workers and typed arrays

	if (!(window.Worker && window.ArrayBuffer && window.Uint8Array)) { return; }

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    },
	    enabled = true;

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
	}

	function cardRank(val) {
		return val >> 2;
	}

	function cardSuit(val) {
		return ["s", "h", "c", "d"][val & 3];
	}

	function compareStack(a, b) {
		return b[0] - a[0];
	}

	function sortedStacks(field) {
		return Y.Array.map(field.stacks, function (s) { return s; }).
			sort(function (s1, s2) {
				var c1 = s1.first(),
				    c2 = s2.first();

				return cardToValue(c1) - cardToValue(c2);
			});
	}

	function gameToState(game) {
		var reserve, foundation, tableau;

		tableau = Y.Array.map(sortedStacks(game.tableau), function (s) {
			var buffer = [];

			s.eachCard(function (c, i) {
				buffer[i] = cardToValue(c);
			});

			return [buffer, s.cards.length];
		});

		reserve = [];
		Y.Array.forEach(sortedStacks(game.reserve), function (s, i) {
			reserve[i] = cardToValue(s.last());
		});

		foundation = [];
		Y.Array.forEach(sortedStacks(game.foundation), function (s, i) {
			foundation[i] = cardToValue(s.last());
		});

		return {reserve: reserve, foundation: foundation, tableau: tableau};
	}


	function moveToCardAndStack(game, move) {
		var source = move.source,
		    dest = move.dest,
		    value,
		    ret = {};

		value = source[1];
		game.eachStack(function (stack) {
			if (ret.card) { return; }

			var card = stack.last();
			if (!card) { return; }

			if (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value)) {
				ret.card = card;
			}
		}, source[0]);

		value = dest[1];
		game.eachStack(function (stack) {
			if (ret.stack) { return; }

			var card = stack.last();

			if (!(card || value)) { ret.stack = stack; }

			if (card &&
			    (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value))) {
				ret.stack = stack;
			}
		}, dest[0]);

		return ret;
	}

	function withSelector(selector, callback) {
		var node = Y.one(selector);

		if (node) {
			callback(node);
		}
	}

	var Animation = {
		interval: 500,
		timer: null,
		remainingMoves: null,

		init: function (moves) {
			var current = moves;

			while (current) {
				if (current.next) {
					current.next.prev = current;
				}
				current = current.next;
			}

			this.remainingMoves = moves;
		},

		pause: function () {
			Solitaire.Autoplay.enable();

			window.clearTimeout(this.timer);
			this.timer = null;

			withSelector("#solver-bar .pause", function (node) {
				node.removeClass("pause");
				node.addClass("play");
			});
		},

		playCurrent: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			move = moveToCardAndStack(game, this.remainingMoves);
			card = move.card;

			if (!card) { return; }

			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);
		},

		prev: function (game) {
			var prev = this.remainingMoves.prev;

			if (prev) {
				Y.fire("undo", true);
				this.remainingMoves = prev;
			}
		},

		next: function (game) {
			var current = this.remainingMoves,
			    next = this.remainingMoves.next;

			Solitaire.Statistics.disable();
			Solitaire.WinDisplay.disable();

			this.playCurrent(game);

			if (next) {
				this.remainingMoves = next;
			}

			Y.fire("endTurn", true);
		},

		play: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			Solitaire.Autoplay.disable();

			withSelector("#solver-bar .play", function (node) {
				node.removeClass("play");
				node.addClass("pause");
			});

			this.next(game);
			this.timer = window.setTimeout(function () {
				this.play(game);
			}.bind(this), this.interval);
		}
	};

	var Status = {
		bar: null,
		indicator: null,
		indicatorTimer: null,
		indicatorInterval: 750,
		delay: 400,

		updateIndicator: function (ticks) {
			var indicator = this.indicator,
			    i,
			    text;

			if (!indicator) { return; }

			ticks = ((ticks || 0) % 4);
			text = "Solving";
			for (i = 0; i < ticks; i++) {
				text += ".";
			}

			indicator.set("text", text);

			this.indicatorTimer = window.setTimeout(this.updateIndicator.partial(ticks + 1).bind(this), this.indicatorInterval);
		},

		stopIndicator: function (solved) {
			var indicator = this.indicator;

			window.clearTimeout(this.indicatorTimer);
			if (!indicator) { return; }

			if (solved) {
				indicator.set("text", "Solution found");
				withSelector("#solver-bar .controls", function (node) {
					node.removeClass("hidden");
				});

			} else {
				indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {
			if (Y.one("#solver-bar")) { return; }

			var bar = Y.Node.create("<div id=solver-bar></div>"),
			    indicator = Y.Node.create("<span class=indicator>"),
			    next = Y.Node.create("<div class=fastforward>"),
			    prev = Y.Node.create("<div class=rewind>"),
			    playPause = Y.Node.create("<div class=play>"),
			    controls = Y.Node.create("<div class='controls hidden'>"),
			    playCallback;

			next.on("click", function () {
				Animation.next(Game);
			});
			prev.on("click", function () {
				Animation.prev(Game);
			});
			playPause.on("click", function () {
				/*
				 * Here I tie up state with the DOM
				 * Maybe thats alright, as its interface state being stored in the interface
				 */

				if (this.hasClass("play")) {
					Animation.play(Game);
				} else if (this.hasClass("pause")) {
					Animation.pause();
				}
			});

			controls.append(prev);
			controls.append(playPause);
			controls.append(next);

			bar.append(indicator);
			bar.append(controls);
			Y.one("body").append(bar);

			this.indicator = indicator;

			this.bar = bar;
		},

		hide: function () {
			if (this.bar) {
				this.bar.remove();
			}
		}
	};

	Y.mix(FreecellSolver, {
		currentSolution: null,
		worker: null,
		attached: false,
		supportedGames: ["Freecell"],

		isSupported: function () {
			return Game && this.supportedGames.indexOf(Game.name()) !== -1;
		},

		enable: function () {
			enabled = true;
			this.resume();
		},

		disable: function () {
			enabled = false;
			this.suspend();
		},

		resume: function (dontSolve) {
			if (!(enabled && this.isSupported())) { return; }

			this.createUI();
			this.attachEvents();

			if (!dontSolve) { this.solve(); }
		},

		suspend: function () {
			if (this.worker) {
				this.worker.terminate();
			}

			Status.hide();
		},

		isEnabled: function () {
			return enabled;
		},

		attachEvents: function () {
			if (this.attached) { return; }

			var pause = Animation.pause.bind(Animation);

			// start the solver if the current game supports it
			Y.on("afterSetup", function () {
				if (this.isSupported()) {
					this.solve();
				} else {
					this.suspend();
				}
			}.bind(this));

			// if a solution isn't currently being played, find a new solution on every new turn
			Y.on("endTurn", function (dontResolve) {
				if (dontResolve || !this.isSupported()) { return; }
				this.solve();
			}.bind(this));

			Y.on("autoPlay", function () {
				FreecellSolver.suspend();
			});

			Y.on("win", function () {
				FreecellSolver.suspend();
			});

			// human interaction stops playing the current solution
			document.documentElement.addEventListener("mousedown", function (e) {
				if (e.target.className.match(/\bpause\b/)) { return; }
				pause();
			}, true);

			this.attached = true;
		},

		createUI: function () {
			Status.show();
		},

		stop: function () {
			if (this.worker) {
				this.worker.terminate();
			}
		},

		solve: function () {
			if (!enabled) { return; }

			this.stop();

			withSelector("#solver-bar .controls", function (node) {
				node.addClass("hidden");
			});

			this.currentSolution = null;
			this.worker = new Worker("js/solver-freecell-worker.js");
			this.worker.onmessage = function (e) {
				var solution = this.currentSolution = e.data.solution;

				Animation.init(solution);
				if (solution) {
					Status.stopIndicator(true);
				} else {
					Status.stopIndicator(false);
				}
			}.bind(this);

			this.worker.postMessage({action: "solve", param: gameToState(Game)});

			window.clearTimeout(Status.indicatorTimer);
			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);
		}
	}, true);

	Y.on("beforeSetup", function () {
		FreecellSolver.resume(true);
	});
}, "0.0.1", {requires: ["solitaire", "statistics", "win-display"]});
