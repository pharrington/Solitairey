YUI.add("monte-carlo", function (Y) {

var Solitaire = Y.Solitaire,
    MonteCarlo = Y.Solitaire.MonteCarlo = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.createEvents.call(this);

		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");

		Y.on("solitaire|endTurn", this.deckPlayable);
		Y.on("solitaire|afterSetup", this.deckPlayable);
	},

	deckPlayable: function () {
		var gap = false,
		    node = Game.deck.stacks[0].node;

		Game.eachStack(function (s) {
			if (!gap && Y.Array.indexOf(s.cards, null) !== -1) {
				gap = true;
			}
		}, "tableau");

		if (gap) {
			node.addClass("playable");
		} else {
			node.removeClass("playable");
		}
	},

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 5; stack++) {
			for (i = 0; i < 5; i++) {
				card = deck.pop();
				stacks[stack].push(card);
				card.faceUp();
			}
		}

		card.after(function () {
			var x = 2,
			    y = 2,
			    xinc = 1,
			    yinc = 0,
			    xdir = 1,
			    ydir = -1,
			    spiralLength = -1,
			    factor = 1,
			    run = 0,
			    delay = 50, interval = 70,
			    card;

			for (i = 0; i < 25; i++) {
				if (i === (spiralLength + 1) * factor) {
					spiralLength++;
					factor++;
				}

				card = stacks[y].cards[x];

				setTimeout(function (c) {
					Solitaire.Animation.flip(c);
				}.partial(card), delay);

				delay += interval;

				x += xinc;
				y += yinc;

				if (run++ === spiralLength) {
					run = 0;
					if (xinc === 1) {
						xdir = -1;
					} else if (xinc === -1) {
						xdir = 1;
					}

					if (yinc === 1) {
						ydir = -1;
					} else if (yinc === -1) {
						ydir = 1;
					}

					xinc += xdir;
					yinc += ydir;
				}
			}
		});

		deck.createStack();
	},

	/*
	 * 1) gather all tableau cards into an array
	 * 2) clear every tableau row/stack, then redeal the cards from the previous step onto the tableau
	 * 3) deal cards from the deck to fill the remaining free rows
	 */
	redeal: function () {
		var stacks = this.tableau.stacks,
		    deck = this.deck.stacks[0],
		    cards = Y.Array.reduce(stacks, [], function (compact, stack) {
			return compact.concat(stack.compact());
			}),
		    len = cards.length,
		    card,
		    s, i;

		Y.Array.each(stacks, function (stack) {
			stack.node.remove();
			stack.cards = [];
			stack.createNode();
		});

		for (i = s = 0; i < len; i++) {
			if (i && !(i % 5)) { s++; }
			stacks[s].push(cards[i]);
		}

		this.withoutFlip(function () {
			while (i < 25 && deck.cards.length) {
				if (!(i % 5)) { s++; }
				card = deck.last();
				card.moveTo(stacks[s]);
				card.faceUp();
				card.node.setStyle("zIndex", 100 - i);
				i++;
				card.flipPostMove(Solitaire.Animation.interval * 5);
			}
		});

	},

	height: function () { return this.Card.base.height * 6; },

	Stack: instance(Solitaire.Stack, {
		images: { deck: "freeslot.png" },

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else
					c.node.drop.removeFromGroup("open");
			});
		},

		index: function () { return 0; }
	}),

	Events: instance(Solitaire.Events, {
		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 10.5; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 2}
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Tableau: {
		stackConfig: {
			total: 5,
			layout: {
				cardGap: 1.25,
				vspacing: 1.25,
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		row: function () {
			return this.stack.index();
		},

		column: function () {
			return this.stack.cards.indexOf(this);
		},

		/*
		 * return true if:
		 * 1) the target card is free
		 * 2) both cards are the same rank
		 * 3) both cards are adjacent vertically, horizontally, or diagonally
		 */

		validTarget: function (card) {
			if (this === card || !(this.rank === card.rank && card.isFree())) { return false; }

			return Math.abs(card.row() - this.row()) <= 1 &&
				Math.abs(card.column() - this.column()) <= 1;
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			return this.stack.field === "tableau";
		},

		turnOver: function () {
			this.stack.field === "deck" && Solitaire.game.redeal();
		}
	})
});

Y.Array.each(MonteCarlo.fields, function (field) {
	MonteCarlo[field].Stack = instance(MonteCarlo.Stack);
});

// Each tableau row is treated as a "stack"
Y.mix(MonteCarlo.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    layout = MonteCarlo.Tableau.stackConfig.layout,
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
	},

	compact: function () {
		var cards = this.cards,
		    card,
		    compact = [],
		    i, len;

		for (i = 0, len = cards.length; i < len; i++) {
			card = cards[i];
			if (card) {
				compact.push(card);
				card.pushPosition();
			}
		}

		return compact;
	},

	index: function () {
		return Solitaire.game.tableau.stacks.indexOf(this);
	}
}, true);

Y.mix(MonteCarlo.Deck.Stack, {
	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
