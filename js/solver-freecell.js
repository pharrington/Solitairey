/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		c: 1,
		h: 2,
		d: 3
	    };

	function flatten(ary) {
		var result = [],
		    i,
		    len,
		    item,
		    proto = Array.prototype;

		for (i = 0, len = ary.length; i < len; i++) {
			item = ary[i];
			if (Object.prototype.toString.call(item) === "[object Array]") {
				proto.push.apply(result, flatten(item));
			} else {
				result.push(item);
			}
		}
		return result;
	}

	function take(ary, count) {
		var result = [],
		    i;

		count = Math.min(ary.length, count);
		i = count;
		for (i = 0; i < count; i++) {
			result.push(ary[i]);
		}

		return result;

	}

	function drop(ary, count) {
		var result = [],
		    i, len = ary.length;

		count = Math.min(len, count);
		for (i = count; i < len; i++) {
			result.push(ary[i]);
		}

		return result;
	}

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
	}

	function cardRank(val) {
		return val >> 2;
	}

	function cardSuit(val) {
		return val & 3;
	}

	function cardIsBlack(val) {
		return val < 2;
	}

	function stackToValues(stack) {
		if (!stack.first()) {
			return String.fromCharCode(0);
		}

		var vals = "";

		stack.eachCard(function (c) {
			vals = String.fromCharCode(cardToValue(c)) + vals;
		});

		return vals;
	}

	function sortedStacks(field) {
		return Y.Array.map(field.stacks, function (s) { return s; }).
			sort(function (s1, s2) {
				var c1 = s1.first(),
				    c2 = s2.first();

				return cardToValue(c2) - cardToValue(c1);
			});
	}

	function gameToState(game) {
		var values, lens;
		
		values = flatten(Y.Array.map(["reserve", "foundation", "tableau"], function (field) {
			return Y.Array.map(sortedStacks(game[field]),  function (s) {
				return stackToValues(s);
			});
		}));

		lens = Y.Array.map(values, function (str) {
			return str === String.fromCharCode(0) ? 0 : str.length;
		});

		return new GameState(values, lens);
	}

	function GameState(stacks, lengths) {
		this.reserve = {
			lengths: take(lengths, 4),
			stacks: take(stacks, 4)
		};
		this.foundation = {
			lengths: take(drop(lengths, 4), 4),
			stacks: take(drop(stacks, 4), 4)
		};
		this.tableau = {
			lengths: take(drop(lengths, 8), 8),
			stacks: take(drop(stacks, 8), 8)
		};
	}

	GameState.prototype = {
		reserve: null,
		foundation: null,
		tableau: null,

		equals: function (state) {
			return deepEquals(this.reserve.stacks, state.reserve.stacks) &&
				deepEquals(this.foundation.stacks, state.foundation.stacks) &&
				deepEquals(this.tableau.stacks, state.tableau.stacks);
		},

		push: function (field, stackidx, value) {
			var field = this[field],
			    stacks = field.stacks;

			stacks[stackidx] = value + stacks[stackidx];
			field.lengths[stackidx]++;
		},

		pop: function (field, stackidx, value) {
			var field = this[field],
			    stacks = field.stacks;

			stacks[stackidx] = stacks[stackidx].substr(1);
			field.lengths[stackidx]--;
		},

		validTarget: function (field, value) {
			var start = 0,
			    stacks = this[field].stacks,
			    lengths = this[field].lengths,
			    rank = value >> 2,//cardRank(value),
			    suit = value & 3,//cardSuit(value),
			    dest,
			    i, len;
		
			if (!value) { return -1; }

			for (i = start, len = stacks.length; i < len; i++) {
				dest = stacks[i].charCodeAt();

				switch (field) {
				case "foundation":
					if (!lengths[i] ||
					    (suit === dest & 3 &&
					    rank === (dest >> 2) + 1)) {
						return i;
					}
					break;
				case "reserve":
					if (!lengths[i]) {
						return i;
					}
					break;
				case "tableau":
					if (!lengths[i] ||
					    (cardIsBlack(value) ^ cardIsBlack(dest) &&
					    rank === (dest >> 2) - 1)) {
						return i;
					}
					break;
				}
			}

			return -1;
		},

		eachStack: function (fields, callback) {
			Y.Array.each(fields, function (f) {
				Y.Array.each(this[f].stacks, callback, this);
			}, this);
		},

		_rank: null,
		rank: function () {
			//if (this._rank !== null) { return this._rank; }

			var baseReward = {
				foundation: 10000,
				toFoundation: 1000,
				openTableau: 100,
				openReserve: 50,
				reserveToTableau: 10,
				tableauToTableau: 5,
				headedByKing: 5,
				buriedFoundationTarget: -10
			    },
			    foundation = this.foundation, reserve = this.reserve, tableau = this.tableau,
			    rank = 0,
			    stack,
			    i, j, len;

			// reward each card in the foundation
			for (i = 0, len = 4; i < len; i++) {
				rank += baseReward.foundation * foundation.lengths[i];
			};

			// reward free cards in the reserve or tableau that can be placed on the foundation
			this.eachStack(["reserve", "tableau"], function (stack) {
				if (this.validTarget("foundation", stack.charCodeAt()) > -1) {
					rank += baseReward.toFoundation;
				}
			});

			// reward each open tableau slot

			for (i = 0, len = 8; i < len; i++) {
				if (!tableau.lengths[i]) {
					rank += baseReward.openTableau;
				}
			};

			// reward each open reserve slot
			for (i = 0, len = 4; i < len; i++) {
				if (!reserve.lengths[i]) {
					rank += baseReward.openReserve;
				}
			};

			// reward reserve cards that can be placed the tableau
			for (i = 0, len = 4; i < len; i++) {
				if (this.validTarget("tableau", reserve.stacks[i].charCodeAt()) > -1) {
					rank += baseReward.reserveToTableau;
				}
			};

			// reward tableau cards that can be placed on other tableau cards
			for (i = 0, len = 8; i < len; i++) {
				if (this.validTarget("tableau", tableau.stacks[i].charCodeAt()) > -1) {
					rank += baseReward.reserveToTableau;
				}
			};

			// reward tableau stacks beginning with a king
			for (i = 0, len = 8; i < len; i++) {
				stack = tableau.stacks[i];
				if (stack.charCodeAt(stack.length - 1) === 13) {
					rank += baseReward.headedByKing;
				}
			};

			// punish buried cards that can be placed on the foundation
			for (i = 0; i < 8; i++) {
				stack = tableau.stacks[i];

				for (j = 1, len = stack.length; j < len; j++) {
					if (this.validTarget("foundation", stack.charCodeAt(i)) > -1) {
						rank += baseReward.buriedFoundationTarget * j;
					}
				}
			};

			this._rank = rank;
			return rank;
		}
	};

	Y.mix(FreecellSolver, {
		test: function () {
			var a = gameToState(Game);
			for (var i = 0; i < 10000; i++) {
				a.rank();
			}
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
