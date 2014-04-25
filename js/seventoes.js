YUI.add("seven-toes", function (Y) {

var Solitaire = Y.Solitaire,
    Klondike = Solitaire.Klondike,
    SevenToes = Y.Solitaire.SevenToes = instance(Solitaire, {
	fields: ["Foundation", "Tableau", "Deck", "Waste"],
	
	deal: function() {
		var deck,
		    foundation,
		    card,
			i;

		deck = this.deck;
		for (i = 0; i < 6; i++)
		{
			card = this.deck.pop();
			foundation = this.foundation.stacks[i];
			foundation.push(card);
			card.faceUp();
			card.flipPostMove(Solitaire.Animation.interval * 5);
		}

		deck = this.deck.stacks[0];
		foundation = this.foundation.stacks[0];
		Klondike.deal.call(this);		
	},
	
	turnOver: function () {
		var last = this.deck.stacks[0].last(),
		    waste = this.waste.stacks[0];

		if (last && !waste.last()) {
			this.withoutFlip(function () {
				last.moveTo(waste);
				last.faceUp();
				last.flipPostMove(0);
			});
		}
	},

	redeal: Solitaire.noop,

	height: function () { return this.Card.base.height * 3; },

	Stack: instance(Solitaire.Stack, {
		images: {
			deck: null,
			waste: null,
			tableau: "freeslot.png",
			foundation: "freeslot.png"
		}
	}),

	Foundation: {
		stackConfig: {
			total: 6,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation"
	},

	Tableau: instance(Klondike.Tableau, {
		stackConfig : {
			total : 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		}	
	}),

 	Deck: instance(Klondike.Deck, {
		suits: ["s", "s", "h", "h", "c", "d"],
		field : "deck"
	}),
	
	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "waste":
				return true;
			case "tableau":
				return this.isFree();
			case "foundation":
				return false;
			case "deck":
				return !Solitaire.game.waste.stacks[0].last();
			}
		},

		isFree: function () {
			return true;
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    interval;
	
			if (!target) {
				return false;
			}

			switch (stack.field) {
			case "tableau":
				if (this.stack.field === "tableau") { return false; }
				return true;
			case "foundation":
				interval = stack.index() + 1;

				return target.rank !== 13 && ((this.rank % 13) === (target.rank + interval) % 13);
			default:
				return false;
			}
		}
	})
});

Y.Array.each(SevenToes.fields, function (field) {
	SevenToes[field].Stack = instance(SevenToes.Stack);
}, true);


Y.mix(SevenToes.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "klondike"]});
