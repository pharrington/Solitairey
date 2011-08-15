/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    },
	    worker;

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

	function animateMove(game, moves) {
		var move,
		    card, origin;

		if (!moves) { return; }

		move = moveToCardAndStack(game, moves);
		card = move.card;
		origin = card.stack;

		card.after(function () {
			origin.updateCardsPosition();
			move.stack.updateCardsPosition();
		});
		card.moveTo(move.stack);

		window.setTimeout(animateMove.partial(game, moves.next), 500);
	}

	var Status = {
		indicatorTimer: null,
		indicator: null,
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
				this.indicator.set("text", "Solved");
			} else {
				this.indicator.set("text", "Unable to find solution");
			}
		},

		showMenu: function () {
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
		}
	};

	Status.showMenu();

	Y.mix(FreecellSolver, {
		solve: function () {
			if (worker) {
				worker.terminate();
			}

			worker = new Worker("js/solver-freecell-worker.js");
			worker.onmessage = function (e) {
				var data = e.data
				if (data.solution) {
					Status.stopIndicator(true);
					animateMove(Game, data.solution);
				} else {
					Status.stopIndicator(false);
				}
			};

			worker.postMessage({action: "solve", param: gameToState(Game)});

			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
