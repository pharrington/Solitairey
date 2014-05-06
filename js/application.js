(function () {
	function cacheNode(selector) {
		var node;

		return function () {
			if (!node) { 
				node = Y.one(selector);
			}
			return node;
		};
	}

	var active = {
		name: "Klondike",
		game: null
	    },
	    /* remove {fetchCSS: false, bootstrap: false} during development when additional YUI modules are needed
	     * TODO: generate this in the build script
	     */
	    yui = YUI({fetchCSS: false, bootstrap: false}), Y,
	    body = cacheNode("body"),
	    games = {
		"accordion": "Accordion",
		"acesup": "AcesUp",
		"agnes": "Agnes",
		"alternations": "Alternations",
		"bakersdozen": "BakersDozen",
		"bakersgame": "BakersGame",
		"baroness": "Baroness",
		"bisley": "Bisley",
		"doubleklondike": "DoubleKlondike",
		"calculation": "Calculation",
		"canfield": "Canfield",
		"eightoff": "Eightoff",
		"king-albert": "KingAlbert",
		"klondike": "Klondike",
		"klondike1t": "Klondike1T",
		"thefan": "TheFan",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"golf": "Golf",
		"grandfathers-clock": "GClock",
		"labellelucie": "LaBelleLucie",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"russian-solitaire": "RussianSolitaire",
		"simple-simon": "SimpleSimon",
		"seven-toes" : "SevenToes",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
                "spiderette": "Spiderette",
		"tri-towers": "TriTowers",
		"will-o-the-wisp": "WillOTheWisp",
		"yukon": "Yukon"},

	    extensions = [
		"json",
		"tabview",
		"util",
		"auto-turnover",
	        "statistics",
		"win-display",
		"solver-freecell",
		"solitaire-autoplay",
	        "solitaire-ios",
		"display-seed-value",
		"save-manager",
		"analytics"],

	nameMap = {
			Accordion: "Accordion",
			AcesUp: "Aces Up",
			Agnes: "Agnes",
			Alternations: "Alternations",
			BakersDozen: "Baker's Dozen",
			BakersGame: "Baker's Game",
			Baroness: "Baroness",
			Bisley: "Bisley",
			Calculation: "Calculation",
			Canfield: "Canfield",
			DoubleKlondike: "Double Klondike",
			Eightoff: "Eight Off",
			Klondike: "Klondike",
			Klondike1T: "Klondike (Vegas style)",
			TheFan: "The Fan",
			FlowerGarden: "Flower Garden",
			FortyThieves: "Forty Thieves",
			Freecell: "Freecell",
                        Golf: "Golf",
			GClock: "Grandfather's Clock",
			LaBelleLucie: "La Belle Lucie",
			KingAlbert: "King Albert",
			MonteCarlo: "Monte Carlo",
			Pyramid: "Pyramid",
			RussianSolitaire: "Russian Solitaire",
			Scorpion: "Scorpion",
			SevenToes: "Seven Toes",
			SimpleSimon: "Simple Simon",
			Spider: "Spider",
			Spider1S: "Spider (1 Suit)",
			Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
			TriTowers: "Tri Towers",
			Yukon: "Yukon"
	},

	Fade = (function() {
		var el = null,
		    css = {
		    position: "absolute",
		    display: "none",
		    backgroundColor: "#000",
		    opacity: 0.7,
		    top: 0,
		    left: 0,
		    width: 0,
		    height: 0,
		    zIndex: 1000,
		},

		element = function() {
			if (el === null) {
				el = Y.Node.create("<div>");
				el.setStyles(css);
				body().append(el);
			}
			return el;
		};

		return {
			show: function() {
				var el = element();

				css.display = "block";
				css.width = el.get("winWidth");
				css.height = el.get("winHeight");

				el.setStyles(css);

			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);
			},

			resize: function () {
				if (css.display === "block") { this.show(); }
			}
		};
	}()),

	Rules = (function () {
		var popupNode = cacheNode("#rules-popup"),
			description,
			rootNode,
			visible = false;

		function sourceNode() {
			var srcNode = Y.one("#" + active.name),
				activeGame;

			// HACK: active.name can be either of the form "MonteCarlo" or "monte-carlo" at this point, depending
			// on whether we've just switched games or not. Without this hack, you don't see rules unless you switch games.
			// A better fix would be to be more consistent with active.name.
			if (!srcNode) {
				for (m in games) {
					if (games[m] === active.name) {
						srcNode = Y.one("#" + m);
						break;
					}
				}
			}

			return srcNode;
		}

		return {
			show: function () {
				description = sourceNode().one(".description");
				popupNode().one("button").insert(description, "before");
				popupNode().removeClass("hidden");
				Fade.show();
				visible = true;
			},

			hide: function () {
				if (!(visible && description)) { return; }

				sourceNode().appendChild(description);
				popupNode().addClass("hidden");
				Fade.hide();
				visible = false;
			}
		};
	})(),

	GameChooser = {
		selected: null,
		fade: false,

		init: function () {
			this.refit();
		},

		node: cacheNode("#game-chooser"),

		refit: function () {
			var node = Y.one("#game-chooser"),
			    height = node.get("winHeight");

			node.setStyle("min-height", height);
		},

		show: function (fade) {
			if (!this.selected) {
				this.select(active.name);
			}

			if (fade) {
				Fade.show();
				this.fade = true;
			}

			this.node().addClass("show").append(Backgrounds.node());
			body().addClass("scrollable");
		},

		hide: function () {
			if (this.fade) {
				Fade.hide();
			}

			this.node().removeClass("show");
			Y.fire("gamechooser:hide", this);
			body().removeClass("scrollable").append(Backgrounds.node());
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div"),
			    previous = this.selected;
			
			if (previous !== game) {
				this.unSelect();
			}

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
			}

			if (previous && previous !== game) {
				Y.fire("gamechooser:select", this);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			this.selected = null;
		}
	},

	OptionsChooser = {
		selector: "#options-chooser",

		initInputs: function () {
			var option,
			    options = Options.properties,
			    value;

			for (option in options) {
				if (!options.hasOwnProperty(option)) { continue; }

				value = options[option].get();
				if (typeof value === "boolean") {
					document.getElementById(option + "-toggle").checked = value;
				}
			}
		},

		attachEvents: function () {
			Y.delegate("change", function (e) {
				var name = this.get("id").replace("-toggle", ""),
				    option = Options.properties[name];

				if (option) {
					option.set(this.get("checked"));
					Options.save();
				}
			}, this.selector, "input[type=checkbox]");

			Y.delegate("click", function () {
				Backgrounds.load(this.getData("item"));
				Options.save();
			}, "#background-options .backgrounds", ".background");

			Y.delegate("click", function (e) {
				Themes.load(this.getData("item"));
				Preloader.preload(false);
				Preloader.loaded(resize);
				Options.save();
			}, "#graphics-options .cards", ".card-preview");
		},

		element: (function () {
			var element;

			function createList(collection, selector, callback) {
				var item,
				    all = collection.all,
				    current = collection.current,
				    list = Y.one(selector),
				    node;

				for (item in all) {
					if (!all.hasOwnProperty(item)) { continue; }

					collection.current = item;
					node = callback(collection).setData("item", item);

					if (item === current) {
						node.addClass("selected");
					}

					list.append(node);
				}

				collection.current = current;
			}

			return function () {
				var tabview;

				if (!element) {
					element = Y.one(OptionsChooser.selector);
					tabview = new Y.TabView({
						srcNode: element.one(".tabview")
					});
					tabview.render();

					OptionsChooser.initInputs();
					OptionsChooser.attachEvents();

					createList(Themes, "#graphics-options .cards", function (collection) {
						return Y.Node.create(Y.Lang.sub(
							"<li class=card-preview><img src={base}/facedown.png><img src={base}/h12.png></li>", {
								base: collection.basePath(90)
							}));
					});

					createList(Backgrounds, "#background-options .backgrounds", function (collection) {
						return Y.Node.create("<li class=background></li>")
							.setStyle("backgroundImage", "url(" + collection.all[collection.current].image + ")");
					});
				}

				return element;
			}
		}()),

		show: function () {
			Fade.show();
			this.element().removeClass("hidden");
		},

		hide: function () {
			Fade.hide();
			this.element().addClass("hidden");
		}
	},

	Options = {
		properties: {
			cardTheme: {
				set: function (value) {
					Themes.load(value);
				},

				get: function () {
					return Themes.current || Themes.defaultTheme;
				}
			},

			autoplay: {
				set: function (value) {
					var autoplay = Y.Solitaire.Autoplay;

					value ? autoplay.enable() : autoplay.disable();
				},

				get: function () {
					return Y.Solitaire.Autoplay.isEnabled();
				}
			},

			animateCards: {
				set: function (value) {
					Y.Solitaire.Animation.animate = value;
				},

				get: function () {
					return Y.Solitaire.Animation.animate;
				}
			},

			autoFlip: {
				set: function (value) {
					var autoflip = Y.Solitaire.AutoTurnover;

					value ? autoflip.enable() : autoflip.disable();
				},

				get: function () {
					return Y.Solitaire.AutoTurnover.isEnabled();
				}
			},

			enableSolver: {
				set: function (value) {
					var solver = Y.Solitaire.Solver.Freecell;

					value ? solver.enable() : solver.disable();
				},

				get: function () {
					return Y.Solitaire.Solver.Freecell.isEnabled();
				}
			},

			background: {
				set: function (value) {
					Backgrounds.load(value);
				},

				get: function () {
					return Backgrounds.current || Backgrounds.defaultBackground;
				}
			}
		},

		load: function () {
			var options;

			options = localStorage["options"];

			if (!options) {
				options = Y.Cookie.get("full-options");
				Y.Cookie.remove("full-options");
			}

			try {
				Y.JSON.parse(options, this.set.bind(this));
			} catch (e) {
				// do nothing as we'll just use the default settings
			}

			if (!Themes.current) { Themes.load(); }
			if (!Backgrounds.current) { Backgrounds.load(); }
		},

		save: function () {
			localStorage["options"] = Y.JSON.stringify(mapObject(this.properties, function (key, value) {
				return value.get();
			}));
		},

		set: function (key, value) {
			var prop = this.properties[key];

			if (prop) {
				prop.set(value);
			}
		},
	},

	Themes = {
		all: {
			air: {
				sizes: [141],
				141: {
					hiddenRankHeight: 17,
					rankHeight: 55,
					dimensions: [141, 199]
				}
			},

			ancient_egyptians: {
				sizes: [148],
				148: {
					hiddenRankHeight: 17,
					rankHeight: 50,
					dimensions: [148, 200]
				}
			},

			dondorf: {
				sizes: [61, 79, 95, 122],
				61: {
					hiddenRankHeight: 7,
					rankHeight: 25,
					dimensions: [61, 95]
				},

				79: {
					hiddenRankHeight: 10,
					rankHeight: 32,
					dimensions: [79, 123]
				},

				95: {
					hiddenRankHeight: 12,
					rankHeight: 38,
					dimensions: [95, 148]
				},

				122: {
					hiddenRankHeight: 15,
					rankHeight: 48,
					dimensions: [122, 190]
				}
			},

			"jolly-royal": {
				sizes: [144],
				144: {
					hiddenRankHeight: 20,
					rankHeight: 52,
					dimensions: [144, 200]
				}
			},

			paris: {
				sizes: [131],
				131: {
					hiddenRankHeight: 18,
					rankHeight: 48,
					dimensions: [131, 204]
				}
			}
		},

		current: null,
		defaultTheme: "jolly-royal",

		/* theres no mechanism yet to load the appropriate deck depending on the scaled card width
		 * so we just load the largest cards and call it a day :/
		 */
		snapToSize: function (width) {
			var theme = this.all[this.current],
			    sizes = theme.sizes;

			width = clamp(width || 0, sizes[0], sizes[sizes.length - 1]) >>> 0;

			while (Y.Array.indexOf(sizes, width) === -1) {
				width++;
			}

			return width;
		},

		basePath: function (width) {
			return this.current + "/" + this.snapToSize(width);
		},

		load: function (name) {
			var Solitaire = Y.Solitaire,
			    base = Solitaire.Card.base,
			    sizes;

			if (!(name in this.all)) {
				name = this.defaultTheme;
			}

			this.current = name;

			sizes = this.all[name].sizes;
			this.set(sizes[sizes.length - 1]);
		},

		set: function (size) {
			var theme = this.all[this.current][size];

			Y.mix(Y.Solitaire.Card.base, {
				theme: this.basePath(size),
				hiddenRankHeight: theme.hiddenRankHeight,
				rankHeight: theme.rankHeight,
				width: theme.dimensions[0],
				height: theme.dimensions[1]
			}, true);
		}
	},
	
	Backgrounds = {
		all: {
			"green": {
				image:"green.jpg",
				size: "100%"
		     	}, 
			"vintage": {
				image:"backgrounds/grungy-vintage.jpg",
				repeat: true,
			},
			"circles": {
				image: "backgrounds/retro-circles-army-green.jpg",
				repeat: true,
			},
			"watercolor": {
				image: "backgrounds/watercolor-grunge-ripe-apricot.jpg",
				size: "cover",
			},
			"heart": {
				image: "backgrounds/grunge-hearts-maroon-copper.jpg",
				size: "cover"
			}
		},
		current: null,
		defaultBackground: "green",
		stylesheet: null,

		load: function (name) {
			if (!(name in this.all)) {
				name = this.defaultBackground;
			}

			this.current = name;
			this.set();
		},

		set: function () {
			var selected = this.all[this.current],
			    node;

			node = this.node();
			if (selected.repeat) {
				this.imageNode().hide();
				this.node().setStyle("backgroundImage", "url(" + selected.image + ")");
			} else {
				this.node().setStyle("backgroundImage", "none");
				this.imageNode().set("src", selected.image).show();
			}
		},

		resize: function () {
			var selected = this.all[this.current],
			    img = this.imageNode(),
			    width = img.get("width"),
			    height = img.get("height"),
			    winWidth = img.get("winWidth"),
			    winHeight = img.get("winHeight"),
			    ratioWidth, ratioHeight,
			    ratio;

			if (selected.repeat) { return; }

			if (selected.size === "cover") {
				ratioWidth = width / winWidth;
				ratioHeight = height / winHeight;
				ratio = ratioWidth < ratioHeight ? ratioWidth : ratioHeight;
				img.setAttrs({width: Math.ceil(width / ratio), height: Math.ceil(height / ratio)});
			} else if (selected.size === "100%") {
				img.setAttrs({width: winWidth, height: winHeight});
			}

			img.show();
		},

		imageNode: cacheNode("#background-image"),
		node: function () {
			var node = Y.one("#background"),
			    image;

			if (!node) {
				node = Y.Node.create("<div id=background>").appendTo(body());
				image = Y.Node.create("<img id=background-image>");
				image.set("draggable", false);
				image.on("load", this.resize.bind(this));
				node.append(image);
			}

			return node;
		}
	};

	function clamp(value, low, high) {
		return Math.max(Math.min(value, high), low);
	}

	function mapObject(source, mapper) {
		var mapped = {},
		    key;

		for (key in source) {
			if (!source.hasOwnProperty(key)) { continue; }

			mapped[key] = mapper.call(source, key, source[key]);
		}

		return mapped;
	}

	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.unshift(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		exportAPI();
		Y.on("domready", load);
	}

	function showDescription() {
		GameChooser.select(this._node.id);
		GameChooser.choose();
	}

	var aboutPopup = cacheNode("#about-popup"),
	    statsPopup = cacheNode("#stats-popup"),
	    winPopup = cacheNode("#win-display");

	function showPopup(popup) {
		Y.fire("popup", popup);
	}

	var Confirmation = {
		promptNode: cacheNode("#confirmation-prompt"),
		node: cacheNode("#confirmation"),
		affirmButton: cacheNode("#confirmation-affirm"),
		denyButton: cacheNode("#confirmation-deny"),
		active: false,

		attachEvents: function(callback) {
			this.affirmButton().once("click", function () {
				callback();
				this.hide();
			}.bind(this));

			this.denyButton().once("click", function () {
				this.hide();
			}.bind(this));
		},

		resize: function() {
			if (!this.active) { return; }

			this.node().setStyles({
				width: this.node().get("winWidth") + "px",
				height: this.node().get("winHeight") + "px"
			});
		},

		hide: function () {
			this.active = false;
			this.node().addClass("hidden");
		},

		show: function (prompt, callback) {
			this.active = true;
			this.attachEvents(callback);
			this.promptNode().set("text", prompt);
			this.node().removeClass("hidden");
			this.resize();
		}
	};

	function attachEvents() {
		var hideMenus = function () {
			GameChooser.hide();
			OptionsChooser.hide();
			Rules.hide();
			statsPopup().addClass("hidden");
			aboutPopup().addClass("hidden");
			Fade.hide();
		    };

		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", showPopup.partial("GameChooser"), Y.one("#choose-game"));
		Y.on("click", showPopup.partial("OptionsChooser"), Y.one("#choose-options"));
		Y.on("click", showPopup.partial("Rules"), Y.one("#rules"));
		Y.on("click", showPopup.partial("About"), Y.one("#about"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new-deal"));
		Y.on("click", Y.Solitaire.Statistics.statsDisplay, Y.one("#stats"));
		Y.on("submit", function () {
			Y.Solitaire.Analytics.track("Donations", "Click", "Paypal button");
		}, Y.one("#donate"));


		Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

		Y.delegate("click", showDescription, "#descriptions", "li");

		Y.on("click", hideMenus, ".close-chooser");

		Y.one("document").on("keydown", function (e) {
			if (e.keyCode === 27) {
				hideMenus();
			}
		});

		Y.on("afterSetup", function() {
			active.game.stationary(function () {
				resize();
			});
		});

		Y.on("Application|popup", function (popup) {
			winPopup().addClass("hidden");

			switch (popup) {
			case "GameChooser":
				GameChooser.show(false);
				break;
			case "OptionsChooser":
				OptionsChooser.show();
				break;
			case "About":
				aboutPopup().removeClass("hidden");
				Fade.show();
				break;
			case "Rules":
				Rules.show();
				break;
			case "Stats":
				statsPopup().removeClass("hidden");
				Fade.show();
				break;
			}
		});

		Y.on("fieldResize", function (ratio, w, h) {
			active.game.resize(ratio);
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250,
		    attachEvent;

		if (window.addEventListener) {
			attachEvent = "addEventListener";
		} else if (window.attachEvent) {
			attachEvent = "attachEvent";
		}

		window[attachEvent](Y.Solitaire.Application.resizeEvent, function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, false);
	}

	function resize() {
		var game = active.game,
		    el = game.container(),
		    padding = game.padding,
		    offset = game.offset,
		    width = el.get("winWidth") - padding.x,
		    height = el.get("winHeight") - padding.y,
		    ratio = 1;

		Y.Solitaire.Application.windowHeight = height;
		ratio = Math.min((width - normalize(offset.left)) / game.width(), (height - normalize(offset.top)) / game.height());

		Y.fire("fieldResize", ratio, width, height);
		GameChooser.refit();
		Fade.resize();
		Backgrounds.resize();
		Confirmation.resize();
	}

	function playGame(name) {
		active.name = name;
		active.game = lookupGame(name);

		newGame();
	}

	function lookupGame(name) {
		return Y.Solitaire[games[name]] || Y.Solitaire[name];
	}

	function load() {
		var save = Y.Solitaire.SaveManager.getSavedGame();

		if (save.name !== "") {
			active.name = save.name;
		}

		attachEvents();
		Options.load();

		Preloader.preload();
		Preloader.loaded(function () {
			showChromeStoreLink();
			if (save.serialized !== "") {
				clearDOM();
				active.game = lookupGame(active.name);

				try {
					active.game.cleanup();
					active.game.loadGame(save.serialized);
				} catch (e) {
					playGame(active.name);
				}
			} else {
				playGame(active.name);
			}
		});

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
	}

	function restart() {
		var save = Y.Solitaire.SaveManager.getSavedGame("initial-game"),
		    game = active.game;

		clearDOM();
		game.cleanup();

		if (save.serialized !== "") {
			game.loadGame(save.serialized);
		} else {
			game.newGame();
		}
	}

	function newGame() {
		var game = active.game;

		clearDOM();
		game.cleanup();
		game.newGame();
	}

	function exportAPI() {
		Y.Solitaire.Application = {
			windowHeight: 0,
			resizeEvent: "resize",
			GameChooser: GameChooser,
			Confirmation: Confirmation,
			newGame: newGame,
			nameMap: nameMap,
			currentTheme: function () { return Themes.current; }
		};
	}

        function hideChromeStoreLink() {
		Y.one(".chromestore").addClass("hidden");
		localStorage["disable-chromestore-link"] = "true";
        }

	function showChromeStoreLink() {
		var key = "disable-chromestore-link";

		if (Y.UA.chrome && (localStorage[key] !== "true" || !Y.Cookie.get(key, Boolean))) {
			Y.one(".chromestore").removeClass("hidden");
		}
	}

	var Preloader = {
		loadingCount: 0,
		showFade: true,

		loaded: function (callback) {
			if (this.loadingCount) {
				setTimeout(function () {
					this.loaded(callback);
				}.bind(this), 100);
			} else {
				Y.one(".loading").addClass("hidden");
				callback();
				if (this.showFade) {
					Fade.hide();
				}
			}
		},
	
		load: function (path) {
			var image = new Image;

			image.onload = function () {
				--this.loadingCount;
			}.bind(this);

			// don't freeze the page if there's an error preloading an image
			image.onerror = function () {
				--this.loadingCount;
			}.bind(this);

			image.src = path;

			this.loadingCount++;
		},

		preload: function (fade) {
			    var rank,
			    icons = ["agnes",
			    	     "flower-garden",
				     "forty-thieves",
				     "freecell",
				     "gclock",
				     "golf",
				     "klondike1t",
				     "klondike",
				     "montecarlo",
				     "pyramid",
				     "scorpion",
				     "spider1s",
				     "spider2s",
				     "spiderette",
				     "spider",
				     "tritowers",
				     "will-o-the-wisp",
				     "yukon"];

			Y.Array.each(["s", "h", "c", "d"], function (suit) {
				for (rank = 1; rank <= 13; rank++) {
					this.load(Y.Solitaire.Card.base.theme + "/" + suit + rank + ".png");
				}
			}, this);

			this.load(Y.Solitaire.Card.base.theme + "/facedown.png");
			this.load(Y.Solitaire.Card.base.theme + "/freeslot.png");

			Y.Array.each(icons, function (image) {
				this.load("layouts/mini/" + image + ".png");
			}, this);

			this.showFade = fade !== false;
			if (this.showFade) {
				Fade.show();
			}

			Y.one(".loading").removeClass("hidden");
		}
	};

	yui.use.apply(yui, modules().concat(main));
}());
