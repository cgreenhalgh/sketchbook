// Note, problems with paperjs versions.
// Nightly build recent (July 2012) throws an exception early on in the View initialisation
// with view apparently null.
// Stable release 0.2.2 has (at least) a bug in the way the centre is updated when zooming. See
// NB: https://github.com/eric-wieser/paper.js/tree/patch-1
// "Fixed bad centering when `view.center` and `view.zoom` are changed"

// main application state

var nextObjectId = 1;

var objectsProject = undefined;
// an object, i.e. sketch, has properties:
// - id
// - description : text
// - symbol : Symbol in objectsProject
// - editorSettings : per-object detail/ovewview/zoom/center 
// - editorRank (if exists): i.e. position of editor tab in list, if present
// - [save] editorVisible : currently visible?
// - frames : array of Frame (Object):
//   - id : unique for all frames and sequences in all objects
//   - description : text
//   - center (x,y), width, height
// - sequences : array of Sequence (Object):
//   - id : unique for all frames and sequences on all objects
//   - description : text
//   - items : array of (Object):
//     - objid : (optional - if not this object) [TODO]
//     - type : sequence or frame
//     - id : of frame or sequence
var objects = new Object();
// Old: each object is a Symbol on the objectsProject
// var objectSymbols = new Object();
// Old: per-object detail/ovewview/zoom/center 
// var objectEditorSettings = new Object();
// overview in the editor
var objectOverviewProject = undefined;
// detail view in the editor
var objectDetailProject = undefined;
// a selection
// - objid : object id
// - item : Item if partial selection within object
// - current : is part of current selection
var selectionHistory = new Array();
// selection history project
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
	var refSymbol = objects[objid] ? objects[objid].symbol : null;
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
	if (project===objectsProject) {
		for (var si in objects) {
			var s = objects[si].symbol;
			if (s===symbol) {
				return si;
			}
		}
		console.log('could not find definition objid for '+symbol);
		return null;
	}
	else {
		var cache = getSymbolCache(project);
		for (var oi in cache.objects) {
			var s = cache.objects[oi];
			if (symbol===s)
				return oi;
		}
		console.log('could not find objid for '+symbol);
		return null;
	}
}

/** update symbol caches */
function updateSymbolCaches(objid) {
	console.log('update symbol caches for '+objid);
	var refSymbol = objects[objid] ? objects[objid].symbol : null;
	
	for (var ci in symbolCaches) {
		var cache = symbolCaches[ci];
		var symbol = cache.objects[objid];
		if (symbol) {
			if (refSymbol) {
				
				var bounds1 = symbol.definition.bounds;//.clone();
				
				// fix: remove old children afterwards
				var oldChildren = symbol.definition.children.length;
				//symbol.definition.removeChildren();
				for (var ci in refSymbol.definition.children) {
					var c = refSymbol.definition.children[ci];
					c.copyTo(symbol.definition);
				}
				console.log('- update definition for '+$(cache.project.view._element).attr('id'));

				for (var i=0; i<oldChildren; i++)
					symbol.definition.firstChild.remove();
				
				var bounds2 = symbol.definition.bounds;
				console.log('- bounds '+bounds1+' now '+symbol.definition.bounds);
				
				// in index & selection the symbol should still fit in the bounding box.
				// in definition and detail/overview the placed symbol needs to be offset to compensate for change in 
				// center of symbol.
				// TODO this isn't working at the moment!!
				// The current weirdness is that an object which has another placed object in it, when the other object 
				// is edited, is the detail/overview the other object appears shifted, but in the index view it 
				// is not shifted but the bounds are not correct.
				
				var scale = Math.max(bounds1.width, bounds1.height)/Math.max(bounds2.width, bounds2.height);
				var delta = new paper.Point(bounds1.center.x-bounds2.center.x, bounds1.center.y-bounds2.center.y);
				if (delta.x!=0 || delta.y!=0 || scale!=1) {
					for (var ii in symbol._instances) {
						var placed = symbol._instances[ii];
						if (!(placed.project)) {
							// hmm. old PlacedSymbols still seem to show up as being in their project, i.e. this 
							// doesn't discriminate them
							console.log('note: placed not in project: '+placed);
							// TODO GC? clear definition?!
							continue;
						}
						if (cache.project===indexProject || cache.project===selectionProject) {
							// need to adjust delta by scale?!
							// TODO this still isn't right
							var matrix = placed.matrix;
							console.log('- - matrix sx '+matrix.scaleX+', sy='+matrix.scaleY);
							var d2 = new paper.Point(delta.x*matrix.scaleX, delta.y*matrix.scaleY);
							placed.translate(d2);
							console.log('- - offset by '+d2+' in '+$(cache.project.view._element).attr('id'));
							placed.scale(scale);
							console.log('- - scaled by '+scale+' in '+$(cache.project.view._element).attr('id'));
						}
					}
				}
				
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

/** copy to Project handling PlacedSymbol */
function copyItem(item, fromProject, toProject, toGroup) {
	if (item instanceof paper.PlacedSymbol) {
		console.log('- copy symbol');
		var objid = getCachedSymbolId(fromProject, item);
		if (objid) {
			console.log('- instance symbol '+objid);
			var symbol = getCachedSymbol(toProject, objid);
			if (symbol) {
				var placed = new paper.PlacedSymbol(symbol);
				placed.matrix = item.matrix;
				if (toGroup)
					toGroup.addChild(placed);
				else
					toProject.activeLayer.addChild(placed);
				return placed;
			}
			else {
				console.log('- could not find '+objid+' in cache');
				return null;
			}
		}
		else {
			console.log('- could not find ref symbol '+objid);
			return null;
		}
	}
	else {
		console.log('- copy '+item);
		// just copy
		return item.copyTo(toGroup ? toGroup : toProject);
	}	
}

/** copy from definition(s) to project */
function copyDefinition(objectSymbol, toProject) {
	console.log('copy definition to '+toProject);
	// definition should be a group
	toProject.activate();
	var fix = new paper.Group();
	var toGroup = new paper.Group([fix]);//[]?
	for (var ci=0; ci<objectSymbol.definition.children.length; ci++) {
		var c = objectSymbol.definition.children[ci];
		copyItem(c, objectsProject, toProject, toGroup);
	}
	if (toGroup.children.length>1)
		fix.remove();
	return toGroup;
}

/** handle change of tab */
function handleTabChange() {
	// TODO tidy up selection history
	// save any changes to description
	if (currentObjectId) {
		onObjectTextChange();
	}
}

/** show editor for object ID */
function showEditor(objid) {
	
	handleTabChange();
	
	$('.tab').removeClass('tabselected');
	$('#tab_'+objid).addClass('tabselected');
	$('.tabview').hide();
	// update editor state!
	// find object Symbol
	var objectSymbol = objects[objid] ? objects[objid].symbol : null;
	currentObjectId = objid;
	
	objectDetailProject.activate();
	// remove old
	objectDetailProject.activeLayer.removeChildren();
	clearSymbolCache(objectDetailProject);
	
	//var objectDetailGroup = 
	copyDefinition(objectSymbol, objectDetailProject);
	//objectDetailGroup.translate(new paper.Point(50,25));
	//objectDetailSymbol.place();
	
	objectOverviewProject.activate();
	// remove old
	objectOverviewProject.activeLayer.removeChildren();
	clearSymbolCache(objectOverviewProject);
	
	//var objectOverviewGroup = 
	copyDefinition(objectSymbol, objectOverviewProject);
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
	
	$('#objectTextArea').val(objects[objid].description);
	
	$('#editor').show();		
	// scaling problem workaround
	handleResize();

	// NB set zoom/center after resize workaround
	var settings = objects[objid].editorSettings;
	objectDetailProject.view.zoom = settings.detailZoom;
	objectDetailProject.view.center = settings.detailCenter;
	objectOverviewProject.view.zoom = settings.overviewZoom;
	objectOverviewProject.view.center = settings.overviewCenter;
}

/** line tool */
var lineTool = new Object();
var lineToolPath = undefined;
var DOT_SIZE = 2;

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

		if (lineToolPath.length==0) {
			// replace with dot
			lineToolPath.remove();
			lineToolPath = new paper.Path.Circle(point, DOT_SIZE/toolView.zoom);
			lineToolPath.fillColor = 'black';
		} else {
			lineToolPath.simplify();
		}
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
	var texts = new Array();
	var y = 0;
	for (var li in lines) {
		var line = lines[li];
		var text = new paper.PointText(new paper.Point(0, y));
		text.content = line;
		text.paragraphStyle.justification = justification;
		text.characterStyle = characterStyle;
		texts.push(text);//block.addChild(text);
		y = y + lineSpacing;
	}
	var block = new paper.Group(texts);//[]?
	block.translate(point);
	return block;
}

/** text tool */
var textTool = new Object();
//var textToolOutline = undefined;
var textToolText = undefined;
var textToolBegin = undefined;
//var textToolPos = 0;

textTool.edits = true;
textTool.begin = function(point) {
	console.log('textTool.begin '+point);
	textToolBegin = point;
	var text = $('#orphanText').val();
	$('#orphanText').val('');
	if (text.length>0)
	var lines = [text];
	textToolText = createTextBlock(point, lines); //['testing','testing','1, 2, 3...']);
};
textTool.move = function(point) {
	if (textToolText) {
		textToolText.translate(new paper.Point(point.x-textToolBegin.x, point.y-textToolBegin.y));
		textToolBegin = point;
	}
};
textTool.end = function(point) {
	if (textToolText) {
		console.log('textTool.end'+point);
		textToolText = undefined;
		textToolBegin = undefined;
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

/** get title, first line of description */
function getObjectTitle(objid) {
	var title = objects[objid].description;
	if (title) {
		var ix = title.indexOf('\n');
		if (ix>=0)
			title = title.substr(0, ix);
	}
	if (!title || title.length==0)
		title = objid;
	return title;
}
/** make an index icon in current project for a symbol. 
 * @return Item (Group) representing object in index/selection
 */
function createIndexItem(objid, indexProject) {
	// make a visual icon for the object comprising a group with box, scaled view and text label
	// (currently id)
	indexProject.activate();
	//if (indexProject!==selectionProject) {
	var symbol = getCachedSymbol(indexProject, objid);
	//}
	var symbolBounds = symbol.definition.bounds;
	var scale = (symbolBounds) ? Math.min((INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.width+INDEX_CELL_MARGIN),
			(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(symbolBounds.height+INDEX_CELL_MARGIN)) : 1;
	var placed = symbol.place();
	console.log('symbolbounds='+symbolBounds+', placed bounds='+placed.bounds);
	placed.scale(scale);
	placed.name = objid;
	placed.translate(new paper.Point(INDEX_CELL_SIZE/2-placed.bounds.center.x, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2-placed.bounds.center.y));
	var label = new paper.PointText(new paper.Point(INDEX_CELL_SIZE/2, INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT+pt2px(LABEL_FONT_SIZE)));
	var title = getObjectTitle(objid);
	label.content = title;
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

function moveHistory() {
	// move history along
	for (var ci in selectionProject.activeLayer.children) {
		var c = selectionProject.activeLayer.children[ci];
		c.translate(new paper.Point(INDEX_CELL_SIZE,0));
		console.log('moved '+ci+' '+c+' to '+c.position);
	}
}
function selectItem(project, item) {
	// a selection
	// - objid : object id
	// - item : Item if partial selection within object
	// - current : is part of current selection
	var selection = new Object();
	if (project===objectDetailProject || project===objectOverviewProject) {
		// within an object
		selection.objid = currentObjectId;
		selection.item = item;

		moveHistory();
		selectionProject.activate();
		var copy = copyItem(item, toolProject, selectionProject);
		var group = new paper.Group([copy]);
		var bounds = group.bounds;
		var scale = Math.min((INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(bounds.width+INDEX_CELL_MARGIN),
				(INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT-INDEX_CELL_MARGIN)/(bounds.height+INDEX_CELL_MARGIN));
		group.scale(scale);
		group.translate(new paper.Point(INDEX_CELL_SIZE/2-group.bounds.center.x, (INDEX_CELL_SIZE-INDEX_LABEL_HEIGHT)/2-group.bounds.center.y));
		selection.historyItem = group;
	} else {
		// reference to an object, e.g. in index (or for now selection)?
		var objid = getObjectId(item);
		if (!objid || !objects[objid]) {
			console.log('non-editor selection which is not object ref ignored');
			return false;
		}
		selection.objid = objid;

		moveHistory();
		var group = createIndexItem(objid, selectionProject);
		group.translate(new paper.Point());
		console.log('added '+group+' at '+group.center);
		selection.historyItem = group;
	}
	selection.current = true;
	selectionHistory.splice(0,0,selection);
	//selectionProject.activate();
	//selectionProject.activate();
	// initial position should be ok
	selectionProject.view.zoom = 1;
	selectionProject.view.center = new paper.Point($(selectionProject.view._element).width()/2, INDEX_CELL_SIZE/2);
	//redraw(paper);
	
	console.log('selection history has '+selectionHistorylength+' selections; project has '+selectionProject.layers[0].children.length+' children');
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
		
		// clear old selection
		for (var i=0; i<selectionHistory.length; i++)
			selectionHistory[i].current = false;
		
		for (var si in selectToolItems) {
			var s = selectToolItems[si];
			// TODO if this is the selectionHistory then just re-order and/or make current
			selectItem(toolProject, s);
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
	if (selectionHistory.length==0) {
		console.log('no selections');
		return;
	}
	var selection = selectionHistory[0];
	if (!selection.item) {
		// an object
		if (currentObjectId===selection.objid) {
			console.log('cannot place object in self '+selection.objid);				
		} else {
			console.log('place '+selection.objid);
			// make sure it is a symbol in this project
			var symbol = getCachedSymbol(toolProject, selection.objid);
			if (symbol) {
				// place the symbol, centred at point with default scale
				placeToolItem = new paper.PlacedSymbol(symbol);
				placeToolItem.translate(point);
				placeToolItem.scale(1/toolView.zoom);
				placeToolBeginWidth = placeToolItem.bounds.width;
				placeToolBeginHeight = placeToolItem.bounds.height;
			}
			else {
				console.log('Could not get symbol for '+selection.objid);
			}
		}
	}
	else {		
		// TODO handle partial selection
		console.log('Todo: paste item '+selection.item);
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

var deleteTool = new Object();
deleteTool.edits = true;
deleteTool.highlights = true;

function checkDelete() {
	if (highlightItem) {
		var deleteItem = highlightItem;
		clearHighlight();
		// fix only child?
		if (toolProject.activeLayer.firstChild.children.length==1) {
			console.log('added fix object before delete');
			toolProject.activeLayer.firstChild.addChild(new paper.Group());
		}
		console.log('delete '+deleteItem);
		deleteItem.remove();
	}
}

deleteTool.begin = function(point) {
	checkDelete();
	
	toolProject.layers[1].activate();
	selectToolPath = new paper.Path();
	toolProject.layers[0].activate();	
	selectToolPath.strokeColor = 'red';
	selectToolPath.strokeWidth = 1/toolView.zoom;
	selectToolPath.add(point);	

};
deleteTool.move = function(point) {
	checkDelete();

	if (selectToolPath) {
		//console.log('lineTool.move '+point);

		selectToolPath.add(point);
		if (highlightItem && selectToolItems.indexOf(highlightItem)<0)
			selectToolItems.push(highlightItem);
	}
};
deleteTool.end = function(point) {
	if (selectToolPath) {
		selectToolPath.remove();
		selectToolPath = undefined;
	}
};

/** space tool, i.e. move to end of children */
var spaceTool = new Object();
spaceTool.edits = true;
spaceTool.highlights = true;

function moveHighlight() {
	if (highlightItem && highlightItem.parent && highlightItem.parent instanceof paper.Group && highlightItem.parent.children.length>1 && highlightItem.parent.lastChild!==highlightItem) {
		console.log('move highlight item to end of parent children');
		highlightItem.moveBelow(highlightItem.parent.lastChild);
	}
}
spaceTool.begin = function(point) {
	moveHighlight();
};
spaceTool.move = function(point) {
	moveHighlight();
};
spaceTool.end = function(point) {
	moveHighlight();	
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
tools[getToolKeyWhich(KEY_DELETE)] = deleteTool;
tools[getToolKeyChar(' ')] = spaceTool;


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
	
	handleTabChange();
	
	$('.tab').removeClass('tabselected');
	$('#tabIndex').addClass('tabselected');
	$('.tabview').hide();
	$('#index').show();
	currentObjectId = undefined;
	
	indexProject.activate();
	indexProject.layers[0].activate();
	indexProject.activeLayer.removeChildren();
	//cache?! indexProject.symbols = [];
	
	var max = 0;
	var x = 0;
	var y = 0;
	
	for (var objid in objects) {
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
	$('#tabs .footer').before('<div class="tab objecttab" id="'+tabid+'">'+objid+'</div>');	
	
	// new object Symbol
	objectsProject.activate();
	var fix = new paper.Group();
	var objectGroup = new paper.Group([fix]);//[]?
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

	var object = new Object();
	objects[objid] = object;
	object.symbol = objectSymbol;	
	object.id = objid;
	object.editorRank = $('#'+tabid).index();
	object.description = 'Sketch '+objid;
		
	var settings = new Object();
	object.editorSettings = settings;
	settings.overviewZoom = 1;
	settings.detailZoom = 1;
	settings.overviewCenter = new paper.Point(0,0);
	settings.detailCenter = new paper.Point(0,0);
	
	var tabfn = function() {
		showEditor(objid);
	};
	$('#'+tabid).on('click', tabfn);
	tabfn();
}

/** handle completed edit */
function mergeChangesAndCopy(changedProject, copyProject) {
	var objectSymbol = objects[currentObjectId].symbol;
	// group assumed first item in changedProject
	var changedGroup = changedProject.activeLayer.firstChild;
	console.log('from changed with '+changedProject.activeLayer.children.length+' items, first '+changedGroup);
	// if the group is empty the bounds don't seem to update properly
	while (changedProject.activeLayer.children.length>1) {
		var newItem = changedProject.activeLayer.children[1];
		// just doing addChild isn't updating the bounds
		//newItem.copyTo(changedGroup);
		//newItem.remove();
		changedGroup.addChild(newItem);
		console.log('added new item to group');
	}
	console.log('- group bounds now '+changedGroup.bounds);
	// discard empty group fix??
	if (changedGroup.children.length>1 && changedGroup.firstChild instanceof paper.Group && changedGroup.firstChild.children.length==0) {
		console.log('remove first child fix');
		changedGroup.firstChild.remove();
	}
	
	// force group bounds update?!
	//changedProject.activeLayer.addChild(changedGroup);
	//changedProject.activeLayer._clearBoundsCache();
	//console.log('-- group bounds now '+changedGroup.bounds);
	// copy to other project
	copyProject.activeLayer.removeChildren();
	changedGroup.copyTo(copyProject);
	// copy to symbol 
	objectsProject.activate();
	
	// fix: remove old children afterwards!
	var oldChildren = objectSymbol.definition.children.length;
	//objectSymbol.definition.removeChildren();
	for (var ci=0; ci<changedGroup.children.length; ci++) {
		var c = changedGroup.children[ci];
		// A Symbol needs to be translated to the symbol there
		if (c instanceof paper.PlacedSymbol) {
			var objid = getCachedSymbolId(changedProject, c);
			if (objid) {
				console.log('copying placed '+objid+' back to object');
				var refSymbol = objects[objid] ? objects[objid].symbol : null;
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
	for (var i=0; i<oldChildren; i++) 
		objectSymbol.definition.firstChild.remove();
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
			var settings = objects[currentObjectId].editorSettings;
			settings.overviewZoom = toolView.zoom;
			settings.overviewCenter = toolView.center;
		}
	}
	else if (toolView===objectDetailProject.view) {
		if (tool.edits) {
			mergeChangesAndCopy(objectDetailProject, objectOverviewProject);
		}
		else if (currentObjectId) {
			var settings = objects[currentObjectId].editorSettings;
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
			var children = project.layers[0].children;
			if ((project===objectDetailProject || project===objectOverviewProject) && children.length>0)
				// look inside top-level group in object editor
				children = children[0].children;
			for (var ci in children) {
				var c = children[ci];
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

/** marshall matrix */
function marshallMatrix(matrix) {
	var jmatrix = matrix.values;
	return jmatrix;
}

/** marshall paperjs color to JSON-compatible */
function marshallColor(color) {
	if (color) {
		return { red: color.red, green: color.green, blue: color.blue };
	}
	return undefined;
}
/** marshall paperjs Symbol which is an object to JSON-stingifiability */
function marshallItem(item) {
	var jitem = {};
	var matrix = item.matrix;
	if (matrix)
		jitem.matrix = marshallMatrix(matrix);
	
	if (item instanceof paper.Group) {
		jitem.type = 'group';
		jitem.children = [];
		for (var ci=0; ci<item.children.length; ci++) {
			var c = item.children[ci];
			jitem.children.push(marshallItem(c));
		}
	} else if (item instanceof paper.PlacedSymbol) {
		jitem.type = 'symbol';
		var objid = getCachedSymbolId(objectsProject, item);
		if (objid)
			jitem.objid = objid;
	} else if (item instanceof paper.Path) {
		jitem.type = 'path';
		jitem.strokeColor =  marshallColor(item.strokeColor);
		jitem.fillColor = marshallColor(item.fillColor);
		jitem.strokeWidth = item.strokeWidth;
		jitem.closed = item.closed;
		jitem.clockwise = item.clockwise;
		jitem.segments = [];
		for (var si=0; si<item.segments.length; si++) {
			var s = item.segments[si];
			var js = { point : { x: s.point.x, y: s.point.y },
					handleIn : { x: s.handleIn.x, y: s.handleIn.y },
					handleOut : { x: s.handleOut.x, y: s.handleOut.y } };
			jitem.segments.push(js);
		}
	} else if (item instanceof paper.PointText) {
		jitem.type = 'text';
		jitem.content = item.content;
		jitem.point = { x: item.point.x, y : item.point.y };
		jitem.paragraphStyle = { justification: String(item.paragraphStyle.justification) };
		jitem.characterStyle = { fontSize: item.characterStyle.fontSize, 
				fillColor:  marshallColor(item.characterStyle.fillColor), 
				font: String(item.characterStyle.font) };
		//jitem.fillColor = item.fillColor;
	} else {
		console.log('marshallItem: Unsupported item '+item);
	}
	return jitem;
}
/** unmarshall color */
function unmarshallColor(jcolor) {
	if (jcolor)
		return new paper.RgbColor(jcolor.red, jcolor.green, jcolor.blue);
	return undefined;
}
/** unmarshallItem */
function unmarshallItem(jitem) {
	var item = null;
	if (jitem.type=='group') {
		var children = [];
		for (var i=0; i<jitem.children.length; i++) {
			var child = unmarshallItem(jitem.children[i]);
			if (child)
				children.push(child);
		}
		if (children.length==0)
			// fix
			children.push(new paper.Group());
		item = new paper.Group(children);
	}
	else if (jitem.type=='symbol') {
		if (jitem.objid) {
			var objid = jitem.objid;
			// already exists?!
			if (objects[objid]) {
				console.log('read reference to known '+objid);
			} 
			else {
				console.log('warning: read reference to '+objid+' before definition - create place-holder');
				var tmp = { objid: objid, tmp: true };
				tmp.symbol = new paper.Symbol(new paper.Group(new paper.Group()));
				objects[objid] = tmp;
			}			
			item = new paper.PlacedSymbol(objects[objid].symbol);
		}
	}
	else if (jitem.type=='path') {
		var segments = [];
		for (var si=0; si<jitem.segments.length; si++) {
			var s = jitem.segments[si];
			segments.push(new paper.Segment(new paper.Point(s.point.x, s.point.y),
					new paper.Point(s.handleIn.x, s.handleIn.y), 
					new paper.Point(s.handleOut.x, s.handleOut.y)));
		}
		item = new paper.Path(segments);
		item.strokeColor =  unmarshallColor(jitem.strokeColor);
		item.fillColor = unmarshallColor(jitem.fillColor);
		item.strokeWidth = jitem.strokeWidth;
		item.closed = jitem.closed;
		item.clockwise = jitem.clockwise;
	}
	else if (jitem.type=='text') {
		item = new paper.PointText(new paper.Point(jitem.point.x, jitem.point.y));
		item.content = jitem.content;
		item.paragraphStyle = jitem.paragraphStyle;
		item.characterStyle = jitem.characterStyle;
		item.characterStyle.fillColor = unmarshallColor(jitem.characterStyle.fillColor);
	}
	else {
		console.log('unknown item type '+jitem.type);
	}
	if (jitem.matrix && item) 
		item.matrix = new paper.Matrix(jitem.matrix);
	return item;
}
/** save. 
 * NB uses propsed/html5 FileSaver API, as supported by 
 * https://github.com/eligrey/FileSaver.js https://github.com/eligrey/BlobBuilder.js
 * see also http://eligrey.com/blog/post/saving-generated-files-on-the-client-side */
function onSave() {
	
	// chance to persist some other bits
	handleTabChange();
	
	var bb = new BlobBuilder();
	// build current state into object representation
	var jstate = { nextObjectId : nextObjectId };
	jstate.objects = [];
	for (var objid in objects) {
		var object = objects[objid];
		var jobject = { id: objid };
		jstate.objects.push(jobject);
		if (objid==currentObjectId)
			jobject.editorVisible = true;
		if (object.editorSettings)
			jobject.editorSettings = object.editorSettings;
		if (object.editorRank)
			jobject.editorRank = object.editorRank;
		jobject.description = object.description;
		jobject.symbol = marshallItem(object.symbol.definition);
	}
	jstate.selectionHistory = [];
	for (var si=0; si<selectionHistory.length; si++) {
		var selection = selectionHistory[si];
		if (selection.item) {
			console.log('partial selection omitted from save');
		} else {
			var jselection = { objid : selection.objid, current : selection.current };
			jstate.selectionHistory.push(jselection);
		}
	}
	console.log('state: '+jstate);
	// save
	bb.append(JSON.stringify(jstate));
	var filename = $('#filenameText').val()+'.json';
	var fileSaver = saveAs(bb.getBlob(), filename);
	//fileSaver.onwriteend = myOnWriteEnd;
}

function clearProject(project) {
	for (var li=0; li<project.layers.length; li++)
		project.layers[li].removeChildren();
	project.symbols = [];
}
/** clear everything! */
function clearAll() {
	// remove all objects
	objects = new Object();
	objectsProject.symbols = [];
	
	currentObjectId = undefined;
	// clear selection history
	selectionHistory = [];
	
	// remove all items
	clearProject(indexProject);
	clearProject(selectionProject);
	clearProject(objectDetailProject);
	clearProject(objectOverviewProject);

	// remove all extra tabs
	$('.objecttab').remove();
	
	// show index
	onShowIndex();
}

/** restore state from JSON-compat object saved */
function restoreState(jstate) {
	// .nextObjectId
	nextObjectId = jstate.nextObjectId;
	// .objects
	var currentObjectFn = null;
	for (var i=0; i<jstate.objects.length; i++) {
		var jobject = jstate.objects[i];
		var objid = jobject.id;

		var object = objects[objid] ? objects[objid] : new Object();
		console.log('restore object '+objid);
		// see also onNewObject
		var tabid = 'tab_'+objid;
		$('#tabs .footer').before('<div class="tab objecttab" id="'+tabid+'">'+objid+'</div>');	

		// TODO editorRank
		console.log('editorRank = '+jobject.editorRank);
		
		// new object Symbol
		objectsProject.activate();

		objects[objid] = object;

		var defItem = unmarshallItem(jobject.symbol);
		if (!object.symbol) {
			var objectSymbol = new paper.Symbol(defItem);
			object.symbol = objectSymbol;	
		}
		else {
			object.symbol.definition = defItem;
			console.log('replaced definition of '+objid+'(tmp? '+object.tmp+')');
		}
		object.id = objid;
		object.editorRank = $('#'+tabid).index();
		object.description = jobject.description;
			
		object.editorSettings = jobject.editorSettings;
		
		(function (objid, tabid) {
			var tabfn = function() {
				showEditor(objid);
			};
			$('#'+tabid).on('click', tabfn);

			if (jobject.editorVisible)
				currentObjectFn = tabfn;
		})(objid, tabid);
	}
	// .selectionHistory
	for (var i=0; i<jstate.selectionHistory.length; i++) {
		var jselection = jstate.selectionHistory[i];
		var selection = { objid: jselection.objid, current: jselection.current };
		if (selection.objid) {
			selection.item = createIndexItem(selection.objid, selectionProject);
			selection.item.translate(new paper.Point(i*INDEX_CELL_SIZE, 0));
		}
	}
	selectionProject.view.zoom = 1;
	selectionProject.view.center = new paper.Point($(selectionProject.view._element).width()/2, INDEX_CELL_SIZE/2);
	if (currentObjectFn) {
		currentObjectFn();
	}
	else
		onShowIndex();
}
//http://stackoverflow.com/questions/498970/how-do-i-trim-a-string-in-javascript
if (!String.prototype.trim) {
   //code for trim
	String.prototype.trim=function(){return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');};
}

/** object filter changes */
function onObjectFilterChanges() {
	// TODO
}

/** load - from File select.
 * NB uses new/html5 File API */
function onLoad(evt) {
	handleTabChange();
	
	if (nextObjectId!=1)
		onSave();
	else
		console.log('project believed empty - no extra save');
	
	clearAll();
	
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// Great success! All the File APIs are supported.

	    var files = evt.target.files; // FileList object
		if (files.length==0) {
			console.log('no file specified');
			return;
		}
		var f = files[0];
	    console.log('read file: '+escape(f.name)+' ('+(f.type || 'n/a')+') - '+
	                  f.size+' bytes, last modified: '+
	                  (f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a'));
	    
	    var name = f.name;
	    // remove extension
	    var ix = name.lastIndexOf('.');
	    if (ix>0)
	    	name = name.substr(0,ix);
	    // remove (..) added by browser on save
	    ix = name.lastIndexOf('(');
	    if (ix>0)
	    	name = name.substr(0,ix).trim();
	    $('#filenameText').val(name);
	    
	    var reader = new FileReader();
	    reader.onload = function(evt) {
	        // Render thumbnail.
	        console.log('file read: '+evt.target.result);
	        var jstate;
	        try {
	        	jstate = JSON.parse(evt.target.result);
	        }
	        catch (err) {
	        	console.log('error parsing JSON state: '+err.message);
	        }
        	restoreState(jstate);
	    };
	
	    // Read in the file
	    reader.readAsText(f);
	}
	else
		console.log('sorry, file apis not supported');
}

/** change to object text (description). Note this is kind of lazy, i.e. not each key press, 
 * but on loss of focus */
function onObjectTextChange() {
	//console.log('objectTextChange');
	var text = $('#objectTextArea').val();
	console.log('objectTextChange: '+text+' (current object '+currentObjectId+')');
	if (currentObjectId && objects[currentObjectId]) {
		objects[currentObjectId].description = text;
		var title = getObjectTitle(currentObjectId);
		// update icon title in selectionProject
		for (var si=0; si<selectionHistory.length; si++) {
			var selection = selectionHistory[si];
			if (selection.historyItem && selection.objid==currentObjectId && !selection.item) {
				// should be an icon			
				for (var ci=0; ci<selection.historyItem.children.length; ci++) {
					var c = selection.historyItem.children[ci];
					if (c instanceof paper.PointText) {
						console.log('update icon title for '+currentObjectId+' from '+c.content+' to '+title);
						c.content = title;
					}
				}
			}
		}
		redraw(paper);
	}
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
	//var test;
	//test = new paper.PointText(new paper.Point(10,20));
	//test.content = 'Index';
	indexProject.layers[0].activate();
	
	var objectOverviewCanvas = document.getElementById('objectOverviewCanvas');
	paper.setup(objectOverviewCanvas);
	objectOverviewProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	//var test;
	//test = new paper.PointText(new paper.Point(10,20));
	//test.content = 'ObjectOverview';
	objectOverviewProject.layers[0].activate();
	
	var objectDetailCanvas = document.getElementById('objectDetailCanvas');
	paper.setup(objectDetailCanvas);
	objectDetailProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	//var test;
	//test = new paper.PointText(new paper.Point(10,20));
	//test.content = 'ObjectDetail';
	objectDetailProject.layers[0].activate();
	
	var selectionCanvas = document.getElementById('selectionCanvas');
	paper.setup(selectionCanvas);
	selectionProject = paper.project;
	// extra layer for highlights
	new paper.Layer();
	//var test;
	//test = new paper.PointText(new paper.Point(10,20));
	//test.content = 'Selection';
	selectionProject.layers[0].activate();
	
	$('#loadFile').on('change', onLoad);
	console.log('textarea: '+$('#objectTextArea').attr('id'));
	$('#objectTextArea').change(onObjectTextChange);
	
	$(document).on('mouseover', 'div .tab', function() {
		$(this).addClass('tabhighlight');
	});
	$(document).on('mouseout', 'div .tab', function() {
		$(this).removeClass('tabhighlight');
	});
	$(document).on('mouseenter', 'textarea',function() {
		$(this).focus();
	});
	$(document).on('mouseout', 'textarea',function() {
		$(this).blur();
		$('#orphanText').focus();
	});
	$(document).on('mouseenter', 'canvas',function() {
		$('#orphanText').blur();
	});
	$(document).on('mouseout', 'canvas',function() {
		$('#orphanText').focus();
	});
	$(document).on('mouseenter', 'body',function() {
		$('#orphanText').focus();
	});
	$(document).on('mouseenter', 'input[type=text]',function() {
		$(this).focus();
	});
	$(document).on('mouseout', 'input[type=text]',function() {
		$(this).blur();
		$('#orphanText').focus();
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
		if (p && p.view && document.activeElement!=document.getElementById('orphanText')) {		
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
		
		// escape for orphan focus?
		if (ev.which==KEY_ESCAPE) {
			$('#orphanText').focus();
		}
		// stop, e.g. backspace and ctrl-... propagating to browser itself
		if (isSpecialKey(ev.which) || ev.ctrlKey) {
			if (ev.target.tagName && (ev.target.tagName=='TEXTAREA' || ev.target.tagName=='INPUT')) {
				if (ev.which==KEY_BACKSPACE || ev.which=='C'.charCodeAt(0) || ev.which=='V'.charCodeAt(0)) {
					console.log('textarea allowing special key down '+ev.which);
					return true;
				}
				//else
				//	console.log('textarea key '+ev.which+' target tagName = '+ev.target.tagName);

			}
			//else 
			//	console.log('key target tagName = '+ev.target.tagName);
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
			// except some things in text
			if (ev.target.tagName && (ev.target.tagName=='TEXTAREA' || ev.target.tagName=='INPUT')) {
				if (ev.which==KEY_BACKSPACE || ev.which=='C'.charCodeAt(0) || ev.which=='V'.charCodeAt(0)) {
					console.log('textarea allowing special key up '+ev.which);
					return true;
				}
			}
			ev.stopPropagation();
			return false;
		}
	});
	$(document).keypress(function(ev) {
		console.log('keypress: '+ev.which+' at '+mousePageX+','+mousePageY+' on '+mouseTarget+' = '+(mousePageX-pageOffsetLeft(mouseTarget))+','+(mousePageY-pageOffsetTop(mouseTarget)));
		if (ev.target.tagName.toUpperCase()!='CANVAS' && mouseTarget.tagName.toUpperCase()!='CANVAS' && ev.target.tagName!='TEXTAREA' && ev.target.tagName!='INPUT' && ev.charCode) {
			console.log('key '+String.fromCharCode(ev.charCode)+' in <'+ev.target.tagName+'> (mouse <'+mouseTarget.tagName+'>)');
			$('#orphanText').val($('#orphanText').val()+String.fromCharCode(ev.charCode));
		}
	});
	$(document).mousemove(function(ev) {
		//console.log('mousemove: '+ev.pageX+','+ev.pageY+' on '+ev.target+' = '+(ev.pageX-pageOffsetLeft(ev.target))+','+(ev.pageY-pageOffsetTop(ev.target)));
		if (ev.target.tagName=='CANVAS' && (ev.pageX!=mousePageX || ev.pageY!=mousePageY)) {
			console.log('blur orphan text on mousemove');
			$('#orphanText').blur();
		}
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
		if (ev.target.tagName=='CANVAS') {
			console.log('blur orphan text on mousedown');
			$('#orphanText').blur();
		}
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

