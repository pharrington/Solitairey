YUI.add("golf", function (Y) {
	var Solitaire = Y.Solitaire,
	Golf = Y.Solitaire.Golf = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],
			    row;


			for (row = 0; row < 5; row++) {
				for (stack = 0; stack < 7; stack++) {
					card = deck.pop();
					stacks[stack].push(card);
					card.faceUp().flipPostMove(Solitaire.Animation.interval * 40);
				}
			}

			card = deck.pop();
			foundation.push(card);
			card.faceUp().flipPostMove(Solitaire.Animation.interval * 100);

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			if (last) {
				this.withoutFlip(function () {
					last.faceUp().moveTo(foundation);
					last.after(function () {
						Solitaire.Animation.flip(last);
					});
				});
			}
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

		height: function () { return this.Card.base.height * 4; },

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
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
				total: 7,
				layout: {
					hspacing: 1.25,
					top: 0,
					left: 0
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: function () { return Solitaire.Card.width * 3.75; }
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
			playable: function () {
				switch (this.stack.field) {
				case "tableau":
					return this.autoPlay(true);
				case "deck":
					return this === this.stack.last();
				case "foundation":
					return false;
				}
			},

			/*
			 * return true if the target is 1 rank away from the this card
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var target = stack.last(),
				    diff = Math.abs(this.rank - target.rank);

				return diff === 1;
			},

			isFree: function () {
				return !this.isFaceDown && this === this.stack.last();
			},
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(Golf.fields, function (field) {
		Golf[field].Stack = instance(Golf.Stack);
	});

	Y.mix(Golf.Tableau.Stack, {

		setCardPosition: function (card) {
			var last = this.cards.last(),
			    top = last ? last.top + last.rankHeight : this.top,
			    left = this.left;

			card.left = left;
			card.top = top;
		}
	}, true);

	Y.mix(Golf.Deck.Stack, {
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
