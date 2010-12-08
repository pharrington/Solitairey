YUI.add("spider1s", function (Y) {
	
	Y.namespace("Spider1S")

	var Spider = Y.Solitaire.Spider1S = instance(Y.Solitaire.Spider);

	Spider.Deck.suits = ["s"];
	Spider.Deck.count = 8;
}, "0.0.1", {requires: ["spider"]});
