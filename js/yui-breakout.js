YUI.add("breakout", function (Y) {
	function clamp (value, min, max) {
		return Math.max(Math.min(value, max), min);
	}

	/*
	 * @attribute rows
	 * @description The number of rows to split the host into. If columns is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	/*
	 * @attribute columns
	 * @description The number of columns to split the host into. If rows is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	function Breakout(config) {
		var rows = config.rows,
		    columns = config.columns;

		this._host = config.host;
		this._container = Y.Node.create("<div style='position: absolute'>");
		this._nodes = [];

		if (!(rows || columns)) {
			rows = 8;
		}

		this._rows = rows;
		this._columns = columns;

		Breakout.superclass.constructor.apply(this, arguments);
	}

	Breakout.NS = "breakout";
	Breakout.Name = "Breakout";

	Y.extend(Breakout, Y.Plugin.Base, {
		_splitNode: function () {
			var r, c,
			    x, y,
			    width = Math.round(this._blockWidth),
			    height = Math.round(this._blockHeight),
			    rows = this._rows,
			    columns = this._columns,

			    origin = this._host.getXY(),

			    host,
			    container = this._container,
			    nodes = this._nodes = [],
			    row,
			    
			    mask = Y.Node.create(
				'<div style="width: ' + width + 'px; height: ' + height + 'px; position: absolute; overflow: hidden">'
				);

			container.setXY(origin);

			for (r = 0; r < rows; r++) {
				nodes[r] = row = [];
				y = r * height;

				for (c = 0; c < columns; c++) {
					x = c * width;
					host = this._host.cloneNode(true);

					row[c] = mask.cloneNode()
						.setXY([x, y])
						.append(host.setXY([-x, -y]));
					container.append(row[c]);
				}
			}

			this._swapIn();
		},

		_swapIn: function () {
			this._host.get("parentNode").append(this._container);
			this._host.setStyle("visibility", "hidden");
		},

		_setup: function () {
			if (this._nodes.length) { return; }

			var node = this._host,
			    width = parseFloat(node.getComputedStyle("width")),
			    height = parseFloat(node.getComputedStyle("height")),

			    blockWidth,
			    blockHeight,

			    rows = this._rows,
			    columns = this._columns;

			if (rows) { blockHeight = height / rows; }
			if (columns) { blockWidth = width / columns; }

			if (!rows) {
				blockHeight = blockWidth;
				rows = height / blockHeight;
			}
			
			if (!columns) {
				blockWidth = blockHeight;
				columns = width / blockWidth;
			}

			this._container.setStyles({width: width, height: height});

			this._width = width;
			this._height = height;

			this._blockWidth = blockWidth;
			this._blockHeight = blockHeight;

			this._rows = rows;
			this._columns = columns;

			this._splitNode();
		},

		_forEach: function (effect, options) {
			this._setup();
			this._swapIn();

			var r, c,
			    rows = this._rows,
			    columns = this._columns,
 
			    options = options || {},
			    randomization = Math.abs(options.random || 0),
			    running = 0,
			    anim,
			    piece,
			    delay,
			    
			    container = this._container,
			    that = this;

			options.crop && container.setStyle("overflow", "hidden");

			for (r = 0; r < rows; r++) {
				for (c = 0; c < columns; c++) {
					running++;

					piece = this._nodes[r][c];
					anim = effect.call(this, piece, r, c, rows, columns);
					
					delay = r + c;
					if (options.reverse) {
						delay = rows + columns - delay;
					}

					anim.animation.on("end", function () {
						running--;

						if (!running) {
							that._container.remove();
							
							options.unhide && that._host.setStyle("visibility", "visible");
							options.crop && container.setStyle("overflow", "visible");

							that.fire("end");
						}
					});

					(function (a) {
				    		var random = 1 - (Math.random() * randomization),
						    opacity;

						if (options.fade) {
							opacity = options.unhide ? 0 : 1;
							Y.mix(a.animation.get("from"), {opacity: opacity});
							Y.mix(a.animation.get("to"), {opacity: 1 - opacity});
						} else {
							piece.setStyle("opacity", 1);
						}

						setTimeout(function () {
							a.animation.run();
						}, a.interval * delay * random);
					})(anim);
				}
			}
		},

		explode: function (options) {
			options = options || {};
			if (!("fade" in options)) { options.fade = true; }

			var randomization = Math.abs(options.random || 0);

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * 2,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeOutStrong,

				    random = 1 - (Math.random() * randomization),

				    center = {x: (columns - 1) / 2, y: (rows - 1) / 2},
				    delta = {x: column - center.x, y: row - center.y},

				    to;

				distance *= random;

				to  = {left: (delta.x * distance + center.x) * this._blockWidth,
					  top: (delta.y * distance + center.y) * this._blockHeight};

				if (options.unhide) {
					node.setStyles(to);
					to = {left: column * this._blockWidth, top: row * this._blockHeight};
				}
				
				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: 0};
			}, options);
		},

		sheer: function (options) {
			options = options || {};


			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    interval = options.interval || 0,
			    easing = options.easing || Y.Easing.easeIn;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    width = this._width,
				    height = this._height,

				    from = {left: column * this._blockWidth,
					    top: row * this._blockHeight},
				    to = {};

				if (columns === 1) { evenCol = evenRow; }
				if (rows === 1) { evenRow = !evenCol; }

				if (evenCol) {
					if (evenRow) { // go left
						to.left = from.left - distance * width;
					} else { // go down
						to.top = from.top + distance * height;
					}
				} else {
					if (evenRow) { // go up
						to.top = from.top - distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		pinwheel: function (options) {
			options = options || {};

			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    easing = options.easing || Y.Easing.easeOut;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    interval = 0,

				    width = this._blockWidth,
				    height = this._blockHeight,

				    from = {left: column * width,
					    top: row * height,
					    width: width,
					    height: height},
				    to = {};

				if (evenCol) {
					if (evenRow) { // go down
						to.top = from.top + distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (evenCol === evenRow) { // shrink height
					to.height = height * (1 - distance);
				} else { //shrink width
					to.width = width * (1 - distance);
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		disintegrate: function (options) {
			options = options || {};
			options.reverse = true;

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * this._height,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeBoth,

				    interval = duration / (rows + columns) * 2,

				    y = row * this._blockHeight,
				    anim;
				    
				if (distance < 0) { row = rows - row - 1}

				if (options.unhide) {
					node.setStyle("top", y - distance);
				} else {
					y += distance;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: { top: y },
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		fadeOut: function (options) {
			options = options || {};
			options.fade = true;

			this._forEach(function (node, row, column, rows, columns) {
				var duration = options.duration || 700,
				    startOpacity = options.unhide ? 0 : 1,
				    easing = options.easing,
				    interval,
				    anim;

				if (!easing) {
					easing = options.unhide ? Y.Easing.easeOut : Y.Easing.easeInStrong;
				}

				interval = duration / (rows + columns) * 2;

				anim = new Y.Anim({
					node: node,
					easing: easing,
					from: {}, to: {},
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		_inverse: function (effect, options) {
			options = options || {};
			options.unhide = true;
			effect.call(this, options);
		},

		unsheer: function (options) {
			this._inverse(this.sheer, options);
		},

		unpinwheel: function (options) {
			this._inverse(this.pinwheel, options);
		},

		converge: function (options) {
			this._inverse(this.explode, options);
		},

		fadeIn: function (options) {
			this._inverse(this.fadeOut, options);
		},

		build: function (options) {
			this._inverse(this.disintegrate, options);
		}
	});

	Y.Breakout = Breakout;
}, "1.0", {requires: ["plugin", "anim"]});
