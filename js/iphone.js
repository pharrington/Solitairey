YUI.add("solitaire-ios", function (Y) {
	if (!Y.UA.ios) { return; }

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale,

	    LANDSCAPE = 0,
	    PORTRAIT = 1,

	    BARE_LAYOUT = {
	    	hspacing: 0,
		vspacing: 0,
		left: 0,
		top: 0,
	    },

	    DEFAULTS = {
	    	scale: 1,
		offset: 60,
		maxStackHeight: 155
	    },

	    OPTIONS = {
	    	TriTowers: {scale: 0.90, offset: 10},
		FlowerGarden: {offset: -60},
		Freecell: {offset: 35},
		FortyThieves: {offset: 10, scale: 0.9},
		Klondike: {offset: [null, 5], maxStackHeight: [null, 340]},
		MonteCarlo: {scale: 0.88, offset: 80},
		Pyramid: {offset: 20},
		Scorpion: {offset: 5, maxStackHeight: [235, 380]},
		Spider: {scale: [1, 0.76], offset: [10, 2], maxStackHeight: [155, 340]},
		Yukon: {scale: [0.95, 0.9], offset: [50, 8], maxStackHeight: [235, 390]}
	    },

	    gameOverrides = {
		FlowerGarden: function () {
			this.Card.rankHeight = 15;

			Y.mix(this.Reserve.stackConfig.layout, {
				top: function () { return 0; },
				left: function () { return 440; }
			}, true);

			Y.mix(this.Reserve.Stack, {
				setCardPosition: function (card) {
					var last = this.cards.last(),
					    top = last ? last.top + 12 : this.top,
					    left = this.left;

					card.left = left;
					card.top = top;
				},

				update: function (undo) {
					if (undo) { return; }

					var stack = this,
					    top;

					Y.Array.each(this.cards, function (card, i) {
						left = stack.left + i * 12;

						if (top !== card.top) {
							card.top = top;
							card.updatePosition();
						}
					});
				}
			}, true);
		},

		Klondike: [
			function () {
				originalLayout("Klondike", "Foundation").call(this);
				originalLayout("Klondike", "Tableau").call(this);
			},

			function () {
				Y.mix(this.Foundation.stackConfig.layout, {left: 135, hspacing: 1.13}, true);
				Y.mix(this.Tableau.stackConfig.layout, {hspacing: 1.13}, true);
			}
		],

		MonteCarlo: function () {
			Y.mix(this.Tableau.stackConfig.layout, {
				cardGap: 1.1,
				vspacing: 1.05
			}, true);
		},

		Pyramid: [
			function () {
				var deck = originalLayout("Pyramid", "Deck");
				var waste = originalLayout("Pyramid", "Waste");

				return function () {
					deck.call(this);
					waste.call(this);

					Y.mix(this.Tableau.stackConfig.layout, {
						left: 190,
						cardGap: 1.1,
						hspacing: -0.55
					}, true);
				}
			}(),

			function () {
				Y.mix(this.Deck.stackConfig.layout, {
					left: -10,
					top: 300,
				}, true);

				Y.mix(this.Waste.stackConfig.layout, {
					top: 300,
				}, true);

				Y.mix(this.Tableau.stackConfig.layout, {
					left: 120,
					cardGap: 1.1,
					hspacing: -0.55
				}, true);
			}
		],

		Scorpion: [
			function () {
				fieldLayout(this, "Deck", {top: 0, left: 0});
				fieldLayout(this, "Foundation", {
					top: 0,
					left: 420,
					hspacing: 0,
					vspacing: 1.1
				});
				fieldLayout(this, "Tableau", {
					left: 60,
					hspacing: 1.13
				});
			},

			function () {
				var top = parseInt(Y.one("body").getStyle("height"), 10) - 95;

				fieldLayout(this, "Deck", {left: 10, top: top});

				fieldLayout(this, "Foundation", {
					left: 75,
					top: top,
					hspacing: 1.5,
					vspacing: 0
				});

				fieldLayout(this, "Tableau", {
					left: 0,
					hspacing: 1.13
				});
			}
		],

		Spider: [
			function () {
				Y.mix(this.Foundation.stackConfig.layout, {
					left: 94,
					hspacing: 1.18
				}, true);

				Y.mix(this.Tableau.stackConfig.layout, {
					hspacing: 1.18
				}, true);
			},
			function () {
				Y.mix(this.Foundation.stackConfig.layout, {
					hspacing: 1.05
				}, true);

				Y.mix(this.Tableau.stackConfig.layout, {
					hspacing: 1.05
				}, true);
			}
		],

		TriTowers: function () {
			Y.mix(this.Tableau.stackConfig.layout, {
				hspacing: -0.5,
				rowGaps: [3, 2, 1, 0],
				cardGap: 1
			}, true);
		},

		Yukon: [
			originalLayout("Yukon", "Foundation"),

			function () {
				var height = parseInt(Y.one("body").getStyle("height"), 10);

				fieldLayout(this, "Foundation", {
					left: 55,
					top: height - 90,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		]
	    };

	OPTIONS.Spider1S = OPTIONS.Spider2S = OPTIONS.Spider;
	gameOverrides.Spider1S = gameOverrides.Spider2S = gameOverrides.Spider;

	Y.mix(Y.DD.DDM, {
		useHash: false, // :\
		_pg_activate: Solitaire.noop,
		_pg_size: function () {
			if (this.activeDrag) {
				this._pg.setStyles({width: "100%", height: "100%"});
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
		},

		_deactivateShim: function () {
			this.overTarget = false;
		}
	}, true);

	Solitaire.Statistics.winDisplay = function () {
		alert("You win!");
	};

	Solitaire.scale = Solitaire.noop;
	Solitaire.Card.ghost = false;
	Solitaire.Animation.animate = false;

	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};

	function fieldLayout(game, field, layout) {
		Y.mix(game[field].stackConfig.layout, layout, true);
	}

	function originalLayout(game, field) {
		var layout = Y.merge(BARE_LAYOUT, Solitaire[game][field].stackConfig.layout);

		return function () {
			Y.mix(this[field].stackConfig.layout, layout, true);
		}
	}

	function runOverrides() {
		var game = Solitaire.name(),
		    override;

		if (gameOverrides.hasOwnProperty(game)) {
			override = optionWithOrientation(gameOverrides[game]);
			override.call(Solitaire.game);
		}
	}

	function optionWithOrientation(option) {
		var orientation = window.innerWidth === 480 ? LANDSCAPE : PORTRAIT,
		    o;

		if (!option.length) { return option; }

		o = option[orientation];
		return o ? o : option[LANDSCAPE];
			
	}

	function getOption(name) {
		var game = Solitaire.name(),
		    options = OPTIONS[game],
		    dfault = DEFAULTS[name],
		    option = options ? options[name] : dfault; 

		return optionWithOrientation(option ? option : dfault) || dfault;
	}
	
	function scale() {
		_scale.call(Solitaire.game, getOption("scale"));
	}

	function offsetLeft() {
		return getOption("offset");
	}

	function maxStackHeight() {
		return getOption("maxStackHeight");
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

		// set resize event to orientationchange to more flexibly customize the layout
		Solitaire.Application.resizeEvent = "orientationchange";
	}

	function setStyles(landscape) {
		var body = Y.one("body"),
		    from, to;

		if (landscape) {
			from = "portrait";
			to = "landscape";
		} else {
			from = "landscape";
			to = "portrait";
		}

		body.removeClass(from).addClass(to);
	}

	function setLayout() {
		var game = Solitaire.name(),
		    landscape = window.innerWidth === 480,
		    msh = maxStackHeight();

		setStyles(landscape);

		runOverrides();

		Solitaire.offset = {left: offsetLeft(), top: 10};
		Solitaire.maxStackHeight = function () { return msh; };
		scale();
	}

	function scrollToTop() {
		setTimeout(function () {scrollTo(0, 0);}, 0);
	}

	Y.on("beforeSetup", setLayout);
	Y.on("beforeResize", setLayout);
	Y.on("afterSetup", scrollToTop);
	Y.on("afterResize", scrollToTop);

	Y.on("touchstart", function (e) {
		if (e.target._node === document.body) { e.preventDefault(); }
	}, document);

	Y.on("touchmove", cancelIfBody, document);

	Y.on("domready", setupUI);
}, "0.0.1", {requires: ["solitaire", "statistics"]});
