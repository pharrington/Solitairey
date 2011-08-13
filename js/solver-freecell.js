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
		rating: null,
		parentMove: null,
		parent: null,
		child: null,

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

		validTarget: function (field, value, start) {
			var rank = value >> 2,
			    suit = value & 3,
			    dest,
			    tableau,
			    i, len;
		
			if (!value) { return -1; }

			if (start === undefined) {
				start = 0;
			} else {
				start++;
			}

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

				for (i = start, len = tableau.length; i < len; i++) {
					dest = tableau[i][0][tableau[i][1] - 1];

					if (!tableau[i][1] ||
					    (((suit & 1) ^ (dest & 1)) &&
					    (rank === (dest >> 2) - 1))) {
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

			val = tableau[stack][0][bufferLength - 1];
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

			for (i = 0; i < newLength; ++i) {
				newBuffer[i] = tableau[i];
			}

			this.tableau = [];

			for (i = 0, len = old.length; i < len; ++i) {
				if (i !== stack) {
					this.tableau[i] = old[i];
				} else {
					this.tableau[i] = [newBuffer, newLength];
				}
			}
		},

		sort: function () {
			Array.prototype.sort.call(this.reserve);
			Array.prototype.sort.call(this.foundation);
			this.tableau.sort(function (a, b) {
				return a[0][0] - b[0][0];
			});
		},

		_hash: null,
		// TODO write a hash function
		hash: function () {
			if (this._hash !== null) { return this._hash; }

			var i, j, len, stack;

			this._hash = "";
			for (i = 0; i < 4; i++) {
				this._hash += String.fromCharCode(this.reserve[i]);
			}

			this._hash += "-";

			for (i = 0; i < 4; i++) {
				this._hash += String.fromCharCode(this.foundation[i]);
			}

			this._hash += "-";

			for (i = 0; i < 8; i++) {
				stack = this.tableau[i];

				for (j = 0; j < stack[1]; j++) {
					this._hash += String.fromCharCode(stack[0][j]);
				}
			}

			return this._hash;
		},

		rateMove: function (sourceField, sourceIndex, destField, destIndex) {
			var RATING_FOUNDATION = 1000,
			    RATING_FREEFOUNDATIONTARGET = 15,
			    RATING_CLOSEDTABLEAUFOLLOWUP = 20,
			    RATING_OPENTABLEAU = 15,
			    RATING_FREETABLEAUTARGET = 10,
			    RATING_OPENRESERVE = 10,
			    RATING_TABLEAU = 1,
			    RATING_RESERVE = -1,
			    RATING_CLOSEDTABLEAU = -5,
			rating = 0,
			stack,
			card,
			nextCard,
			followup = false,
			i, length;

			// reward moves to the foundation
			if (destField === "foundation") {
				rating += RATING_FOUNDATION;
			}

			if (sourceField === "tableau") {
				stack = this.tableau[sourceIndex];
				length = stack[1];
				card = stack[0][length - 1];

				// reward an opened tableau slot
				if (length === 1) {
					rating += RATING_OPENTABLEAU;
				}

				// reward unburing foundation targets
				for (i = length - 2; i >= 0; i--) {
					if (this.validTarget("foundation", stack[0][i]) > -1) {
						rating += RATING_FREEFOUNDATIONTARGET;
					}
				}

				// reward a newly discovered tableau-to-tableau move
				if (this.validTarget("tableau", stack[0][length - 2]) > -1) {
					rating += RATING_FREETABLEAUTARGET;
				}
			}

			// reward an opened reserve slot
			if (sourceField === "reserve") {
				rating += RATING_OPENRESERVE;
				card = this.reserve[sourceIndex];
			}

			// reward any move to the tableau
			if (destField === "tableau") {
				rating += RATING_TABLEAU;

				stack = this.tableau[destIndex];
				if (stack[1] === 0) {
					// reward a move to an empty stack that can be followed up be another move
					for (i = 0; i < 4; i++) {
						nextCard = this.reserve[i];
						if (((nextCard >> 2) === (card >> 2) - 1) &&
						    ((nextCard & 1) ^ (card & 1))) {
							rating += RATING_CLOSEDTABLEAUFOLLOWUP;
							followup = true;
						}
					}

					for (i = 0; i < 8; i++) {
						stack = this.tableau[i];
						nextCard = stack[0][stack[1] - 1];
						if (((nextCard >> 2) === (card >> 2) - 1) &&
						    ((nextCard & 1) ^ (card & 1))) {
							rating += RATING_CLOSEDTABLEAUFOLLOWUP;
							followup = true;
						}
					}

					// punish filling a tableau slot with no immediate followup
					if (!followup) {
						rating += RATING_CLOSEDTABLEAU;
					}
				}
			}

			// penalize moving to the reserve
			if (destField === "reserve") {
				rating += RATING_RESERVE;
			}
			return rating;
		},

		transformParentMove: function () {
			var move = this.parentMove,
			    parent = this.parent;

			if (!(move && parent)) { return; }

			move.source[1] = parent.lastCard(move.source[0], move.source[1]);
			move.dest[1] = parent.lastCard(move.dest[0], move.dest[1]);
		},

		lastCard: function (field, index) {
			var stack, length;

			switch (field) {
			case "reserve":
			case "foundation":
				return this[field][index];

			case "tableau":
				stack = this[field][index];
				length = stack[1];

				return stack[0][length - 1];
			}
		},

		becomeChild: function () {
			var parent = this.parent;

			if (!parent) { return; }

			parent.child = this;
			this.transformParentMove();
		}
	};

	function Tree(value) {
		this.value = value;
		this.children = [];
	}

	Tree.prototype = {
		children: null,
		parent: null,

		addChildren: function (children) {
			children.forEach(function (c) {
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
	window.ddd = 0;

	// returns the depth of tree to jump up to, or 0 if the solution is found
	function solve(state, depth, visited, movesSinceFoundation) {
		var jumpDepth,
		    maxDepth = 150,
		    sourceIndex, destIndex, length, val,
		    next, sourceField, destField,
		    tableau,
		    move, moves = [],
		    scale = 1,
		    foundFoundation = false,
		    i;

		/*
		 * if the state is the solved board, return
		 * for each reserve and tableau stack, find all valid moves
		 * for each valid move, create a new game state
		 * sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
		 * stop iterating if a child state is solved
		 */

		if (depth > maxDepth) { return maxDepth; }

		/* when the state is solved
		 * replace the stack index with its associated move with the actual card that was moved
		 * set the parent states child to this state
		 * then jump out of the tree
		 */
		if (state.solved()) {
			state.becomeChild();
			return 0;
		}

		// find moves from the reserve
		for (i = 0; i < 4; i++) {
			val = state.reserve[i];

			if (!val) { continue; }

			destIndex = state.validTarget("foundation", val);
			if (destIndex > -1) {
				moves.push({source: ["reserve", i], dest: ["foundation", destIndex]});
				foundFoundation = true;
			}

			if (foundFoundation) { break; }

			destIndex = 0;
			while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
				moves.push({source: ["reserve", i], dest: ["tableau", destIndex]});
			}
		}

		// find moves from the tableau
		tableau = state.tableau;
		for (i = 0; i < tableau.length; i++) {
			s = tableau[i][0];
			length = tableau[i][1];
			val = s[length - 1];

			if (!val) { continue; }

			destIndex = state.validTarget("foundation", val);
			if (destIndex > -1) {
				moves.push({source: ["tableau", i], dest: ["foundation", destIndex]});
				foundFoundation = true;
			}

			if (foundFoundation) { break; }

			destIndex = state.validTarget("reserve", val);
			if (destIndex > -1) {
				moves.push({source: ["tableau", i], dest: ["reserve", destIndex]});
			}

			destIndex = 0;
			while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
				moves.push({source: ["tableau", i], dest: ["tableau", destIndex]});
			}
		}

		if (foundFoundation) {
			movesSinceFoundation = 0;
		} else {
			movesSinceFoundation++;
		}

		for (i = 0; i < moves.length; i++) {
			move = moves[i];
			next = GameState.fromState(state);

			sourceField = move.source[0];
			sourceIndex = move.source[1];

			destField = move.dest[0];
			destIndex = move.dest[1];

			next.rating = next.rateMove(sourceField, sourceIndex, destField, destIndex);
			next.move(sourceField, sourceIndex, destField, destIndex);
			next.parentMove = move;
			next.parent = state;

			moves[i] = next;
		};

		moves.sort(function (a, b) {
			return b.rating - a.rating;
		});

		// if nothing's been moved to the foundation in many turns, backtrack alot of steps
		if (movesSinceFoundation >= 20) {
			scale = 0.7;
		}

		for (i = 0; i < moves.length && scale === 1; i++) {
			move = moves[i];
			if (jumpDepth < depth ||
			    visited[move.hash()]) {
				break;
			}

			window.states++;
			visited[move.hash()] = true;
			jumpDepth = solve(move, depth + 1, visited, movesSinceFoundation);
		}

		if (depth > window.ddd) { window.ddd = depth; }

		if (jumpDepth === 0) {
			state.becomeChild();
			window.solved = true;
		}

		if (jumpDepth === undefined) { jumpDepth = Math.ceil(depth * scale); }
		return jumpDepth;
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

	function animateMove(game, state) {
		var child = state.child,
		    move;

		if (!child) { return; }

		if (child.parentMove) {
			move = moveToCardAndStack(game, child.parentMove);
			move.card.moveTo(move.stack);
		}

		window.setTimeout(animateMove.partial(game, child), 1000);
	}

	Y.mix(FreecellSolver, {
		test: function () {
			var a = gameToState(Game);

			solve(a, 1, {}, 0);

			animateMove(Game, a);
			return a;
		}
	});
}, "0.0.1", {requires: ["solitaire"]});

function last(t, index) {
}
