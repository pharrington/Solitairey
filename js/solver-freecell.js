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

	function identity(arg) { return arg; }

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
	}

	function cardRank(val) {
		return val >> 2;
	}

	function cardSuit(val) {
		return val & 3;
	}

	function cardIsRed(val) {
		return val & 1;
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
		if (!stacks) { return; }

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

	GameState.fromState = function (other) {
		var state = new GameState();

		Y.Array.each(["reserve", "foundation", "tableau"], function (field) {
			oField = other[field];

			state[field] = { lengths: oField.lengths, stacks: oField.stacks };
		});

		return state;
	}

	GameState.prototype = {
		reserve: null,
		foundation: null,
		tableau: null,

		// TODO check if rank() equals the "perfect" rank
		solved: function () {
			var i, len,
			    lengths = this.foundation.lengths;

			for (i = 0, len = lengths.length; i < len; i++) {
				if (lengths[i] !== 13) { return false; }
			}

			return true;
		},

		validTarget: function (field, value) {
			var start = 0,
			    stacks = this[field].stacks,
			    lengths = this[field].lengths,
			    rank = value >> 2,
			    suit = value & 3,
			    dest,
			    i, len;
		
			if (!value) { return -1; }

			for (i = start, len = stacks.length; i < len; i++) {
				dest = stacks[i].charCodeAt();

				switch (field) {
				case "foundation":
					if ((!lengths[i] && rank === 1) ||
					    (suit === (dest & 3) &&
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
					    (cardIsRed(value) ^ cardIsRed(dest) &&
					    rank === (dest >> 2) - 1)) {
						return i;
					}
					break;
				}
			}

			return -1;
		},

		equals: function (other) {
			var equals;

			equals = Y.Array.every(["foundation", "reserve", "tableau"], function (field) {
				var stacks = this[field].stacks,
				    oStacks = other[field].stacks,
				    i, len;

				for (i = 0, len = stacks.length; i < len; i++) {
					if (stacks[i] !== oStacks[i]) { return false; }
				}

				return true;
			}, this);

			return equals;
		},

		eachStack: function (fields, callback) {
			Y.Array.each(fields, function (f) {
				Y.Array.each(this[f].stacks, callback.partial(f), this);
			}, this);
		},

		move: function (sourceField, sourceStack, destField, destStack) {
			var val = this.pop(sourceField, sourceStack);
			this.push(destField, destStack, val);
		},

		pop: function (field, stack) {
			var field = this[field],
			    stackStr,
			    val;

			if (!field.lengths[stack]) { return null; }

			field.stacks = Y.Array.map(field.stacks, identity);
			field.lengths = Y.Array.map(field.lengths, identity);

			stackStr = field.stacks[stack];
			field.stacks[stack] = stackStr.substr(1) || String.fromCharCode(0);
			field.lengths[stack]--;
			return stackStr.charAt();
		},

		push: function (field, stack, val) {
			if (val === String.fromCharCode(0) || val === null) { return; }

			var field = this[field],
			    stackStr;

			field.stacks = Y.Array.map(field.stacks, identity);
			field.lengths = Y.Array.map(field.lengths, identity);

			stackStr = field.stacks[stack];
			if (stackStr !== String.fromCharCode(0)) {
				val += stackStr;
			}
			field.lengths[stack]++;
			field.stacks[stack] = val;
		},

		_rank: null,
		rank: function () {
			if (this._rank !== null) { return this._rank; }

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
			    rank = 0;

			// reward each card in the foundation
			Y.Array.each(foundation.lengths, function (len) {
				rank += baseReward.foundation * len;
			});

			// reward free cards in the reserve or tableau that can be placed on the foundation
			this.eachStack(["reserve", "tableau"], function (stack) {
				if (this.validTarget("foundation", stack.charCodeAt()) > -1) {
					rank += baseReward.toFoundation;
				}
			});

			// reward each open tableau slot

			Y.Array.each(tableau.lengths, function (len) {
				if (!len) {
					rank += baseReward.openTableau;
				}
			});

			// reward each open reserve slot
			Y.Array.each(reserve.lengths, function (len) {
				if (!len) {
					rank += baseReward.openReserve;
				}
			});

			// reward reserve cards that can be placed the tableau
			Y.Array.each(reserve.stacks, function (s) {
				if (this.validTarget("tableau", s.charCodeAt()) > -1) {
					rank += baseReward.reserveToTableau;
				}
			}, this);

			// reward tableau cards that can be placed on other tableau cards
			Y.Array.each(tableau.stacks, function (s) {
				if (this.validTarget("tableau", s.charCodeAt()) > -1) {
					rank += baseReward.reserveToTableau;
				}
			}, this);

			// reward tableau stacks beginning with a king
			Y.Array.each(tableau.stacks, function (s, i) {
				if (s.charCodeAt(s.length - 1) === 13) {
					rank += baseReward.headedByKing;
				}
			});

			// punish buried cards that can be placed on the foundation
			Y.Array.each(tableau.stacks, function (s) {
				var i, len;

				for (i = 1, len = s.length; i < len; i++) {
					if (this.validTarget("foundation", s.charCodeAt(i)) > -1) {
						rank += baseReward.buriedFoundationTarget * i;
					}
				}
			}, this);

			this._rank = rank;
			return rank;
		},

	};

	function Tree(value) {
		this.value = value;
		this.children = [];
	}

	Tree.prototype = {
		children: null,
		parent: null,

		addChildren: function (children) {
			Y.Array.each(children, function (c) {
				c.parent = this;
				this.children.push(c);
			}, this);
		},

		findParent: function (compare) {
			var p = this;

			while (p = p.parent) {
				if (compare.equals(p.value)) { return p; }
			}

			return null;
		}
	};

	function solve(tree) {
		var state = tree.value,
		    solved = false,
		    moves = [];

		// if the state is the solved board, return
		// for each reserve and tableau stack, find all valid moves
		// for each valid move, create a new game state
		// sort each state by rank, add each state as a branch, and recurse on each undiscovered state
		// stop iterating if a child state is solved

		if (state.solved()) { return true; }

		state.eachStack(["reserve", "tableau"], function (field, stack, i) {
			Y.Array.each(["foundation", "tableau", "reserve"], function (destField) {
				if (field === "reserve" && destField === "reserve") { return; }

				var destIndex = this.validTarget(destField, stack.charCodeAt());

				if (destIndex > -1) {
					moves.push({source: [field, i], dest: [destField, destIndex]});
				}
			}, this);
		});

		moves = Y.Array.map(moves, function (move) {
			var next = GameState.fromState(state);

			next.move(move.source[0], move.source[1], move.dest[0], move.dest[1]);
			return next;
		});

		moves.sort(function (a, b) {
			return b.rank() - a.rank();
		});

		moves = Y.Array.map(moves, function (state) {
			return new Tree(state);
		});

		tree.addChildren(moves);

		Y.Array.forEach(tree.children, function (branch, i) {
			if (solved ||
			    // TODO search the whole tree for the current state
			    branch.findParent(branch.value)) { return; }

			solved = solve(branch);
		});

		return solved;
	}

	Y.mix(FreecellSolver, {
		test: function () {
			var a = gameToState(Game),
			    t = new Tree(a);
			solve(t);
			return t;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
