YUI.add("baroness", function (Y) {
	var Solitaire = Y.Solitaire,
	    AcesUp = Solitaire.AcesUp,
	    Baroness = Solitaire.Baroness = instance(AcesUp, {

		createEvents: function () {
			Solitaire.createEvents.call(this);
			Y.on("solitaire|endTurn", this.fillTableau.bind(this));
		},

		turnOver: function () {
			if (Y.Array.every(this.tableau.stacks, function (stack) {
				return stack.last();
			})) {
				AcesUp.turnOver.call(this);
			}
		},

		fillTableau: function () {
			var tableau = this.tableau.stacks,
			    deck = this.deck.stacks[0],
	    		    cardsToFill,
			    card,
			    moved = [],
			    totalCards = Y.Array.reduce(tableau, 0, function (total, stack) {
				return total + stack.cards.length;
			});

			if (totalCards >= tableau.length) { return; }

			cardsToFill = 5 - totalCards;

			this.withoutFlip(function () {
				this.eachStack(function (stack) {
					if (!(cardsToFill && deck.cards.length)) { return; }

					if (!stack.last()) {
						card = deck.last();
						card.moveTo(stack);
						card.faceUp();
						cardsToFill--;
						moved.push(card);
					}
				}, "tableau");
			});

			if (card) {
				card.after(function () {
					Y.Array.each(moved, function (c) {
						Solitaire.Animation.flip(c);
					});
				});
			}
		},

		isWon: Solitaire.isWon,

		Events: instance(Solitaire.Pyramid.Events, {
			drop: function (e) {
				var active = Solitaire.activeCard,
				    foundation = Solitaire.game.foundation.stacks[0],
				    target = e.drop.get("node").getData("target");

				if (!active) { return; }

				if (target.field) {
					if (!target.last()) {
						active.moveTo(target);
					} else {
						Solitaire.stationary(function () {
							target.last().moveTo(foundation);
							active.moveTo(foundation);
						});
					}
				} else {
					Solitaire.stationary(function () {
						target.moveTo(foundation);
						active.moveTo(foundation);
					});
				}

				Y.fire("endTurn");
			}
		}),

		Tableau: instance(AcesUp.Tableau, {
			stackConfig: instance(AcesUp.Tableau.stackConfig, {
				total: 5
			})
		}),

		Stack: instance(AcesUp.Stack, {
			updateDragGroups: Y.Solitaire.Pyramid.Stack.updateDragGroups
		}),

		Foundation: instance(AcesUp.Foundation, {
			stackConfig: {
				total: 1,
				layout: {
					spacing: 0,
					top: 0,
					left: function () { return Y.Solitaire.Card.width * 8.5; }
				}
			},
		}),

		Card: instance(AcesUp.Card, {
			playable: function () {
				return this.isFree();
			},

			validTarget: function (target) {
				var card = target.last();

				if (target.field === "foundation") {
					return this.isFree() && this.rank === 13;
				}

				if (!card) {
					return true;
				}

				return !card.isFaceDown && (this.rank + card.rank === 13);
			}
		})
	});
}, "1.0.0", {requires: ["acesup", "pyramid"]});
