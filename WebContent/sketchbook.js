// sketchbook.js - sketchbook data model including file format support (for sketcher2)

// Sketch class/constructor
function Sketch(id) {
	this.id = id;
	this.description = '';
	this.elements = [];
	this.background = {};
}

Sketch.prototype.marshall = function() {
	var jsketch = { id : this.id, description: this.description, elements: this.elements, background: this.background };
	return jsketch;
};

var DEFAULT_TEXT_WIDTH = 50;
var DEFAULT_TEXT_HEIGHT = 50;

Sketch.prototype.unmarshall = function(jsketch) {
	this.id = jsketch.id;
	if (jsketch.description!==undefined)
		this.description = jsketch.description;
	if (jsketch.elements!==undefined) {
		for (var eix=0; eix<jsketch.elements.length; eix++) {
			var jelement = jsketch.elements[eix];
			// TODO any more checking??
			if (jelement.image) {
				// if image: and no image.url: take image.dataurl: as image.url: (backwards compatibility with 2.0)
				var image = jelement.image;
				if (!image.url)
					image.url = image.dataurl;
				delete image.dataurl;
			}
			else if (jelement.line) {
				// if line and no lineColor take color; no lineWidth, take width (backwards compatibility with 2.0)
				var line = jelement.line;
				if (!line.lineWidth)
					line.lineWidth = line.width;
				delete line.width;
				if (!line.lineColor)
					line.lineColor = line.color;
				delete line.color;
			}
			else if (jelement.text) {
				// if text and no textColor take color; if size and no textSize take size; (backwards compatibility with 2.0)
				var text = jelement.text;
				if (!text.textColor)
					text.textColor = text.color;
				delete text.color;
				if(!text.textSize)
					text.textSize = text.size;
				delete text.size;
				// if no width/height set defaults (backwards compatibility with 2.0)
				if (!text.width)
					text.width = DEFAULT_TEXT_WIDTH;
				if (!text.height)
					text.height = DEFAULT_TEXT_HEIGHT;
			}
			this.elements.push(jelement);
		}
	}
	if (jsketch.background) {
		this.background = jsketch.background;
	}
};

function getDescriptionTitle(description, id) {
	var title = description;
	var ix = title.indexOf('\n');
	if (ix>=0)
		title = title.substr(0, ix);
	if (title===undefined || title==null || title.length==0) {
		if (id)
			return "Unnamed ("+id+")";
		else
			return "Unnamed";
	}
	return title;
}
function getSketchTitle(sketch) {
	return getDescriptionTitle(sketch.description, sketch.id);
}
Sketch.prototype.getTitle = function() {
	return getSketchTitle(this);
};

/** get element by id */
Sketch.prototype.getElementById = function(id) {
	for (var i=0; i<this.elements.length; i++) {
		var element = this.elements[i];
		if (element.id==id)
			return element;
	}
	return null;
};

/** convert color to paper js color */
function colorToPaperjs(color) {
	return new paper.RgbColor(color.red, color.green, color.blue);
}

/** return paperjs Matrix transform from Rectangle to Rectangle */
function getMatrixFromTo(from, to) {
	// xscale
	var a = from.width>0 ? to.width/from.width : 1;
	// yscale
	var b = from.height>0 ? to.height / from.height : 1;
	var tx = to.x-a*from.x;
	var ty = to.y-b*from.y;
	var m = new paper.Matrix(a, 0, 0, b, tx, ty);
	console.log('matrix from '+from+' to '+to+' = '+m);
	return m;
}
/** convert an array of elements to paperjs */
function elementsToPaperjs(elements, sketchbook, images, iconSketchIds, fromsketch) {
	if (iconSketchIds==undefined)
		iconSketchIds = [];
	var items = new Array();
	for (var ix=0; ix<elements.length; ix++) {
		var element = elements[ix];
		if (element.line!==undefined) {
			var path = new paper.Path();
			// preserve id
			path.sketchElementId = element.id;
			items.push(path);
			if (element.line.lineWidth)
				path.strokeWidth = element.line.lineWidth;
			if (element.line.lineColor && (!element.line.frameStyle)) 
				path.strokeColor = colorToPaperjs(element.line.lineColor);
			if (element.line.lineColor && element.line.frameStyle && element.line.frameStyle.indexOf('border')>=0) {
				path.strokeColor = colorToPaperjs(element.line.lineColor);
				path.closed = true;
			}
			if (element.line.fillColor && element.line.frameStyle && element.line.frameStyle.indexOf('fill')>=0) {
				path.fillColor = colorToPaperjs(element.line.fillColor);
				path.closed = true;
			}
			if (element.line.segments) {
				for (var si=0; si<element.line.segments.length; si++) {
					var segment = element.line.segments[si];
					if (segment.point && segment.handleIn && segment.handleOut)
						path.add(new paper.Segment(
								new paper.Point(segment.point.x, segment.point.y),
								new paper.Point(segment.handleIn.x, segment.handleIn.y),
								new paper.Point(segment.handleOut.x, segment.handleOut.y)
								));
				}
			}
		}
		if (element.icon!==undefined) {
			// copy sketch item(s)
			var sketch = sketchbook.sketches[element.icon.sketchId];
			var group = null;
			var bounds = null;
			var frameel = null;
			if (!sketch || iconSketchIds.indexOf(element.icon.sketchId)>=0) {
				if (!sketch)
					console.log('cannot find sketch '+element.icon.sketchId+' for icon');
				else
					console.log('found loop of sketches/icons for sketch '+element.icon.sketchId);
				var outline = new paper.Path.Rectangle(new paper.Rectangle(element.icon.x, element.icon.y, element.icon.width, element.icon.height));
				outline.fillColor = 'grey';
				var iconItems = [outline];
				//outline.strokeWidth = 2;
				group = new paper.Group(iconItems);			
			}
			else {
				var iconItems = sketch.toPaperjs(sketchbook, images, iconSketchIds);
				// if linking to a frame then we need to define a clipping rectangle as first item,
				// which will match the frame, and adjust the scaling appropriately
				if (element.icon.elementId) {
					frameel = sketch.getElementById(element.icon.elementId);
					if (!frameel) 
						console.log('could not find link frame element '+element.icon.elementId+' in sketch '+element.icon.sketchId);
					else if (!frameel.frame) 
						console.log('found non-frame link element '+element.icon.elementId+' in sketch '+element.icon.sketchId);
					else {
						bounds = new paper.Rectangle(frameel.frame.x, frameel.frame.y, frameel.frame.width, frameel.frame.height);
						var clip = new paper.Path.Rectangle(bounds);
						iconItems.unshift(clip);
						group = new paper.Group(iconItems);
						group.clipped = true;
					}
				}
				if(!group)
					// fallback/default
					group = new paper.Group(iconItems);
			}
			if (!bounds)
				bounds = group.bounds;
			var iconBounds = new paper.Rectangle(element.icon.x, element.icon.y, element.icon.width, element.icon.height);
			group.transform(getMatrixFromTo(bounds, iconBounds));

			// package that group in another group for label, border, fill!
			var iconItems = [];
			iconItems.push(group);
			group = new paper.Group(iconItems);
			group.sketchElementId = element.id;
			group.sketchFrameFlag = true;
			
			//group.bounds = new paper.Rectangle(element.icon.x, element.icon.y, element.icon.width, element.icon.height);
			if (element.icon.frameStyle && element.icon.frameStyle.indexOf('border')>=0) {
				// bounds pre/post?
				var border = new paper.Path.Rectangle(iconBounds);
				if (element.icon.lineColor)
					border.strokeColor = colorToPaperjs(element.icon.lineColor);
				else 
					border.strokeColor = 'black';
				group.addChild(border);
			}
			if (element.icon.frameStyle && element.icon.frameStyle.indexOf('fill')>=0) {
				// bounds pre/post?
				var fill = new paper.Path.Rectangle(iconBounds);
				if (element.icon.fillColor)
					fill.fillColor = colorToPaperjs(element.icon.fillColor);
				else 
					fill.fillColor = 'black';				
				group.insertChild(0, fill);
			}			

			// label
			if (element.icon.showLabel) {
				var textSize = 12;
				if (element.icon.textSize)
					textSize = element.icon.textSize;
				// 12pts = 16pixels
				var y = element.icon.y+element.icon.height/2+textSize*4/3*0.25;
				if (element.icon.textVAlign) {
					if (element.icon.textVAlign=='above')
						y = element.icon.y-textSize*4/3*0.25;
					else if (element.icon.textVAlign=='below')
						y = element.icon.y+element.icon.height+textSize*4/3*0.75;
					else if (element.icon.textVAlign=='top')
						y = element.icon.y+textSize*4/3*0.75;
					else if (element.icon.textVAlign=='bottom')
						y = element.icon.y+element.icon.height-textSize*4/3*0.25;
				}
				var title = new paper.PointText(new paper.Point(element.icon.x+element.icon.width/2, y));
				title.characterStyle.fontSize = textSize;
				title.content = '';
				if (element.icon.showLabel.indexOf('sketch')>=0) {
					// target sketch
					if (sketch)
						title.content += getSketchTitle(sketch);
				}
				if (element.icon.showLabel.indexOf('frame')>=0) {
					if (title.content.length>0)
						title.content += ': ';
					if (frameel && frameel.frame && frameel.frame.description)
						title.content += frameel.frame.description;
				}
				title.paragraphStyle.justification = 'center';
				// default
				if (element.icon.textColor)
					title.characterStyle.fillColor = colorToPaperjs(element.icon.textColor);
				else
					title.characterStyle.fillColor = 'black';
				group.addChild(title);
			}
			items.push(group);
		}
		if (element.frame!==undefined) {
			var outline = new paper.Path.Rectangle(new paper.Rectangle(element.frame.x, element.frame.y, element.frame.width, element.frame.height));
			// default
			if (element.frame.lineWidth)
				outline.strokeWidth = element.frame.lineWidth;
			if (element.frame.frameStyle && element.frame.frameStyle.indexOf('border')>=0) {
				if (element.frame.lineColor)
					outline.strokeColor = colorToPaperjs(element.frame.lineColor);
				else
					outline.strokeColor = 'black';
			}
			if (element.frame.frameStyle && element.frame.frameStyle.indexOf('fill')>=0) {
				if (element.frame.fillColor)
					outline.fillColor = colorToPaperjs(element.frame.fillColor);
				else
					outline.fillColor = 'black';
			}
			//outline.strokeColor = 'grey';
			//outline.strokeWidth = 2;
			outline.dashArray = [4, 10];
			// default
			var textSize = 12;
			if (element.frame.textSize)
				textSize = element.frame.textSize;
			// 12pts = 16pixels
			var y = element.frame.y+element.frame.height/2+textSize*4/3*0.25;
			if (element.frame.textVAlign) {
				if (element.frame.textVAlign=='above')
					y = element.frame.y-textSize*4/3*0.25;
				else if (element.frame.textVAlign=='below')
					y = element.frame.y+element.frame.height+textSize*4/3*0.75;
				else if (element.frame.textVAlign=='top')
					y = element.frame.y+textSize*4/3*0.75;
				else if (element.frame.textVAlign=='bottom')
					y = element.frame.y+element.frame.height-textSize*4/3*0.25;
			}
			var title = new paper.PointText(new paper.Point(element.frame.x+element.frame.width/2, y));
			title.characterStyle.fontSize = textSize;
			title.content = '';
			if (element.frame.showLabel===null || element.frame.showLabel===undefined)
				// default
				title.content = element.frame.description;
			else {
				if (element.frame.showLabel.indexOf('sketch')>=0 && fromsketch)
					title.content += getSketchTitle(fromsketch);
				if (element.frame.showLabel.indexOf('frame')>=0) {
					if (title.content.length>0)
						title.content += ': ';
					title.content += element.frame.description;
				}
			}
			title.paragraphStyle.justification = 'center';
			// default
			if (element.frame.textColor)
				title.characterStyle.fillColor = colorToPaperjs(element.frame.textColor);
			else
				title.characterStyle.fillColor = 'black';
			group = new paper.Group([outline, title]);			
			group.sketchElementId = element.id;
			items.push(group);
		}
		if (element.image!==undefined) {
			var imageId = null;
			for (var iid in images) {
				if (images[iid].url==element.image.url) {
					imageId = iid;
					break;
				} else
					console.log('did not match image '+iid);
			}
			var item = null;
			var bounds = new paper.Rectangle(element.image.x, element.image.y, element.image.width, element.image.height);
			if (!imageId) {
				console.log('Could not find image for url');
				item = new paper.Path.Rectangle(bounds);
				// default
				item.fillColor = 'grey';
			} else {
				item = new paper.Raster(imageId);
				item.bounds = bounds;
			}
			item.sketchElementId = element.id;
			items.push(item);
		}
		if (element.text!==undefined) {
			var text = new paper.PointText(new paper.Point(element.text.x, element.text.y));
			text.content = element.text.content;
			text.characterStyle.fontSize = element.text.textSize;
			text.paragraphStyle.justification = 'center';
			text.characterStyle.fillColor = colorToPaperjs(element.text.textColor);
			text.sketchElementId = element.id;
			items.push(text);
		}
	}
	return items;
}

/** convert all elements to paperjs objects (in current/default paperjs project).
 * @return array of items added */
Sketch.prototype.toPaperjs = function(sketchbook, images, iconSketchIds) {
	if (iconSketchIds==undefined)
		iconSketchIds = [];
	else
		iconSketchIds = iconSketchIds.slice(0);
	iconSketchIds.push(this.id);
	return elementsToPaperjs(this.elements, sketchbook, images, iconSketchIds, this);
};

/** get elementId (if any) for paperJs item */
function getSketchElementId(item) {
	return item.sketchElementId;
}

/** sequence class */
function Sequence(id) {
	this.id = id;
	this.description = '';
	this.items = [];
}

Sequence.prototype.getTitle = function() {
	return getDescriptionTitle(this.description);
};

/** to JSON */
Sequence.prototype.marshall = function() {
	var jsequence = { id: this.id, description: this.description, items: [] };
	for (var ix=0; ix<this.items.length; ix++)
	{
		var sitem = this.items[ix];
		jsequence.items.push(JSON.parse(JSON.stringify(sitem)));
	}
	return jsequence;
};
/** unmarshall from standard JSON */
Sequence.prototype.unmarshall = function(jsequence) {
	this.id = jsequence.id;
	if (jsequence.description!==undefined)
		this.description = jsequence.description;
	if (jsequence.items!==undefined) {
		for (var eix=0; eix<jsequence.items.length; eix++) {
			var jsitem = jsequence.items[eix];
			// TODO any more checking??
			this.items.push(jsitem);
		}
	}
};

/** get item by id */
Sequence.prototype.getItemById = function(id) {
	for (var i=0; i<this.items.length; i++) {
		var item = this.items[i];
		if (item.id==id)
			return item;
	}
	return null;
};

// Sketchbook Class/constructor
function Sketchbook() {
	// associative array of Sketches
	this.sketches = new Object();
	this.sequences = new Array();
	this.nextId = 1;
	this.changed = false;
}

// current version string
var VERSION = "sketcher2.0";

Sketchbook.prototype.marshall = function() {
	var jsketches = new Array();	
	var jstate = { version: VERSION, nextId: this.nextId, sketches: jsketches };
	for (var sid in this.sketches) {
		var sketch = this.sketches[sid];
		jsketches.push(sketch.marshall());
	}
	jstate.sequences = new Array();
	for (var six=0; six<this.sequences.length; six++) {
		jstate.sequences.push(this.sequences[six].marshall());
	}
	return jstate;
};

Sketchbook.prototype.unmarshall = function(jstate) {
	this.nextId = jstate.nextId;
	var jversion = jstate.version;
	if (VERSION!=jversion)
		throw "Wrong file version: "+jversion+", expected "+VERSION;
	for (var jsix=0; jsix<jstate.sketches.length; jsix++) {
		var jsketch = jstate.sketches[jsix];
		var sketch = new Sketch();
		sketch.unmarshall(jsketch);
		if (sketch.id==undefined) {
			sketch.id = this.nextId++;
		}
		this.sketches[sketch.id] = sketch;
		for (var ei=0; ei<sketch.elements.length; ei++) {
			var el = sketch.elements[ei];
			if (el.id===undefined)
				el.id = this.nextId++;
		}
	}
	// unmarshall sequence(s)
	this.sequences = new Array();
	if (jstate.sequences) {
		for (var six=0; six<jstate.sequences.length; six++) {
			var jsequence = jstate.sequences[six];
			var sequence = new Sequence();
			sequence.unmarshall(jsequence);
			if (sequence.id===undefined)
				sequence.id = this.nextId++;
			for (var iix=0; iix<sequence.items.length; iix++)
			{
				var sitem = sequence.items[iix];
				if (sitem.id===undefined)
					sitem.id = this.nextId++;
			}
			this.sequences.push(sequence);
		}
	}
};
/** merge */
Sketchbook.prototype.merge = function(other) {
	// first establish mapping of ids
	var idMap = new Array();
	var sketches = [];
	for (var sketchId in other.sketches) {
		var sketch = other.sketches[sketchId];
		sketches.push(sketch);
		idMap[sketch.id] = this.nextId++;
		for (var ei=0; ei<sketch.elements.length; ei++) {
			var el = sketch.elements[ei];
			idMap[el.id] = this.nextId++;
		}
	}
	for (var six in this.sequences) {
		var sequence = this.seqeunces[six];
		idMap[sequence.id] = this.nextId++;
		for (var iix=0; iix<sequence.items.length; iix++)
		{
			var sitem = sequence.items[iix];
			idMap[sitem.id] = this.nextId++;
		}
	}
	// now remap ids and references, merging sketches and sequences
	while (sketches.length>0) {
		var sketch = sketches.shift();
		sketch.id = idMap[sketch.id];
		for (var ei=0; ei<sketch.elements.length; ei++) {
			var el = sketch.elements[ei];
			el.id = idMap[el.id];
			if (el.icon) {
				el.icon.sketchId = idMap[el.icon.sketchId];
				if (el.icon.elementId)
					el.icon.elementId = idMap[el.icon.elementId];
			}
		}
		this.sketches[sketch.id] = sketch;
		this.changed = true;
	}
	while (other.sequences.length>0) {
		var sequence = other.sequences.shift();
		sequence.id = idMap[sequence.id];
		for (var iix=0; iix<sequence.items.length; iix++)
		{
			var sitem = sequence.items[iix];
			sitem.id = idMap[sitem.id];
			if (sitem.frameRef) {
				sitem.frameRef.sketchId = idMap[sitem.frameRef.sketchId];
				sitem.frameRef.elementId = idMap[sitem.frameRef.elementId];
			} 
			else if (sitem.sketchRef) {
				sitem.frameRef.sketchId = idMap[sitem.frameRef.sketchId];				
			}
			else if (sitem.sequenceRef) {
				sitem.frameRef.sequenceId = idMap[sitem.frameRef.sequenceId];								
			}
			else if (sitem.toFrameRef) {
				sitem.toFrameRef.sketchId = idMap[sitem.toFrameRef.sketchId];
				sitem.toFrameRef.elementId = idMap[sitem.toFrameRef.elementId];
			} 
		}
		this.changed = true;
	}
};

/** get element by id */
Sketchbook.prototype.getSequenceById = function(id) {
	for (var i=0; i<this.sequences.length; i++) {
		var sequence = this.sequences[i];
		if (sequence.id==id)
			return sequence;
	}
	return null;
};


//Sketchbook.prototype.newSketch = function() {
//	var sketch = new Sketch(this.nextId++);
//	this.sketches[sketch.id] = sketch;
//	this.changed = true;
//	return sketch;
//};

function Action(sketchbook, type) {
	this.sketchbook;
	this.type = type;
}

function NewSketchAction(sketchbook, sketchId) {
	Action.call(this, sketchbook, 'newSketch');
	this.sketch = new Sketch(sketchId);
}
NewSketchAction.prototype = new Action();

NewSketchAction.prototype.addElements = function(elements) {
	for (var ei=0; ei<elements.length; ei++) {
		var el = elements[ei];
		var newel = JSON.parse(JSON.stringify(el));
		delete newel.id;
		this.sketch.elements.push(newel);
	}
};

Sketchbook.prototype.newSketchAction = function() {
	var action = new NewSketchAction(this, this.nextId++);
	return action;
};

Sketchbook.prototype.setSketchDescriptionAction = function(sketchId, description) {
	var action = new Action(this, 'setSketchDescription');
	action.sketchId = sketchId;
	action.description = description;
	return action;
};

/** return action to add a new line to a sketch, from provided paperjs Path */
Sketchbook.prototype.addLineAction = function(sketchId, path, frameStyle, lineColor, fillColor) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var lineColor2 = parseHexColor(lineColor);
	var fillColor2 = parseHexColor(fillColor);
	//{ red: path.strokeColor.red, green: path.strokeColor.green, blue: path.strokeColor.blue };
	var line = { lineColor: lineColor2, fillColor : fillColor2, lineWidth: path.strokeWidth, frameStyle: frameStyle, segments: [] };
	action.elements =  [{ line : line }]; // id?
	for (var six=0; six<path.segments.length; six++) {
		var psegment = path.segments[six];
		var segment = { 
			point: { x: psegment.point.x, y: psegment.point.y },
			handleIn: { x: psegment.handleIn.x, y: psegment.handleIn.y },
			handleOut: { x: psegment.handleOut.x, y: psegment.handleOut.y }
		};
		line.segments.push(segment);
	}
	return action;
};
/** return action to add a new line to a sketch, from provided paperjs Path */
Sketchbook.prototype.addCurveAction = function(sketchId, path, lineColor) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var lineColor2 = parseHexColor(lineColor);
	//{ red: path.strokeColor.red, green: path.strokeColor.green, blue: path.strokeColor.blue };
	var line = { lineColor: lineColor2, lineWidth: path.strokeWidth, frameStyle: 'border', segments: [] };
	action.elements =  [{ line : line }]; // id?
	if (path.segments.length==1) {
		// point
		var psegment = path.segments[0];
		var segment = { 
			point: { x: psegment.point.x, y: psegment.point.y },
			handleIn: { x: 0, y: 0 },
			handleOut: { x: 0, y: 0 }
		};
		line.segments.push(segment);
	} else if (path.segments.length>1) {
		// This doesn't work well - the initial handle isn't great
		// TODO improve
		var psegment1 = path.segments[0];
		var psegment2 = path.segments[path.segments.length-1];
		var len = Math.sqrt((psegment1.point.x-psegment2.point.x)*(psegment1.point.x-psegment2.point.x)+
				(psegment1.point.y-psegment2.point.y)*(psegment1.point.y-psegment2.point.y));
		var hlen = Math.sqrt(psegment1.handleOut.x*psegment1.handleOut.x+psegment1.handleOut.y*psegment1.handleOut.y);
		var scale = (hlen>0 && len>0 ? 0.33*len/hlen : 1);
		var segment = { 
			point: { x: psegment1.point.x, y: psegment1.point.y },
			handleIn: { x: psegment1.handleIn.x, y: psegment1.handleIn.y },
			handleOut: { x: scale*psegment1.handleOut.x, y: scale*psegment1.handleOut.y }
		};
		line.segments.push(segment);
		hlen = Math.sqrt(psegment2.handleIn.x*psegment2.handleIn.x+psegment2.handleIn.y*psegment2.handleIn.y);
		scale = (hlen>0 && len>0 ? 0.33*len/hlen : 1);
		segment = { 
			point: { x: psegment2.point.x, y: psegment2.point.y },
			handleIn: { x: scale*psegment2.handleIn.x, y: scale*psegment2.handleIn.y},
			handleOut: { x: psegment2.handleOut.x, y: psegment2.handleOut.y }
		};
		line.segments.push(segment);
		
	}
	return action;
};

Sketchbook.prototype.addTextAction = function(sketchId, text) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var color = { red: text.fillColor.red, green: text.fillColor.green, blue: text.fillColor.blue };
	// TODO width, height, etc.
	var textel = { textColor: color, textSize: text.characterStyle.fontSize, content: text.content, x: text.point.x, y: text.point.y };
	action.elements =  [{ text : textel }]; 
	return action;
};

Sketchbook.prototype.addFrameAction = function(sketchId, description, bounds, frameStyle, lineColor, lineWidth, fillColor, showLabel, textColor, textSize, textVAlign) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	var lineColor2 = parseHexColor(lineColor);
	var fillColor2 = parseHexColor(fillColor);
	var textColor2 = parseHexColor(textColor);
	var frame = { description: description, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, frameStyle: frameStyle, lineColor: lineColor2, fillColor: fillColor2, lineWidth: lineWidth,
				showLabel : showLabel, textColor : textColor2, textSize: textSize, textVAlign : textVAlign};
	action.elements = [{frame : frame}];
	return action;	
};

/** transform {x:, y:} from paperjs fromBounds to paperjs toBounds */
function transformPoint(point, fromBounds, toBounds) {
	return { x: (point.x-fromBounds.left)*toBounds.width/fromBounds.width+toBounds.left,
		y: (point.y-fromBounds.top)*toBounds.height/fromBounds.height+toBounds.top };
}
function transformIcon(icon, fromBounds, toBounds) {
	icon.x = (icon.x-fromBounds.left)*toBounds.width/fromBounds.width+toBounds.left;
	icon.y = (icon.y-fromBounds.top)*toBounds.height/fromBounds.height+toBounds.top;
	icon.width *= toBounds.width / fromBounds.width; 
	icon.height *= toBounds.height / fromBounds.height; 
}
/** action to add (copy of) elements, including optional transformation from/to */
Sketchbook.prototype.addElementsAction = function(sketchId, elements, fromBounds, toBounds) {
	var action = new Action(this, 'addElements');
	action.sketchId = sketchId;
	action.elements =  [];
	for (var ei=0; ei<elements.length; ei++) {
		var el = elements[ei];
		var newel = JSON.parse(JSON.stringify(el));
		if (fromBounds && toBounds) {
			if (newel.line) {
				for (var si=0; si<newel.line.segments.length;si++) {
					var seg = newel.line.segments[si];
					seg.point = transformPoint(seg.point, fromBounds, toBounds);
					seg.handleIn.x *= toBounds.width / fromBounds.width;
					seg.handleIn.y *= toBounds.height / fromBounds.height;
					seg.handleOut.x *= toBounds.width / fromBounds.width;
					seg.handleOut.y *= toBounds.height / fromBounds.height;
				}
			}
			if (newel.icon) {
				transformIcon(newel.icon, fromBounds, toBounds);
			}
			if (newel.frame) {
				transformIcon(newel.frame, fromBounds, toBounds);
			}
			if (newel.image) {
				transformIcon(newel.image, fromBounds, toBounds);
			}
			if (newel.text) {
				newel.text.x = (newel.text.x-fromBounds.left)*toBounds.width/fromBounds.width+toBounds.left;
				newel.text.y = (newel.text.y-fromBounds.top)*toBounds.height/fromBounds.height+toBounds.top;
			}
		}
		delete newel.id;
		action.elements.push(newel);
	}
	return action;
};


/** return action to select a list of elements within a sketch - not really a model action */
Sketchbook.prototype.selectItemsAction = function(defaultSketchId, items) {
	var action = new Action(this, 'select');
	action.selections = [];
	// several elements in the same sketch are one selection
	var defaultSelection = undefined;
	if (defaultSketchId) {
		defaultSelection = { sketchId: defaultSketchId, elements: [] };
	}
	for (var i=0; i<items.length; i++) {
		var item = items[i];
		if (item.selectionRecordId) {
			// selection from selection history!
			var selection = { selectionRecordId: item.selectionRecordId };
			action.selections.push(selection);
			continue;
		}
		var sketchId = item.sketchId;
		if (!sketchId)
			sketchId = defaultSketchId;
		sketch = this.sketches[sketchId];
		if (!sketch) {
			console.log('selectItemsAction sketch '+sketchId+' unknown');
			continue;
		}
		var elementId = getSketchElementId(item);
		if (elementId) {
			var element = sketch.getElementById(elementId);
			if (!element) {
				// Note that this will only work in current sketch state!! 
				// OK for selection from sketch editor view, but not in selection history
				console.log('selectItemsAction sketch '+sketchId+' element '+elementId+' unknown');
				continue;
			}
			// clone element state to avoid problems with subsequent/parallel modifications (delete, etc.)
			var cloned = JSON.parse(JSON.stringify(element));
			if (sketchId==defaultSketchId)
				// element in default
				defaultSelection.elements.push(cloned);
			else {
				// element in sketch
				var selection = { sketchId : sketchId };
				selection.elements = [ cloned ];
				action.selections.push(selection);
			}				
		}
		else if (item.sketchId) {
			// whole sketch?!
			var selection = { sketchId : sketchId };
			selection.sketch = JSON.parse(JSON.stringify(sketch));
			action.selections.push(selection);
		}
		else 
			console.log('selectItemsAction could not find elementId in sketch '+sketchId+' on '+item);
	}
	if (defaultSelection && defaultSelection.elements.length>0)
		action.selections.push(defaultSelection);
	return action;
};

/** return action to move a list of items within a sketch to the back */
Sketchbook.prototype.orderToBackItemsAction = function(defaultSketchId, items) {
	var action = new Action(this, 'orderToBack');
	action.elements = [];
	// several elements in the same sketch are one selection
	for (var i=0; i<items.length; i++) {
		var item = items[i];
		if (item.selectionRecordId) {
			// selection from selection history!
			// ??
			console.log('orderToBackItemsAction ignoring selection history item '+item.selectionRecordId);
			continue;
		}
		var sketchId = item.sketchId;
		if (!sketchId)
			sketchId = defaultSketchId;
		sketch = this.sketches[sketchId];
		if (!sketch) {
			console.log('orderToBackItemsAction sketch '+sketchId+' unknown');
			continue;
		}
		var elementId = getSketchElementId(item);
		if (elementId) {
			action.elements.push({ sketchId: sketchId, elementId: elementId });
		}
		else if (item.sketchId) {
			// whole sketch?!
			console.log('orderToBackItemsAction ignoring while sketch '+item.sketchId);
		}
		else 
			console.log('orderToBackItemsAction could not find elementId in sketch '+sketchId+' on '+item);
	}
	return action;
};

/** return action to select a list of elements within a sketch - not really a model action */
Sketchbook.prototype.selectElementsAction = function(sketchId, elements) {
	var action = new Action(this, 'select');
	var defaultSelection = { sketchId: sketchId, elements: [] };
	action.selections = [defaultSelection];
	for (var i=0; i<elements.length; i++) {
		var el = elements[i];
		// clone element state to avoid problems with subsequent/parallel modifications (delete, etc.)
		var cloned = JSON.parse(JSON.stringify(el));
		defaultSelection.elements.push(cloned);
	}
	return action;
};

/** return action to select a sketch - not really a model action */
Sketchbook.prototype.selectSketchAction = function(sketchId) {
	var action = new Action(this, 'select');
	var selection = { sketchId: sketchId };
	action.selections = [selection];
	sketch = this.sketches[sketchId];
	if (!sketch) {
		console.log('selectSketchAction sketch '+sketchId+' unknown');
	} else {
		selection.sketch = JSON.parse(JSON.stringify(sketch));
		
	}
	return action;
};

/** return action to select a sequence item - not really a model action */
Sketchbook.prototype.selectSequenceItemAction = function(sequenceId, sequenceItem) {
	var action = new Action(this, 'select');
	var selection = { sequenceId: sequenceId, sequence: { items: [] } };
	action.selections = [selection];
	var cloned = JSON.parse(JSON.stringify(sequenceItem));
	selection.sequence.items.push(cloned);
	return action;
};

/** return action to select a sequence- not really a model action */
Sketchbook.prototype.selectSequenceAction = function(sequence) {
	var action = new Action(this, 'select');
	var selection = { sequence: sequence.marshall() };
	action.selections = [selection];
	return action;
};

/** return action to select a sketch as a sequence item - not really a model action */
Sketchbook.prototype.selectSketchAsSequenceItemAction = function(sketchId) {
	var action = new Action(this, 'select');
	var selection = { sequence : { items: [] } };
	action.selections = [selection];
	var sitem = { sketchRef: { sketchId: sketchId } };
	selection.sequence.items.push(sitem);
	return action;
};

/** return action to select a sketch as a sequence item - not really a model action */
Sketchbook.prototype.selectFrameAsSequenceItemAction = function(sketchId, frameId) {
	var action = new Action(this, 'select');
	var selection = { sequence: { items: [] } };
	action.selections = [selection];
	var sitem = { frameRef: { sketchId: sketchId, elementId: frameId } };
	selection.sequence.items.push(sitem);
	return action;
};

function SetPropertiesAction(sketchbook) {
	Action.call(this, sketchbook, 'setProperties');
	//this.color = color;
	this.elements = [];
}

Sketchbook.prototype.setPropertiesAction = function() {
	return new SetPropertiesAction(this);
};

SetPropertiesAction.prototype = new Action();

SetPropertiesAction.prototype.addElement =  function(sketchId, elementId) {
	this.elements.push({ sketchId: sketchId, elementId : elementId});
};

SetPropertiesAction.prototype.setLineColor = function(color) {
	this.lineColor = color;
};

SetPropertiesAction.prototype.setTextColor = function(color) {
	this.textColor = color;
};

SetPropertiesAction.prototype.setFillColor = function(color) {
	this.fillColor = color;
};

Sketchbook.prototype.setLineColorAction = function(color) {
	var action = new SetPropertiesAction(this);
	action.setLineColor(color);
	return action;
};

Sketchbook.prototype.setTextColorAction = function(color) {
	var action = new SetPropertiesAction(this);
	action.setTextColor(color);
	return action;
};

Sketchbook.prototype.setFillColorAction = function(color) {
	var action = new SetPropertiesAction(this);
	action.setFillColor(color);
	return action;
};

SetPropertiesAction.prototype.setLineWidth = function(width) {
	this.lineWidth = width;
};

Sketchbook.prototype.setLineWidthAction = function(width) {
	var action = new SetPropertiesAction(this);
	action.setLineWidth(width);
	return action;
};

SetPropertiesAction.prototype.setTextSize = function(size) {
	this.textSize = size;
};

SetPropertiesAction.prototype.setText = function(text) {
	this.text = text;
};

SetPropertiesAction.prototype.setRescale = function(text) {
	this.rescale = rescale;
};

SetPropertiesAction.prototype.setFrameStyle = function(value) {
	this.frameStyle = value;
};

SetPropertiesAction.prototype.setShowLabel = function(value) {
	this.showLabel = value;
};

SetPropertiesAction.prototype.setTextVAlign = function(value) {
	this.textVAlign = value;
};

SetPropertiesAction.prototype.setTextHAlign = function(value) {
	this.textHAlign = value;
};

SetPropertiesAction.prototype.setTextHFit = function(value) {
	this.textHFit = value;
};

function DeleteAction(sketchbook) {
	Action.call(this, sketchbook, 'delete');
	this.items = [];
}

DeleteAction.prototype = new Action();

DeleteAction.prototype.addElement =  function(sketchId, elementId) {
	this.items.push({ sketchId: sketchId, elementId : elementId});
};

DeleteAction.prototype.addSketch =  function(sketchId) {
	this.items.push({ sketchId: sketchId });
};

DeleteAction.prototype.addSequenceItem =  function(sequenceId, sequenceItemId) {
	this.items.push({ sequenceId: sequenceId, sequenceItemId : sequenceItemId});
};

DeleteAction.prototype.addSequence =  function(sequenceId) {
	this.items.push({ sequenceId: sequenceId });
};

Sketchbook.prototype.deleteAction = function() {
	return new DeleteAction(this);
};

Sketchbook.prototype.setBackgroundAction = function(sketchId, backgroundSketchId, alpha) {
	var action = new Action(this,'setBackground');
	action.sketchId = sketchId;
	action.background = { sketchId : backgroundSketchId, alpha : alpha };
	return action;
};

function NewSequenceAction(sketchbook, sequenceId) {
	Action.call(this, sketchbook, 'newSequence');
	this.sequence = new Sequence(sequenceId);
}
NewSequenceAction.prototype = new Action();

/** for copy, i.e. new with items in it */
NewSequenceAction.prototype.addItems = function(items) {
	for (var ei=0; ei<items.length; ei++) {
		var el = items[ei];
		var newel = JSON.parse(JSON.stringify(el));
		delete newel.id;
		this.sequence.items.push(newel);
	}
};

Sketchbook.prototype.newSequenceAction = function(title) {
	var action = new NewSequenceAction(this, this.nextId++);
	if (title)
		action.sequence.description = title;
	return action;
};

/** action to add (copy of) elements, including optional transformation from/to */
Sketchbook.prototype.addSequenceItemsAction = function(sequenceId, sequenceItems, beforeIndex) {
	var action = new Action(this, 'addSequenceItems');
	action.sequenceId = sequenceId;
	action.sequenceItems =  [];
	action.beforeIndex = beforeIndex;
	for (var ei=0; ei<sequenceItems.length; ei++) {
		var el = sequenceItems[ei];
		var newel = JSON.parse(JSON.stringify(el));
		delete newel.id;
		action.sequenceItems.push(newel);
	}
	return action;
};

Sketchbook.prototype.doAction = function(action) {
	if (action.type=='newSketch') {
		this.sketches[action.sketch.id] = action.sketch;
		// fix element IDs
		for (var ei=0; ei<action.sketch.elements.length; ei++) {
			var el = action.sketch.elements[ei];
			if (!el.id)
				el.id = this.nextId++;
		}
		this.changed = true;
	}
	else if (action.type=='setSketchDescription') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined) {
			action.undo = { description: sketch.description };
			sketch.description = action.description;
		}
		this.changed = true;
	}
	else if (action.type=='addElements') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined && action.elements!=undefined) {
			for (var ei=0; ei<action.elements.length; ei++) {
				var el = action.elements[ei];
				if (!el.id)
					// only allocate once else causes problems for undo/redo
					el.id = this.nextId++;
				sketch.elements.push(el);
			}
		}
		this.changed = true;		
	}
	else if (action.type=='select') {
		// no-op
	}
	else if (action.type=='setProperties') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setColor could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setColor could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					if (element.line) {
						var elval = element.line;
						el.undo = {};
						el.undo.lineColor = elval.lineColor;
						el.undo.fillColor = elval.fillColor;
						el.undo.lineWidth = elval.lineWidth;
						el.undo.frameStyle = elval.frameStyle;
						if (action.lineColor)
							elval.lineColor = action.lineColor;
						if (action.fillColor)
							elval.fillColor = action.fillColor;
						if (action.lineWidth)
							elval.lineWidth= action.lineWidth;
						if (action.frameStyle!==undefined)
							elval.frameStyle= action.frameStyle;
					}
					else if (element.text) {
						var elval = element.text;
						el.undo = {};
						el.undo.content = elval.content;
						el.undo.textSize = elval.textSize;
						el.undo.textColor = elval.textColor;
						el.undo.frameStyle = elval.frameStyle;
						el.undo.lineColor = elval.lineColor;
						el.undo.lineWidth = elval.lineWidth;
						el.undo.fillColor = elval.fillColor;
						el.undo.textVAlign = elval.textVAlign;
						el.undo.textHAlign = elval.textHAlign;
						el.undo.textHFit = elval.textHFit;
						if (action.text)
							elval.content = action.text;
						if (action.textSize)
							elval.textSize = action.textSize;
						if (action.textColor)
							elval.textColor = action.textColor;
						if (action.frameStyle!==undefined)
							elval.frameStyle = action.frameStyle;
						if (action.lineColor)
							elval.lineColor = action.lineColor;
						if (action.lineWidth)
							elval.lineWidth = action.lineWidth;
						if (action.fillColor)
							elval.fillColor = action.fillColor;
						if (action.textVAlign)
							elval.textVAlign = action.textVAlign;
						if (action.textHAlign)
							elval.textHAlign = action.textHAlign;
						if (action.textHFit)
							elval.textHFit = action.textHFit;
					}
					else if (element.image) {
						var elval = element.image;
						el.undo = {};
						el.undo.rescale = elval.rescale;
						if (action.rescale)
							elval.rescale = action.rescale;
					}
					else if (element.icon) {
						var elval = element.icon;
						el.undo = {};
						el.undo.frameStyle = elval.frameStyle;
						el.undo.lineColor = elval.lineColor;
						el.undo.lineWidth = elval.lineWidth;
						el.undo.fillColor = elval.fillColor;
						el.undo.rescale = elval.rescale;
						el.undo.showLabel = elval.showLabel;
						el.undo.textSize = elval.textSize;
						el.undo.textColor = elval.textColor;
						el.undo.textVAlign = elval.textVAlign;
						el.undo.textHAlign = elval.textHAlign;
						el.undo.textHFit = elval.textHFit;
						if (action.frameStyle!==undefined)
							elval.frameStyle = action.frameStyle;
						if (action.lineColor)
							elval.lineColor = action.lineColor;
						if (action.lineWidth)
							elval.lineWidth = action.lineWidth;
						if (action.fillColor)
							elval.fillColor = action.fillColor;
						if (action.rescale)
							elval.rescale = action.rescale;
						if (action.showLabel!==undefined)
							elval.showLabel = action.showLabel;
						if (action.textSize)
							elval.textSize = action.textSize;
						if (action.textColor)
							elval.textColor = action.textColor;
						if (action.textVAlign)
							elval.textVAlign = action.textVAlign;
						if (action.textHAlign)
							elval.textHAlign = action.textHAlign;
						if (action.textHFit)
							elval.textHFit = action.textHFit;
					}
					else if (element.frame) {
						var elval = element.frame;
						el.undo = {};
						el.undo.description = elval.description;
						el.undo.frameStyle = elval.frameStyle;
						el.undo.lineColor = elval.lineColor;
						el.undo.lineWidth = elval.lineWidth;
						el.undo.fillColor = elval.fillColor;
						el.undo.showLabel = elval.showLabel;
						el.undo.textSize = elval.textSize;
						el.undo.textColor = elval.textColor;
						el.undo.textVAlign = elval.textVAlign;
						el.undo.textHAlign = elval.textHAlign;
						el.undo.textHFit = elval.textHFit;
						if (action.text)
							elval.description = action.text;
						if (action.frameStyle!==undefined)
							elval.frameStyle = action.frameStyle;
						if (action.lineColor)
							elval.lineColor = action.lineColor;
						if (action.lineWidth)
							elval.lineWidth = action.lineWidth;
						if (action.fillColor)
							elval.fillColor = action.fillColor;
						if (action.showLabel!==undefined)
							elval.showLabel = action.showLabel;
						if (action.textSize)
							elval.textSize = action.textSize;
						if (action.textColor)
							elval.textColor = action.textColor;
						if (action.textVAlign)
							elval.textVAlign = action.textVAlign;
						if (action.textHAlign)
							elval.textHAlign = action.textHAlign;
						if (action.textHFit)
							elval.textHFit = action.textHFit;
					}
					else {
						console.log('setProperties cannot handle element '+elementId+' in sketch '+sketchId);
					}
				}
			}
		}
	}
	else if (action.type=='delete') {
		for (var si=0; si<action.items.length; si++) {
			var item = action.items[si];
			if (item.sketchId) {
				var sketch = this.sketches[item.sketchId];
				if (sketch) {
					if (item.elementId) {
						var done = false;
						for (var i=0; i<sketch.elements.length; i++) {
							var element = sketch.elements[i];
							if (element.id==item.elementId) {
								item.undo = { element : element, atIndex: i };
								sketch.elements.splice(i, 1);
								done = true;
								console.log('delete sketch '+item.sketchId+' element '+item.elementId);
								break;
							}
						}
						if (!done)
							console.log('delete: could not find element '+item.elementId+' in sketch '+item.sketchId);
					}
					else {
						item.undo = { sketch : sketch };
						delete this.sketches[item.sketchId];
						console.log('delete sketch '+item.sketchId);
					}
				}
				else {
					console.log('delete: cannot find sketch '+item.sketchId);
				}
			} 
			else if (item.sequenceId) {
				var sequence = this.getSequenceById(item.sequenceId);
				if (sequence) {
					if (item.sequenceItemId) {
						var done = false;
						for (var i=0; i<sequence.items.length; i++) {
							var sitem = sequence.items[i];
							if (sitem.id==item.sequenceItemId) {
								item.undo = { sequenceItem: sitem, atIndex: i };
								sequence.items.splice(i, 1);
								done = true;
								console.log('delete sequence '+item.sequenceId+' item '+item.sequenceItemId);
								break;
							}
						}
						if (!done)
							console.log('delete: could not find item '+item.sequenceItemId+' in sequence '+item.sequenceId);						
					}
					else {
						var ix = this.getSequenceIndex(item.sequenceId);
						item.undo = { sequence : sequence, atIndex: ix };
						this.sequences.splice(ix, 1);
						console.log('delete sequence '+item.sequenceId);
					}
				}
				else {
					console.log('delete: cannot find sequence '+item.sequenceId);
				}
			}
		}
	}
	else if (action.type=='orderToBack') {
		for (var si=0; si<action.elements.length; si++) {
			var element = action.elements[si];
			var sketch = this.sketches[element.sketchId];
			if (sketch) {
				var done = false;
				for (var i=0; i<sketch.elements.length; i++) {
					var el = sketch.elements[i];
					if (el.id==element.elementId) {
						element.undo = { atIndex: i };
						sketch.elements.splice(i, 1);
						sketch.elements.splice(0, 0, el);
						done = true;
						console.log('orderToBack sketch '+element.sketchId+' element '+element.elementId);
						break;
					}
				}
				if (!done)
					console.log('orderToBack: could not find element '+element.elementId+' in sketch '+element.sketchId);
			}
			else {
				console.log('orderToBack: cannot find sketch '+element.sketchId);
			} 
		}
	}
	else if (action.type=='setBackground') {
		var sketch = this.sketches[action.sketchId];
		if (sketch) {
			if (sketch.background)
				action.undo = { background : { sketchId: sketch.background.sketchId, alpha: sketch.background.alpha } };
			else
				action.undo = {};
			if (!action.background) {
				delete sketch.background;
			} else {
				sketch.background = { sketchId : action.background.sketchId, alpha : action.background.alpha };
			}
		}
	}
	else if (action.type=='newSequence') {
		// fix item IDs
		for (var ei=0; ei<action.sequence.items.length; ei++) {
			var el = action.sequence.items[ei];
			if (!el.id)
				el.id = this.nextId++;
		}
		this.sequences.push(action.sequence);
		this.changed = true;
	}
	else if (action.type=='addSequenceItems') {
		var sequence = sketchbook.getSequenceById(action.sequenceId);
		if (sequence!==undefined) {
			if (sequence.items===undefined) {
				sequence.items = [];
			}
			var ix = action.beforeIndex;
			if (ix>sequence.items.length) {
				ix = sequence.items.length;
			}
			for (var ei=0; ei<action.sequenceItems.length; ei++) {
				var el = action.sequenceItems[ei];
				if (!el.id) {
					// only allocate once else causes problems for undo/redo
					el.id = this.nextId++;
				}
			}
			sequence.items = sequence.items.slice(0, ix).concat(action.sequenceItems, sequence.items.slice(ix));
			this.changed = true;		
		}
		else
			console.log('addSequenceItems cannot find sequence '+action.sequenceId);
	}
	else
		throw 'Unknown sketchbook do action '+action.type;
};

Sketchbook.prototype.getSequenceIndex = function(sequenceId) {
	for (var six=0; six<this.sequences.length; six++) {
		var sequence = this.sequences[six];
		if (sequence.id==sequenceId) 
			return six;
	}
	return -1;
};
Sketchbook.prototype.undoAction = function(action) {
	if (action.type=='newSketch') {
		delete this.sketches[sketch.id];
		this.changed = true;
	}
	else if (action.type=='setSketchDescription') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined) {
			sketch.description = action.undo.description; 
		}
		this.changed = true;
	}
	else if (action.type=='addElements') {
		var sketch = sketchbook.sketches[action.sketchId];
		if (sketch!==undefined && action.elements!==undefined) {
			for (var ei=0; ei<actions.elements.length; ei++) {
				var el = actions.elements[ei];
				if (el.id!==undefined) {
					for (var ix=0; ix<sketch.elements.length; ix++) {
						if (sketch.elements[ix].id==el.id) {
							sketch.elements.splice(ix,1);
							break;
						}
					}
				}
			}
		}
		this.changed = true;
	}
	else if (action.type=='select') {
		// no-op
	}
	else if (action.type=='setProperties') {
		for (var ei=0; ei<action.elements.length; ei++) {
			var el = action.elements[ei];
			var sketch = this.sketches[el.sketchId];
			if (!sketch) {
				console.log('setColor could not find sketch '+el.sketchId);				
			} else {
				var element = sketch.getElementById(el.elementId);
				if (!element) {
					console.log('setColor could not find element '+elementId+' in sketch '+sketchId);
				}
				else {
					var elval = null;
					if (element.line) 
						elval = element.line;
					else if (element.text)
						elval = element.text;
					else if (element.image)
						elval = element.image;
					else if (element.frame)
						elval = element.frame;
					else if (element.icon)
						elval = element.icon;
					else {
						console.log('setProperties undo cannot handle element '+elementId+' in sketch '+sketchId);
					}
					if (elval && el.undo) {
						if (el.undo.content)
							elval.content = el.undo.content;
						if (el.undo.description)
							elval.description = el.undo.description;
						if (el.undo.frameStyle!==undefined)
							elval.frameStyle = el.undo.frameStyle;
						if (el.undo.lineColor)
							elval.lineColor = el.undo.lineColor;
						if (el.undo.lineWidth)
							elval.lineWidth = el.undo.lineWidth;
						if (el.undo.fillColor)
							elval.fillColor = el.undo.fillColor;
						if (el.undo.rescale)
							elval.rescale = el.undo.rescale;
						if (el.undo.showLabel!==undefined)
							elval.showLabel = el.undo.showLabel;
						if (el.undo.textSize)
							elval.textSize = el.undo.textSize;
						if (el.undo.textColor)
							elval.textColor = el.undo.textColor;
						if (el.undo.textVAlign)
							elval.textVAlign = el.undo.textVAlign;
						if (el.undo.textHAlign)
							elval.textHAlign = el.undo.textHAlign;
						if (el.undo.textHFit)
							elval.textHFit = el.undo.textHFit;
					}
				}
			}
		}
	}
	else if (action.type=='delete') {
		// NB in reverse order
		for (var si=action.items.length-1; si>=0; si--) {
			var item = action.items[si];
			if (item.undo) {
				if (item.undo.sketch) {
					if (!this.sketches[item.undo.sketch.id]) {
						this.sketches[item.undo.sketch.id] = item.undo.sketch;
					} else {
						console.log('undo delete: sketch '+item.undo.sketch.id+' already present');
						continue;
					}
				}
				else if (item.undo.element) {
					var sketch = this.sketches[item.sketchId];
					if (!sketch) {
						console.log('undo delete: could not find sketch '+item.sketchId+' for element '+item.elementId);
						continue;
					}
					var element = sketch.getElementById(item.elementId);
					if (element) {
						console.log('undo delete: element '+item.elementId+' in sketch '+item.sketchId+' already present');
						continue;
					}
					if (item.undo.atIndex && item.undo.atIndex<sketch.elements.length)
						sketch.elements.splice(item.undo.atIndex, 0, item.undo.element);
					else
						sketch.elements.push(item.undo.element);
				}
				else if (item.undo.sequence) {
					if (this.getSequenceIndex(item.undo.sequence.id)>=0)
						console.log('undo delete: sequence '+item.undo.sequence.id+' already present');
					else {
						if (item.undo.atIndex && item.undo.atIndex<this.sequences.length)
							this.sequences.splice(item.undo.atIndex, 0, item.undo.sequence);
						else 
							this.sequences.push(item.undo.sequences);
					}
				} 
				else if (item.undo.sequenceItem) {
					var sequence = this.getSequenceById(item.sequenceId);
					if (!sequence) {
						console.log('undo delete: could not find sequence '+item.sequenceId+' for item '+item.sequenceItemId);
						continue;
					}
					var sitem = sequence.getItemById(item.sequenceItemId);
					if (sitem) {
						console.log('undo delete: item '+item.sequenceItemId+' in sequence '+item.sequenceId+' already present');
						continue;
					}
					if (item.undo.atIndex && item.undo.atIndex<sequence.items.length) 
						sequence.items.splice(item.undo.atIndex, 0, item.undo.sequenceItem);
					else
						sequence.items.push(item.undo.sequenceItem);
				}
			}
		}
	}
	else if (action.type=='orderToBack') {
		for (var si=action.elements.length-1; si>=0; si--) {
			var element = action.elements[si];
			if (element.undo && element.undo.atIndex) {
				var sketch = this.sketches[element.sketchId];
				if (sketch) {
					var done = false;
					for (var i=0; i<sketch.elements.length; i++) {
						var el = sketch.elements[i];
						if (el.id==element.elementId) {
							sketch.elements.splice(i, 1);
							sketch.elements.splice(element.undo.atIndex, 0, el);
							done = true;
							console.log('undo orderToBack sketch '+element.sketchId+' element '+element.elementId);
							break;
						}
					}
					if (!done)
						console.log('undo orderToBack: could not find element '+element.elementId+' in sketch '+element.sketchId);
				}
				else {
					console.log('undo orderToBack: cannot find sketch '+element.sketchId);
				}
			} 
		}
	}
	else if (action.type=='setBackground') {
		var sketch = this.sketches[action.sketchId];
		if (sketch) {
			if (action.undo) {
				if (!action.undo.background) {
					delete sketch.background;
				} else {
					sketch.background = { sketchId : action.undo.background.sketchId, alpha : action.undo.background.alpha };
				}
			}
		}
	}
	else if (action.type=='newSequence') {
		var six = this.getSequenceIndex(action.sequence.id);
		if (six) {
			action.sequences.splice(six, 1);
			this.changed = true;
		}
		else {
			console.log('undo newSketch cannot find sequence '+action.sequence.id);
		}
	}
	else if (action.type=='addSequenceItems') {
		var sequence = sketchbook.getSequenceById(action.sequenceId);
		if (sequence!==undefined && sequence.items!==undefined) {
			for (var ei=0; ei<actions.sequenceItems.length; ei++) {
				var el = actions.sequenceItems[ei];
				if (el.id!==undefined) {
					for (var ix=0; ix<sequence.items.length; ix++) {
						if (sequence.items[ix].id==el.id) {
							sequence.items.splice(ix,1);
							break;
						}
					}
				}
			}
		}
		this.changed = true;
	}
	else
		throw 'Unknown sketchbook undo action '+action.type;
};
