YUI.add("accordion", function (Y) {

var Solitaire = Y.Solitaire,
    Accordion = Y.Solitaire.Accordion = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],
	width: function () { return Solitaire.Card.base.width * 10; },

	deal: function () {
		var card,
		    i,
		    cards = this.deck.cards,
		    stack = this.tableau.stacks[0];

		for (i = 0; i < cards.length; i++) {
			card = cards[i];
			stack.push(card);
			card.faceUp();
			card.flipPostMove(0);
		}
	},

	height: function () { return this.Card.base.height * 6; },

	Stack: instance(Solitaire.Stack, {
		images: {},

		adjustRankHeight: Solitaire.noop,

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else {
					c.node.drop.removeFromGroup("open");
				}
			});
		}
	}),

	Events: instance(Solitaire.Events, {
		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				var keep, discard,
				    index, stack,
				    left, top, zIndex;

				if (active.getIndex() < target.getIndex()) {
					keep = target;
					discard = active;
				} else {
					keep = active;
					discard = target;
				}

				left = discard.left;
				top = discard.top;
				zIndex = discard.zIndex;

				index = discard.getIndex();
				stack = keep.stack;

				Solitaire.game.pushMove(function () {
					discard.updatePosition = Accordion.Card.updatePosition;
					Solitaire.game.unanimated(function () {
						discard.updatePosition();
						discard.node.setStyle("display", "block");
					});
				});

				discard.moveTo(foundation);
				stack.deleteItem(keep);
				stack.cards.splice(index, 0, keep);

				discard.node.setStyle("zIndex", discard.zIndex - 1);
				keep.after(function () {
					discard.left = left;
					discard.top = top;
					discard.zIndex = zIndex;
					discard.updatePosition = Solitaire.noop;
				});
			});

			Y.fire("endTurn");
		},

		dragEnd: function (e) {
			Solitaire.game.foundation.stacks[0].updateCardsPosition();
			Solitaire.Events.dragEnd.call(this, e);
			Solitaire.game.tableau.stacks[0].updateCardsPosition();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: function () { return Solitaire.Card.height * 0 },
				left: function () { return Solitaire.Card.width * -5; }
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 1,
			layout: {
				top: 0,
				left: 0,
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			return true;
		},

		createProxyStack: function () {
			if (this.stack.field !== "tableau") { return null; }

			var stack = instance(this.stack, {
				cards: [this],
				setCardPosition: Solitaire.Stack.setCardPosition
			});

			return this.proxyStack = stack;
		},

		getIndex: function () {
			return this.stack.cards.indexOf(this);
		},

		moveTo: Y.Solitaire.FlowerGarden.Card.moveTo,

		validTarget: function (card) {
			if (card.field || card.stack.field !== "tableau") { return false; }

			var diff = Math.abs(card.getIndex() - this.getIndex());

			return (diff === 1 || diff === 3) &&
				(this.suit === card.suit || this.rank === card.rank);
		},

		isFree: function () {
			return true;
		}
	})
});

Y.Array.each(Accordion.fields, function (field) {
	Accordion[field].Stack = instance(Accordion.Stack);
});

Y.mix(Accordion.Foundation.Stack, {
	setCardPosition: function (card) {
		card.ensureDOM();
		card.node.setStyle("display", "none");
	},

	push: function (card, temp) {
		var zIndex = card.zIndex;
		Solitaire.Stack.push.call(this, card, temp);
		card.zIndex = zIndex;
	}
}, true);

Y.mix(Accordion.Tableau.Stack, {
	setCardPosition: function (card) {
		var perRow = 11,
		    radius = 7,
		    cards = this.cards,
		    total = cards.length + 1,
		    mod,
		    arc,
		    toEnd,
		    x, y,
		    top, left,
		    odd,
		    delta,
		    sign;

		mod = (total - 1) % perRow;
		arc = radius / 2 >>> 0;
		x = mod;
		y = (total - 1) / perRow >>> 0;
		toEnd = perRow - mod - 1;
		odd = y % 2 ? true : false;
		delta = perRow - mod + 1;

		console.log(total, toEnd, mod);
		if ((total > arc && total < 52 - arc) && Math.abs(delta) <= arc) {
			x -= Math.pow((arc - toEnd) / arc, 2);
			if (delta < 0) {
				sign = 1;
			} else {
				sign = -1;
			}
			y += sign * Math.pow((arc - toEnd) / arc, 2);
		}

		if (odd) {
			x = perRow - 1 - x;
		}

		card.left = x * card.width * 1 + this.left;
		card.top = y * card.height * 1.4 + this.top;
	}

}, true);

Y.on("solitaire|afterSetup", function () {
	Solitaire.Animation.queue.defaults.timeout = 0;
});

}, "0.0.1", {requires: ["flower-garden"]});
