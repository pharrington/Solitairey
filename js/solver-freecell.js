/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	// only let this work with Web Workers

	if (!Worker) { return; }

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    };

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

	var Animation = {
		interval: 500,
		timer: null,
		remainingMoves: null,

		stop: function () {
			this.remainingMoves = null;
			window.clearTimeout(this.timer);
			this.timer = null;
		},

		play: function (game, moves) {
			var move,
			    card, origin;

			if (!this.remainingMoves) {
				this.remainingMoves = moves || null;
			}

			moves = this.remainingMoves;
			if (!moves) { return; }

			move = moveToCardAndStack(game, moves);
			card = move.card;
			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);

			this.remainingMoves = moves.next;
			this.timer = window.setTimeout(this.play.partial(game).bind(this), this.interval);

			game.endTurn();
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
			window.clearTimeout(this.indicatorTimer);
			if (!this.indicator) { return; }

			if (solved) {
				this.indicator.set("text", "Solution found");
			} else {
				this.indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {
			var bar = Y.Node.create("<div id=solver_bar></div>"),
			    indicator = Y.Node.create("<span>");
			/*
			    controls = Y.Node.create(
				"<div class=controls><div class=play></div><div class=pause></div><div class=rewind></div><div class=fastforward></div></div>");
			bar.append(controls);
				*/

			bar.append(indicator);
			this.indicator = indicator;
			Y.one("body").append(bar);

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
			return this.supportedGames.indexOf(Game.name()) !== -1;
		},

		enable: function () {
			if (this.isSupported()) {
				this.createUI();
			}
			this.attachEvents();
		},

		disable: function () {
			var children,
			    last,
			    solveButton;

			if (this.worker) {
				this.worker.terminate();
			}

			solveButton = Y.one("#solve");
			if (solveButton) {
				solveButton.get("parentNode").remove();
			}

			children = Y.one("#menu").get("children");
			last = children.item(children.size() - 1);

			if (last) {
				last.addClass("end");
			}

			Status.hide();
		},

		attachEvents: function () {
			if (this.attached) { return; }

			var stop = Animation.stop.bind(Animation);

			// start the solver if the current game supports it
			Y.on("afterSetup", function () {
				if (this.isSupported()) {
					this.solve();
				} else {
					this.disable();
				}
			}.bind(this));

			// if a solution isn't currently being played, find a new solution on every new turn
			Y.on("endTurn", function () {
				if (Animation.timer || !this.isSupported()) { return; }
				this.solve();
			}.bind(this));

			// human interaction stops playing the current solution
			document.documentElement.addEventListener("mousedown", function (e) {
				Y.on("undo", stop);
				if (e.target.id === "solve") { return; }
				stop();
			}, true);

			this.attached = true;
		},

		createUI: function () {
			if (Y.one("#solve")) { return; }

			var menu = Y.one("#menu"),
			    solveButton = Y.Node.create("<li class=end><a id=solve>Solve</a></li>");

			solveButton.on("click", this.playSolution.bind(this));

			menu.one(".end").removeClass("end");
			menu.append(solveButton);
			Status.show();
		},

		playSolution: function () {
			var solution = this.currentSolution;

			if (solution) {
				Animation.play(Game, solution);
			}
		},

		solve: function () {
			if (this.worker) {
				this.worker.terminate();
			}

			this.currentSolution = null;
			this.worker = new Worker("js/solver-freecell-worker.js");
			this.worker.onmessage = function (e) {
				var solution = this.currentSolution = e.data.solution;
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
	});

	Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
}, "0.0.1", {requires: ["solitaire"]});
