// Note, problems with paperjs versions.
// Nightly build recent (July 2012) throws an exception early on in the View initialisation
// with view apparently null.
// Stable release 0.2.2 has (at least) a bug in the way the centre is updated when zooming. See
// NB: https://github.com/eric-wieser/paper.js/tree/patch-1
// "Fixed bad centering when `view.center` and `view.zoom` are changed"

// main application state

var nextObjectId = 1;

var objectsProject = undefined;
// each object is a Symbol on the objectsProject
var objectSymbols = new Object();
// per-object detail/ovewview/zoom/center 
var objectEditorSettings = new Object();
// overview in the editor
var objectOverviewProject = undefined;
// detail view in the editor
var objectDetailProject = undefined;
// selection history
var selectionProject = undefined;
// index project
var indexProject = undefined;
// current editor object id 
var currentObjectId = undefined;

// current tool stuff
var tool = undefined;
var toolView = undefined;
var toolProject = undefined;

var highlightItem = undefined;
var highlightProject = undefined;

var MAX_ZOOM = 2;

var INDEX_CELL_SIZE = 100;
var INDEX_CELL_MARGIN = 10;
var INDEX_LABEL_HEIGHT = 20;
var LABEL_FONT_SIZE = 12;


// redraw all views 
function redraw(ps) {
	for (var vi in ps.View._views) {
		var v = ps.View._views[vi];
		if (ps===v._scope)
			v.draw();
	}
}

// create some test content in a PaperScope
function createTestContent(ps) {
	paper = ps;
	
    // some test content
    var path = new ps.Path();
    // Give the stroke a color
    path.strokeColor = 'black';
    var start = new ps.Point(100, 100);
    // Move to start and draw a line from there
    path.moveTo(start);
    // Note the plus operator on Point objects.
    // PaperScript does that for us, and much more!
    path.lineTo(new ps.Point( 200, 50 ));

   	var myPath;    
   	myPath = new ps.Path();
   	myPath.strokeColor = 'black';
   	myPath.strokeWidth = 3;
   	myPath.add(new ps.Point(100,100));
   	myPath.add(new ps.Point(200,200));
   	
   	myPath = new ps.Path.Line(new ps.Point(200,100), new ps.Point(100,200));
   	myPath.strokeColor = 'black';
   	myPath.strokeWidth = 3;

   	var myCircle = new ps.Path.Circle(new paper.Point(150,150), 30);
   	myCircle.fillColor = 'black';
   	
   	/*
   	// some test interactivity
    var drawTool = new ps.Tool();
    drawTool.onMouseDown = function(event) {
    	paper = ps;

    	//console.log('onMouseDown('+event.point+')');
    	
    	var myCircle = new ps.Path.Circle(event.point, 3);
    	myCircle.fillColor = 'black';
    	
    	myPath = new ps.Path();
    	myPath.strokeColor = 'black';
    	myPath.add(event.point);
    	//console.log('myPath='+myPath);
    };
    drawTool.onMouseDrag = function(event) {
    	paper = ps;

    	//console.log('myPath='+myPath);
    	myPath.add(event.point);
    	//console.log('onMouseDrag');
    };
    drawTool.onMouseUp = function(event) { 
    	paper = ps;

    	myPath.simplify();

    	redraw(ps);
    };
    drawTool.activate();
	*/
}

var paperScopes = new Array();

// with new version may only need one scope
paperScopes.push(paper);

// set up a PaperScope with overview and detail canvases
function setupOverviewAndDetail(overviewId, detailId) {

	// with new version may only need one scope
	//var ps = new paper.PaperScope();
	//paper = ps;
    //paperScopes.push(ps);
    
    var overviewCanvas = document.getElementById(overviewId);
    paper.setup(overviewCanvas);
    
    //var p = new paper.Project();
    //p.activate();

    // release 0.2.2
    //new paper.View(overviewCanvas);
    // later versions
    //paper.View.create(overviewCanvas);
    
    // for some reason, setting the size via CSS on the Canvas doesn't seem to work.
	// the view stays 300x150
	//ps.view.viewSize = new ps.Size(300,300);
    //var v = ps.view;    
	// Create a Paper.js Path to draw a line into it:
    
    createTestContent(paper);
   	
    // Draw the view now:
    //?ps.view.draw();
	
    var detailCanvas = document.getElementById(detailId);
    console.log('detailCanvas '+detailId+' = '+detailCanvas);
    // release 0.2.2
    //new ps.View(detailCanvas);
    //paper.View.create(detailCanvas);
    
    // mouse/key tool
    /*
    var drawTool = new ps.Tool();
    drawTool.onMouseDown = function(event) {
    	paper = ps;

    	console.log('onMouseDown('+event.point+')');
    };
    drawTool.onMouseDrag = function(event) {
    	paper = ps;

    	console.log('onMouseDrag('+event.point+')');
    };
    drawTool.onMouseUp = function(event) { 
    	paper = ps;

    	console.log('onMouseUp('+event.point+')');
    };
    drawTool.onMouseMove = function(event) { 
    	paper = ps;

    	console.log('onMouseMove('+event.point+')');
    };
    //drawTool.onKeyDown = function(event) {
    //	console.log('onKeyDown('+event.key+')');
    //};
    //drawTool.onKeyUp = function(event) {
    //	console.log('onKeyUp('+event.key+')');
    //};
    drawTool.activate();
	*/
}

// some special key codes - from http://www.quirksmode.org/js/keys.html#t00
var KEY_BACKSPACE = 8;
var KEY_TAB = 9;
var KEY_SHIFT = 16;
var KEY_CTRL = 17;
var KEY_CAPSLOCK = 20;
var KEY_PAGEUP = 33;
var KEY_PAGEDOWN = 34;
var KEY_END = 35;
var KEY_HOME = 36;
var KEY_LEFT = 37;
var KEY_UP = 38;
var KEY_RIGHT = 39;
var KEY_DOWN = 40;
var KEY_INSERT = 45;
var KEY_DELETE = 46;
var KEY_NUMLOCK = 144;
var KEY_ENTER = 13;
var KEY_ESCAPE = 27;
var KEY_F1 = 112;
//...
var KEY_F12 = 123;

function isSpecialKey(which) {
	switch (which) {
	case KEY_BACKSPACE:
	case KEY_CTRL:
/*	case KEY_CAPSLOCK:
	case KEY_PAGEUP:
	case KEY_PAGEDOWN:
	case KEY_END:
	case KEY_HOME:
	case KEY_LEFT:
	case KEY_UP:
	case KEY_RIGHT:
	case KEY_DOWN:
	case KEY_INSERT:
	case KEY_DELETE:
	case KEY_NUMLOCK:
	case KEY_ENTER:
	case KEY_ESCAPE:
*/		return true;
	default:
		if (which>=KEY_F1 && which<=KEY_F12)
			return true;
		return false;
	}
}

// common mouse/key interaction state
var mouseTarget = undefined;
var mousePageX = undefined;
var mousePageY = undefined;
var keyTarget = undefined;
var keyDown = undefined;

/** get paperjs view for event target iff it is a canvas.
 * also initialises global paper if found.
 * 
 * @return View if found, else null
 */ 
/*function getView(target) {
//	for (var psi in paperScopes) {
//		var ps = paperScopes[psi];
    	//console.log('paperscope with '+ps.views);
		// post paperjs 0.2.2. views -> _views?
	for (var vi in paper.View._views) {
		var v = paper.View._views[vi];
//		for (var vi in ps._views) {
//			var v = ps._views[vi];
//			if (v.canvas===mouseTarget) {
		if (v._element===mouseTarget) {
				//console.log('- - in view2 '+v);
				paper = v._scope;//ps;
				//v.activate();
				//ps.projects[0].activate();
				return v;
//			}
		}
	}
	return null;
}
*/

/** get paperjs project for event target iff it is a canvas.
 * 
 * @return View if found, else null
 */ 
function getProject(target) {
	// for newer paperscript with one view/project
	for (var pi in paper.projects) {
		var p = paper.projects[pi];
		if (p.view && p.view._element===mouseTarget) {
			//console.log('in project '+p);
			return p;
		}
		//console.log('- not in project '+p);
	}
	return null;
}

/** line tool */
var lineTool = new Object();
var lineToolPath = undefined;

lineTool.edits = true;
lineTool.begin = function(point) {
	console.log('lineTool.begin '+point);
	
	lineToolPath = new paper.Path();
	lineToolPath.strokeColor = 'black';
	lineToolPath.strokeWidth = 1/toolView.zoom;
	lineToolPath.add(point);	
};
lineTool.move = function(point) {
	if (lineToolPath) {
		//console.log('lineTool.move '+point);

		lineToolPath.add(point);
	}
};
lineTool.end = function(point) {
	if (lineToolPath) {
		console.log('lineTool.end'+point);

		lineToolPath.simplify();
		lineToolPath = undefined;
	}
};

/** convert CSS points to screen pixels, see http://stackoverflow.com/questions/279749/detecting-the-system-dpi-ppi-from-js-css */
function pt2px(pt) {
	screenPPI = document.getElementById('ppitest').offsetWidth;
	return pt*screenPPI/72;
}

/** workaround for editable multi-line text */
function createTextBlock(point, lines, justification) {
	if (justification===undefined)
		justification = 'center';
	var characterStyle = { fillColor: 'black', fontSize: 12/toolView.zoom };
	var lineSpacing = pt2px(characterStyle.fontSize)*1.15;
	var block = new paper.Group();
	for (var li in lines) {
		var line = lines[li];
		var text = new paper.PointText(new paper.Point(point.x, point.y));
		text.content = line;
		text.paragraphStyle.justification = justification;
		text.characterStyle = characterStyle;
		block.addChild(text);
		point.y = point.y + lineSpacing;
	}
}

/** text tool */
var textTool = new Object();
var textToolOutline = undefined;
var textToolText = undefined;
var textToolBegin = undefined;
var textToolPos = 0;

textTool.edits = true;
textTool.begin = function(point) {
	console.log('textTool.begin '+point);
	textToolBegin = point;
};
textTool.move = function(point) {
	if (textToolBegin) {
		//console.log('lineTool.move '+point);
		if (textToolOutline)
			textToolOutline.remove();
		textToolOutline = new paper.Path.Rectangle(textToolBegin, point);
		textToolOutline.strokeColor = 'grey';
		textToolOutline.dashArray = [10,4];
	}
};
textTool.end = function(point) {
	if (textToolBegin) {
		console.log('textTool.end'+point);
		if (textToolOutline) {
			textToolOutline.remove();
			textToolOutline = undefined;
		}
		var width = Math.abs(point.x-textToolBegin.x);
		var x = (point.x+textToolBegin.x)/2;
		var y = (point.y+textToolBegin.y)/2;
		textToolBegin = undefined;
		createTextBlock(new paper.Point(x, y), ['testing','testing','1, 2, 3...']);
	}
};

/** zoom in tool */
var zoomInTool = new Object();
var zoomOutTool = new Object();
var ZOOM_INTERVAL = 20;
var ZOOM_RATIO = 0.05;
var zoomInterval = undefined;
var zoomPoint = undefined;
var zoomView = undefined;

function zoomIn() {
	if (!zoomView || !zoomPoint)
		return;
	// zoom towards zoomPoint in project space
	var zoom = zoomView.zoom;
	// had problems with main version - see top of file
	//console.log('zoomIn point='+zoomPoint+' zoom='+zoomView.zoom+' center='+zoomView.center);
	zoomView.zoom = Math.min(MAX_ZOOM, zoomView.zoom*(1+ZOOM_RATIO));
	var dx = zoomPoint.x-zoomView.center.x;
	var dy = zoomPoint.y-zoomView.center.y;
	var sdx = (ZOOM_RATIO*dx*zoom)/zoomView.zoom;
	var sdy = (ZOOM_RATIO*dy*zoom)/zoomView.zoom;
	//console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	zoomView.center = new paper.Point(zoomView.center.x+sdx, zoomView.center.y+sdy);
	//console.log('- center\'='+zoomView.center);
}

function zoomOut() {
	if (!zoomView || !zoomPoint)
		return;
	// zoom away from zoomPoint in project space
	// had problems with main version - see top of file
	//console.log('zoomOut point='+zoomPoint+' zoom='+zoomView.zoom+' center='+zoomView.center);
	var zoom = zoomView.zoom;
	zoomView.zoom = zoomView.zoom*(1-ZOOM_RATIO);
	var dx = zoomPoint.x-zoomView.center.x;
	var dy = zoomPoint.y-zoomView.center.y;
	var sdx = (ZOOM_RATIO*dx*zoom)/zoomView.zoom;
	var sdy = (ZOOM_RATIO*dy*zoom)/zoomView.zoom;
	//console.log('- d='+dx+','+dy+' zoom\'='+zoomView.zoom+' sd='+sdx+','+sdy);
	zoomView.center = new paper.Point(zoomView.center.x-sdx, zoomView.center.y-sdy);
	//console.log('- center\'='+zoomView.center);
}

zoomInTool.begin = function(point, view) {
	zoomPoint = point;
	zoomView = view;
	zoomInterval = setInterval(zoomIn, ZOOM_INTERVAL);
	zoomIn();
};
zoomOutTool.begin = function(point, view) {
	zoomPoint = point;
	zoomView = view;
	zoomInterval = setInterval(zoomOut, ZOOM_INTERVAL);
	zoomOut();
};
zoomOutTool.move = zoomInTool.move = function(point) {
	zoomPoint = point;	
};
zoomOutTool.end = zoomInTool.end = function(point) {
	zoomPoint = point;		
	clearInterval(zoomInterval);
	zoomView = undefined;
};

var showAllTool = new Object();

var MIN_SIZE = 10;

/** scale view to show all of project */
function showAll(project) {
	// this doesn't seem to work at the moment with my indexProject
	//var bounds = project.activeLayer.bounds;
	var bounds = null;
	for (var ci in project.activeLayer.children) {
		var c = project.activeLayer.children[ci];
		var b = c.bounds;
		if (b) {
			if (bounds==null)
				bounds = b;
			else
				bounds = bounds.unite(b);
		}
	}
	if (bounds==null) {
		project.view.zoom = 1;
		project.view.center = new paper.Point(0,0);
	} else {
		var bw = bounds.width+MIN_SIZE;
		var bh = bounds.height+MIN_SIZE;
		var w = $(project.view._element).width();
		var h = $(project.view._element).height();
		var zoom = Math.min(MAX_ZOOM, w/bw, h/bh);
		console.log('showAll: bounds='+bw+','+bh+', canvas='+w+','+h+', zoom='+zoom+', bounds.center='+bounds.center);
		project.view.zoom = zoom;
		project.view.center = bounds.center;
	}
}

showAllTool.begin = function() {
	showAll(toolProject);
};
showAllTool.move = function() {};
showAllTool.end = function() {};

/** get key string for code */
function getToolKeyWhich(which) {
	return 'code'+which;
}
/** get key string for char */
function getToolKeyChar(c) {
	return 'code'+c.charCodeAt(0);
}

var selectTool = new Object();
var selectToolPath = undefined;
selectTool.edits = true;
var selectToolItems = undefined;

selectTool.begin = function(point) {
	console.log('selectTool.begin '+point);
	
	selectToolPath = new paper.Path();
	selectToolPath.strokeColor = 'red';
	selectToolPath.strokeWidth = 1/toolView.zoom;
	selectToolPath.add(point);	
	selectToolItems = new Array();
	if (highlightItem)
		selectToolItems.push(highlightItem);
};
selectTool.move = function(point) {
	if (selectToolPath) {
		//console.log('lineTool.move '+point);

		selectToolPath.add(point);
		if (highlightItem && selectToolItems.indexOf(highlightItem)<0)
			selectToolItems.push(highlightItem);
	}
};


/** make an index icon in current project for a symbol. 
 * @return Item (Group) representing object in index/selection
 */
function createIndexItem(objid, indexProject) {
	// make a visual icon for the object comprising a group with box, scaled view and text label
	// (currently id)
	var symbol = objectSymbols[objid];
	var symbolDef = symbol.definition.copyTo(indexProject);
	var indexSymbol = new paper.Symbol(symbolDef);
	var symbolBounds = indexSymbol.definition.bounds;
	var scale = (symbolBounds) ? Math.min((INDEX_CELL_SIZE-INDEX_CELL_MARGIN)/(symbolBounds.width+INDEX_CELL_MARGIN),
			(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.height+INDEX_CELL_MARGIN)) : 1;
	var placed = indexSymbol.place();
	placed.scale(scale);
	placed.name = objid;
	placed.translate(new paper.Point(INDEX_CELL_SIZE/2, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2));
	var label = new paper.PointText(new paper.Point(INDEX_CELL_SIZE/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT+pt2px(LABEL_FONT_SIZE)));
	label.content = objid;
	label.paragraphStyle.justification = 'center';
	label.characterStyle = { fillColor: 'black', fontSize: LABEL_FONT_SIZE };
	
	var box = new paper.Path.Rectangle(new paper.Point(INDEX_CELL_MARGIN/2, INDEX_CELL_MARGIN/2),
			new paper.Point(INDEX_CELL_SIZE-INDEX_CELL_MARGIN/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN/2));
	box.strokeColor = 'grey';		
	var group = new paper.Group([placed, box, label]);
	// name is object id
	group.name = objid;

	return group;
}

function selectItem(item) {
	selectionProject.activate();
	// move history along
	for (var ci in selectionProject.activeLayer.children) {
		var c = selectionProject.activeLayer.children[ci];
		c.translate(new paper.Point(INDEX_CELL_SIZE,0));
	}
	var objid = item.name;
	if (!(objid)) {
		// Symbol name?!
		for (var ci in item.children) {
			var c = item.children[ci]; 
			if (c instanceof paper.PlacedSymbol && c.name) {
				objid = c.name;
				console.log('Found objid on child Symbol: '+objid);
			}
		}
	}
	// add new item
	if (objid && objectSymbols[objid]) {
		selectionProject.activate();
		var group = createIndexItem(objid, selectionProject);
		// initial position should be ok
		selectionProject.view.zoom = 1;
		selectionProject.view.center = new paper.Point($(selectionProject.view._element).width()/2, INDEX_CELL_SIZE/2);
		//redraw(paper);
	}
	else {
		console.log('dont know how to add/select '+item+' (name='+item.name+', objid='+objid+')');
	}
}
selectTool.end = function(point) {
	if (selectToolPath) {
		console.log('selectToolPath.end'+point);

		selectToolPath.remove();
		selectToolPath = undefined;

		if (highlightItem && selectToolItems.indexOf(highlightItem)<0)
			selectToolItems.push(highlightItem);
		
		// do something with selection...
		console.log('Selected '+selectToolItems.length+' items');
		
		for (var si in selectToolItems) {
			var s = selectToolItems[si];
			selectItem(s);
		}
		
		selectToolItems = undefined;
	}
};


/** global - all tools keys by key */
var tools = new Object();
tools[getToolKeyChar('A')] = lineTool;
tools[getToolKeyChar('S')] = textTool;
tools[getToolKeyChar('Z')] = zoomInTool;
tools[getToolKeyChar('X')] = zoomOutTool;
tools[getToolKeyChar('C')] = showAllTool;

/** function to map view pixel position to project coordinates.
 * @return Point */
function view2project(view, vx, vy) {
	return view.viewToProject(new paper.Point(vx, vy));
//	var px = (vx-view.canvas.width/2)/view.zoom+view.center.x;
//	var py = (vy-view.canvas.height/2)/view.zoom+view.center.y;
//	return new paper.Point(px, py);
}

// work-around for canvas sizing problem
function handleResize() {
	console.log('handle resize');
//	for (var psi in paperScopes) {
//		var ps = paperScopes[psi];
//    	console.log('paperscope with '+ps._views);
		for (var vi in paper.View._views) {
			var v = paper.View._views[vi];
			if (v.isVisible()) {
				console.log('canvas:resize to '+$(v._element).width()+","+$(v._element).height());
				// need to force a change or it does some weird partial rescaling
				v.viewSize = new paper.Size(1,1);
				v.viewSize = new paper.Size($(v._element).width(),$(v._element).height());
			}
		}
//	}
}



/** HTML actions */
function onShowIndex() {
	$('.tab').removeClass('tabselected');
	$('#tabIndex').addClass('tabselected');
	$('.tabview').hide();
	$('#index').show();
	currentObjectId = undefined;
	
	indexProject.activate();
	indexProject.layers[0].activate();
	indexProject.activeLayer.removeChildren();
	indexProject.symbols = [];
	
	var max = 0;
	var x = 0;
	var y = 0;
	
	for (var objid in objectSymbols) {
		var group = createIndexItem(objid, indexProject);
		group.translate(new paper.Point(x*INDEX_CELL_SIZE, y*INDEX_CELL_SIZE));

		// lay out in an outwards 'square spiral'
		if (x>(-max) && x<max && y==(-max))
			x++;
		else if (x==max && y<max)
			y++;
		else if (y==max && x>(-max))
			x--;
		else if (x==(-max) && y>(-max))
			y--;
		else {
			y--;
			max++;
		}
		indexProject.activeLayer.addChild(group);
		
		//console.log("added "+objid+" to index, group bounds="+group.bounds+', symbol bounds='+indexSymbol.bounds+', placed bounds='+placed.bounds);
		//console.log('project bounds='+indexProject.activeLayer.bounds);
	}
		
	// scaling problem workaround
	handleResize();
	
	showAll(indexProject);
}	

function onNewObject() {
	$('.tabview').hide();
	var objid = 'o'+nextObjectId;
	nextObjectId++;
	var tabid = 'tab_'+objid;
	$('#tabs .footer').before('<div class="tab" id="'+tabid+'">'+objid+'</div>');
	
	// new object Symbol
	objectsProject.activate();
	var objectGroup = new paper.Group();
	// note: by default, position is considered to be the centre of the item's bounds!
	// group is re-positioned at 0,0
	var objectSymbol = new paper.Symbol(objectGroup);
	// TEST
	var text = new paper.PointText(new paper.Point(50,50));
	text.content = 'Object '+objid;
	objectSymbol.definition.addChild(text);
	//text.translate(new paper.Point(50,75));
	//var rect = new paper.Path.Rectangle(new paper.Point(20,20), new paper.Point(80,80));
	//rect.fillColor = 'black';
	//objectSymbol.definition.addChild(rect);

	objectSymbols[objid] = objectSymbol;	
	
	var settings = new Object();
	settings.overviewZoom = 1;
	settings.detailZoom = 1;
	settings.overviewCenter = new paper.Point(0,0);
	settings.detailCenter = new paper.Point(0,0);
	objectEditorSettings[objid] = settings;
	
	var tabfn = function() {
		$('.tab').removeClass('tabselected');
		$(this).addClass('tabselected');
		$('.tabview').hide();
		// update editor state!
		// find object Symbol
		var objectSymbol = objectSymbols[objid];
		currentObjectId = objid;
		
		objectDetailProject.activate();
		// remove old
		objectDetailProject.activeLayer.removeChildren();
		objectDetailProject.symbols = [];
		
		var objectDetailGroup = objectSymbol.definition.copyTo(objectDetailProject);
		//objectDetailGroup.translate(new paper.Point(50,25));
		//objectDetailSymbol.place();
		
		objectOverviewProject.activate();
		// remove old
		objectOverviewProject.activeLayer.removeChildren();
		objectOverviewProject.symbols = [];
		
		var objectOverviewGroup = objectSymbol.definition.copyTo(objectOverviewProject);
		//objectOverviewGroup.translate(new paper.Point(50,25));
		//objectOverviewSymbol.place();

		/* 
		// TEST
		var objectGroup = new paper.Group();
		var objectSymbol = new paper.Symbol(objectGroup);
		objectSymbol.place(new paper.Point(50,50));
		var text = new paper.PointText(new paper.Point(50,50));
		text.content = 'Object '+objid;
		text.strokeColor = 'red';
		objectGroup.addChild(text);
		//text.translate(new paper.Point(50,75));
		var rect = new paper.Path.Rectangle(new paper.Point(20,20), new paper.Point(80,80));
		rect.fillColor = 'red';
		objectGroup.addChild(rect);
		*/
		
		$('#editor').show();		
		// scaling problem workaround
		handleResize();

		// NB set zoom/center after resize workaround
		var settings = objectEditorSettings[objid];
		objectDetailProject.view.zoom = settings.detailZoom;
		objectDetailProject.view.center = settings.detailCenter;
		objectOverviewProject.view.zoom = settings.overviewZoom;
		objectOverviewProject.view.center = settings.overviewCenter;
	};
	$('#'+tabid).on('click', tabfn);
	tabfn();
}

/** handle completed edit */
function mergeChangesAndCopy(changedProject, copyProject) {
	var objectSymbol = objectSymbols[currentObjectId];
	// group assumed first item in changedProject
	var changedGroup = changedProject.activeLayer.firstChild;
	var skip = 1;
	while (changedProject.activeLayer.children.length>skip) {
		var newItem = changedProject.activeLayer.children[skip];
		if (newItem===highlightVisibleItem || newItem===selectToolPath) {
			skip++;
			continue;
		}
		changedGroup.addChild(newItem);
		console.log('added new item to group');
	}
	// copy to other project
	copyProject.activeLayer.firstChild.remove();
	changedGroup.copyTo(copyProject);
	// copy to symbol 
	objectSymbol.definition.removeChildren();
	for (var ci in changedGroup.children) {
		var c = changedGroup.children[ci];
		c.copyTo(objectSymbol.definition);
	}
}

/** handle completed edit */
function handleEdit(tool, toolView) {
	// change to overview?
	if (toolView===objectOverviewProject.view) {
		if (tools.edits) {
			mergeChangesAndCopy(objectOverviewProject, objectDetailProject);
		}
		else if (currentObjectId) {
			var settings = objectEditorSettings[currentObjectId];
			settings.overviewZoom = toolView.zoom;
			settings.overviewCenter = toolView.center;
		}
	}
	else if (toolView===objectDetailProject.view) {
		if (tool.edits) {
			mergeChangesAndCopy(objectDetailProject, objectOverviewProject);
		}
		else if (currentObjectId) {
			var settings = objectEditorSettings[currentObjectId];
			settings.detailZoom = toolView.zoom;
			settings.detailCenter = toolView.center;
		}
	}
}

// temporary hack to show red box at bounds as highlight
var highlightVisibleItem = undefined;

/** clear any highlight */
function clearHighlight() {
	if (highlightItem) {
		//highlightItem.strokeColor = 'black';
		highlightItem = undefined;
		if (highlightVisibleItem)
			// temporary hack to show red box at bounds as highlight
			highlightVisibleItem.remove();
		redraw(paper);
	}
}
function highlight(project, item) {
	//item.strokeColor = 'red';
	if (item) {
		// temporary hack to show red box at bounds as highlight
		highlightProject = project;
		highlightItem = item;
		var bounds = highlightItem.bounds;
		highlightVisibleItem = new paper.Path.Rectangle(bounds);
		highlightVisibleItem.strokeColor = 'red';
		highlightProject.activeLayer.addChild(highlightVisibleItem);
	}
}

/** check/set highlight from mouse move */
function checkHighlight() {
	if (mouseTarget) {
		var project = getProject(mouseTarget);
		if (project) {
			var point = view2project(project.view, 
					mousePageX-mouseTarget.offsetLeft,
					mousePageY-mouseTarget.offsetTop);
			/* Hit test doesn't seem to work by default on Text, or on groups
			var options = { tolerance:2, fill:true, stroke:true, segments: true };
			var res = project.hitTest(point, options);
			console.log('highlight test at '+point+' -> '+res);
			var item = (res) ? res.item : null;
			*/
			var tolerance = 2/project.view.zoom;
			var items = new Array();
			for (var ci in project.activeLayer.children) {
				var c = project.activeLayer.children[ci];
				if (c!==highlightVisibleItem && c!==selectToolPath) {
					var bounds = c.bounds;
					if (point.x>=bounds.left-tolerance &&
							point.x<=bounds.right+tolerance &&
							point.y>=bounds.top-tolerance &&
							point.y<=bounds.bottom+tolerance)
						items.push(c);
					else {
						console.log('missed '+point+' vs '+bounds+'+/-'+tolerance);
					}
				}
			}
			var item = (items.length>0) ? items[0] : null;
			if (item) {
				if (item===highlightItem && project===highlightProject) 
					; // no-op
				else {
					clearHighlight();
					highlight(project, item);
					redraw(paper);
				}
			}
			else
				clearHighlight();
		}
		else
			clearHighlight();
	}
	else
		clearHighlight();
}

// Only executed our code once the DOM is ready.
$(document).ready(function() {

	// create object editor paperjs scope/project/views
	//setupOverviewAndDetail('objectOverviewCanvas', 'objectDetailCanvas');
	// set up canvases
	paper.setup();
	objectsProject = paper.project;
	
	var indexCanvas = document.getElementById('indexCanvas');
	paper.setup(indexCanvas);
	indexProject = paper.project;
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'Index';
	
	var objectOverviewCanvas = document.getElementById('objectOverviewCanvas');
	paper.setup(objectOverviewCanvas);
	objectOverviewProject = paper.project;
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'ObjectOverview';
	
	var objectDetailCanvas = document.getElementById('objectDetailCanvas');
	paper.setup(objectDetailCanvas);
	objectDetailProject = paper.project;
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'ObjectDetail';
	
	var selectionCanvas = document.getElementById('selectionCanvas');
	paper.setup(selectionCanvas);
	selectionProject = paper.project;
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'Selection';
	
	

	
	$(document).on('mouseover', 'div .tab', function() {
		$(this).addClass('tabhighlight');
	});
	$(document).on('mouseout', 'div .tab', function() {
		$(this).removeClass('tabhighlight');
	});
	
	onShowIndex();

	// capture document-wide key presses, including special keys
	$(document).keydown(function(ev) {
		if (ev.which==keyDown) {
			//console.log('ignore duplicate keydown for '+ev.which);
			ev.stopPropagation();
			return false;
		}
		keyDown = ev.which;
		// Note: this is not meant to be called multiple times when key is held down, but on Chrome
		// it is being, so that will need some filtering
		console.log('keydown: '+ev.which+' ctrlKey='+ev.ctrlKey+' special='+isSpecialKey(ev.which));

		if (tool) {
			// switch tool
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			handleEdit(tool, toolView);
			tool = undefined;
			redraw(paper);
		}
		keyTarget = mouseTarget;
		var p = getProject(keyTarget);
		//var v = getView(keyTarget);
		if (p && p.view) {
			var v = p.view;
			var t = tools[getToolKeyWhich(ev.which)];
			if (t) {
				var editable = false;
				if (p===objectDetailProject) {
					editable = true;
				} else if (p===objectOverviewProject) {
					editable = true;
				}
				if (!t.edits || editable) {

					clearHighlight();

					p.activate();
					console.log('begin tool '+t);
					tool = t;
					toolView = v;
					toolProject = p;
					tool.begin(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop), v);
					redraw(paper);
				}				
			}
		}
		
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keyup(function(ev) {
		keyDown = undefined;
		if (tool) {
			// switch tool
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			handleEdit(tool, toolView);
			redraw(paper);
			tool = undefined;
		}
		console.log('keyup: '+ev.which);
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keypress(function(ev) {
		console.log('keypress: '+ev.which+' at '+mousePageX+','+mousePageY+' on '+mouseTarget+' = '+(mousePageX-mouseTarget.offsetLeft)+','+(mousePageY-mouseTarget.offsetTop));
//		var v = getView(mouseTarget);
//		if (v) {
//			// test content
//	    	var myText = new paper.PointText(new paper.Point(mousePageX-mouseTarget.offsetLeft, mousePageY-mouseTarget.offsetTop));
//	    	myText.content = String.fromCharCode(ev.which);
//	    	myText.strokeColor = 'black';
//	    	redraw(paper);
//		}
	});
	$(document).mousemove(function(ev) {
		//console.log('mousemove: '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-ev.target.offsetLeft)+','+(ev.pageY-ev.target.offsetTop));
		mouseTarget = ev.target;
		mousePageX = ev.pageX;
		mousePageY = ev.pageY;
		if (tool) {
			tool.move(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			if (tool===selectTool)
				checkHighlight();
			redraw(paper);
		}
		else {
			checkHighlight();
		}
	});
	$(document).mousedown(function(ev) {
		// which: 1=left, 2=middle, 3=right
		console.log('mousedown: '+ev.which+' at '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-ev.target.offsetLeft)+','+(ev.pageY-ev.target.offsetTop));
		if (tool) {
			// switch tool
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			handleEdit(tool, toolView);
			redraw(paper);
			tool = undefined;
		}
		keyTarget = ev.target;
		var p = getProject(keyTarget);
		//var v = getView(keyTarget);
		if (p && p.view) {
			var v = p.view;			
			p.activate();
			console.log('begin select tool');
			tool = selectTool;
			toolView = v;
			toolProject = p;
			tool.begin(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop), v);
			checkHighlight();
			redraw(paper);
		}

		/* TEST		 
		var v = getView(ev.target);
		if (v) {
			// test content
	    	var myCircle = new paper.Path.Circle(new paper.Point(ev.pageX-ev.target.offsetLeft, ev.pageY-ev.target.offsetTop), 3);
	    	myCircle.fillColor = 'black';
	    	redraw(paper);
		}
		*/
	});
	$(document).mouseup(function(ev) {
		console.log('mouseup: '+ev.which+' on '+ev.target);
		if (tool===selectTool) {
			tool.end(view2project(toolView, mousePageX-keyTarget.offsetLeft, mousePageY-keyTarget.offsetTop));
			handleEdit(tool, toolView);
			redraw(paper);
			tool = undefined;
		}
	});
	// mousedown, mouseup, mouseenter, mouseleave
	
	
    $(window).resize(handleResize);
    handleResize();
});

