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

	function compareStack(a, b) {
		return b.charCodeAt() - a.charCodeAt();
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
			var i, len;

			for (i = 0; i < 4; i++) {
				if ((this.reserve.stacks[i] !== other.reserve.stacks[i]) ||
				   (this.foundation.stacks[i] !== other.foundation.stacks[i])) {
					return false;
				}
			}

			for (i = 0; i < 8; i++) {
				if (this.tableau.stacks[i] !== other.tableau.stacks[i]) {
					return false;
				}
			}

			return true;
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

		_hash: null,
		hash: function () {
			if (this._hash !== null) { return this._hash; }

			this._hash = this.reserve.stacks.join("") +
					this.foundation.stacks.join("") +
					this.tableau.stacks.join("");

			return this._hash;
		},

		_rank: null,
		rank: function () {
			if (this._rank !== null) { return this._rank; }

			var baseReward = {
				foundation: 10000,
				toFoundation: 1000,
				openTableau: 100,
				headedByKing: 50,
				openReserve: 25,
				reserveToTableau: 10,
				tableauToTableau: 5,
				buriedFoundationTarget: -20
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

			Y.Array.each(tableau.stacks, function (s) {
				var i, len;

				// reward tableau cards that can be placed on other tableau cards
				if (this.validTarget("tableau", s.charCodeAt()) > -1) {
					rank += baseReward.reserveToTableau;
				}

				// reward tableau stacks beginning with a king
				if (s.charCodeAt(s.length - 1) === 13) {
					rank += baseReward.headedByKing;
				}

				// punish buried cards that can be placed on the foundation
				for (i = 1, len = s.length; i < len; i++) {
					if (this.validTarget("foundation", s.charCodeAt(i)) > -1) {
						rank += baseReward.buriedFoundationTarget;
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

		addChild: function (child) {
			child.parent = this;
			this.children.push(child);
		},

		findParent: function (compare) {
			var p = this;

			while (p = p.parent) {
				if (compare.equals(p.value)) { return p; }
			}

			return null;
		},

		findChild: function (compare) {
			if (compare.equals(this.value)) { return this; }

			var i, len, children = this.children;

			for (i = 0, len = children.length; i < len; i++) {
				if (children[i].findChild(compare)) { return children[i]; }
			}

			return null;
		}
	};

	window.states = 0;
	// returns the depth of tree to jump up to, or 0 if the solution is found
	function solve(tree, depth, visited) {
		var state = tree.value,
		    jumpDepth,
		    maxDepth = 4,
		    moves = [],

		// if the state is the solved board, return
		// for each reserve and tableau stack, find all valid moves
		// for each valid move, create a new game state
		// sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
		// stop iterating if a child state is solved

		if (depth > maxDepth) { return Math.ceil(maxDepth / 2); }
		if (state.solved()) { return 0; }

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

			return new Tree(next);
		});

		moves.sort(function (a, b) {
			return b.value.rank() - a.value.rank();
		});

		Y.Array.forEach(moves, function (branch) {
			if (jumpDepth < depth ||
			    visited[branch.value.hash()]) {
				return;
			}

			window.states++;
			visited[branch.value.hash()] = true;
			tree.addChild(branch);
			jumpDepth = solve(branch, depth + 1, visited);

			if (jumpDepth === 0) { window.solved = true; }
		});
		tree.children = [];

		if (jumpDepth === undefined) { jumpDepth = Math.ceil(depth / 2); }
		return jumpDepth;
	}

	Y.mix(FreecellSolver, {
		test: function () {
			var a = gameToState(Game),
			    t = new Tree(a);
			window.root = t;
			solve(t, 1, {});
			return t;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
