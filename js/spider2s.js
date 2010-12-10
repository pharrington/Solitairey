YUI.add("spider2s", function (Y) {
	var Spider = Y.Solitaire.Spider2S = instance(Y.Solitaire.Spider);

	Spider.Deck.suits = ["s", "h"];
	Spider.Deck.count = 4;
}, "0.0.1", {requires: ["spider"]});
