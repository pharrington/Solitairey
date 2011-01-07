YUI.add("solitaire-ios", function (Y) {
	if (!Y.UA.ios) { return; }

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale;

	Solitaire.Animation.animate = false;
	Solitaire.offset = {left: 60, top: 10};
	Solitaire.maxStackHeight = function () { return 160; };
	Solitaire.scale = function () {
		return _scale.call(this, 1);
	};

	Solitaire.Card.ghost = false;

	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};

	function disableScroll(e) {
		var target = e.target;

		if (target.hasClass("stack") || target.hasClass("card")) { return; }
		e.preventDefault();
	}

	Y.on("afterSetup", function () { scrollTo(0, 0);});
	Y.on("afterResize", function () { scrollTo(0, 0);});

	Y.on("touchstart", Solitaire.preventDefault, document);
	Y.on("touchmove", Solitaire.preventDefault, document);
}, "0.0.1", {requires: ["solitaire"]});
