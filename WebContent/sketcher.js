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

/** symbol caches for projects */
var symbolCaches = new Array();

/** a symbol cache for a project.
 * An object, with .project -> paper.Project, and .objects -> Object{ id : Symbol }.
 * @return new symbol cache for project */
function createSymbolCache(project) {
	var cache = new Object();
	cache.project = project;
	cache.objects = new Object();
	return cache;
}

/** get symbol cache for project */
function getSymbolCache(project) {
	for (var ci in symbolCaches) {
		var cache = symbolCaches[ci];
		if (cache.project===project)
			return cache;
	}
	cache = createSymbolCache(project);
	symbolCaches.push(cache);		
	return cache;
}

/** clear symbol cache (and symbols) */
function clearSymbolCache(project) {
	var cache = getSymbolCache(project);
	cache.project.symbols = [];
	cache.objects = new Object();
}

/** get Symbol for object id from cache, adding if required */
function getCachedSymbol(project, objid) {
	var cache = getSymbolCache(project);
	var symbol = cache.objects[objid];
	if (symbol)
		return symbol;
	var refSymbol = objectSymbols[objid];
	if (refSymbol) {
		var def2 = refSymbol.definition.copyTo(cache.project);
		cache.project.activate();
		symbol = new paper.Symbol(def2);
		cache.objects[objid] = symbol;
		console.log('added object '+objid+' to cache for '+$(cache.project.view._element).attr('id'));
		return symbol;
	}
	console.log('could not find object '+objid);
	return null;
}

/** get object id for symbol */
function getCachedSymbolId(project, placed) {
	var symbol = placed.symbol;
	var cache = getSymbolCache(project);
	for (var oi in cache.objects) {
		var s = cache.objects[oi];
		if (symbol===s)
			return oi;
	}
	console.log('could not find objid for '+symbol);
	return null;
}

/** update symbol caches */
function updateSymbolCaches(objid) {
	console.log('update symbol caches for '+objid);
	var refSymbol = objectSymbols[objid];
	
	for (var ci in symbolCaches) {
		var cache = symbolCaches[ci];
		var symbol = cache.objects[objid];
		if (symbol) {
			if (refSymbol) {
				
				symbol.definition.removeChildren();
				for (var ci in refSymbol.definition.children) {
					var c = refSymbol.definition.children[ci];
					c.copyTo(symbol.definition);
				}
				console.log('- update definition for '+$(cache.project.view._element).attr('id'));

			} else {
				// remove
				symbol.remove();
				delete caches.objects[objid];
				console.log('- remove definition for '+$(cache.project.view._element).attr('id'));
			}
		}
		else
			console.log('- not found in cache '+$(cache.project.view._element).attr('id'));
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
		if (p.view && p.view._element===target) {
			//console.log('in project '+p);
			return p;
		}
		//console.log('- not in project '+p);
	}
	return null;
}

/** copy from definition(s) to project */
function copyDefinition(objectSymbol, toProject) {
	console.log('copy definition to '+toProject);
	// definition should be a group
	toProject.activate();
	var toGroup = new paper.Group();//[]?
	for (var ci in objectSymbol.definition.children) {
		var c = objectSymbol.definition.children[ci];
		if (c instanceof paper.PlacedSymbol) {
			console.log('- copy symbol');
			var objid = null;
			for (var si in objectSymbols) {
				var s = objectSymbols[si];
				if (c.symbol===s) {
					objid = si;
					break;
				}
			}
			if (objid) {
				console.log('- instance symbol '+objid);
				var symbol = getCachedSymbol(toProject, objid);
				if (symbol) {
					var placed = new paper.PlacedSymbol(symbol);
					placed.matrix = c.matrix;
					toGroup.addChild(placed);
				}
				else 
					console.log('- could not find '+objid+' in cache');
			}
			else 
				console.log('- could not find ref symbol '+objid);
		}
		else {
			console.log('- copy '+c);
			// just copy
			c.copyTo(toGroup);
		}
	}
	return toGroup;
}

/** show editor for object ID */
function showEditor(objid) {
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
	clearSymbolCache(objectDetailProject);
	
	var objectDetailGroup = copyDefinition(objectSymbol, objectDetailProject);
	//objectDetailGroup.translate(new paper.Point(50,25));
	//objectDetailSymbol.place();
	
	objectOverviewProject.activate();
	// remove old
	objectOverviewProject.activeLayer.removeChildren();
	clearSymbolCache(objectOverviewProject);
	
	var objectOverviewGroup = copyDefinition(objectSymbol, objectOverviewProject);
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
	var block = new paper.Group();//[]?
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
		toolProject.layers[1].activate();
		textToolOutline = new paper.Path.Rectangle(textToolBegin, point);
		toolProject.layers[0].activate();
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
zoomInTool.highlights = true;
var zoomOutTool = new Object();
zoomOutTool.highlights = true;
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
showAllTool.highlights = true;

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
selectTool.highlights = true;
var selectToolPath = undefined;
//selectTool.edits = true;
var selectToolItems = undefined;

selectTool.begin = function(point) {
	console.log('selectTool.begin '+point);
	
	toolProject.layers[1].activate();
	selectToolPath = new paper.Path();
	toolProject.layers[0].activate();	
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
	indexProject.activate();
	//var symbol = objectSymbols[objid];
	//if (indexProject!==selectionProject) {
	var symbol = getCachedSymbol(indexProject, objid);
	//}
	var symbolBounds = symbol.definition.bounds;
	var scale = (symbolBounds) ? Math.min((INDEX_CELL_SIZE-INDEX_CELL_MARGIN)/(symbolBounds.width+INDEX_CELL_MARGIN),
			(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.height+INDEX_CELL_MARGIN)) : 1;
	var placed = symbol.place();
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
	//complicates matters if it has a name!
	//group.name = objid;

	return group;
}

/** if item is object icon then return objid, else null */
function getObjectId(item) {
	var objid = null;
	// Symbol name?!
	for (var ci in item.children) {
		var c = item.children[ci]; 
		if (c instanceof paper.PlacedSymbol && c.name) {
			objid = c.name;
			//console.log('Found objid on child Symbol: '+objid);
			break;
		}
	}
	return objid;
}

function selectItem(item) {
	//selectionProject.activate();
	// move history along
	for (var ci in selectionProject.activeLayer.children) {
		var c = selectionProject.activeLayer.children[ci];
		c.translate(new paper.Point(INDEX_CELL_SIZE,0));
		console.log('moved '+ci+' '+c+' to '+c.position);
	}
	var objid = getObjectId(item);
	// add new item
	if (objid && objectSymbols[objid]) {
		//selectionProject.activate();
		var group = createIndexItem(objid, selectionProject);
		group.translate(new paper.Point());
		console.log('added '+group+' at '+group.center);
		// initial position should be ok
		selectionProject.view.zoom = 1;
		selectionProject.view.center = new paper.Point($(selectionProject.view._element).width()/2, INDEX_CELL_SIZE/2);
		//redraw(paper);
		
		console.log('selectionProject has '+selectionProject.layers[0].children.length+' children');
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
		toolProject.activate();
	}
};

/** edit tool */
var editTool = new Object();
editTool.highlights = true;

editTool.begin = function(point) {
	// immediate?!
	if (highlightItem) {
		var objid = getObjectId(highlightItem);
		if (objid) {
			showEditor(objid);
			tool = undefined;
		}
		else {
			console.log('highlighted item not an object: '+highlightItem);
			// TODO edit primitive items
		}
	}
	else {
		console.log('no item highlighted');
	}
};
editTool.move = function(point) {};
editTool.end = function(point) {
};


/** place tool */
var placeTool = new Object();
var placeToolBegin = undefined;
var placeToolItem = undefined;
var placeToolBeginWidth = undefined;
var placeToolBeginHeight = undefined;
var PLACE_MIN_MOVE = 5;
var PLACE_MIN_TAN = 0.05;

placeTool.edits = true;
placeTool.begin = function(point) {
	placeToolBegin = point;
	// try the last item in the selectionProject...
	var item = selectionProject.layers[0].lastChild;
	if (item) {
		// is it an object?
		var objid = getObjectId(item);
		if (objid) {
			if (currentObjectId===objid) {
				console.log('cannot place object in self '+objid);				
			} else {
				console.log('place '+objid);
				// make sure it is a symbol in this project
				var symbol = getCachedSymbol(toolProject, objid);
				if (symbol) {
					// place the symbol, centred at point with default scale
					placeToolItem = new paper.PlacedSymbol(symbol);
					placeToolItem.translate(point);
					placeToolItem.scale(1/toolView.zoom);
					placeToolBeginWidth = placeToolItem.bounds.width;
					placeToolBeginHeight = placeToolItem.bounds.height;
				}
				else {
					console.log('Could not get symbol for '+objid);
				}
			}
		}
		else {
			console.log('Selected item does not seem to be an object');
		}
	}
	else {
		console.log('Could not get a last selected item');
	}
};
placeTool.move = function(point) {
	// calculate scale/transform based on distance from start and adjust scale accordingly
	var dx = Math.abs(point.x-placeToolBegin.x);
	var dy = Math.abs(point.y-placeToolBegin.y);
	if (Math.abs(dx<PLACE_MIN_MOVE) || Math.abs(dx/dy)<PLACE_MIN_TAN)
		dx = 0;
	if (Math.abs(dy<PLACE_MIN_MOVE) || Math.abs(dy/dx)<PLACE_MIN_TAN)
		dy = 0;
	if (dy==0)
		dy = dx*placeToolBeginHeight/placeToolBeginWidth;
	else if (dx==0)
		dx = dy*placeToolBeginWidth/placeToolBeginHeight;
	if (dx==0) {
		dx = placeToolBeginWidth/2;
		dy = placeToolBeginHeight/2;
	}
	var width = placeToolItem.bounds.width;
	if (width/2!=dx) {
		placeToolItem.scale(dx*2/width, dy*2/placeToolItem.bounds.height);
	}
};
placeTool.end = function(point) {
	// tidy up
	placeToolItem = undefined;
	placeToolBegin = undefined;
};

/** global - all tools keys by key */
var tools = new Object();
tools[getToolKeyChar('A')] = lineTool;
tools[getToolKeyChar('S')] = textTool;
tools[getToolKeyChar('Z')] = zoomInTool;
tools[getToolKeyChar('X')] = zoomOutTool;
tools[getToolKeyChar('C')] = showAllTool;
tools[getToolKeyChar('E')] = editTool;
tools[getToolKeyChar('D')] = placeTool;
// TODO Delete
// TODO cycle highlight (space?)


function pageOffsetTop(target) {
	var top = 0;
	while (target) {
		top += target.offsetTop;
		target = target.offsetParent;
	}
	return top;
}
function pageOffsetLeft(target) {
	var left = 0;
	while (target) {
		left += target.offsetLeft;
		target = target.offsetParent;
	}
	return left;
}

/** function to map view pixel position to project coordinates.
 * @return Point */
function view2project(view, pageX, pageY) {
	return view.viewToProject(new paper.Point(pageX-pageOffsetLeft(view._element), pageY-pageOffsetTop(view._element)));
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
		
		//console.log("added "+objid+" to index, group bounds="+group.bounds+', symbol bounds='+.bounds+', placed bounds='+placed.bounds);
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
	var objectGroup = new paper.Group();//[]?
	// note: by default, position is considered to be the centre of the item's bounds!
	// group is re-positioned at 0,0
	var objectSymbol = new paper.Symbol(objectGroup);
	// TEST
	//var text = new paper.PointText(new paper.Point(50,50));
	//text.content = 'Object '+objid;
	//objectSymbol.definition.addChild(text);
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
		showEditor(objid);
	};
	$('#'+tabid).on('click', tabfn);
	tabfn();
}

/** handle completed edit */
function mergeChangesAndCopy(changedProject, copyProject) {
	var objectSymbol = objectSymbols[currentObjectId];
	// group assumed first item in changedProject
	var changedGroup = changedProject.activeLayer.firstChild;
	console.log('from changed with '+changedProject.activeLayer.children.length+' items, first '+changedGroup);
	// if the group is empty the bounds don't seem to update properly
	if (changedGroup.children.length==0 && changedProject.activeLayer.children.length>1) {
		// create a new group instead
		changedGroup.remove();
		console.log('converting '+changedProject.activeLayer.children.length+' items to new group');
		changedGroup = new paper.Group([changedProject.activeLayer.firstChild]);
		if (changedProject.activeLayer.children.length>1)
			changedGroup.moveAbove(changedProject.activeLayer.firstChild);
		console.log('- layer now has '+changedProject.activeLayer.children.length);
	} 
	while (changedProject.activeLayer.children.length>1) {
		var newItem = changedProject.activeLayer.children[1];
		// just doing addChild isn't updating the bounds
		//newItem.copyTo(changedGroup);
		//newItem.remove();
		changedGroup.addChild(newItem);
		console.log('added new item to group');
	}
	console.log('- group bounds now '+changedGroup.bounds);
	// force group bounds update?!
	//changedProject.activeLayer.addChild(changedGroup);
	//changedProject.activeLayer._clearBoundsCache();
	//console.log('-- group bounds now '+changedGroup.bounds);
	// copy to other project
	copyProject.activeLayer.removeChildren();
	changedGroup.copyTo(copyProject);
	// copy to symbol 
	objectsProject.activate();
	objectSymbol.definition.removeChildren();
	for (var ci in changedGroup.children) {
		var c = changedGroup.children[ci];
		// A Symbol needs to be translated to the symbol there
		if (c instanceof paper.PlacedSymbol) {
			var objid = getCachedSymbolId(changedProject, c);
			if (objid) {
				console.log('copying placed '+objid+' back to object');
				var refSymbol = objectSymbols[objid];
				if (refSymbol) {
					var p2 = new paper.PlacedSymbol(refSymbol);
					p2.matrix = c.matrix;
					objectSymbol.definition.addChild(p2);
				}
				else
					console.log('could not find '+objid+' in objects');
			}
			else
				console.log('cound not get id for placed symbol '+c);
		} 
		else {
			c.copyTo(objectSymbol.definition);
		}
	}
	// update caches...
	updateSymbolCaches(currentObjectId);
}

/** handle completed edit */
function handleEdit(tool, toolView) {
	toolProject.activate();
	// change to overview?
	if (toolView===objectOverviewProject.view) {
		if (tool.edits) {
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
		if (highlightVisibleItem) {
			// temporary hack to show red box at bounds as highlight
			highlightVisibleItem.remove();
			highlightVisibleItem = undefined;
			console.log('cleared highlight');
		}
		
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
		project.layers[1].activate();
		highlightVisibleItem = new paper.Path.Rectangle(bounds);
		highlightVisibleItem.strokeWidth = 1/project.view.zoom;
		project.layers[0].activate();
		highlightVisibleItem.strokeColor = 'red';
		console.log('created highlight for '+item);
	}
}

/** check/set highlight from mouse move */
function checkHighlight() {
	if (mouseTarget) {
		var project = getProject(mouseTarget);
		// if tool active, restrict to its home canvas
		if (project && (project===toolProject || !(tool))) {
			var point = view2project(project.view, 
					mousePageX,
					mousePageY);
			/* Hit test doesn't seem to work by default on Text, or on groups
			var options = { tolerance:2, fill:true, stroke:true, segments: true };
			var res = project.hitTest(point, options);
			console.log('highlight test at '+point+' -> '+res);
			var item = (res) ? res.item : null;
			*/
			//console.log('highlight test at '+point+' in '+project);
			
			var tolerance = 2/project.view.zoom;
			var items = new Array();
			for (var ci in project.layers[0].children) {
				var c = project.layers[0].children[ci];
				var bounds = c.bounds;
				if (point.x>=bounds.left-tolerance &&
						point.x<=bounds.right+tolerance &&
						point.y>=bounds.top-tolerance &&
						point.y<=bounds.bottom+tolerance) {
					items.push(c);
					//console.log('- hit '+ci+':'+c+' '+bounds+'+/-'+tolerance);
				}
				else {
					//console.log('- missed '+ci+':'+c+' '+bounds+'+/-'+tolerance);
				}
			}
			var item = (items.length>0) ? items[0] : null;
			if (item) {
				if (item===highlightItem && project===highlightProject) 
					; // no-op
				else {
					clearHighlight();
					project.activate();
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
	// extra layer for highlights
	new paper.Layer();
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'Index';
	indexProject.layers[0].activate();
	
	var objectOverviewCanvas = document.getElementById('objectOverviewCanvas');
	paper.setup(objectOverviewCanvas);
	objectOverviewProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'ObjectOverview';
	objectOverviewProject.layers[0].activate();
	
	var objectDetailCanvas = document.getElementById('objectDetailCanvas');
	paper.setup(objectDetailCanvas);
	objectDetailProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'ObjectDetail';
	objectDetailProject.layers[0].activate();
	
	var selectionCanvas = document.getElementById('selectionCanvas');
	paper.setup(selectionCanvas);
	selectionProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	var test;
	test = new paper.PointText(new paper.Point(10,20));
	test.content = 'Selection';
	selectionProject.layers[0].activate();
	
	

	
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
			toolProject.activate();
			tool.end(view2project(toolView, mousePageX, mousePageY));
			handleEdit(tool, toolView);
			tool = undefined;
			redraw(paper);
		}
		checkHighlight();
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

					if (!t.highlights)
						clearHighlight();

					p.activate();
					console.log('begin tool '+t);
					tool = t;
					toolView = v;
					toolProject = p;
					tool.begin(view2project(toolView, mousePageX, mousePageY), v);
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
			toolProject.activate();
			tool.end(view2project(toolView, mousePageX, mousePageY));
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
		console.log('keypress: '+ev.which+' at '+mousePageX+','+mousePageY+' on '+mouseTarget+' = '+(mousePageX-pageOffsetLeft(mouseTarget))+','+(mousePageY-pageOffsetTop(mouseTarget)));
	});
	$(document).mousemove(function(ev) {
		//console.log('mousemove: '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		mouseTarget = ev.target;
		mousePageX = ev.pageX;
		mousePageY = ev.pageY;
		if (tool) {
			toolProject.activate();
			tool.move(view2project(toolView, mousePageX, mousePageY));
			if (tool.highlights)
				checkHighlight();
			redraw(paper);
		}
		else {
			checkHighlight();
		}
	});
	$(document).mousedown(function(ev) {
		mouseTarget = ev.target;
		mousePageX = ev.pageX;
		mousePageY = ev.pageY;
		// which: 1=left, 2=middle, 3=right
		console.log('mousedown: '+ev.which+' at '+ev.pageX+','+ev.pageY+' on '+ev.target+' ('+$(ev.target).attr('id')+') = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		if (tool) {
			// switch tool
			toolProject.activate();
			tool.end(view2project(toolView, mousePageX, mousePageY));
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
			tool.begin(view2project(toolView, mousePageX, mousePageY), v);
			redraw(paper);
		}
		checkHighlight();
	});
	$(document).mouseup(function(ev) {
		mouseTarget = ev.target;
		mousePageX = ev.pageX;
		mousePageY = ev.pageY;
		console.log('mouseup: '+ev.which+' on '+ev.target);
		if (tool===selectTool) {
			toolProject.activate();
			tool.end(view2project(toolView, mousePageX, mousePageY));
			handleEdit(tool, toolView);
			redraw(paper);
			tool = undefined;
		}
		checkHighlight();
	});
	// mousedown, mouseup, mouseenter, mouseleave
	
	
    $(window).resize(handleResize);
    handleResize();
});

