YUI.add("tri-towers", function (Y) {
	var Solitaire = Y.Solitaire,
	TriTowers = Y.Solitaire.TriTowers = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		width: function () { return this.Card.base.width * 15; },
		height: function () { return this.Card.base.height * 5; },
		createEvents: function () {
			Y.on("solitaire|endTurn", function () {
				var tableaus = Solitaire.game.tableau.stacks,
				    i;

				for (i = 0; i < 3; i++) {
					Y.fire("tableau:afterPop", tableaus[i]);
				}
			});

			Solitaire.createEvents.call(this);
		},

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],

			    i, stackLength;

			for (stack = 0; stack < 4; stack++) {
				stackLength = (stack + 1) * 3;

				for (i = 0; i < stackLength; i++) {
					card = deck.pop();
					stacks[stack].push(card);
					if (stack === 3) {
						card.faceUp();
					}
				}
			}

			card.after(function () {
				Solitaire.Animation.flip(foundation.last());
				stacks[3].eachCard(function (c) {
					Solitaire.Animation.flip(c);
				});
			});

			card = deck.pop();
			foundation.push(card);
			card.faceUp();

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			last && last.faceUp().moveTo(foundation);
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 4,
				layout: {
					rowGaps: [3.75, 2.5, 1.25, 0],
					cardGap: 1.25,
					vspacing: 0.6,
					hspacing: -0.625,
					top: 0,
					left: function () { return Solitaire.Card.width * 1.875; }
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: function () { return Solitaire.Card.width * 4; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			/*
			 * return true if the target is 1 rank away from the this card
			 * Aces and Kings are valid targets for each other
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var card = stack.last(),
				    diff = Math.abs(this.rank - card.rank);

				return diff === 1 || diff === 12;
			},

			playable: function () {
				var stack = this.stack;

				switch (stack.field) {
				case "deck":
					return this === stack.last();
				case "tableau":
					return this.autoPlay(true);
				default:
					return false;
				}
			},

			isFree: function () {
				var stack = this.stack,
				    next = stack.next(),
				    tower = this.tower(),
				    index = stack.cards.indexOf(this),
				    i;

				if (stack.field !== "tableau") { return false; }

				if (!next) { return true; }

				for (i = 0; i < 2; i++) {
					if (next.cards[index + tower + i]) { return false; }
				}

				return true;
			},

			tower: function () {
				var stack = this.stack,
				    index = stack.cards.indexOf(this),
				    stackIndex = stack.index() + 1;

				return Math.floor(index / stackIndex);
			}
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(TriTowers.fields, function (field) {
		TriTowers[field].Stack = instance(TriTowers.Stack);
	});

	Y.mix(TriTowers.Tableau.Stack, {
		deleteItem: function (card) {
			var cards = this.cards,
			    i = cards.indexOf(card);

			if (i !== -1) { cards[i] = null; }
		},

		setCardPosition: function (card) {
			var last = this.last(),
			    top = this.top,
			    left,
			    index,
			    stackIndex,

			    layout = TriTowers.Tableau.stackConfig.layout,
			    rowGaps = layout.rowGaps,
			    cardGap = layout.cardGap;

			if (last) {
				left = last.left + card.width * cardGap;
				index = this.cards.length;
				stackIndex = this.index() + 1;

				if (!(index % stackIndex)) { left += rowGaps[stackIndex - 1] * card.width; }
			} else {
				left = this.left;
			}

			card.top = top;
			card.left = left;
			card.zIndex = this.index() * 10;
		}
	}, true);

	Y.mix(TriTowers.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
