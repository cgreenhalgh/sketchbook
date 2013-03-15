// sketchertools.js - drawing etc. tools for sketcher2.js

function Tool(name, project) {
	this.name = name;
	this.project = project;
	
	this.MAX_ZOOM = 2;
}

Tool.prototype.begin = function(point) {
	console.log('begin '+this.name+' at '+point);
};

Tool.prototype.move = function(point) {
	console.log('move '+this.name+' at '+point);
};

Tool.prototype.end = function(point) {
	console.log('end '+this.name+' at '+point);
};

function activateOverlay(project) {
	project.activate();
	project.layers[2].activate();
}

function LineTool(project, sketchbook, sketchId) {
	// call super cons
	Tool.call(this, 'line', project);
	this.sketchbook = sketchbook;
	this.sketchId = sketchId;
}

function getColor() {
	var color = $('.colorSelected').css('background-color');
	if (color) {
		console.log('color is '+color);
		return color;
	}
	console.log('Could not find current color');
	return '#000000';
}

// inherit (apparently)
LineTool.prototype = new Tool();

LineTool.prototype.begin = function(point) {
	// activate overlay layer
	activateOverlay(this.project);
	this.path = new paper.Path();
	this.path.strokeColor = getColor();
	this.path.strokeWidth = 1;
	this.path.add(point);	
};

LineTool.prototype.move = function(point) {
	if (this.path)
		this.path.add(point);
};

LineTool.prototype.end = function(point) {
	if (this.path) {
		if (this.path.length==0) {
			// TODO? replace with dot
			this.path.remove();
			console.log('zero length line');
			//lineToolPath = new paper.Path.Circle(point, DOT_SIZE/toolView.zoom);
			//lineToolPath.fillColor = 'black';
		} else {
			this.path.simplify();
			// TODO 
			console.log('lineTool: '+this.path);
			// create 
			var action = this.sketchbook.addLineAction(this.sketchId, this.path);
			this.path.remove();
			return action;
		}
	}
	delete this.path;
	return null;
};

/** centre view tool */
function ShowAllTool(project) {
	Tool.call(this, 'showAll', project);
}

ShowAllTool.prototype = new Tool();

ShowAllTool.prototype.begin = function(point) {

	var MIN_SIZE = 10;

	// this doesn't seem to work at the moment with my indexProject
	//var bounds = project.activeLayer.bounds;
	var bounds = null;
	for (var ci in this.project.activeLayer.children) {
		var c = this.project.activeLayer.children[ci];
		var b = c.bounds;
		if (b) {
			if (bounds==null)
				bounds = new paper.Rectangle(b);
			else
				bounds = bounds.unite(b);
		}
	}
	if (bounds==null) {
		this.project.view.zoom = 1;
		this.project.view.center = new paper.Point(0,0);
	} else {
		var bw = bounds.width+MIN_SIZE;
		var bh = bounds.height+MIN_SIZE;
		var w = $(this.project.view._element).width();
		var h = $(this.project.view._element).height();
		var zoom = Math.min(MAX_ZOOM, w/bw, h/bh);
		console.log('showAll: bounds='+bw+','+bh+', canvas='+w+','+h+', zoom='+zoom+', bounds.center='+bounds.center);
		this.project.view.zoom = zoom;
		this.project.view.center = bounds.center;
	}
};

/** common zoom tool */
function ZoomTool(project, inFlag) {
	Tool.call(this,'zoom', project);
	this.inFlag = inFlag;

	this.ZOOM_INTERVAL = 20;
	this.ZOOM_RATIO = 0.05;
	this.zoomInterval = null;
	this.zoomPoint = null;
	this.zoomView = null;
};

ZoomTool.prototype.zoomIn = function() {
	if (!this.zoomView || !this.zoomPoint)
		return;
	// zoom towards zoomPoint in project space
	var zoom = this.zoomView.zoom;
	// had problems with main version - see top of file
	//console.log('zoomIn point='+zoomPoint+' zoom='+zoomView.zoom+' center='+zoomView.center);
	this.zoomView.zoom = this.zoomView.zoom*(1+this.ZOOM_RATIO);
	// limit?!
	//zoomView.zoom = Math.min(MAX_ZOOM, zoomView.zoom);
	var dx = this.zoomPoint.x-this.zoomView.center.x;
	var dy = this.zoomPoint.y-this.zoomView.center.y;
	var sdx = (this.ZOOM_RATIO*dx*zoom)/this.zoomView.zoom;
	var sdy = (this.ZOOM_RATIO*dy*zoom)/this.zoomView.zoom;
	//console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	this.zoomView.center = new paper.Point(this.zoomView.center.x+sdx, this.zoomView.center.y+sdy);
	//console.log('- center\'='+zoomView.center);
};

ZoomTool.prototype.zoomOut = function() {
	if (!this.zoomView || !this.zoomPoint)
		return;
	// zoom away from zoomPoint in project space
	// had problems with main version - see top of file
	//console.log('zoomOut point='+zoomPoint+' zoom='+zoomView.zoom+' center='+zoomView.center);
	var zoom = this.zoomView.zoom;
	this.zoomView.zoom = this.zoomView.zoom*(1-this.ZOOM_RATIO);
	var dx = this.zoomPoint.x-this.zoomView.center.x;
	var dy = this.zoomPoint.y-this.zoomView.center.y;
	var sdx = (this.ZOOM_RATIO*dx*zoom)/this.zoomView.zoom;
	var sdy = (this.ZOOM_RATIO*dy*zoom)/this.zoomView.zoom;
	//console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	this.zoomView.center = new paper.Point(this.zoomView.center.x-sdx, this.zoomView.center.y-sdy);
	//console.log('- center\'='+zoomView.center);
};

ZoomTool.prototype.begin = function(point) {
	this.zoomPoint = point;
	this.zoomView = this.project.view;
	var tool = this;
	this.zoomInterval = setInterval(function() { 
		if (tool.inFlag) tool.zoomIn(); else tool.zoomOut();
		}, this.ZOOM_INTERVAL);
	this.zoomIn();
};
ZoomTool.prototype.move = function(point) {
	this.zoomPoint = point;	
};
ZoomTool.prototype.end = function(point) {
	this.zoomPoint = point;	
	clearInterval(this.zoomInterval);
	this.zoomView = null;
};

/** common zoom tool */
function PanTool(project) {
	Tool.call(this,'pan', project);
	this.panPoint = null;
	this.panView = null;
};
PanTool.prototype.pan = function(point) {
	if (!this.panView || !this.panPoint)
		return;
	var dx = this.panPoint.x-point.x;
	var dy = this.panPoint.y-point.y;
	//console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	this.panView.center = new paper.Point(this.panView.center.x+dx, this.panView.center.y+dy);
	//console.log('- center\'='+zoomView.center);
};
PanTool.prototype.begin = function(point) {
	this.panPoint = new paper.Point(point);
	this.panView = this.project.view;
};
PanTool.prototype.move = function(point) {
	this.pan(point);
};
PanTool.prototype.end = function(point) {
	this.pan(point);
	this.panView = null;
};

console.log('defining HighlightTool');

/** highlight tool */
function HighlightTool(project) {
	Tool.call(this, 'highlight', project);
	this.highlightedItem = null;
	this.highlightItem = null;
	console.log('created HighlightTool for project '+project);
}

HighlightTool.prototype = new Tool();

HighlightTool.prototype.clearHighlight = function() {
	if (this.highlightItem) {
		this.highlightItem.remove();
		this.highlightItem = null;
	}
	this.highlightedItem = null;
};

/** add a highlight for an item in a project */
function addHighlight(project, item) {
	project.activate();
	// highlight layer
	project.layers[2].activate();
	
	// temporary hack to show red box at bounds as highlight
	var topLeft = item.bounds.topLeft;
	var bottomRight = item.bounds.bottomRight;
	var parent = item.parent;
	while(parent instanceof paper.Group && parent.matrix) {
		topLeft = parent.matrix.transform(topLeft);
		bottomRight = parent.matrix.transform(bottomRight);
		parent = parent.parent;
	}
	var highlightItem = new paper.Path.Rectangle(topLeft, bottomRight);
	highlightItem.strokeWidth = 1;
	project.layers[1].activate();
	highlightItem.strokeColor = 'red';
	return highlightItem;
}

HighlightTool.prototype.highlight = function(item) {
	this.highlightedItem = item;
	this.highlightItem = addHighlight(this.project, item);
	console.log('created highlight for '+item);
};

/** find item (if any) at point in project - for select and highlight */
function getItemAtPoint(project, point) {
	var tolerance = 2/project.view.zoom;
	var items = new Array();
	var children = project.layers[1].children;
	for (var ci=0; ci<children.length; ci++) {
		var c = children[ci];
		var bounds = c.bounds;
		if (point.x>=bounds.left-tolerance &&
			point.x<=bounds.right+tolerance &&
			point.y>=bounds.top-tolerance &&
			point.y<=bounds.bottom+tolerance) {
			items.push(c);
			//console.log('- hit '+ci+':'+point.x+','+point.y+' vs '+bounds+'+/-'+tolerance);
		}
		else {
			//console.log('- missed '+ci+':'+point.x+','+point.y+' vs '+bounds+'+/-'+tolerance);
		}
	}
	//if (children.length==0)
		//console.log('- no children: '+point.x+','+point.y);
	var item = (items.length>0) ? items[items.length-1] : null;
	return item;
}

HighlightTool.prototype.checkHighlight = function(point) {
	// which item?
	/* Hit test doesn't seem to work by default on Text, or on groups
	var options = { tolerance:2, fill:true, stroke:true, segments: true };
	var res = project.hitTest(point, options);
	console.log('highlight test at '+point+' -> '+res);
	var item = (res) ? res.item : null;
	*/
	//console.log('highlight test at '+point+' in '+project);
	var item = getItemAtPoint(this.project, point);
	if (item) {
		if (item===this.highlightedItem) 
			; // no-op
		else {
			this.clearHighlight();
			this.highlight(item);
			//redraw(paper); ??
		}
	}
	else
		this.clearHighlight();

};

HighlightTool.prototype.begin = function(point) {
	this.checkHighlight(point);
};
HighlightTool.prototype.move = function(point) {
	this.checkHighlight(point);
};
HighlightTool.prototype.end = function(point) {
	this.clearHighlight();
	return null;
};

/** select tool */
function SelectTool(project, sketchbook, sketchId) {
	Tool.call(this, 'select', project);
	this.sketchbook = sketchbook;
	this.sketchId = sketchId;	
	this.selectedItems = new Array();
	this.highlightItems = new Array();
}
SelectTool.prototype = new Tool();

SelectTool.prototype.clearHighlightItems = function() {
	for (var ix=0; ix<this.highlightItems.length; ix++) 
		this.highlightItems[ix].remove();
	this.highlightItems = new Array();
};
SelectTool.prototype.checkSelect = function(point) {
	var item = getItemAtPoint(this.project, point);
	if (item) {
		// item id?
		var elementId = getSketchElementId(item);
		if (elementId) {
			if (this.selectedElementIds.indexOf(elementId)<0) {
				this.selectedItems.push(item);
				this.selectedElementIds.push(elementId);
				this.highlightItems.push(addHighlight(this.project, item));
			}
		} else {
			var sketchId = item.sketchId;
			if (sketchId) {
				if (this.selectedSketchIds.indexOf(sketchId)<0) {
					this.selectedItems.push(item);
					this.selectedSketchIds.push(sketchId);
					this.highlightItems.push(addHighlight(this.project, item));
				}
			}
			else {
				var selectionRecordId = item.selectionRecordId;
				if (selectionRecordId) {
					if (this.selectedSelectionRecordIds.indexOf(selectionRecordId)<0) {
						this.selectedItems.push(item);
						this.selectedSelectionRecordIds.push(selectionRecordId);
						this.highlightItems.push(addHighlight(this.project, item));
					}
				}
				else 
					console.log('could not select item without elementId, sketchId or selectionRecordId: '+item);
			}
		}
	}
};
SelectTool.prototype.begin = function(point) {
	this.clearHighlightItems();
	this.selectedItems = new Array();
	this.selectedElementIds = [];
	this.selectedSketchIds = [];
	this.selectedSelectionRecordIds = [];
	this.checkSelect(point);
};
SelectTool.prototype.move = function(point) {
	this.checkSelect(point);
};
SelectTool.prototype.end = function(point) {
	this.checkSelect(point);
	this.clearHighlightItems();
	var items = this.selectedItems;
	this.selectedItems = [];
	// we'll use an action for this although it doesn't actually modify the sketchbook state!
	return this.sketchbook.selectItemsAction(this.sketchId, items);
};

function CopyToSketchTool(project, sketchbook, sketchId, elements, images) {
	Tool.call(this, 'copyToSketch', project);
	this.sketchbook = sketchbook;
	this.sketchId = sketchId;	
	this.elements = elements;
	this.images = images;
}
CopyToSketchTool.prototype = new Tool();

CopyToSketchTool.prototype.begin = function(point) {
	this.startPoint = point;
	// activate overlay layer
	activateOverlay(this.project);
	if (this.elements) {
		var items = elementsToPaperjs(this.elements, this.sketchbook, this.images);
		this.group = new paper.Group(items);
		console.log('copying '+items.length+' items');
	}
	else
		this.group = new paper.Group();
	this.elementBounds = new paper.Rectangle(this.group.bounds);
	this.group.visible = false;
};
CopyToSketchTool.prototype.move = function(point) {
	if (this.path) {
		this.path.remove();
	}
	// activate overlay layer
	activateOverlay(this.project);
	this.path = new paper.Path.Rectangle(this.startPoint, point);
	this.path.strokeColor = 'red';
	this.path.strokeWidth = 1;

	this.group.bounds = new paper.Rectangle(this.startPoint, point);
	this.group.visible = true;
};
CopyToSketchTool.prototype.end = function(point) {
	if (this.path) {
		this.path.remove();
		delete this.path;
	}
	if (this.group) {
		this.group.remove();
		delete this.group;
	}
	if (this.elements) {
		var bounds = new paper.Rectangle(this.startPoint, point);
		return this.sketchbook.addElementsAction(this.sketchId, this.elements, this.elementBounds, bounds);
	}
	return null;
};

function FrameTool(project, sketchbook, sketchId, description) {
	Tool.call(this, 'frame', project);
	this.sketchbook = sketchbook;
	this.sketchId = sketchId;	
	this.description = description;
}
FrameTool.prototype = new Tool();

FrameTool.prototype.begin = function(point) {
	this.startPoint = point;
};
FrameTool.prototype.move = function(point) {
	if (this.path) {
		this.path.remove();
	}
	// activate overlay layer
	activateOverlay(this.project);
	this.path = new paper.Path.Rectangle(this.startPoint, point);
	this.path.strokeColor = 'red';
	this.path.strokeWidth = 1;
};
FrameTool.prototype.end = function(point) {
	if (this.path) {
		this.path.remove();
		delete this.path;
	}
	var bounds = new paper.Rectangle(this.startPoint, point);
	return this.sketchbook.addFrameAction(this.sketchId, this.description, bounds);
};

function TextTool(project, sketchbook, sketchId, content, fontSize) {
	// call super cons
	Tool.call(this, 'text', project);
	this.sketchbook = sketchbook;
	this.sketchId = sketchId;
	this.content = content;
	this.fontSize = fontSize;
}

TextTool.prototype = new Tool();

TextTool.prototype.begin = function(point) {
	// activate overlay layer
	activateOverlay(this.project);
	this.text = new paper.PointText(point);
	this.text.characterStyle.fillColor = getColor();
	this.text.paragraphStyle.justification = 'center';
	this.text.characterStyle.fontSize = this.fontSize; //default
	this.text.content = this.content;	
};

TextTool.prototype.move = function(point) {
	if (this.text)
		this.text.point = point;
};

TextTool.prototype.end = function(point) {
	if (this.text) {
		this.text.point = point;
		var action = this.sketchbook.addTextAction(this.sketchId, this.text);
		this.text.remove();
		return action;
	}
	delete this.text;
	return null;
};

