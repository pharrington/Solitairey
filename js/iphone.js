YUI.add("solitaire-ios", function (Y) {
	if (!Y.UA.ios) { return; }

	Y.mix(Y.DD.DDM, {
		_pg_size: function () {
			if (this.activeDrag) {
				this._pg.setStyles({width: "480px", height: "268px"});
			}
		}
	}, true);

	Y.mix(Y.DD.Drop.prototype, {
		_activateShim: function () {
			var DDM = Y.DD.DDM;

			if (!DDM.activeDrag) { return false; }
			if (this.get("node") === DDM.activeDrag.get("node")) { return false; }
			if (this.get("lock")) { return false; }

			if (this.inGroup(DDM.activeDrag.get("groups"))) {
				DDM._addValid(this);
				this.overTarget = false;
				if (!this.get("useShim")) {
					this.shim = this.get("node");
				}
				this.sizeShim();
			} else {
				DDM._removeValid(this);
			}
		}
	}, true);

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale,
	    gameOptions = {
	    	"tri-towers": {scale: 0.90, offset: 10}
	    };

	Solitaire.Card.ghost = false;
	Solitaire.Animation.animate = false;

	Solitaire.offset = {left: offsetLeft(), top: 10};
	Solitaire.maxStackHeight = function () { return 160; };

	Solitaire.scale = function () {
		var options = gameOptions[Y.Cookie.get("options")],
		    scale = options ? options.scale : 1;

		return _scale.call(this, scale);
	};

	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};

	function offsetLeft() {
		var options = gameOptions[Y.Cookie.get("options")];

		return options ? options.offset : 60;
	}

	function disableScroll(e) {
		var target = e.target;

		if (target.hasClass("stack") || target.hasClass("card")) { return; }
		e.preventDefault();
	}

	function disableStyles() {
		function stylesheet(index) {
			return {
				deleteSelector: function (selector) {
					var ss = document.styleSheets[index],
					    rules,
					    idx;

					if (!ss) { return; }

					rules = Array.prototype.splice.call(ss.rules, 0);
					idx = rules.indexOf(rules.filter(function (rule) {
						return rule.selectorText === selector;
					})[0]);

					if (idx !== -1) { ss.deleteRule(idx); }
				}
			};
		}

		stylesheet(0).deleteSelector("#menu li:hover");
	}

	function cancelIfBody(e) {
		if (e.target._node === document.body) { e.preventDefault(); }
	}

	disableStyles();

	Y.on("afterSetup", function () { scrollTo(0, 0);});
	Y.on("afterResize", function () { scrollTo(0, 0);});

	Y.on("touchstart", cancelIfBody, document);
	Y.on("touchmove", Solitaire.preventDefault, document);
}, "0.0.1", {requires: ["solitaire"]});
