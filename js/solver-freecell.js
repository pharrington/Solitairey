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

	function compareStack(a, b) {
		return b[0] - a[0];
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
		var reserve, foundation, tableau;

		tableau = Y.Array.map(sortedStacks(game.tableau), function (s) {
			var buffer = new Uint8Array(new ArrayBuffer(s.cards.length));

			s.eachCard(function (c, i) {
				buffer[i] = cardToValue(c);
			});

			return [buffer, s.cards.length];
		});

		reserve = new Uint8Array(new ArrayBuffer(4));
		Y.Array.forEach(sortedStacks(game.reserve), function (s, i) {
			reserve[i] = cardToValue(s.last());
		});

		foundation = new Uint8Array(new ArrayBuffer(4));
		Y.Array.forEach(sortedStacks(game.foundation), function (s, i) {
			foundation[i] = cardToValue(s.last());
		});


		return new GameState(reserve, foundation, tableau);
	}

	function GameState(reserve, foundation, tableau) {
		this.reserve = reserve;
		this.foundation = foundation;
		this.tableau = tableau;
	}

	GameState.fromState = function (other) {
		var state = new GameState();

		state.tableau = other.tableau;
		state.reserve = other.reserve;
		state.foundation = other.foundation;

		return state;
	}

	GameState.prototype = {
		reserve: null,
		foundation: null,
		tableau: null,

		solved: function () {
			var i, len,
			    foundation = this.foundation;

			for (i = 0, len = 4; i < len; i++) {
				if ((foundation[i] >> 2) !== 13) { return false; }
			}

			return true;
		},

		eachTableau: function (callback) {
			var i, len,
			    stack,
			    tableau = this.tableau;

			for (i = 0, len = tableau.length; i < len; i++) {
				stack = tableau[i];
				callback.call(this, stack[0], stack[1], i);
			}
		},

		validTarget: function (field, value) {
			var start = 0,
			    rank = value >> 2,
			    suit = value & 3,
			    dest,
			    reserve, foundation, tableau,
			    i, len;
		
			if (!value) { return -1; }

			switch (field) {
			case "foundation":
				for (i = 0; i < 4; i++ ) {
					dest = this.foundation[i];

					if ((!dest && rank === 1) ||
					    (suit === (dest & 3) &&
					    rank === (dest >> 2) + 1)) {
						return i;
					}
				}
				break;

			case "reserve":
				for (i = 0; i < 4; i++) {
					if (!this.reserve[i]) {
						return i;
					}
				}
				break;

			case "tableau":
				tableau = this.tableau;

				for (i = 0, len = tableau.length; i < len; i++) {
					dest = tableau[i][0][tableau[i][1] - 1];

					if (!tableau[i][1] ||
					    (cardIsRed(value) ^ cardIsRed(dest) &&
					    rank === (dest >> 2) - 1)) {
						return i;
					}
				}
				break;
			}

			return -1;
		},

		move: function (sourceField, sourceStack, destField, destStack) {
			var val = this.pop(sourceField, sourceStack);
			this.push(destField, destStack, val);
		},

		pop: function (field, stack) {
			var val,
			    newBuffer,
			    bufferLength,
			    tableau,
			    i, len;

			if (field === "reserve" || field === "foundation") {
				val = this[field][stack];

				this[field] = new Uint8Array(this[field]);
				this[field][stack] = 0;
				return val;
			}

			tableau = this.tableau;
			bufferLength = tableau[stack][1];

			if (!bufferLength) { return 0; }

			val = tableau[stack][bufferLength - 1];
			this.copyTableau(stack, bufferLength - 1);
			return val;
		},

		push: function (field, stack, val) {
			var newLength;
			if (!val) { return; }

			if (field === "reserve" || field === "foundation") {
				this[field] = new Uint8Array(this[field]);
				this[field][stack] = val;
				return;
			}

			newLength = this.tableau[stack][1] + 1;
			this.copyTableau(stack, newLength);
			this.tableau[stack][0][newLength - 1] = val;

		},

		copyTableau: function (stack, newLength) {
			var old = this.tableau,
			    tableau = old[stack][0],
			    newBuffer = new Uint8Array(new ArrayBuffer(newLength)),
			    i, len;

			for (i = 0; i < newLength; i++) {
				newBuffer[i] = tableau[i];
			}

			this.tableau = [];

			for (i = 0, len = old.length; i < len; i++) {
				if (i !== stack) {
					this.tableau[i] = old[i];
				} else {
					this.tableau[i] = [newBuffer, newLength];
				}
			}
		},

		_hash: null,
		// TODO write a hash function
		hash: function () {
			if (this._hash !== null) { return this._hash; }

			// ultimate laziness, no fucks given.
			this._hash = Math.random();

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
			    rank = 0,
			    i, len;

			// reward each card in the foundation
			for (i = 0, len = 4; i < len; i++) {
				rank += baseReward.foundation * (this.foundation[i] >> 2);
			};

			// reserve based ranking
			for (i = 0, len = 4; i < len; i++) {
				val = this.reserve[i];
				// reward reserve cards that can be placed the tableau
				if (this.validTarget("tableau", val) > -1) {
					rank += baseReward.reserveToTableau;
				}

				// reward cards in the reserve that can be placed on the foundation
				if (this.validTarget("foundation", val) > -1) {
					rank += baseReward.toFoundation;
				}

				// reward each open reserve slot
				if (!val) {
					rank += baseReward.openReserve;
				}
			}

			// tableau based ranking
			this.eachTableau(function (s, length) {
				var i,
				    val = s[length - 1];

				// reward free cards in the tableau that can be placed on the foundation
				if (this.validTarget("foundation", val) > -1) {
					rank += baseReward.toFoundation;
				}


				// reward each open tableau slot
				if (!length) {
					rank += baseReward.openTableau;
				}

				// reward tableau cards that can be placed on other tableau cards
				if (this.validTarget("tableau", val) > -1) {
					rank += baseReward.reserveToTableau;
				}

				// reward tableau stacks beginning with a king
				if ((val >> 2) === 13) {
					rank += baseReward.headedByKing;
				}

				// punish buried cards that can be placed on the foundation
				for (i = 0; i < len - 1; i++) {
					val = s[i];
					if (this.validTarget("foundation", val) > -1) {
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
		    maxDepth = 200,
		    moves = [],
		    i;

		// if the state is the solved board, return
		// for each reserve and tableau stack, find all valid moves
		// for each valid move, create a new game state
		// sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
		// stop iterating if a child state is solved

		if (depth > maxDepth) { return Math.ceil(maxDepth / 2); }
		if (state.solved()) { return 0; }

		for (i = 0; i < 4; i++) {
			var val = state.reserve[i];

			if (!val) { break; }
			Y.Array.each(["foundation", "tableau"], function (destField) {
				var destIndex = this.validTarget(destField, val);

				if (destIndex > -1) {
					moves.push({source: ["reserve", i], dest: [destField, destIndex]});
				}
			}, state);
		}

		state.eachTableau(function (s, length, i) {
			var val = s[length - 1];

			val && Y.Array.each(["foundation", "tableau", "reserve"], function (destField) {
				var destIndex = this.validTarget(destField, val);

				if (destIndex > -1) {
					moves.push({source: ["tableau", i], dest: [destField, destIndex]});
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

			solve(t, 1, {});
			return t;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
