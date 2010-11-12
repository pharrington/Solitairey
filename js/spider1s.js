YUI.add("spider1s", function (Y) {
	var ns = Y.namespace("Spider1S"),
	    Spider = instance(Y.Spider.game);

	Spider.Deck.suits = ["s"];
	Spider.Deck.count = 8;

	ns.game = Spider;
}, "0.0.1", {requires: ["spider"]});
