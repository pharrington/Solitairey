YUI.add("solitaire-ios", function (Y) {
	if (!Y.UA.ios) { return; }

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale,

	    gameOptions = {
	    	"TriTowers": {scale: 0.90, offset: 10},
		"FlowerGarden": {offset: -60},
		"Freecell": {offset: 35},
		"FortyThieves": {offset: 10, scale: 0.9},
		"MonteCarlo": {scale: 0.78, offset: 80},
		"Pyramid": {offset: 20},
		"Scorpion": {offset: 40},
		"Spider": {scale: 0.95, offset: 10},
		"Spider1S": {scale: 0.95, offset: 10},
		"Spider2S": {scale: 0.95, offset: 10},
		"Yukon": {scale: 0.95, offset: 50}
	    },

	    gameOverrides = {
		FlowerGarden: function () {
			this.Card.rankHeight = 15;

			Y.mix(this.Reserve.stackConfig.layout, {
				top: function () { return 0; },
				left: function () { return 440; }
			}, true);

			this.Reserve.Stack.setCardPosition = function (card) {
				var last = this.cards.last(),
				    top = last ? last.top + 12 : this.top,
				    left = this.left;

				card.left = left;
				card.top = top;
			};
		},

		TriTowers: function () {
			Y.mix(this.Tableau.stackConfig.layout, {
				hspacing: -0.5,
				rowGaps: [3, 2, 1, 0],
				cardGap: 1
			}, true);
		}
	    };

	Y.mix(Y.DD.DDM, {
		useHash: false, // :\
		_pg_activate: Solitaire.noop,
		_pg_size: function () {
			if (this.activeDrag) {
				this._pg.setStyles({width: "480px", height: "268px"});
			}
		}
	}, true);

	Y.DD.DDM.set("throttleTime", 40);
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

	Y.on("beforeSetup", function () {
		var game = Solitaire.name();
		if (gameOverrides.hasOwnProperty(game)) {
			gameOverrides[game].call(Solitaire[game]);
		}

		Solitaire.offset = {left: offsetLeft(game), top: 10};
		scale(game);
	});

	Solitaire.scale = Solitaire.noop;
	Solitaire.Card.ghost = false;
	Solitaire.Animation.animate = false;

	Solitaire.maxStackHeight = function () { return 155; };

	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};

	function scale(game) {
		var options = gameOptions[game],
		    scale = options ? options.scale : 1;

		_scale.call(Solitaire.game, scale || 1);
	}

	function offsetLeft(game) {
		var options = gameOptions[game];

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
		if (e.target.test("#descriptions *")) { return; }
		e.preventDefault();
	}

	function setupUI() {
		var undo,
		    cancel,
		    showMenu,
		    menu,
		    body,
		    nav,
		    closeMenu = function () { menu.removeClass("show"); };

		disableStyles();

		menu = Y.one("#menu");
		body = Y.one("body");
		undo = Y.one("#undo");
		nav = Y.Node.create("<nav id=navbar>");
		showMenu = Y.Node.create("<a id=show_menu class='button'>New Game</a>");
		cancel = Y.Node.create("<li class=cancel><a id='cancel'>Cancel</a></li>");

		undo.get("parentNode").remove();

		showMenu.on("click", function () {
			menu.addClass("show");
		});

		menu.append(cancel);

		nav.append(showMenu);
		nav.append(Y.one("#fb"));
		nav.append(undo.addClass("button"));

		body.append(nav);
		Y.on("click", closeMenu, ["#cancel", "#new_deal", "#restart"]);

		// GameChooser customizations
		Solitaire.Application.GameChooser.draggable = false;

		Y.one("#game-chooser .titlebar").append(document.createTextNode("Games"));
		Y.one("#game-chooser .close").append(document.createTextNode("Back"));

		Y.on("gamechooser:select", function (chooser) {
			chooser.choose();
			closeMenu();
		});
	}

	Y.on("afterSetup", function () { scrollTo(0, 0);});
	Y.on("afterResize", function () { scrollTo(0, 0);});

	Y.on("touchstart", function (e) {
		if (e.target._node === document.body) { e.preventDefault(); }
	}, document);

	Y.on("touchmove", cancelIfBody, document);

	Y.on("domready", setupUI);
}, "0.0.1", {requires: ["solitaire"]});
